package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.constant.BizConstants;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.BizTask;
import com.rd.platform.model.mapper.BizTaskMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 任务业务逻辑（从原胖 Controller 抽出，Controller 仅保留 HTTP 映射与委托）。
 * 集中承载：项目级数据隔离、拆解/编辑角色门禁、需求状态校验、开发侧本人门禁、
 * QA 防自审、迭代容量超载校验、状态机校验、乐观锁冲突检查、自动补录与流转通知。
 */
@Service
public class TaskService {

    @Autowired
    private BizTaskMapper taskMapper;

    @Autowired
    private com.rd.platform.model.mapper.BizProjectMapper projectMapper;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private RoleChecker roleChecker;

    @Autowired
    private com.rd.platform.model.mapper.BizRequirementMapper requirementMapper;

    @Autowired
    private ProjectAccessGuard projectAccessGuard;

    @Autowired
    private SprintCapacityGuard sprintCapacityGuard;

    @Autowired
    private ReworkLogRecorder reworkLogRecorder;

    @Autowired
    private AssignmentLogRecorder assignmentLogRecorder;

    @Autowired
    private ConflictAdvisorService conflictAdvisorService;

    @Autowired
    private TicketService ticketService;

    public Page<BizTask> list(Integer pageNum, Integer pageSize, Long projectId, Long requirementId,
                              Long sprintId, Long assigneeId, String status, String keyword) {
        Page<BizTask> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizTask> wrapper = new LambdaQueryWrapper<>();
        // 项目级数据隔离：非管理员只能看到自己所属项目的任务
        java.util.List<Long> accessible = projectAccessGuard.accessibleProjectIds(SecurityContextHolder.getCurrentUserId());
        if (accessible != null) {
            if (accessible.isEmpty()) return page;
            wrapper.in(BizTask::getProjectId, accessible);
        }
        if (projectId != null) wrapper.eq(BizTask::getProjectId, projectId);
        if (requirementId != null) wrapper.eq(BizTask::getRequirementId, requirementId);
        if (sprintId != null) wrapper.eq(BizTask::getSprintId, sprintId);
        if (assigneeId != null) wrapper.eq(BizTask::getAssigneeId, assigneeId);
        if (StringUtils.hasText(status)) wrapper.eq(BizTask::getStatus, status);
        if (StringUtils.hasText(keyword)) wrapper.like(BizTask::getTaskName, keyword);
        wrapper.orderByDesc(BizTask::getCreatedAt);
        return taskMapper.selectPage(page, wrapper);
    }

    public BizTask getById(Long id) {
        BizTask task = taskMapper.selectById(id);
        if (task == null) throw BusinessException.badRequest("任务不存在");
        projectAccessGuard.assertAccess(SecurityContextHolder.getCurrentUserId(), task.getProjectId(), "任务");
        return task;
    }

