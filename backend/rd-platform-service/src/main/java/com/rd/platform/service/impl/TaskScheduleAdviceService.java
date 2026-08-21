package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rd.platform.common.constant.BizConstants;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.BizTask;
import com.rd.platform.model.entity.SysConfig;
import com.rd.platform.model.mapper.BizTaskMapper;
import com.rd.platform.model.mapper.SysConfigMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 新任务排期辅助（建议版）：只读不写库，结论由人决定是否采纳。
 * <p>
 * 模型（刻意保持简单可解释）：按"串行排队"估算——新任务排在该执行人现有未完成任务之后，
 * 以每日可用工时（sys_config: schedule.daily_hours，默认 6）折算完成日，与期望截止日对比，
 * 给出 OK（可按期）/ TIGHT（紧张）/ CONFLICT（撞车）三档结论及受影响任务清单。
 * 预估工时缺失的存量任务不计入队列工时，但会在结果中如实标注，避免"看起来不忙"的假象。
 */
@Service
public class TaskScheduleAdviceService {

    /** 每日可用工时配置键（可在系统配置中调整） */
    public static final String CFG_DAILY_HOURS = "schedule.daily_hours";
    private static final BigDecimal DEFAULT_DAILY_HOURS = new BigDecimal("6");

    @Autowired
    private BizTaskMapper taskMapper;

    @Autowired
    private com.rd.platform.model.mapper.BizProjectMapper projectMapper;
    @Autowired
    private SysConfigMapper configMapper;

