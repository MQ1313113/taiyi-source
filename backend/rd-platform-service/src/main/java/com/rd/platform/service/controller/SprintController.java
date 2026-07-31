package com.rd.platform.service.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.utils.Result;
import com.rd.platform.model.entity.BizSprint;
import com.rd.platform.model.mapper.BizSprintMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/sprints")
public class SprintController {

    @Autowired
    private BizSprintMapper sprintMapper;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) Long projectId,
                          @RequestParam(required = false) String status) {
        Page<BizSprint> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizSprint> wrapper = new LambdaQueryWrapper<>();
        if (projectId != null) wrapper.eq(BizSprint::getProjectId, projectId);
        if (status != null) wrapper.eq(BizSprint::getStatus, status);
        wrapper.orderByDesc(BizSprint::getCreatedAt);
        return Result.success(sprintMapper.selectPage(page, wrapper));
    }

    @GetMapping("/{id}")
    public Result<?> getById(@PathVariable Long id) {
        BizSprint sprint = sprintMapper.selectById(id);
        if (sprint == null) return Result.error("迭代不存在");
        return Result.success(sprint);
    }

    @PostMapping
    @AuditLog(module = "迭代管理", operation = "创建迭代")
    public Result<?> create(@Valid @RequestBody SprintCreateRequest request) {
        Long currentUserId = SecurityContextHolder.getCurrentUserId();
        BizSprint sprint = new BizSprint();
        sprint.setProjectId(request.getProjectId());
        sprint.setSprintName(request.getSprintName());
        sprint.setGoal(request.getGoal());
        sprint.setStartDate(request.getStartDate());
        sprint.setEndDate(request.getEndDate());
        sprint.setStatus("PLANNING");
        sprint.setType("NORMAL");
        sprint.setCreatedBy(currentUserId);
        sprintMapper.insert(sprint);
        return Result.success("迭代创建成功", sprint);
    }

    @PutMapping("/{id}")
    @AuditLog(module = "迭代管理", operation = "更新迭代")
    public Result<?> update(@PathVariable Long id, @Valid @RequestBody SprintCreateRequest request) {
        BizSprint sprint = sprintMapper.selectById(id);
        if (sprint == null) return Result.error("迭代不存在");
        sprint.setSprintName(request.getSprintName());
        sprint.setGoal(request.getGoal());
        sprint.setStartDate(request.getStartDate());
        sprint.setEndDate(request.getEndDate());
        sprintMapper.updateById(sprint);
        return Result.success("迭代更新成功");
    }

    @PutMapping("/{id}/start")
    @AuditLog(module = "迭代管理", operation = "启动迭代")
    public Result<?> start(@PathVariable Long id) {
        BizSprint sprint = sprintMapper.selectById(id);
        if (sprint == null) return Result.error("迭代不存在");
        sprint.setStatus("IN_PROGRESS");
        sprintMapper.updateById(sprint);
        return Result.success("迭代已启动");
    }

    @PutMapping("/{id}/complete")
    @AuditLog(module = "迭代管理", operation = "完成迭代")
    public Result<?> complete(@PathVariable Long id) {
        BizSprint sprint = sprintMapper.selectById(id);
        if (sprint == null) return Result.error("迭代不存在");
        sprint.setStatus("COMPLETED");
        sprintMapper.updateById(sprint);
        return Result.success("迭代已完成");
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
