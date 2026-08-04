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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 工单（统一问题入口）业务逻辑。
 * 混合分派：进单时按路由规则命中→自动派责任人；命中不到→待分诊由分诊人兜底。
 * 分诊可转成需求/缺陷并双向追溯。
 */
@Service
public class TicketService {

    @Autowired
    private BizTicketMapper ticketMapper;
    @Autowired
    private BizTicketRoutingMapper routingMapper;
    @Autowired
    private BizRequirementMapper requirementMapper;
    @Autowired
    private BizBugMapper bugMapper;
    @Autowired
    private ProjectAccessGuard projectAccessGuard;
    @Autowired
    private RoleChecker roleChecker;
    @Autowired
    private NotificationService notificationService;
    @Autowired
    private AssignmentLogRecorder assignmentLogRecorder;

    /** SLA 时限（小时），按优先级。 */
    private long slaHours(String priority) {
        if ("P0".equals(priority)) return 4;
        if ("P1".equals(priority)) return 24;
        if ("P3".equals(priority)) return 168;
        return 72; // P2 默认
    }

    private boolean isTriager(Long userId) {
        return roleChecker.hasPermission(userId, "ticket:triage"); // sys_admin 自动放行
    }

    public BizTicket create(TicketCreateRequest req) {
        Long uid = SecurityContextHolder.getCurrentUserId();
        roleChecker.checkPermission(uid, "无权提交工单", "ticket:create");
        BizTicket t = new BizTicket();
        t.setTicketCode("TK-TMP");
        t.setSource(req.getSource());
        t.setCategory(req.getCategory());
        t.setTitle(req.getTitle());
        t.setDescription(req.getDescription());
        t.setPriority(StringUtils.hasText(req.getPriority()) ? req.getPriority() : "P2");
        t.setProjectId(req.getProjectId());
        t.setReporterId(uid);
        t.setEscalatedLevel(0);
        t.setSlaDueAt(LocalDateTime.now().plusHours(slaHours(t.getPriority())));

        // 路由匹配：命中规则→自动派；未命中→待分诊
        BizTicketRouting rule = matchRouting(t.getCategory(), t.getProjectId());
        if (rule != null && rule.getOwnerId() != null) {
            t.setAssigneeId(rule.getOwnerId());
            t.setStatus(BizConstants.TICKET_DISPATCHED);
        } else {
            t.setStatus(BizConstants.TICKET_PENDING_TRIAGE);
        }
        ticketMapper.insert(t);
        // 回填规范编号
        t.setTicketCode(String.format("TK-%d-%04d", LocalDate.now().getYear(), t.getId()));
        ticketMapper.updateById(t);

        if (t.getAssigneeId() != null) {
            notificationService.sendNotification(t.getAssigneeId(), "新工单待处理",
                    "工单「" + t.getTitle() + "」已自动派给您，请及时处理",
                    BizConstants.NOTIFY_TASK_ASSIGN, "TICKET", t.getId());
        }
        return t;
    }

    /** 按 (category [+ projectId]) 命中启用的路由规则；优先精确到项目的规则。 */
    private BizTicketRouting matchRouting(String category, Long projectId) {
        List<BizTicketRouting> rules = routingMapper.selectList(new LambdaQueryWrapper<BizTicketRouting>()
                .eq(BizTicketRouting::getCategory, category)
                .eq(BizTicketRouting::getEnabled, 1));
        BizTicketRouting fallback = null;
        for (BizTicketRouting r : rules) {
            if (projectId != null && projectId.equals(r.getProjectId())) return r; // 精确项目优先
            if (r.getProjectId() == null) fallback = r;
        }
        return fallback;
    }

    public Page<BizTicket> list(Integer pageNum, Integer pageSize, String status, String category, Boolean mine) {
        Long uid = SecurityContextHolder.getCurrentUserId();
        Page<BizTicket> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizTicket> wrapper = new LambdaQueryWrapper<>();
        // 访问范围：管理员/分诊人看全部；其余只看"我报的/我负责的/我所属项目的"
        if (!isTriager(uid)) {
            List<Long> accessible = projectAccessGuard.accessibleProjectIds(uid);
            wrapper.and(w -> {
                w.eq(BizTicket::getReporterId, uid).or().eq(BizTicket::getAssigneeId, uid);
                if (accessible != null && !accessible.isEmpty()) w.or().in(BizTicket::getProjectId, accessible);
            });
        }
        if (StringUtils.hasText(status)) wrapper.eq(BizTicket::getStatus, status);
        if (StringUtils.hasText(category)) wrapper.eq(BizTicket::getCategory, category);
        if (Boolean.TRUE.equals(mine)) wrapper.eq(BizTicket::getAssigneeId, uid);
        wrapper.orderByDesc(BizTicket::getCreatedAt);
        return ticketMapper.selectPage(page, wrapper);
    }

