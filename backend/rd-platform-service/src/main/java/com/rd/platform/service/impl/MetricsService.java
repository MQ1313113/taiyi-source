package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rd.platform.model.entity.*;
import com.rd.platform.model.mapper.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

/**
 * 效能度量业务逻辑（从原胖 Controller 抽出，Controller 仅保留 HTTP 映射与委托）。
 */
@Service
public class MetricsService {

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
    public Map<String, Object> projectMetrics(Long projectId) {
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

        // 工时闭环:预估偏差率 = avg(|实际-预估|/预估),只统计两者都有值的 DONE 任务。
        // 让"填工时"产生价值:谁的预估总不准、项目排期该留多少 buffer,一目了然
        java.util.List<BizTask> doneWithHours = taskMapper.selectList(new LambdaQueryWrapper<BizTask>()
                .eq(BizTask::getProjectId, projectId)
                .eq(BizTask::getStatus, "DONE")
                .isNotNull(BizTask::getEstimatedHours)
                .isNotNull(BizTask::getActualHours));
        double devSum = 0; int devCnt = 0;
        for (BizTask t : doneWithHours) {
            double est = t.getEstimatedHours().doubleValue();
            double act = t.getActualHours().doubleValue();
            if (est > 0 && act > 0) { devSum += Math.abs(act - est) / est; devCnt++; }
        }
        metrics.put("estimateDeviationRate", devCnt > 0 ?
                BigDecimal.valueOf(devSum / devCnt).setScale(4, RoundingMode.HALF_UP) : null);
        metrics.put("estimateSampleCount", devCnt);

        return metrics;
    }

    /**
     * 迭代燃尽图数据
     */
    public Map<String, Object> sprintBurndown(Long sprintId) {
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
        return data;
    }

    /**
     * 缺陷趋势：近 days 天每日新增/关闭数，以及当日累计未关闭数（含窗口前基线）。
     * 数据直接由 biz_bug 的 created_at / closed_at 时间戳计算，无需额外快照表。
     */
    public List<Map<String, Object>> bugTrend(Long projectId, Integer days) {
        int span = (days == null || days <= 0 || days > 180) ? 30 : days;
        LambdaQueryWrapper<BizBug> wrapper = new LambdaQueryWrapper<>();
        if (projectId != null) wrapper.eq(BizBug::getProjectId, projectId);
        List<BizBug> bugs = bugMapper.selectList(wrapper);

        LocalDate today = LocalDate.now();
        LocalDate start = today.minusDays(span - 1L);

        // 每日桶：index 0=新增, 1=关闭
        LinkedHashMap<LocalDate, int[]> buckets = new LinkedHashMap<>();
        for (LocalDate d = start; !d.isAfter(today); d = d.plusDays(1)) buckets.put(d, new int[2]);

        // 窗口前基线：start 之前已创建但未在 start 之前关闭 = 窗口开始时的未关闭数
        int baselineOpen = 0;
        for (BizBug b : bugs) {
            LocalDate cAt = b.getCreatedAt() != null ? b.getCreatedAt().toLocalDate() : null;
            LocalDate xAt = b.getClosedAt() != null ? b.getClosedAt().toLocalDate() : null;
            if (cAt != null && cAt.isBefore(start) && (xAt == null || !xAt.isBefore(start))) baselineOpen++;
            if (cAt != null && buckets.containsKey(cAt)) buckets.get(cAt)[0]++;
            if (xAt != null && buckets.containsKey(xAt)) buckets.get(xAt)[1]++;
        }

        List<Map<String, Object>> series = new ArrayList<>();
        int runningOpen = baselineOpen;
        for (Map.Entry<LocalDate, int[]> e : buckets.entrySet()) {
            runningOpen += e.getValue()[0] - e.getValue()[1];
            if (runningOpen < 0) runningOpen = 0;
            Map<String, Object> point = new HashMap<>();
            point.put("date", e.getKey().toString());
            point.put("created", e.getValue()[0]);
            point.put("closed", e.getValue()[1]);
            point.put("open", runningOpen);
            series.add(point);
        }
        return series;
    }

    /**
     * 团队成员工作量统计
     */
    public List<Map<String, Object>> workload(Long projectId, Long sprintId) {
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
        return new ArrayList<>(workloadMap.values());
    }
}
