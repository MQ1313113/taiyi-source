package com.rd.platform.service.controller;

import com.rd.platform.common.utils.Result;
import com.rd.platform.service.impl.MetricsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

/**
 * 效能度量接口。业务逻辑已下沉到 {@link MetricsService}，此处仅做 HTTP 映射与结果包装。
 */
@RestController
@RequestMapping("/api/v1/metrics")
public class MetricsController {

    @Autowired
    private MetricsService metricsService;

    /**
     * 项目效能概览
     */
    @GetMapping("/project/{projectId}")
    public Result<?> projectMetrics(@PathVariable Long projectId) {
        return Result.success(metricsService.projectMetrics(projectId));
    }

    /**
     * 迭代燃尽图数据
     */
    @GetMapping("/sprint/{sprintId}/burndown")
    public Result<?> sprintBurndown(@PathVariable Long sprintId) {
        return Result.success(metricsService.sprintBurndown(sprintId));
    }

    /**
     * 缺陷趋势：近 days 天每日新增/关闭数，以及当日累计未关闭数（含窗口前基线）。
     * 数据直接由 biz_bug 的 created_at / closed_at 时间戳计算，无需额外快照表。
     */
    @GetMapping("/bug-trend")
    public Result<?> bugTrend(@RequestParam(required = false) Long projectId,
                              @RequestParam(defaultValue = "30") Integer days) {
        return Result.success(metricsService.bugTrend(projectId, days));
    }

    /**
     * 团队成员工作量统计
     */
    @GetMapping("/workload")
    public Result<?> workload(@RequestParam(required = false) Long projectId,
                              @RequestParam(required = false) Long sprintId) {
        return Result.success(metricsService.workload(projectId, sprintId));
    }
}
