package com.rd.platform.service.impl;

import com.rd.platform.common.constant.BizConstants;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * 待办排序打分组件（供 {@link DashboardService#myTodo()} 使用）。
 * <p>
 * 规则透明可解释：score = 优先级(0~40) + 逾期程度(0~30) + 状态(0~20) + 类型(0~10)，
 * 每项待办附带 scoreExplain 说明"为什么排在这里"，便于团队信任与调参。
 * 纯计算无副作用，权重调整只改本类。
 */
@Service
public class TodoRankService {

    /**
     * 对 myTodo 聚合出的待办列表就地打分并按分数降序排序。
     * 依赖每个 item 中的 priority / status / type / dueDate(LocalDate，可空) 键。
     */
    public void rank(List<Map<String, Object>> todos) {
        LocalDate today = LocalDate.now();
        for (Map<String, Object> item : todos) {
            score(item, today);
        }
        todos.sort(Comparator.comparingInt(m -> -((int) m.get("score"))));
    }

    private void score(Map<String, Object> item, LocalDate today) {
        String priority = normalizePriority((String) item.get("priority"));
        item.put("priority", priority); // 归一后回写，前端拿到统一口径

        int pScore = priorityScore(priority);
        int dScore = dueScore((LocalDate) item.get("dueDate"), today);
        int sScore = statusScore((String) item.get("status"));
        int tScore = typeScore((String) item.get("type"));

        int total = pScore + dScore + sScore + tScore;
        item.put("score", total);
        LocalDate due = (LocalDate) item.get("dueDate");
        if (due != null) item.put("dueLabel", dueLabel(due, today)); // 前端直接展示"已逾期N天/今日到期/N天后到期"
        item.put("scoreExplain", String.format("优先级%s(%d) + %s(%d) + 状态(%d) + 类型(%d) = %d",
                priority, pScore, dueLabel(due, today), dScore, sScore, tScore, total));
    }

    /**
     * 历史脏数据归一：URGENT/紧急→P0，HIGH/高→P1，MEDIUM/NORMAL/中→P2，LOW/低→P3。
     * 存量库表数据由 migration_v12_priority_normalize.sql 修正，此处兜底未迁移的旧值。
     */
    public String normalizePriority(String raw) {
        if (raw == null) return BizConstants.PRIORITY_P2;
        switch (raw.trim().toUpperCase()) {
            case "P0": case "URGENT": case "紧急": return BizConstants.PRIORITY_P0;
            case "P1": case "HIGH": case "高": return BizConstants.PRIORITY_P1;
            case "P3": case "LOW": case "低": return BizConstants.PRIORITY_P3;
            case "P2": case "MEDIUM": case "NORMAL": case "中":
            default: return BizConstants.PRIORITY_P2;
        }
    }

    private int priorityScore(String priority) {
        switch (priority) {
            case "P0": return 40;
            case "P1": return 30;
            case "P3": return 10;
            default: return 20; // P2
        }
    }

    /** 逾期程度：已逾期30 / 今日到期25 / 3天内15 / 7天内8 / 更远或无期限0 */
    private int dueScore(LocalDate dueDate, LocalDate today) {
        if (dueDate == null) return 0;
        long days = ChronoUnit.DAYS.between(today, dueDate);
        if (days < 0) return 30;
        if (days == 0) return 25;
        if (days <= 3) return 15;
        if (days <= 7) return 8;
        return 0;
    }

    private String dueLabel(LocalDate dueDate, LocalDate today) {
        if (dueDate == null) return "无期限";
        long days = ChronoUnit.DAYS.between(today, dueDate);
        if (days < 0) return "已逾期" + (-days) + "天";
        if (days == 0) return "今日到期";
        return days + "天后到期";
    }

    /** 状态：进行中的先收尾（20），测试中次之（15），待开始（5） */
    private int statusScore(String status) {
        if (status == null) return 5;
        switch (status) {
            case BizConstants.TASK_IN_PROGRESS:
            case BizConstants.TASK_SELF_TESTING:
            case BizConstants.BUG_FIXING:
                return 20;
            case BizConstants.TASK_TESTING:
            case BizConstants.BUG_FIXED:
                return 15;
            default:
                return 5;
        }
    }

    /** 类型：评审/审批类阻塞他人，优先处理 */
    private int typeScore(String type) {
        if (type == null) return 5;
        switch (type) {
            case "TICKET_TRIAGE":
            case "CONFIG_MISSING":
            case "REQUIREMENT_REVIEW":
            case "SUBMIT_TEST_APPROVE":
            case "BUG_VERIFY":
                return 10; // 我不处理，别人动不了(配置缺失同级:不配则流程无裁决出口)
            case "REQUIREMENT_SUBMIT_REVIEW":
            case "REQUIREMENT_BREAKDOWN":
            case "REQUIREMENT_DEVELOPED":
                return 8;  // 流程推进节点
            case "TECH_DEBT":
                return 3;  // 债务常驻提醒:可见但不喧宾夺主
            default:
                return 5;  // 个人开发/修复类
        }
    }
}
