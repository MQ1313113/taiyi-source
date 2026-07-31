package com.rd.platform.service.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.constant.BizConstants;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.common.utils.Result;
import com.rd.platform.model.entity.BizTask;
import com.rd.platform.model.mapper.BizTaskMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import com.rd.platform.service.impl.NotificationService;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/tasks")
public class TaskController {

    @Autowired
    private BizTaskMapper taskMapper;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private com.rd.platform.service.impl.RoleChecker roleChecker;

    @Autowired
    private com.rd.platform.model.mapper.BizRequirementMapper requirementMapper;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) Long projectId,
                          @RequestParam(required = false) Long requirementId,
                          @RequestParam(required = false) Long sprintId,
                          @RequestParam(required = false) Long assigneeId,
                          @RequestParam(required = false) String status,
                          @RequestParam(required = false) String keyword) {
        Page<BizTask> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizTask> wrapper = new LambdaQueryWrapper<>();
        if (projectId != null) wrapper.eq(BizTask::getProjectId, projectId);
        if (requirementId != null) wrapper.eq(BizTask::getRequirementId, requirementId);
        if (sprintId != null) wrapper.eq(BizTask::getSprintId, sprintId);
        if (assigneeId != null) wrapper.eq(BizTask::getAssigneeId, assigneeId);
        if (StringUtils.hasText(status)) wrapper.eq(BizTask::getStatus, status);
        if (StringUtils.hasText(keyword)) wrapper.like(BizTask::getTaskName, keyword);
        wrapper.orderByDesc(BizTask::getCreatedAt);
        return Result.success(taskMapper.selectPage(page, wrapper));
    }

    @GetMapping("/{id}")
    public Result<?> getById(@PathVariable Long id) {
        BizTask task = taskMapper.selectById(id);
        if (task == null) return Result.error("任务不存在");
        return Result.success(task);
    }

    @PostMapping
    @AuditLog(module = "任务管理", operation = "创建任务")
    public Result<?> create(@Valid @RequestBody TaskCreateRequest request) {
        // Cross-check R2: Tech leader creates tasks, cannot assign to self only
        Long currentUserId = SecurityContextHolder.getCurrentUserId();

        // 权限门禁(FP-TASK-02 / PRD 24.3)：只有产品经理可拆解任务，拦截开发/测试越权
        if (!roleChecker.hasPermission(currentUserId, "task:create")) {
            throw BusinessException.forbidden("只有产品经理可以拆解任务");
        }
        // 仅该需求的负责人(产品经理)可拆解其名下需求的任务
        if (request.getRequirementId() != null) {
            com.rd.platform.model.entity.BizRequirement reqEntity = requirementMapper.selectById(request.getRequirementId());
            if (reqEntity != null && reqEntity.getOwnerId() != null
                    && !reqEntity.getOwnerId().equals(currentUserId)
                    && !roleChecker.hasPermission(currentUserId, "task:create")) {
                throw BusinessException.forbidden("只有该需求的负责人才能拆解其任务");
            }
        }
        // 需求状态校验：只有评审通过进入开发阶段的需求才能拆解任务
        if (request.getRequirementId() != null) {
            com.rd.platform.model.entity.BizRequirement reqForStatus = requirementMapper.selectById(request.getRequirementId());
            if (reqForStatus != null) {
                String reqStatus = reqForStatus.getStatus();
                if (BizConstants.REQ_DRAFT.equals(reqStatus) || BizConstants.REQ_REVIEWING.equals(reqStatus)) {
                    throw BusinessException.badRequest("需求尚未评审通过，不能拆解任务。请等待需求评审通过进入开发阶段后再拆解");
                }
            }
        }

        // 任务负责人角色校验(PRD 流程规范)：拆解后只能指派给开发人员
        if (request.getAssigneeId() == null
                || !roleChecker.hasPermission(request.getAssigneeId(), "task:dev_progress")) {
            throw BusinessException.badRequest("任务负责人必须指派给开发人员");
        }

        BizTask task = new BizTask();
        task.setRequirementId(request.getRequirementId());
        task.setProjectId(request.getProjectId());
        task.setSprintId(request.getSprintId());
        task.setTaskName(request.getTaskName());
        task.setDescription(request.getDescription());
        task.setStatus(BizConstants.TASK_TODO);
        task.setPriority(request.getPriority());
        task.setAssigneeId(request.getAssigneeId());
        task.setCreatedBy(currentUserId);
        task.setEstimatedHours(request.getEstimatedHours());
        task.setActualHours(BigDecimal.ZERO);
        task.setStartDate(request.getStartDate());
        task.setDueDate(request.getDueDate());
        task.setType(request.getType());
        task.setAcceptanceCriteria(request.getAcceptanceCriteria());
        taskMapper.insert(task);

        // Send notification to assignee
        notificationService.sendNotification(request.getAssigneeId(), "新任务分配",
                "您有新的开发任务: " + request.getTaskName(),
                BizConstants.NOTIFY_TASK_ASSIGN, "TASK", task.getId());

        return Result.success("任务创建成功", task);
    }

    @PutMapping("/{id}")
    @AuditLog(module = "任务管理", operation = "更新任务")
    public Result<?> update(@PathVariable Long id, @Valid @RequestBody TaskCreateRequest request) {
        BizTask task = taskMapper.selectById(id);
        if (task == null) return Result.error("任务不存在");
        // 权限门禁：仅产品经理/系统管理员可编辑、分派任务
        Long currentUserId = SecurityContextHolder.getCurrentUserId();
        if (!roleChecker.hasPermission(currentUserId, "task:edit")) {
            throw BusinessException.forbidden("只有产品经理可以编辑或分派任务");
        }
        task.setTaskName(request.getTaskName());
        task.setDescription(request.getDescription());
        task.setPriority(request.getPriority());
        task.setEstimatedHours(request.getEstimatedHours());
        task.setDueDate(request.getDueDate());
        // 支持分派/转派：更新负责人，且负责人必须为开发人员
        if (request.getAssigneeId() != null) {
            if (!roleChecker.hasPermission(request.getAssigneeId(), "task:dev_progress")) {
                throw BusinessException.badRequest("任务负责人必须指派给开发人员");
            }
            boolean changed = !request.getAssigneeId().equals(task.getAssigneeId());
            task.setAssigneeId(request.getAssigneeId());
            taskMapper.updateById(task);
            if (changed) {
                notificationService.sendNotification(request.getAssigneeId(), "任务分派",
                        "您有新的任务: " + task.getTaskName(), "TASK_ASSIGN", "TASK", task.getId());
            }
            return Result.success("任务更新成功", task);
        }
        taskMapper.updateById(task);
        return Result.success("任务更新成功", task);
    }

    @PutMapping("/{id}/status")
    @AuditLog(module = "任务管理", operation = "变更任务状态")
    public Result<?> changeStatus(@PathVariable Long id, @RequestBody StatusChangeRequest request) {
        BizTask task = taskMapper.selectById(id);
        if (task == null) return Result.error("任务不存在");

        String currentStatus = task.getStatus();
        String newStatus = request.getStatus();

        // Validate state transition
        if (!isValidTaskTransition(currentStatus, newStatus)) {
            throw BusinessException.badRequest("不允许的状态转换: " + currentStatus + " -> " + newStatus);
        }

        Long currentUserId = SecurityContextHolder.getCurrentUserId();
        // 开发侧流转（TODO->IN_PROGRESS->SELF_TESTING->TESTING）只能由任务负责人本人操作
        // 例外：从TESTING打回到IN_PROGRESS属于测试侧操作，由QA执行，不受此限制
        boolean isQaReject = BizConstants.TASK_TESTING.equals(currentStatus)
                && BizConstants.TASK_IN_PROGRESS.equals(newStatus);
        if (!isQaReject && (BizConstants.TASK_IN_PROGRESS.equals(newStatus)
                || BizConstants.TASK_SELF_TESTING.equals(newStatus)
                || (BizConstants.TASK_TESTING.equals(newStatus)))) {
            if (task.getAssigneeId() != null && !task.getAssigneeId().equals(currentUserId)
                    && !roleChecker.hasPermission(currentUserId, "task:create")) {
                throw BusinessException.forbidden("只有任务负责人本人才能推进开发流转");
            }
        }
        // 测试侧流转（TESTING->DONE 测试通过 / TESTING->IN_PROGRESS 打回）只能由测试(QA)操作，且不能验证自己负责的任务（防自审）
        if (BizConstants.TASK_TESTING.equals(currentStatus)) {
            if (!roleChecker.hasPermission(currentUserId, "task:test_verify")) {
                throw BusinessException.forbidden("只有测试人员才能验证任务测试结果");
            }
            if (task.getAssigneeId() != null && task.getAssigneeId().equals(currentUserId)) {
                throw BusinessException.forbidden("不能验证自己负责的任务（防自审）");
            }
        }

        task.setStatus(newStatus);
        if (BizConstants.TASK_DONE.equals(newStatus)) {
            task.setCompletedAt(LocalDateTime.now());
        }
        taskMapper.updateById(task);

        // 状态流转强提醒：通知下一环节负责人
        sendTaskTransitionNotification(task, currentStatus, newStatus, currentUserId);
        return Result.success("状态变更成功");
    }

    /**
     * 任务状态流转强提醒：当任务流转到下一环节时，向负责人发送紧急通知
     */
    private void sendTaskTransitionNotification(BizTask task, String fromStatus, String toStatus, Long operatorId) {
        try {
            // SELF_TESTING → TESTING：开发自测完成，通知测试人员接手测试
            if (BizConstants.TASK_SELF_TESTING.equals(fromStatus) && BizConstants.TASK_TESTING.equals(toStatus)) {
                // 通知需求负责人（PM）协调测试资源
                if (task.getRequirementId() != null) {
                    com.rd.platform.model.entity.BizRequirement req = requirementMapper.selectById(task.getRequirementId());
                    if (req != null && req.getOwnerId() != null) {
                        notificationService.sendUrgentNotification(req.getOwnerId(), "任务待测试",
                                "任务「" + task.getTaskName() + "」已完成开发自测，等待测试验证",
                                "STATUS_CHANGE", "TASK", task.getId());
                    }
                }
            }
            // TESTING → IN_PROGRESS：测试打回，通知开发负责人
            else if (BizConstants.TASK_TESTING.equals(fromStatus) && BizConstants.TASK_IN_PROGRESS.equals(toStatus)) {
                if (task.getAssigneeId() != null) {
                    notificationService.sendUrgentNotification(task.getAssigneeId(), "任务被打回",
                            "您的任务「" + task.getTaskName() + "」测试未通过，已打回，请尽快修复",
                            "STATUS_CHANGE", "TASK", task.getId());
                }
            }
            // TESTING → DONE：测试通过，通知开发负责人
            else if (BizConstants.TASK_TESTING.equals(fromStatus) && BizConstants.TASK_DONE.equals(toStatus)) {
                if (task.getAssigneeId() != null) {
                    notificationService.sendNotification(task.getAssigneeId(), "任务测试通过",
                            "您的任务「" + task.getTaskName() + "」已通过测试验证",
                            "STATUS_CHANGE", "TASK", task.getId());
                }
            }
        } catch (Exception e) {
            // 通知发送失败不影响主流程
        }
    }

    @PutMapping("/{id}/hours")
    @AuditLog(module = "任务管理", operation = "更新工时")
    public Result<?> updateHours(@PathVariable Long id, @RequestBody HoursRequest request) {
        BizTask task = taskMapper.selectById(id);
        if (task == null) return Result.error("任务不存在");
        task.setActualHours(request.getActualHours());
        taskMapper.updateById(task);
        return Result.success("工时更新成功");
    }

    private boolean isValidTaskTransition(String from, String to) {
        // TODO -> IN_PROGRESS -> SELF_TESTING -> TESTING -> DONE
        switch (from) {
            case "TODO": return "IN_PROGRESS".equals(to);
            case "IN_PROGRESS": return "SELF_TESTING".equals(to);
            case "SELF_TESTING": return "TESTING".equals(to) || "IN_PROGRESS".equals(to);
            case "TESTING": return "DONE".equals(to) || "IN_PROGRESS".equals(to);
            case "DONE": return false;
            default: return false;
        }
    }

    @Data
    public static class TaskCreateRequest {
        @NotNull(message = "需求ID不能为空")
        private Long requirementId;
        @NotNull(message = "项目ID不能为空")
        private Long projectId;
        private Long sprintId;
        @NotBlank(message = "任务名称不能为空")
        private String taskName;
        @NotBlank(message = "任务描述不能为空")
        private String description;
        private String priority;
        private String type;
        @NotNull(message = "负责人不能为空")
        private Long assigneeId;
        private BigDecimal estimatedHours;
        private LocalDate startDate;
        @NotNull(message = "截止日期不能为空")
        private LocalDate dueDate;
        @NotBlank(message = "验收标准不能为空")
        private String acceptanceCriteria;
    }

    @Data
    public static class StatusChangeRequest {
        @NotBlank(message = "状态不能为空")
        private String status;
    }

    @Data
    public static class HoursRequest {
        @NotNull(message = "实际工时不能为空")
        private BigDecimal actualHours;
    }
}
