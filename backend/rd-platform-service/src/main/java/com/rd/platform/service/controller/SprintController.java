package com.rd.platform.service.controller;

import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.utils.Result;
import com.rd.platform.service.impl.SprintService;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.time.LocalDate;

/**
 * 迭代管理接口。业务逻辑已下沉到 {@link SprintService}，此处仅做 HTTP 映射与结果包装。
 */
@RestController
@RequestMapping("/api/v1/sprints")
public class SprintController {

    @Autowired
    private SprintService sprintService;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) Long projectId,
                          @RequestParam(required = false) String status) {
        return Result.success(sprintService.list(pageNum, pageSize, projectId, status));
    }

    @GetMapping("/{id}")
    public Result<?> getById(@PathVariable Long id) {
        return Result.success(sprintService.getById(id));
    }

    /** 迭代成员负载：每人容量/已排工时/剩余/是否超载，供规划与负载视图。 */
    @GetMapping("/{id}/capacity")
    public Result<?> capacity(@PathVariable Long id) {
        return Result.success(sprintService.capacity(id));
    }

    @PostMapping
    @AuditLog(module = "迭代管理", operation = "创建迭代")
    public Result<?> create(@Valid @RequestBody SprintCreateRequest request) {
        return Result.success("迭代创建成功",
                sprintService.create(request.getProjectId(), request.getSprintName(),
                        request.getGoal(), request.getStartDate(), request.getEndDate()));
    }

    @PutMapping("/{id}")
    @AuditLog(module = "迭代管理", operation = "更新迭代")
    public Result<?> update(@PathVariable Long id, @Valid @RequestBody SprintCreateRequest request) {
        sprintService.update(id, request.getSprintName(), request.getGoal(),
                request.getStartDate(), request.getEndDate());
        return Result.success("迭代更新成功");
    }

    @PutMapping("/{id}/start")
    @AuditLog(module = "迭代管理", operation = "启动迭代")
    public Result<?> start(@PathVariable Long id) {
        sprintService.changeStatus(id, "启动迭代", "IN_PROGRESS");
        return Result.success("迭代已启动");
    }

    @PutMapping("/{id}/complete")
    @AuditLog(module = "迭代管理", operation = "完成迭代")
    public Result<?> complete(@PathVariable Long id,
                              @RequestParam(required = false) String unfinishedAction,
                              @RequestParam(required = false) Long targetSprintId) {
        return Result.success(sprintService.complete(id, unfinishedAction, targetSprintId));
    }

    @Data
    public static class SprintCreateRequest {
        @NotNull(message = "项目ID不能为空")
        private Long projectId;
        @NotBlank(message = "迭代名称不能为空")
        private String sprintName;
        private String goal;
        @NotNull(message = "开始日期不能为空")
        private LocalDate startDate;
        @NotNull(message = "结束日期不能为空")
        private LocalDate endDate;
    }
}
