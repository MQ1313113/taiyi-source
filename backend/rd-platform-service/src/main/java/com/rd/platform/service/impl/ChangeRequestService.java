package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.constant.BizConstants;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.BizChangeRequest;
import com.rd.platform.model.entity.BizRequirement;
import com.rd.platform.model.entity.SysConfig;
import com.rd.platform.model.mapper.BizChangeRequestMapper;
import com.rd.platform.model.mapper.BizRequirementMapper;
import com.rd.platform.model.mapper.SysConfigMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.time.LocalDateTime;

/**
 * 变更业务逻辑（从原胖 Controller 抽出，Controller 仅保留 HTTP 映射与委托）。
 * 集中承载：双重审批状态机(PENDING→TL_APPROVED→APPROVED)、R4 防自审、二审≠一审、项目级数据隔离与通知。
 */
@Service
public class ChangeRequestService {

    @Autowired
    private BizChangeRequestMapper changeRequestMapper;

    @Autowired
    private BizRequirementMapper requirementMapper;

    @Autowired
    private SysConfigMapper sysConfigMapper;

    /**
     * 变更审批人池(可配置):sys_config[change.approver.ids] 存逗号分隔的用户ID。
     * 配置后,双重审批的两位审批人必须来自池内(防自审与双人不同规则不变),
     * 解决小团队"PM+负责人+防自审"组合凑不齐合法审批人的死锁;未配置时回退角色规则。
     */
    private java.util.Set<Long> approverPool() {
        SysConfig cfg = sysConfigMapper.selectOne(
                new LambdaQueryWrapper<SysConfig>().eq(SysConfig::getConfigKey, "change.approver.ids"));
        java.util.Set<Long> pool = new java.util.HashSet<>();
        if (cfg != null && cfg.getConfigValue() != null) {
            for (String s : cfg.getConfigValue().split("[,，\\s]+")) {
                try { if (!s.isEmpty()) pool.add(Long.parseLong(s.trim())); } catch (NumberFormatException ignored) { }
            }
        }
        return pool;
    }

    /** 当前用户是否具备审批资格:配置了池则看池(admin 始终兜底),未配置回退角色规则 */
    private boolean canApprove(Long userId, java.util.Set<Long> pool, boolean fallbackAllowed) {
        if (roleChecker.hasPermission(userId, "biz:override")) return true; // 业务仲裁兜底(默认项目经理,可配置)
        if (!pool.isEmpty()) return pool.contains(userId);
        return fallbackAllowed;
    }

    @Autowired
    private RoleChecker roleChecker;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private ProjectAccessGuard projectAccessGuard;

    // 变更状态机：PENDING(待产品经理审批) -> PM_APPROVED(待需求负责人复审) -> APPROVED；任一驳回 -> REJECTED
    private static final String ST_PENDING = "PENDING";
    private static final String ST_PM_APPROVED = "TL_APPROVED";
    private static final String ST_APPROVED = "APPROVED";
    private static final String ST_REJECTED = "REJECTED";

    public Page<BizChangeRequest> list(Integer pageNum, Integer pageSize, Long projectId, String status) {
        Page<BizChangeRequest> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizChangeRequest> wrapper = new LambdaQueryWrapper<>();
        // 项目级数据隔离：非管理员只能看到自己所属项目的变更
        java.util.List<Long> accessible = projectAccessGuard.accessibleProjectIds(SecurityContextHolder.getCurrentUserId());
        if (accessible != null) {
            if (accessible.isEmpty()) return page;
            wrapper.in(BizChangeRequest::getProjectId, accessible);
        }
        if (projectId != null) wrapper.eq(BizChangeRequest::getProjectId, projectId);
        if (status != null) wrapper.eq(BizChangeRequest::getStatus, status);
        wrapper.orderByDesc(BizChangeRequest::getCreatedAt);
        return changeRequestMapper.selectPage(page, wrapper);
    }

    public BizChangeRequest getById(Long id) {
        BizChangeRequest cr = changeRequestMapper.selectById(id);
        if (cr == null) throw BusinessException.badRequest("变更申请不存在");
        return cr;
    }

    public BizChangeRequest create(ChangeCreateRequest request) {
        Long currentUserId = SecurityContextHolder.getCurrentUserId();
        // 仅产品经理可发起需求变更(PRD 11.2)
        if (!roleChecker.hasPermission(currentUserId, "change:create")) {
            throw BusinessException.forbidden("只有产品经理可以发起需求变更");
        }
        // 已关闭/已取消的需求不可变更:需求生命周期已终结,调整应新建需求走完整流程
        BizRequirement targetReq = requirementMapper.selectById(request.getRequirementId());
        if (targetReq == null) throw BusinessException.badRequest("关联的需求不存在");
        if (BizConstants.REQ_CLOSED.equals(targetReq.getStatus())
                || BizConstants.REQ_CANCELLED.equals(targetReq.getStatus())) {
            throw BusinessException.badRequest("需求已" +
                    (BizConstants.REQ_CLOSED.equals(targetReq.getStatus()) ? "关闭" : "取消") +
                    ",不支持发起变更;如需调整请新建需求");
        }
        BizChangeRequest cr = new BizChangeRequest();
        cr.setRequirementId(request.getRequirementId());
        cr.setProjectId(request.getProjectId());
        cr.setChangeContent(request.getChangeContent());
        cr.setChangeReason(request.getChangeReason());
        cr.setImpactScope(request.getImpactScope());
        cr.setStatus(ST_PENDING);
        cr.setApplicantId(currentUserId);
        changeRequestMapper.insert(cr);

        // 通知需求负责人(产品经理)先行审批
        BizRequirement req = requirementMapper.selectById(request.getRequirementId());
        if (req != null && req.getOwnerId() != null) {
            notificationService.sendNotification(req.getOwnerId(), "新需求变更待审批",
                    "需求#" + req.getId() + " 有新的变更申请待您(产品经理)审批",
                    "CHANGE_APPROVAL", "CHANGE", cr.getId());
        }
        return cr;
    }