    public BizTicket getById(Long id) {
        BizTicket t = ticketMapper.selectById(id);
        if (t == null) throw BusinessException.badRequest("工单不存在");
        Long uid = SecurityContextHolder.getCurrentUserId();
        boolean canView = isTriager(uid)
                || uid.equals(t.getReporterId()) || uid.equals(t.getAssigneeId())
                || projectAccessGuard.canAccess(uid, t.getProjectId());
        if (!canView) throw BusinessException.forbidden("无权查看该工单");
        return t;
    }

    /**
     * 分诊：仅分诊人可操作。设项目/责任人；可选转成需求或缺陷并双向追溯。
     */
    public BizTicket triage(Long id, TriageRequest req) {
        Long uid = SecurityContextHolder.getCurrentUserId();
        roleChecker.checkPermission(uid, "只有分诊人可以分诊工单", "ticket:triage");
        BizTicket t = ticketMapper.selectById(id);
        if (t == null) throw BusinessException.badRequest("工单不存在");
        if (BizConstants.TICKET_CLOSED.equals(t.getStatus()) || BizConstants.TICKET_RESOLVED.equals(t.getStatus())) {
            throw BusinessException.badRequest("已解决/关闭的工单不可再分诊");
        }
        Long oldAssignee = t.getAssigneeId();
        if (req.getProjectId() != null) t.setProjectId(req.getProjectId());
        if (req.getAssigneeId() != null) t.setAssigneeId(req.getAssigneeId());

        String convertTo = req.getConvertTo();
        if (StringUtils.hasText(convertTo)) {
            if (t.getProjectId() == null) throw BusinessException.badRequest("转换前必须先指定项目");
            // 转换目标实体的负责人必填（缺陷 assignee 为 NOT NULL），且与平台门禁一致
            if (t.getAssigneeId() == null) throw BusinessException.badRequest("转换前必须先指定责任人");
            if (BizConstants.TICKET_CONV_BUG.equals(convertTo)
                    && !roleChecker.hasPermission(t.getAssigneeId(), "task:dev_progress")) {
                throw BusinessException.badRequest("转成缺陷时责任人必须是开发人员");
            }
            if (BizConstants.TICKET_CONV_REQUIREMENT.equals(convertTo)) {
                Long reqId = convertToRequirement(t, uid);
                t.setConvertedType(BizConstants.TICKET_CONV_REQUIREMENT);
                t.setConvertedId(reqId);
            } else if (BizConstants.TICKET_CONV_BUG.equals(convertTo)) {
                Long bugId = convertToBug(t, uid);
                t.setConvertedType(BizConstants.TICKET_CONV_BUG);
                t.setConvertedId(bugId);
            } else {
                throw BusinessException.badRequest("暂只支持转成需求或缺陷");
            }
        }
        t.setStatus(BizConstants.TICKET_DISPATCHED);
        ticketMapper.updateById(t);
        // 转派留痕
        assignmentLogRecorder.record(BizConstants.ASSIGN_ENTITY_TICKET, t.getId(), t.getProjectId(),
                oldAssignee, t.getAssigneeId(), uid, null);

        if (t.getAssigneeId() != null) {
            notificationService.sendNotification(t.getAssigneeId(), "工单已分派",
                    "工单「" + t.getTitle() + "」已分派给您", BizConstants.NOTIFY_TASK_ASSIGN, "TICKET", id);
        }
        return t;
    }

    /** 转成需求（DRAFT），回填 sourceTicketId。责任人作为负责人。 */
    private Long convertToRequirement(BizTicket t, Long uid) {
        BizRequirement r = new BizRequirement();
        r.setProjectId(t.getProjectId());
        r.setTitle(t.getTitle());
        r.setType("功能");
        r.setPriority("中");
        r.setStatus(BizConstants.REQ_DRAFT);
        r.setDescription(t.getDescription());
        r.setAcceptanceCriteria("（由工单转入，待补充验收标准）");
        r.setOwnerId(t.getAssigneeId() != null ? t.getAssigneeId() : uid);
        r.setCreatedBy(uid);
        r.setExpectedCompletionDate(LocalDate.now().plusDays(14));
        r.setIsFastTrack(0);
        r.setFastTrackViolated(0);
        r.setVersion(1);
        r.setSourceTicketId(t.getId());
        requirementMapper.insert(r);
        return r.getId();
    }

