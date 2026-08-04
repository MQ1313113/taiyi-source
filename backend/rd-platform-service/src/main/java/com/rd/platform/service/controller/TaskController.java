package com.rd.platform.service.controller;

import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.utils.Result;
import com.rd.platform.service.impl.TaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

/**
 * 任务管理接口。业务逻辑已下沉到 {@link TaskService}，此处仅做 HTTP 映射与结果包装。
 */
@RestController
@RequestMapping("/api/v1/tasks")
public class TaskController {

    @Autowired
    private TaskService taskService;

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

    @PutMapping("/{id}/hours")
    @AuditLog(module = "任务管理", operation = "更新工时")
    public Result<?> updateHours(@PathVariable Long id, @RequestBody TaskService.HoursRequest request) {
        taskService.updateHours(id, request);
        return Result.success("工时更新成功");
    }
}
