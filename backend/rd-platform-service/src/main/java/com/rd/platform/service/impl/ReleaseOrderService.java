package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.constant.BizConstants;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.*;
import com.rd.platform.model.mapper.*;
import com.rd.platform.security.context.SecurityContextHolder;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 发布单(车次模型):补齐发布环节"最后一公里"的验证卡点。
 * 状态机:DRAFT → RELEASING(开始发布) → SMOKE_PENDING(已部署待冒烟) → DONE(冒烟通过) / ROLLED_BACK(回滚)
 * 职责分离:发布单由 PM/项目经理创建与推进,冒烟确认只能 QA 操作。
 * 档位弹性:标准/完整档项目的需求 RELEASING→CLOSED 必须挂在冒烟通过(DONE)的发布单上;轻量档不强制。
 */
@Service
public class ReleaseOrderService {

    public static final String ST_DRAFT = "DRAFT";
    public static final String ST_RELEASING = "RELEASING";
    public static final String ST_SMOKE_PENDING = "SMOKE_PENDING";
    public static final String ST_DONE = "DONE";
    public static final String ST_ROLLED_BACK = "ROLLED_BACK";

    @Autowired
    private BizReleaseOrderMapper releaseOrderMapper;
    @Autowired
    private BizReleaseOrderItemMapper itemMapper;
    @Autowired
    private BizRequirementMapper requirementMapper;
    @Autowired
    private RoleChecker roleChecker;
    @Autowired
    private ProjectAccessGuard projectAccessGuard;
    @Autowired
    private NotificationService notificationService;
    @Autowired
    private com.rd.platform.model.mapper.SysUserMapper userMapper;

    public Page<BizReleaseOrder> list(Integer pageNum, Integer pageSize, Long projectId, String status) {
        Page<BizReleaseOrder> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizReleaseOrder> qw = new LambdaQueryWrapper<>();
        if (projectId != null) qw.eq(BizReleaseOrder::getProjectId, projectId);
        if (StringUtils.hasText(status)) qw.eq(BizReleaseOrder::getStatus, status);
        qw.orderByDesc(BizReleaseOrder::getId);
        return releaseOrderMapper.selectPage(page, qw);
    }

    public java.util.Map<String, Object> detail(Long id) {
        BizReleaseOrder ro = mustGet(id);
        List<BizReleaseOrderItem> items = itemMapper.selectList(new LambdaQueryWrapper<BizReleaseOrderItem>()
                .eq(BizReleaseOrderItem::getReleaseOrderId, id));
        List<BizRequirement> reqs = new ArrayList<>();
        for (BizReleaseOrderItem it : items) {
            BizRequirement r = requirementMapper.selectById(it.getRequirementId());
            if (r != null) reqs.add(r);
        }
        java.util.Map<String, Object> m = new java.util.HashMap<>();
        m.put("order", ro);
        m.put("requirements", reqs);
        return m;
    }

