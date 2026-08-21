package com.rd.platform.service.controller;

import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.utils.Result;
import com.rd.platform.service.impl.TaskScheduleAdviceService;
import com.rd.platform.service.impl.TaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 任务管理接口。业务逻辑已下沉到 {@link TaskService}，此处仅做 HTTP 映射与结果包装。
 */
@RestController
@RequestMapping("/api/v1/tasks")
public class TaskController {

    @Autowired
    private TaskService taskService;

    @Autowired
    private TaskScheduleAdviceService scheduleAdviceService;

    /**
     * 排期辅助建议（只读）：按执行人现有负载估算新任务可否按期，返回 OK/TIGHT/CONFLICT 与受影响任务。
     * 建议仅供创建/编辑任务时参考，是否采纳由人决定。
     */
    @GetMapping("/schedule-advice")
    public Result<?> scheduleAdvice(@RequestParam Long assigneeId,
                                    @RequestParam BigDecimal estimatedHours,
                                    @RequestParam(required = false)
                                    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dueDate,
                                    @RequestParam(required = false) Long excludeTaskId) {
        return Result.success(scheduleAdviceService.advise(assigneeId, estimatedHours, dueDate, excludeTaskId));
    }

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) Long projectId,
                          @RequestParam(required = false) Long requirementId,
                          @RequestParam(required = false) Long sprintId,
                          @RequestParam(required = false) Long assigneeId,
                          @RequestParam(required = false) String status,
                          @RequestParam(required = false) String keyword) {
        return Result.success(taskService.list(pageNum, pageSize, projectId, requirementId, sprintId, assigneeId, status, keyword));
    }

    @GetMapping("/{id}")
    public Result<?> getById(@PathVariable Long id) {
        return Result.success(taskService.getById(id));
    }

    @PostMapping
    @AuditLog(module = "任务管理", operation = "创建任务")
    public Result<?> create(@Valid @RequestBody TaskService.TaskCreateRequest request) {
        return Result.success("任务创建成功", taskService.create(request));
    }

    @PutMapping("/{id}")
    @AuditLog(module = "任务管理", operation = "更新任务")
    public Result<?> update(@PathVariable Long id, @Valid @RequestBody TaskService.TaskCreateRequest request) {
        return Result.success("任务更新成功", taskService.update(id, request));
    }

    @PutMapping("/{id}/status")
    @AuditLog(module = "任务管理", operation = "变更任务状态")
    public Result<?> changeStatus(@PathVariable Long id, @RequestBody TaskService.StatusChangeRequest request) {
        taskService.changeStatus(id, request);
        return Result.success("状态变更成功");
    }

    @PostMapping("/{id}/promote")
    @AuditLog(module = "任务管理", operation = "单人项目任务转报团队")
    public Result<?> promote(@PathVariable Long id) {
        return Result.success("已提报为需求工单,待分诊后转入正式流程", taskService.promote(id));
    }

    @PutMapping("/{id}/hours")
    @AuditLog(module = "任务管理", operation = "更新工时")
    public Result<?> updateHours(@PathVariable Long id, @RequestBody TaskService.HoursRequest request) {
        taskService.updateHours(id, request);
        return Result.success("工时更新成功");
    }
}