    /** 转成缺陷（OPEN），回填 sourceTicketId。 */
    private Long convertToBug(BizTicket t, Long uid) {
        BizBug b = new BizBug();
        b.setProjectId(t.getProjectId());
        b.setTitle(t.getTitle());
        b.setDescription(StringUtils.hasText(t.getDescription()) ? t.getDescription() : "（由工单转入）");
        b.setExpectedResult("（待补充）");
        b.setActualResult("（待补充）");
        b.setSeverity("MAJOR");
        b.setPriority(t.getPriority());
        b.setModuleName("（工单转入）");
        b.setStatus(BizConstants.BUG_OPEN);
        b.setReporterId(uid);
        b.setAssigneeId(t.getAssigneeId());
        b.setSourceTicketId(t.getId());
        bugMapper.insert(b);
        return b.getId();
    }

    public void changeStatus(Long id, String to) {
        BizTicket t = ticketMapper.selectById(id);
        if (t == null) throw BusinessException.badRequest("工单不存在");
        Long uid = SecurityContextHolder.getCurrentUserId();
        // 责任人本人或分诊人可推进
        if (!isTriager(uid) && !uid.equals(t.getAssigneeId())) {
            throw BusinessException.forbidden("只有工单责任人或分诊人可以推进状态");
        }
        if (!isValidTicketTransition(t.getStatus(), to)) {
            throw BusinessException.badRequest("不允许的状态流转: " + t.getStatus() + " -> " + to);
        }
        t.setStatus(to);
        if (BizConstants.TICKET_RESOLVED.equals(to) || BizConstants.TICKET_CLOSED.equals(to)) {
            t.setResolvedAt(LocalDateTime.now());
        }
        ticketMapper.updateById(t);
    }

    private boolean isValidTicketTransition(String from, String to) {
        if (from == null || to == null) return false;
        switch (from) {
            case BizConstants.TICKET_PENDING_TRIAGE:
                return BizConstants.TICKET_DISPATCHED.equals(to);
            case BizConstants.TICKET_DISPATCHED:
                return BizConstants.TICKET_PROCESSING.equals(to) || BizConstants.TICKET_RESOLVED.equals(to);
            case BizConstants.TICKET_PROCESSING:
                return BizConstants.TICKET_RESOLVED.equals(to);
            case BizConstants.TICKET_RESOLVED:
                return BizConstants.TICKET_CLOSED.equals(to) || BizConstants.TICKET_PROCESSING.equals(to); // 关闭 或 重开处理
            case BizConstants.TICKET_CLOSED:
            default:
                return false;
        }
    }

    // ===== 路由/责任规则维护（仅分诊人）=====
    public List<BizTicketRouting> listRoutings() {
        roleChecker.checkPermission(SecurityContextHolder.getCurrentUserId(), "只有分诊人可以查看路由规则", "ticket:triage");
        return routingMapper.selectList(new LambdaQueryWrapper<BizTicketRouting>().orderByDesc(BizTicketRouting::getId));
    }

    public BizTicketRouting createRouting(RoutingRequest req) {
        roleChecker.checkPermission(SecurityContextHolder.getCurrentUserId(), "只有分诊人可以维护路由规则", "ticket:triage");
        BizTicketRouting r = new BizTicketRouting();
        r.setCategory(req.getCategory());
        r.setProjectId(req.getProjectId());
        r.setOwnerId(req.getOwnerId());
        r.setEnabled(1);
        routingMapper.insert(r);
        return r;
    }

    public void deleteRouting(Long id) {
        roleChecker.checkPermission(SecurityContextHolder.getCurrentUserId(), "只有分诊人可以维护路由规则", "ticket:triage");
        routingMapper.deleteById(id);
    }

    @Data
    public static class TicketCreateRequest {
        @NotBlank(message = "来源不能为空")
        private String source;
        @NotBlank(message = "类型不能为空")
        private String category;
        @NotBlank(message = "标题不能为空")
        private String title;
        private String description;
        private String priority;
        private Long projectId;
    }

    @Data
    public static class TriageRequest {
        private Long projectId;
        private Long assigneeId;
        private String convertTo; // REQUIREMENT / BUG / 空=仅指派
    }

    @Data
    public static class StatusRequest {
        @NotBlank(message = "状态不能为空")
        private String status;
    }

    @Data
    public static class RoutingRequest {
        @NotBlank(message = "类型不能为空")
        private String category;
        private Long projectId;
        @NotNull(message = "负责人不能为空")
        private Long ownerId;
    }
}