    public BizReleaseOrder create(CreateRequest request) {
        Long uid = SecurityContextHolder.getCurrentUserId();
        // 发布单由 PM/项目负责角色创建(复用发布权限)
        if (!roleChecker.hasPermission(uid, "requirement:release")) {
            throw BusinessException.forbidden("只有产品经理可以创建发布单");
        }
        projectAccessGuard.assertAccess(uid, request.getProjectId(), "发布单");
        if (!StringUtils.hasText(request.getRollbackPlan()) || request.getRollbackPlan().trim().length() < 20) {
            throw BusinessException.badRequest("回滚方案必填且不少于20字:必须是可执行的回滚步骤,不接受\"重新发布\"式敷衍");
        }
        if (request.getRequirementIds() == null || request.getRequirementIds().isEmpty()) {
            throw BusinessException.badRequest("发布单至少关联一个需求");
        }
        for (Long rid : request.getRequirementIds()) {
            BizRequirement r = requirementMapper.selectById(rid);
            if (r == null) throw BusinessException.badRequest("需求 #" + rid + " 不存在");
            if (!BizConstants.REQ_TESTED.equals(r.getStatus()) && !BizConstants.REQ_RELEASING.equals(r.getStatus())) {
                throw BusinessException.badRequest("需求 #" + rid + " 当前状态为 " + r.getStatus()
                        + ",只有测试通过(TESTED)或发布中(RELEASING)的需求可上发布单");
            }
            // 一个需求同一时间只能挂在一个未终结的发布单上
            Long exists = itemMapper.selectCount(new LambdaQueryWrapper<BizReleaseOrderItem>()
                    .eq(BizReleaseOrderItem::getRequirementId, rid));
            if (exists > 0) {
                List<BizReleaseOrderItem> its = itemMapper.selectList(new LambdaQueryWrapper<BizReleaseOrderItem>()
                        .eq(BizReleaseOrderItem::getRequirementId, rid));
                for (BizReleaseOrderItem it : its) {
                    BizReleaseOrder o = releaseOrderMapper.selectById(it.getReleaseOrderId());
                    if (o != null && !ST_DONE.equals(o.getStatus()) && !ST_ROLLED_BACK.equals(o.getStatus())) {
                        throw BusinessException.badRequest("需求 #" + rid + " 已挂在进行中的发布单 #" + o.getId() + " 上");
                    }
                }
            }
        }

        BizReleaseOrder ro = new BizReleaseOrder();
        ro.setProjectId(request.getProjectId());
        ro.setTitle(request.getTitle());
        ro.setVersion(request.getVersion());
        ro.setContent(request.getContent());
        ro.setRollbackPlan(request.getRollbackPlan());
        ro.setStatus(ST_DRAFT);
        ro.setCreatedBy(uid);
        releaseOrderMapper.insert(ro);
        for (Long rid : request.getRequirementIds()) {
            BizReleaseOrderItem it = new BizReleaseOrderItem();
            it.setReleaseOrderId(ro.getId());
            it.setRequirementId(rid);
            it.setCreatedAt(LocalDateTime.now());
            itemMapper.insert(it);
        }
        return ro;
    }

    /** DRAFT→RELEASING(开始发布) 或 RELEASING→SMOKE_PENDING(部署完成,通知QA冒烟) */
    public String advance(Long id) {
        Long uid = SecurityContextHolder.getCurrentUserId();
        BizReleaseOrder ro = mustGet(id);
        if (!roleChecker.hasPermission(uid, "requirement:release")) {
            throw BusinessException.forbidden("只有产品经理可以推进发布单");
        }
        if (ST_DRAFT.equals(ro.getStatus())) {
            ro.setStatus(ST_RELEASING);
            releaseOrderMapper.updateById(ro);
            return "发布单已开始发布";
        }
        if (ST_RELEASING.equals(ro.getStatus())) {
            ro.setStatus(ST_SMOKE_PENDING);
            releaseOrderMapper.updateById(ro);
            // 通知全体 QA 冒烟(简化:通知项目内 QA 成员由前端待办承接)
            notifyQa(ro, "发布单 [" + ro.getTitle() + "] 已部署完成,请尽快完成生产冒烟验证");
            return "已标记部署完成,等待 QA 生产冒烟确认";
        }
        throw BusinessException.badRequest("当前状态[" + ro.getStatus() + "]不可推进");
    }