    public BizTask create(TaskCreateRequest request) {
        // Cross-check R2: Tech leader creates tasks, cannot assign to self only
        Long currentUserId = SecurityContextHolder.getCurrentUserId();

        // 个人项目直通:本人给自己记任务(待办留痕),免拆解权限/需求关联/负责人角色/容量校验
        boolean privateOwner = projectAccessGuard.isPrivateOwner(currentUserId, request.getProjectId());
        if (privateOwner) {
            request.setAssigneeId(currentUserId);
            request.setSprintId(null);
            request.setRequirementId(null);
        }
        // 权限门禁(FP-TASK-02 / PRD 24.3)：只有产品经理可拆解任务，拦截开发/测试越权
        if (!privateOwner && !roleChecker.hasPermission(currentUserId, "task:create")) {
            throw BusinessException.forbidden("只有产品经理可以拆解任务");
        }
        // 团队项目:需求关联与验收标准仍为必填(从 DTO 注解下沉,因个人项目需豁免)
        if (!privateOwner) {
            if (request.getRequirementId() == null) throw BusinessException.badRequest("需求ID不能为空");
            if (!StringUtils.hasText(request.getAcceptanceCriteria())) throw BusinessException.badRequest("验收标准不能为空");
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

        // 任务负责人角色校验(PRD 流程规范)：拆解后只能指派给开发人员(个人项目=本人,免校验)
        if (!privateOwner && (request.getAssigneeId() == null
                || !roleChecker.hasPermission(request.getAssigneeId(), "task:dev_progress"))) {
            throw BusinessException.badRequest("任务负责人必须指派给开发人员");
        }
        // 排期护栏：任务纳入迭代时，校验被指派人在该迭代不超载
        if (request.getSprintId() != null) {
            sprintCapacityGuard.assertWithinCapacity(request.getSprintId(), request.getAssigneeId(), request.getEstimatedHours());
        }
        // 冲突管控(conflict.enforce)：排期撞车时 warn 留痕放行 / block 拒绝保存并引导走变更(个人项目不参与)
        if (!privateOwner) {
            conflictAdvisorService.onTaskSave(request.getTaskName(), request.getAssigneeId(),
                    request.getEstimatedHours(), request.getDueDate(), null);
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

        // 自动补录：被指派的开发纳入该项目成员，便于其在数据隔离下看到任务
        projectAccessGuard.enroll(request.getAssigneeId(), task.getProjectId());

        // Send notification to assignee
        notificationService.sendNotification(request.getAssigneeId(), "新任务分配",
                "您有新的开发任务: " + request.getTaskName(),
                BizConstants.NOTIFY_TASK_ASSIGN, "TASK", task.getId());

        return task;
    }

    /**
     * 单人项目任务"转报团队":发现的价值点(如组件该产品化)一键提报为需求类工单,
     * 预填内容与来源留痕,走既有的 分诊→转需求→正式流程 链路;原任务保留作为留痕。
     */
    public com.rd.platform.model.entity.BizTicket promote(Long id) {
        BizTask task = taskMapper.selectById(id);
        if (task == null) throw BusinessException.badRequest("任务不存在");
        Long uid = SecurityContextHolder.getCurrentUserId();
        if (!projectAccessGuard.isPrivateOwner(uid, task.getProjectId())) {
            throw BusinessException.badRequest("仅单人项目的任务可由负责人转报团队");
        }
        TicketService.TicketCreateRequest tr = new TicketService.TicketCreateRequest();
        tr.setSource("INTERNAL");
        tr.setCategory(BizConstants.TICKET_CAT_REQUIREMENT);
        tr.setTitle("[单人项目转报] " + task.getTaskName());
        tr.setDescription("来源:单人项目任务 #" + task.getId() + "\n\n" +
                (task.getDescription() == null ? "" : task.getDescription()) +
                "\n\n(由个人负责项目中验证有价值,提报转入团队正式流程)");
        tr.setPriority(task.getPriority() != null ? task.getPriority() : BizConstants.PRIORITY_P2);
        return ticketService.create(tr);
    }

    public BizTask update(Long id, TaskCreateRequest request) {
        BizTask task = taskMapper.selectById(id);
        if (task == null) throw BusinessException.badRequest("任务不存在");
        // 权限门禁：仅产品经理/系统管理员可编辑、分派任务
        Long currentUserId = SecurityContextHolder.getCurrentUserId();
        if (!roleChecker.hasPermission(currentUserId, "task:edit")) {
            throw BusinessException.forbidden("只有产品经理可以编辑或分派任务");
        }
        // 冲突管控：编辑改期/转派同样过检（排除任务自身的存量工时）
        Long effectiveAssignee = request.getAssigneeId() != null ? request.getAssigneeId() : task.getAssigneeId();
        conflictAdvisorService.onTaskSave(request.getTaskName(), effectiveAssignee,
                request.getEstimatedHours(), request.getDueDate(), id);
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
            Long oldAssignee = task.getAssigneeId();
            task.setAssigneeId(request.getAssigneeId());
            taskMapper.updateById(task);
            // 自动补录：转派后的新负责人纳入该项目成员
            projectAccessGuard.enroll(request.getAssigneeId(), task.getProjectId());
            if (changed) {
                // 转派留痕：记录 from→to,用于流转路径与甩活统计
                assignmentLogRecorder.record(BizConstants.ASSIGN_ENTITY_TASK, task.getId(), task.getProjectId(),
                        oldAssignee, request.getAssigneeId(), SecurityContextHolder.getCurrentUserId(), null);
                notificationService.sendNotification(request.getAssigneeId(), "任务分派",
                        "您有新的任务: " + task.getTaskName(), "TASK_ASSIGN", "TASK", task.getId());
            }
            return task;
        }
        taskMapper.updateById(task);
        return task;
    }

    public void changeStatus(Long id, StatusChangeRequest request) {
        BizTask task = taskMapper.selectById(id);
        if (task == null) throw BusinessException.badRequest("任务不存在");
        projectAccessGuard.assertAccess(SecurityContextHolder.getCurrentUserId(), task.getProjectId(), "任务");

        String currentStatus = task.getStatus();
        String newStatus = request.getStatus();

        // 个人项目直通:本人推进自己任务,简化流转(TODO→IN_PROGRESS→DONE 可直达,免自测/测试/QA验收/工时强制)
        if (projectAccessGuard.isPrivateOwner(SecurityContextHolder.getCurrentUserId(), task.getProjectId())) {
            boolean okPrivate = isValidTaskTransition(currentStatus, newStatus)
                    || (BizConstants.TASK_IN_PROGRESS.equals(currentStatus) && BizConstants.TASK_DONE.equals(newStatus))
                    || (BizConstants.TASK_SELF_TESTING.equals(currentStatus) && BizConstants.TASK_DONE.equals(newStatus));
            if (!okPrivate) {
                throw BusinessException.badRequest("不允许的状态转换: " + currentStatus + " -> " + newStatus);
            }
            task.setStatus(newStatus);
            if (BizConstants.TASK_DONE.equals(newStatus)) task.setCompletedAt(LocalDateTime.now());
            if (taskMapper.updateById(task) == 0) {
                throw BusinessException.badRequest("任务已被他人修改，请刷新后重试");
            }
            return;
        }

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
        // 工时闭环:标准/完整档任务提测(→TESTING)前必须录入实际工时,否则预估偏差分析永远缺数据
        if (!isQaReject && BizConstants.TASK_TESTING.equals(newStatus)) {
            com.rd.platform.model.entity.BizProject proj = projectMapper.selectById(task.getProjectId());
            String gear = BizConstants.normalizeGear(proj != null ? proj.getGearLevel() : null);
            if (!BizConstants.GEAR_LIGHTWEIGHT.equals(gear)
                    && (task.getActualHours() == null || task.getActualHours().doubleValue() <= 0)) {
                throw BusinessException.badRequest("提测前请先填写实际工时(任务详情-填写工时),用于预估偏差分析与排期校准");
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
        // 乐观锁：并发下版本不匹配则影响 0 行，显式报冲突而非静默丢更新
        if (taskMapper.updateById(task) == 0) {
            throw BusinessException.badRequest("任务已被他人修改，请刷新后重试");
        }

        // 打回归因：QA 打回(TESTING→IN_PROGRESS),责任方=任务负责人(开发)
        if (isQaReject) {
            reworkLogRecorder.record(BizConstants.REWORK_ENTITY_TASK, task.getId(), task.getProjectId(),
                    currentStatus, newStatus, BizConstants.REWORK_DEV_POOR, null, task.getAssigneeId(), currentUserId);
        }

        // 状态流转强提醒：通知下一环节负责人
        sendTaskTransitionNotification(task, currentStatus, newStatus, currentUserId);
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

    public void updateHours(Long id, HoursRequest request) {
        BizTask task = taskMapper.selectById(id);
        if (task == null) throw BusinessException.badRequest("任务不存在");
        Long uid = SecurityContextHolder.getCurrentUserId();
        projectAccessGuard.assertAccess(uid, task.getProjectId(), "任务");
        // 门禁：仅任务负责人本人或产品经理可填报工时
        if (task.getAssigneeId() != null && !task.getAssigneeId().equals(uid)
                && !roleChecker.hasPermission(uid, "task:edit")) {
            throw BusinessException.forbidden("只有任务负责人本人或产品经理可以填报工时");
        }
        task.setActualHours(request.getActualHours());
        taskMapper.updateById(task);
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
        /** 团队项目必填(service 校验);个人项目留痕任务无需求可挂 */
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
        /** 团队项目必填(service 校验);个人项目豁免 */
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