    /**
     * 审批变更：双重审批。
     * 第一步由产品经理(pm)审批 -> PM_APPROVED；
     * 第二步由需求负责人(Owner)复审 -> APPROVED。
     * R4 防自审：变更申请人不得审批自己的变更。
     */
    public String approve(Long id) {
        Long currentUserId = SecurityContextHolder.getCurrentUserId();
        BizChangeRequest cr = changeRequestMapper.selectById(id);
        if (cr == null) throw BusinessException.badRequest("变更申请不存在");

        // R4 防自审
        if (cr.getApplicantId() != null && cr.getApplicantId().equals(currentUserId)) {
            throw BusinessException.forbidden("变更申请人不能审批自己提交的变更（R4防自审）");
        }
        BizRequirement req = requirementMapper.selectById(cr.getRequirementId());
        Long ownerId = req != null ? req.getOwnerId() : null;

        java.util.Set<Long> pool = approverPool();

        if (ST_PENDING.equals(cr.getStatus())) {
            // 第一重：配置了审批人池则以池为准,否则回退"产品经理"角色规则
            if (!canApprove(currentUserId, pool,
                    roleChecker.hasPermission(currentUserId, "change:approve"))) {
                throw BusinessException.forbidden(pool.isEmpty()
                        ? "第一重审批须由产品经理完成"
                        : "第一重审批须由配置的变更审批人完成(系统设置-变更审批人池)");
            }
            cr.setStatus(ST_PM_APPROVED);
            cr.setApproverId(currentUserId);
            changeRequestMapper.updateById(cr);
            // 通知第二重审批人（需求负责人）
            if (ownerId != null && !ownerId.equals(currentUserId)) {
                notificationService.sendNotification(ownerId, "变更待复审",
                        "变更#" + cr.getId() + " 已通过产品经理审批，待您复审", "CHANGE_APPROVAL", "CHANGE", cr.getId());
            }
            return "第一重(产品经理)审批通过，待需求负责人复审";
        } else if (ST_PM_APPROVED.equals(cr.getStatus())) {
            // 第二重：需求负责人复审；且不得与第一重审批人为同一人
            if (cr.getApproverId() != null && cr.getApproverId().equals(currentUserId)) {
                throw BusinessException.forbidden("第二重审批人不能与第一重审批人相同（双人双审）");
            }
            boolean isOwner = ownerId != null && ownerId.equals(currentUserId);
            if (!canApprove(currentUserId, pool,
                    isOwner || roleChecker.hasPermission(currentUserId, "change:approve"))) {
                throw BusinessException.forbidden(pool.isEmpty()
                        ? "第二重复审须由需求负责人或产品经理完成"
                        : "第二重复审须由配置的变更审批人完成(系统设置-变更审批人池)");
            }
            cr.setStatus(ST_APPROVED);
            cr.setApprovedAt(LocalDateTime.now());
            changeRequestMapper.updateById(cr);
            if (cr.getApplicantId() != null) {
                notificationService.sendNotification(cr.getApplicantId(), "变更已批准",
                        "您提交的变更#" + cr.getId() + " 已通过双重审批", "CHANGE_RESULT", "CHANGE", cr.getId());
            }
            return "第二重(需求负责人)复审通过，变更正式批准";
        } else {
            throw BusinessException.badRequest("当前状态[" + cr.getStatus() + "]不可审批");
        }
    }

    public void reject(Long id, RejectRequest request) {
        Long currentUserId = SecurityContextHolder.getCurrentUserId();
        BizChangeRequest cr = changeRequestMapper.selectById(id);
        if (cr == null) throw BusinessException.badRequest("变更申请不存在");
        if (cr.getApplicantId() != null && cr.getApplicantId().equals(currentUserId)) {
            throw BusinessException.forbidden("变更申请人不能驳回自己提交的变更（R4防自审）");
        }
        if (!ST_PENDING.equals(cr.getStatus()) && !ST_PM_APPROVED.equals(cr.getStatus())) {
            throw BusinessException.badRequest("当前状态[" + cr.getStatus() + "]不可驳回");
        }
        cr.setStatus(ST_REJECTED);
        cr.setApproverId(currentUserId);
        cr.setRejectReason(request.getReason());
        changeRequestMapper.updateById(cr);
        if (cr.getApplicantId() != null) {
            notificationService.sendNotification(cr.getApplicantId(), "变更被驳回",
                    "您提交的变更#" + cr.getId() + " 被驳回：" + request.getReason(), "CHANGE_RESULT", "CHANGE", cr.getId());
        }
    }

    @Data
    public static class ChangeCreateRequest {
        @NotNull(message = "需求ID不能为空")
        private Long requirementId;
        @NotNull(message = "项目ID不能为空")
        private Long projectId;
        @NotBlank(message = "变更内容不能为空")
        private String changeContent;
        @NotBlank(message = "变更原因不能为空")
        private String changeReason;
        @NotBlank(message = "影响范围不能为空")
        private String impactScope;
    }

    @Data
    public static class RejectRequest {
        @NotBlank(message = "驳回原因不能为空")
        private String reason;
    }
}