    /** 冒烟确认:仅 QA;PASS→DONE,FAIL→ROLLED_BACK(记录结论) */
    public String smokeConfirm(Long id, SmokeRequest request) {
        Long uid = SecurityContextHolder.getCurrentUserId();
        BizReleaseOrder ro = mustGet(id);
        if (!roleChecker.hasPermission(uid, "requirement:test_pass")) {
            throw BusinessException.forbidden("生产冒烟确认只能由测试人员完成");
        }
        if (!ST_SMOKE_PENDING.equals(ro.getStatus())) {
            throw BusinessException.badRequest("发布单未处于待冒烟状态");
        }
        if (!StringUtils.hasText(request.getResult()) || request.getResult().trim().length() < 10) {
            throw BusinessException.badRequest("冒烟结论必填且不少于10字(验证了哪些核心链路、结果如何)");
        }
        ro.setSmokeBy(uid);
        ro.setSmokeAt(LocalDateTime.now());
        ro.setSmokeResult(request.getResult());
        if (Boolean.TRUE.equals(request.getPass())) {
            ro.setStatus(ST_DONE);
            releaseOrderMapper.updateById(ro);
            if (ro.getCreatedBy() != null) {
                notificationService.sendNotification(ro.getCreatedBy(), "发布冒烟通过",
                        "发布单 [" + ro.getTitle() + "] 生产冒烟通过,关联需求可以关闭",
                        BizConstants.NOTIFY_STATUS_CHANGE, "RELEASE", ro.getId());
            }
            return "冒烟通过,发布完成";
        } else {
            ro.setStatus(ST_ROLLED_BACK);
            releaseOrderMapper.updateById(ro);
            if (ro.getCreatedBy() != null) {
                notificationService.sendUrgentNotification(ro.getCreatedBy(), "发布冒烟失败-已标记回滚",
                        "发布单 [" + ro.getTitle() + "] 冒烟失败:" + request.getResult() + ",请按回滚方案执行回滚",
                        BizConstants.NOTIFY_WARNING, "RELEASE", ro.getId());
            }
            return "冒烟失败,发布单已标记回滚,请按回滚方案执行";
        }
    }

    /**
     * 需求关闭卡点(供 RequirementService 调用):
     * 标准/完整档项目的需求必须挂在冒烟通过(DONE)的发布单上才能 CLOSED;轻量档放行。
     */
    public void assertReleasedForClose(BizRequirement req, String gearLevel) {
        String gear = BizConstants.normalizeGear(gearLevel);
        if (BizConstants.GEAR_LIGHTWEIGHT.equals(gear)) return;
        List<BizReleaseOrderItem> items = itemMapper.selectList(new LambdaQueryWrapper<BizReleaseOrderItem>()
                .eq(BizReleaseOrderItem::getRequirementId, req.getId()));
        for (BizReleaseOrderItem it : items) {
            BizReleaseOrder o = releaseOrderMapper.selectById(it.getReleaseOrderId());
            if (o != null && ST_DONE.equals(o.getStatus())) return;
        }
        throw BusinessException.badRequest("需求必须挂在\"冒烟通过\"的发布单上才能关闭(" +
                (BizConstants.GEAR_FULL.equals(gear) ? "完整档" : "标准档") +
                "项目发布卡点):请先创建发布单→部署→QA完成生产冒烟确认");
    }

    /** 供 QA 工作台待办:待冒烟的发布单 */
    public List<BizReleaseOrder> pendingSmoke() {
        return releaseOrderMapper.selectList(new LambdaQueryWrapper<BizReleaseOrder>()
                .eq(BizReleaseOrder::getStatus, ST_SMOKE_PENDING));
    }

    private void notifyQa(BizReleaseOrder ro, String content) {
        // 简化实现:通知所有 QA 角色用户(项目隔离由待办侧保证)
        List<SysUser> users = userMapper.selectList(null);
        for (SysUser u : users) {
            if (roleChecker.hasPermission(u.getId(), "requirement:test_pass")
                    && !roleChecker.hasPermission(u.getId(), "biz:override")
                    && !roleChecker.hasPermission(u.getId(), "system:manage")) {
                notificationService.sendNotification(u.getId(), "待生产冒烟验证", content,
                        BizConstants.NOTIFY_WARNING, "RELEASE", ro.getId());
            }
        }
    }

    private BizReleaseOrder mustGet(Long id) {
        BizReleaseOrder ro = releaseOrderMapper.selectById(id);
        if (ro == null) throw BusinessException.badRequest("发布单不存在");
        return ro;
    }

    @Data
    public static class CreateRequest {
        @NotNull(message = "项目ID不能为空")
        private Long projectId;
        @NotBlank(message = "发布标题不能为空")
        private String title;
        private String version;
        private String content;
        @NotBlank(message = "回滚方案不能为空")
        private String rollbackPlan;
        @NotNull(message = "关联需求不能为空")
        private List<Long> requirementIds;
    }

    @Data
    public static class SmokeRequest {
        @NotNull(message = "冒烟结果不能为空")
        private Boolean pass;
        @NotBlank(message = "冒烟结论不能为空")
        private String result;
    }
}