    /**
     * @param assigneeId     拟指派的执行人（必填）
     * @param estimatedHours 新任务预估工时（必填，>0）
     * @param dueDate        期望截止日（可空：为空则只给预计完成日，不判撞车）
     * @param excludeTaskId  编辑既有任务时排除自身（可空）
     */
    public Map<String, Object> advise(Long assigneeId, BigDecimal estimatedHours,
                                      LocalDate dueDate, Long excludeTaskId) {
        if (assigneeId == null) throw BusinessException.badRequest("assigneeId 不能为空");
        if (estimatedHours == null || estimatedHours.signum() <= 0) {
            throw BusinessException.badRequest("estimatedHours 必须大于 0");
        }

        BigDecimal dailyHours = loadDailyHours();
        LocalDate today = LocalDate.now();

        // 该执行人现有未完成任务（TODO/IN_PROGRESS/SELF_TESTING 为开发侧真实负载）
        LambdaQueryWrapper<BizTask> qw = new LambdaQueryWrapper<BizTask>()
                .eq(BizTask::getAssigneeId, assigneeId)
                .in(BizTask::getStatus, BizConstants.TASK_TODO,
                        BizConstants.TASK_IN_PROGRESS, BizConstants.TASK_SELF_TESTING);
        if (excludeTaskId != null) qw.ne(BizTask::getId, excludeTaskId);
        List<BizTask> openTasks = taskMapper.selectList(qw);

        BigDecimal backlogHours = BigDecimal.ZERO;
        BigDecimal otherProjectHours = BigDecimal.ZERO; // 其中:单人项目(该执行人独立负责的其他正式项目)占用
        int noEstimateCount = 0;
        // 预取项目可见性,标注每条在途任务的来源
        java.util.Set<Long> pidSet = new java.util.HashSet<>();
        for (BizTask t : openTasks) if (t.getProjectId() != null) pidSet.add(t.getProjectId());
        Map<Long, String> visMap = new HashMap<>();
        if (!pidSet.isEmpty()) {
            for (com.rd.platform.model.entity.BizProject p : projectMapper.selectBatchIds(pidSet)) {
                visMap.put(p.getId(), p.getVisibility());
            }
        }
        List<Map<String, Object>> queue = new ArrayList<>();
        for (BizTask t : openTasks) {
            BigDecimal remaining = remainingHours(t);
            boolean fromPrivate = "PRIVATE".equals(visMap.get(t.getProjectId()));
            if (remaining == null) {
                noEstimateCount++;
            } else {
                backlogHours = backlogHours.add(remaining);
                if (fromPrivate) otherProjectHours = otherProjectHours.add(remaining);
            }
            Map<String, Object> q = new HashMap<>();
            q.put("taskId", t.getId());
            q.put("taskName", t.getTaskName());
            q.put("status", t.getStatus());
            q.put("priority", t.getPriority());
            q.put("dueDate", t.getDueDate());
            q.put("remainingHours", remaining);
            q.put("fromPrivateProject", fromPrivate);
            queue.add(q);
        }

        // 串行模型：新任务在存量队列消化完后开始
        int backlogDays = ceilDays(backlogHours, dailyHours);
        int newTaskDays = ceilDays(estimatedHours, dailyHours);
        LocalDate earliestStart = today.plusDays(backlogDays);
        LocalDate expectedFinish = today.plusDays((long) backlogDays + newTaskDays);

        String verdict;
        if (dueDate == null) {
            verdict = "NO_DUE_DATE";
        } else if (expectedFinish.isBefore(dueDate)) {
            verdict = "OK";
        } else if (!expectedFinish.isAfter(dueDate)) {
            verdict = "TIGHT";
        } else {
            verdict = "CONFLICT";
        }

        // 撞车时列出受影响任务：与新任务竞争同一时间窗（截止日不晚于新任务预计完成日）的存量任务
        List<Map<String, Object>> affected = new ArrayList<>();
        if ("CONFLICT".equals(verdict) || "TIGHT".equals(verdict)) {
            for (Map<String, Object> q : queue) {
                LocalDate qDue = (LocalDate) q.get("dueDate");
                if (qDue != null && !qDue.isAfter(expectedFinish)) affected.add(q);
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("verdict", verdict);
        result.put("dailyHours", dailyHours);
        result.put("backlogHours", backlogHours);
        result.put("otherProjectHours", otherProjectHours);
        result.put("backlogTaskCount", openTasks.size());
        result.put("noEstimateCount", noEstimateCount);
        result.put("earliestStartDate", earliestStart);
        result.put("expectedFinishDate", expectedFinish);
        result.put("dueDate", dueDate);
        result.put("queue", queue);
        result.put("affectedTasks", affected);
        String explain = buildExplain(verdict, openTasks.size(), noEstimateCount,
                backlogHours, dailyHours, earliestStart, expectedFinish, dueDate);
        if (otherProjectHours.doubleValue() > 0) {
            explain += String.format("(在途负载中含其单人负责项目 %.1f 小时——公司正式工作,排期时请一并考量)",
                    otherProjectHours.doubleValue());
        }
        result.put("explain", explain);
        return result;
    }

    /** 剩余工时 = max(预估 - 实际, 0)；无预估返回 null（不猜测，如实标注） */
    private BigDecimal remainingHours(BizTask t) {
        if (t.getEstimatedHours() == null) return null;
        BigDecimal actual = t.getActualHours() == null ? BigDecimal.ZERO : t.getActualHours();
        BigDecimal remaining = t.getEstimatedHours().subtract(actual);
        return remaining.signum() < 0 ? BigDecimal.ZERO : remaining;
    }

    private int ceilDays(BigDecimal hours, BigDecimal dailyHours) {
        if (hours.signum() <= 0) return 0;
        return hours.divide(dailyHours, 0, RoundingMode.CEILING).intValue();
    }

    private BigDecimal loadDailyHours() {
        SysConfig cfg = configMapper.selectOne(
                new LambdaQueryWrapper<SysConfig>().eq(SysConfig::getConfigKey, CFG_DAILY_HOURS));
        if (cfg == null || cfg.getConfigValue() == null) return DEFAULT_DAILY_HOURS;
        try {
            BigDecimal v = new BigDecimal(cfg.getConfigValue().trim());
            return v.signum() > 0 ? v : DEFAULT_DAILY_HOURS;
        } catch (NumberFormatException e) {
            return DEFAULT_DAILY_HOURS;
        }
    }

    private String buildExplain(String verdict, int backlogCount, int noEstimateCount,
                                BigDecimal backlogHours, BigDecimal dailyHours,
                                LocalDate earliestStart, LocalDate expectedFinish, LocalDate dueDate) {
        StringBuilder sb = new StringBuilder();
        sb.append("该执行人当前有 ").append(backlogCount).append(" 个未完成任务，剩余约 ")
                .append(backlogHours.stripTrailingZeros().toPlainString()).append(" 小时");
        if (noEstimateCount > 0) {
            sb.append("（另有 ").append(noEstimateCount).append(" 个任务未填预估工时，未计入）");
        }
        sb.append("。按每日 ").append(dailyHours.stripTrailingZeros().toPlainString())
                .append(" 小时折算，新任务最早 ").append(earliestStart)
                .append(" 开始，预计 ").append(expectedFinish).append(" 完成");
        if (dueDate != null) {
            sb.append("，期望截止 ").append(dueDate);
            switch (verdict) {
                case "OK": sb.append("：可按期完成。"); break;
                case "TIGHT": sb.append("：时间紧张，无余量。"); break;
                default: sb.append("：排期撞车，需调整截止日、降低其他任务优先级或走变更。");
            }
        } else {
            sb.append("。未填期望截止日，仅供参考。");
        }
        return sb.toString();
    }
}
