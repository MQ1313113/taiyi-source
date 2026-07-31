package com.rd.platform.service.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.constant.BizConstants;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.common.utils.Result;
import com.rd.platform.model.entity.BizBug;
import com.rd.platform.model.entity.BizRequirement;
import com.rd.platform.model.mapper.BizBugMapper;
import com.rd.platform.model.mapper.BizRequirementMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import com.rd.platform.service.impl.NotificationService;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/bugs")
public class BugController {

    @Autowired
    private BizBugMapper bugMapper;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private com.rd.platform.service.impl.RoleChecker roleChecker;

    @Autowired
    private BizRequirementMapper requirementMapper;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) Long projectId,
                          @RequestParam(required = false) Long sprintId,
                          @RequestParam(required = false) Long assigneeId,
                          @RequestParam(required = false) String status,
                          @RequestParam(required = false) String severity,
                          @RequestParam(required = false) String keyword) {
        Page<BizBug> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizBug> wrapper = new LambdaQueryWrapper<>();
        if (projectId != null) wrapper.eq(BizBug::getProjectId, projectId);
        if (sprintId != null) wrapper.eq(BizBug::getSprintId, sprintId);
        if (assigneeId != null) wrapper.eq(BizBug::getAssigneeId, assigneeId);
        if (StringUtils.hasText(status)) wrapper.eq(BizBug::getStatus, status);
        if (StringUtils.hasText(severity)) wrapper.eq(BizBug::getSeverity, severity);
        if (StringUtils.hasText(keyword)) wrapper.like(BizBug::getTitle, keyword);
        wrapper.orderByDesc(BizBug::getCreatedAt);
        return Result.success(bugMapper.selectPage(page, wrapper));
    }

    @GetMapping("/{id}")
    public Result<?> getById(@PathVariable Long id) {
        BizBug bug = bugMapper.selectById(id);
        if (bug == null) return Result.error("缺陷不存在");
        return Result.success(bug);
    }

    @PostMapping
    @AuditLog(module = "缺陷管理", operation = "提交缺陷")
    public Result<?> create(@Valid @RequestBody BugCreateRequest request) {
        Long currentUserId = SecurityContextHolder.getCurrentUserId();

        // 权限门禁(FP-BUG-03 / PRD 25.4.2)：只有测试或产品可提交Bug，拦截开发越权
        if (!roleChecker.hasPermission(currentUserId, "bug:create")) {
            throw BusinessException.forbidden("只有测试或产品人员可以提交缺陷");
        }
        // Cross-check R3: Reporter and assignee must be different
        if (request.getAssigneeId().equals(currentUserId)) {
            throw BusinessException.badRequest("提交人和负责人不能为同一人");
        }
        // 缺陷负责人角色校验(FP-BUG-04 / PRD 25.4.2)：Bug只能指派给开发人员修复
        if (request.getAssigneeId() == null
                || !roleChecker.hasPermission(request.getAssigneeId(), "task:dev_progress")) {
            throw BusinessException.badRequest("缺陷负责人必须指派给开发人员");
        }

        BizBug bug = new BizBug();
        bug.setProjectId(request.getProjectId());
        bug.setSprintId(request.getSprintId());
        bug.setRequirementId(request.getRequirementId());
        bug.setTaskId(request.getTaskId());
        bug.setTitle(request.getTitle());
        bug.setDescription(request.getDescription());
        bug.setExpectedResult(request.getExpectedResult());
        bug.setActualResult(request.getActualResult());
        bug.setSeverity(request.getSeverity());
        bug.setPriority(request.getPriority());
        bug.setModuleName(request.getModuleName());
        bug.setStatus(BizConstants.BUG_OPEN);
        bug.setReporterId(currentUserId);
        bug.setAssigneeId(request.getAssigneeId());
        bug.setEnvironment(request.getEnvironment());
        bug.setFrequency(request.getFrequency());
        bug.setAffectedScope(request.getAffectedScope());
        bug.setAttachmentUrls(request.getAttachmentUrls());
        bugMapper.insert(bug);

        // Notify assignee
        notificationService.sendNotification(request.getAssigneeId(), "新缺陷分配",
                "您有新的Bug需要处理: " + request.getTitle(),
                BizConstants.NOTIFY_BUG_ASSIGN, "BUG", bug.getId());

        return Result.success("缺陷提交成功", bug);
    }

    @PutMapping("/{id}/status")
    @AuditLog(module = "缺陷管理", operation = "变更缺陷状态")
    public Result<?> changeStatus(@PathVariable Long id, @RequestBody BugStatusRequest request) {
        BizBug bug = bugMapper.selectById(id);
        if (bug == null) return Result.error("缺陷不存在");

        String currentStatus = bug.getStatus();
        String newStatus = request.getStatus();

        if (!isValidBugTransition(currentStatus, newStatus)) {
            throw BusinessException.badRequest("不允许的状态转换: " + currentStatus + " -> " + newStatus);
        }

        Long currentUserId = SecurityContextHolder.getCurrentUserId();
        // 角色门禁：按状态流转方向限制操作人角色
        checkBugStatusPermission(currentUserId, currentStatus, newStatus, bug);

        // Cross-check R4: Verifier must be different from fixer
        if (BizConstants.BUG_VERIFIED.equals(newStatus)) {
            if (currentUserId.equals(bug.getFixerId())) {
                throw BusinessException.badRequest("修复人不能验证自己修复的Bug");
            }
        }

        bug.setStatus(newStatus);
        if (BizConstants.BUG_CONFIRMED.equals(newStatus)) {
            bug.setConfirmedAt(LocalDateTime.now());
        } else if (BizConstants.BUG_FIXED.equals(newStatus)) {
            bug.setFixedAt(LocalDateTime.now());
            bug.setFixerId(SecurityContextHolder.getCurrentUserId());
            bug.setRootCause(request.getRootCause());
            bug.setIntroducePhase(request.getIntroducePhase());
        } else if (BizConstants.BUG_CLOSED.equals(newStatus)) {
            bug.setClosedAt(LocalDateTime.now());
        }
        bugMapper.updateById(bug);

        // FP-RETRO-01 / PRD 10.1：关闭严重(CRITICAL/BLOCKER)缺陷时，自动向修复人与需求负责人生成 5Whys 根因复盘任务
        if (BizConstants.BUG_CLOSED.equals(newStatus)
                && ("CRITICAL".equalsIgnoreCase(bug.getSeverity()) || "BLOCKER".equalsIgnoreCase(bug.getSeverity()))) {
            String content = "严重缺陷 #" + bug.getId() + "「" + bug.getTitle() + "」已关闭，请在 3 天内提交 5Whys 根因复盘（逼问五层原因+改进措施）";
            if (bug.getFixerId() != null) {
                notificationService.sendNotification(bug.getFixerId(), "5Whys根因复盘待提交", content, "RETRO_TASK", "BUG", bug.getId());
            }
            BizRequirement req = bug.getRequirementId() != null ? requirementMapper.selectById(bug.getRequirementId()) : null;
            if (req != null && req.getOwnerId() != null && !req.getOwnerId().equals(bug.getFixerId())) {
                notificationService.sendNotification(req.getOwnerId(), "5Whys根因复盘待跟进", content, "RETRO_TASK", "BUG", bug.getId());
            }
        }

        // 状态流转强提醒：通知下一环节负责人
        sendBugTransitionNotification(bug, currentStatus, newStatus, currentUserId);
        return Result.success("状态变更成功");
    }

    @PutMapping("/{id}/reassign")
    @AuditLog(module = "缺陷管理", operation = "转派缺陷")
    public Result<?> reassign(@PathVariable Long id, @RequestBody ReassignRequest request) {
        BizBug bug = bugMapper.selectById(id);
        if (bug == null) return Result.error("缺陷不存在");
        bug.setAssigneeId(request.getAssigneeId());
        bugMapper.updateById(bug);
        notificationService.sendNotification(request.getAssigneeId(), "缺陷转派",
                "Bug [" + bug.getTitle() + "] 已转派给您",
                BizConstants.NOTIFY_BUG_ASSIGN, "BUG", id);
        return Result.success("转派成功");
    }

    /**
     * Bug状态流转角色门禁：
     * - 确认/拒绝(OPEN→CONFIRMED/REJECTED)：测试人员或产品经理 (bug:edit)
     * - 开始修复(CONFIRMED→FIXING)：开发人员，且必须是负责人本人
     * - 标记已修复(FIXING→FIXED)：开发人员，且必须是负责人本人
     * - 验证(FIXED→VERIFIED/REOPENED)：测试人员 (bug:close)
     * - 关闭(VERIFIED→CLOSED)：测试人员或产品经理 (bug:close)
     * - 重新打开(REJECTED→REOPENED)：测试人员 (bug:edit)
     * - 重新确认(REOPENED→CONFIRMED)：测试人员或产品经理 (bug:edit)
     * sys_admin 全程兜底放行。
     */
    private void checkBugStatusPermission(Long operatorId, String from, String to, BizBug bug) {
        // sys_admin 兜底
        if (roleChecker.hasPermission(operatorId, "requirement:delete")) return;

        // 确认/拒绝/重新确认/重新打开：测试或产品经理
        if (BizConstants.BUG_CONFIRMED.equals(to) || BizConstants.BUG_REJECTED.equals(to)) {
            if (!roleChecker.hasPermission(operatorId, "bug:confirm")) {
                throw BusinessException.forbidden("只有测试人员或产品经理可以确认/拒绝Bug");
            }
            return;
        }
        // 开始修复/标记已修复：必须是负责人本人（开发人员）
        if (BizConstants.BUG_FIXING.equals(to) || BizConstants.BUG_FIXED.equals(to)) {
            if (bug.getAssigneeId() != null && !bug.getAssigneeId().equals(operatorId)) {
                throw BusinessException.forbidden("只有Bug负责人本人才能操作修复流转");
            }
            return;
        }
        // 验证/关闭：测试人员
        if (BizConstants.BUG_VERIFIED.equals(to) || BizConstants.BUG_CLOSED.equals(to)
                || BizConstants.BUG_REOPENED.equals(to)) {
            if (!roleChecker.hasPermission(operatorId, "bug:close")) {
                throw BusinessException.forbidden("只有测试人员可以验证/关闭/重开Bug");
            }
            return;
        }
    }

    private boolean isValidBugTransition(String from, String to) {
        switch (from) {
            case "OPEN": return "CONFIRMED".equals(to) || "REJECTED".equals(to);
            case "CONFIRMED": return "FIXING".equals(to);
            case "FIXING": return "FIXED".equals(to);
            case "FIXED": return "VERIFIED".equals(to) || "REOPENED".equals(to);
            case "VERIFIED": return "CLOSED".equals(to);
            case "REJECTED": return "REOPENED".equals(to);
            case "REOPENED": return "CONFIRMED".equals(to);
            case "CLOSED": return false;
            default: return false;
        }
    }

    /**
     * Bug状态流转强提醒：当Bug流转到下一环节时，向负责人发送紧急通知
     */
    private void sendBugTransitionNotification(BizBug bug, String fromStatus, String toStatus, Long operatorId) {
        try {
            // OPEN → CONFIRMED：缺陷已确认，通知负责人（开发）开始修复
            if (BizConstants.BUG_CONFIRMED.equals(toStatus)) {
                if (bug.getAssigneeId() != null && !bug.getAssigneeId().equals(operatorId)) {
                    notificationService.sendUrgentNotification(bug.getAssigneeId(), "Bug已确认，请修复",
                            "缺陷「" + bug.getTitle() + "」已确认，请尽快开始修复",
                            "STATUS_CHANGE", "BUG", bug.getId());
                }
            }
            // FIXING → FIXED：开发已修复，通知提交人（QA）去验证
            else if (BizConstants.BUG_FIXED.equals(toStatus)) {
                if (bug.getReporterId() != null && !bug.getReporterId().equals(operatorId)) {
                    notificationService.sendUrgentNotification(bug.getReporterId(), "Bug已修复，请验证",
                            "缺陷「" + bug.getTitle() + "」已修复，请进行验证测试",
                            "STATUS_CHANGE", "BUG", bug.getId());
                }
            }
            // FIXED → REOPENED：验证未通过，通知修复人重新修复
            else if ("REOPENED".equals(toStatus) && BizConstants.BUG_FIXED.equals(fromStatus)) {
                if (bug.getFixerId() != null && !bug.getFixerId().equals(operatorId)) {
                    notificationService.sendUrgentNotification(bug.getFixerId(), "Bug验证未通过",
                            "缺陷「" + bug.getTitle() + "」验证未通过，已重新打开，请重新修复",
                            "STATUS_CHANGE", "BUG", bug.getId());
                }
            }
            // OPEN → REJECTED：缺陷被拒绝，通知提交人
            else if ("REJECTED".equals(toStatus)) {
                if (bug.getReporterId() != null && !bug.getReporterId().equals(operatorId)) {
                    notificationService.sendNotification(bug.getReporterId(), "Bug被拒绝",
                            "您提交的缺陷「" + bug.getTitle() + "」已被拒绝，请确认是否需要重新提交",
                            "STATUS_CHANGE", "BUG", bug.getId());
                }
            }
        } catch (Exception e) {
            // 通知发送失败不影响主流程
        }
    }

    @Data
    public static class BugCreateRequest {
        @NotNull(message = "项目ID不能为空")
        private Long projectId;
        private Long sprintId;
        private Long requirementId;
        private Long taskId;
        @NotBlank(message = "Bug标题不能为空")
        private String title;
        @NotBlank(message = "复现步骤不能为空")
        private String description;
        @NotBlank(message = "预期结果不能为空")
        private String expectedResult;
        @NotBlank(message = "实际结果不能为空")
        private String actualResult;
        @NotBlank(message = "严重程度不能为空")
        private String severity;
        @NotBlank(message = "优先级不能为空")
        private String priority;
        @NotBlank(message = "所属模块不能为空")
        private String moduleName;
        @NotNull(message = "负责人不能为空")
        private Long assigneeId;
        @NotBlank(message = "测试环境不能为空")
        private String environment;
        @NotBlank(message = "复现频率不能为空")
        private String frequency;
        private String affectedScope;
        private String attachmentUrls;
    }

    @Data
    public static class BugStatusRequest {
        @NotBlank(message = "状态不能为空")
        private String status;
        private String rootCause;
        private String introducePhase;
    }

    @Data
    public static class ReassignRequest {
        @NotNull(message = "负责人不能为空")
        private Long assigneeId;
    }
}
