package com.rd.platform.service.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rd.platform.common.utils.Result;
import com.rd.platform.model.entity.*;
import com.rd.platform.model.mapper.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@RestController
@RequestMapping("/api/v1/metrics")
public class MetricsController {

    @Autowired
    private BizRequirementMapper requirementMapper;
    @Autowired
    private BizTaskMapper taskMapper;
    @Autowired
    private BizBugMapper bugMapper;
    @Autowired
    private BizSprintMapper sprintMapper;

    /**
     * 项目效能概览
     */
    @GetMapping("/project/{projectId}")
    public Result<?> projectMetrics(@PathVariable Long projectId) {
        Map<String, Object> metrics = new HashMap<>();

        // Requirement metrics
        Long totalReqs = requirementMapper.selectCount(
                new LambdaQueryWrapper<BizRequirement>().eq(BizRequirement::getProjectId, projectId));
        Long closedReqs = requirementMapper.selectCount(
                new LambdaQueryWrapper<BizRequirement>()
                        .eq(BizRequirement::getProjectId, projectId)
                        .eq(BizRequirement::getStatus, "CLOSED"));
        metrics.put("requirementTotal", totalReqs);
        metrics.put("requirementClosed", closedReqs);
        metrics.put("requirementCompletionRate", totalReqs > 0 ?
                BigDecimal.valueOf(closedReqs).divide(BigDecimal.valueOf(totalReqs), 4, RoundingMode.HALF_UP) : 0);

        // Task metrics
        Long totalTasks = taskMapper.selectCount(
                new LambdaQueryWrapper<BizTask>().eq(BizTask::getProjectId, projectId));
        Long doneTasks = taskMapper.selectCount(
                new LambdaQueryWrapper<BizTask>()
                        .eq(BizTask::getProjectId, projectId)
                        .eq(BizTask::getStatus, "DONE"));
        metrics.put("taskTotal", totalTasks);
        metrics.put("taskDone", doneTasks);
        metrics.put("taskCompletionRate", totalTasks > 0 ?
                BigDecimal.valueOf(doneTasks).divide(BigDecimal.valueOf(totalTasks), 4, RoundingMode.HALF_UP) : 0);

        // Bug metrics
        Long totalBugs = bugMapper.selectCount(
                new LambdaQueryWrapper<BizBug>().eq(BizBug::getProjectId, projectId));
        Long closedBugs = bugMapper.selectCount(
                new LambdaQueryWrapper<BizBug>()
                        .eq(BizBug::getProjectId, projectId)
                        .in(BizBug::getStatus, "CLOSED", "VERIFIED"));
        Long criticalBugs = bugMapper.selectCount(
                new LambdaQueryWrapper<BizBug>()
                        .eq(BizBug::getProjectId, projectId)
                        .eq(BizBug::getSeverity, "CRITICAL"));
        metrics.put("bugTotal", totalBugs);
        metrics.put("bugClosed", closedBugs);
        metrics.put("bugCritical", criticalBugs);
        metrics.put("bugFixRate", totalBugs > 0 ?
                BigDecimal.valueOf(closedBugs).divide(BigDecimal.valueOf(totalBugs), 4, RoundingMode.HALF_UP) : 0);

        return Result.success(metrics);
    }

    /**
     * 迭代燃尽图数据
     */
    @GetMapping("/sprint/{sprintId}/burndown")
    public Result<?> sprintBurndown(@PathVariable Long sprintId) {
        Long totalTasks = taskMapper.selectCount(
                new LambdaQueryWrapper<BizTask>().eq(BizTask::getSprintId, sprintId));
        Long doneTasks = taskMapper.selectCount(
                new LambdaQueryWrapper<BizTask>()
                        .eq(BizTask::getSprintId, sprintId)
                        .eq(BizTask::getStatus, "DONE"));
        Map<String, Object> data = new HashMap<>();
        data.put("totalTasks", totalTasks);
        data.put("completedTasks", doneTasks);
        data.put("remainingTasks", totalTasks - doneTasks);
        return Result.success(data);
    }

    /**
     * 团队成员工作量统计
     */
    @GetMapping("/workload")
    public Result<?> workload(@RequestParam(required = false) Long projectId,
                              @RequestParam(required = false) Long sprintId) {
        LambdaQueryWrapper<BizTask> wrapper = new LambdaQueryWrapper<>();
        if (projectId != null) wrapper.eq(BizTask::getProjectId, projectId);
        if (sprintId != null) wrapper.eq(BizTask::getSprintId, sprintId);
        List<BizTask> tasks = taskMapper.selectList(wrapper);

        Map<Long, Map<String, Object>> workloadMap = new HashMap<>();
        for (BizTask task : tasks) {
            Long assigneeId = task.getAssigneeId();
            if (assigneeId == null) continue;
            workloadMap.computeIfAbsent(assigneeId, k -> {
                Map<String, Object> m = new HashMap<>();
                m.put("userId", k);
                m.put("totalTasks", 0);
                m.put("doneTasks", 0);
                m.put("estimatedHours", BigDecimal.ZERO);
                m.put("actualHours", BigDecimal.ZERO);
                return m;
            });
            Map<String, Object> m = workloadMap.get(assigneeId);
            m.put("totalTasks", (int) m.get("totalTasks") + 1);
            if ("DONE".equals(task.getStatus())) {
                m.put("doneTasks", (int) m.get("doneTasks") + 1);
            }
            if (task.getEstimatedHours() != null) {
                m.put("estimatedHours", ((BigDecimal) m.get("estimatedHours")).add(task.getEstimatedHours()));
            }
            if (task.getActualHours() != null) {
                m.put("actualHours", ((BigDecimal) m.get("actualHours")).add(task.getActualHours()));
            }
        }
        return Result.success(new ArrayList<>(workloadMap.values()));
    }
}
