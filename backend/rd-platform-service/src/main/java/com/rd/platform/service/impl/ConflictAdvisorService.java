package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.SysAuditLog;
import com.rd.platform.model.entity.SysConfig;
import com.rd.platform.model.mapper.SysAuditLogMapper;
import com.rd.platform.model.mapper.SysConfigMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 冲突→变更 半自动串联（C 步）。
 * <p>
 * 设计原则：不自动创建变更单，只做"检测 + 留痕 + 引导"。
 * 总开关 sys_config: conflict.enforce = off / warn / block，默认 warn：
 * <ul>
 *   <li>off  —— 完全关闭，不检测；</li>
 *   <li>warn —— 检测到排期撞车时写审计留痕（用于统计误报率），放行保存；</li>
 *   <li>block —— 撞车时拒绝保存，提示走变更或调整排期。</li>
 * </ul>
 * 误报率经审计数据验证可接受后，再将开关从 warn 收紧到 block。
 */
@Service
public class ConflictAdvisorService {

    /** 冲突管控开关配置键 */
    public static final String CFG_ENFORCE = "conflict.enforce";
    public static final String ENFORCE_OFF = "off";
    public static final String ENFORCE_WARN = "warn";
    public static final String ENFORCE_BLOCK = "block";

    @Autowired
    private TaskScheduleAdviceService scheduleAdviceService;
    @Autowired
    private SysConfigMapper configMapper;
    @Autowired
    private SysAuditLogMapper auditLogMapper;

    /**
     * 任务保存（创建/编辑）路径上的排期冲突检查。
     * warn 模式：留痕放行；block 模式：抛异常拒绝保存。
     * 预估工时或截止日缺失时不检查（无法判定，不制造噪声）。
     */
    public void onTaskSave(String taskName, Long assigneeId, BigDecimal estimatedHours,
                           LocalDate dueDate, Long excludeTaskId) {
        String enforce = loadEnforce();
        if (ENFORCE_OFF.equals(enforce)) return;
        if (assigneeId == null || estimatedHours == null || estimatedHours.signum() <= 0 || dueDate == null) return;

        Map<String, Object> advice = scheduleAdviceService.advise(assigneeId, estimatedHours, dueDate, excludeTaskId);
        if (!"CONFLICT".equals(advice.get("verdict"))) return;

        recordConflictAudit(taskName, advice, enforce);

        if (ENFORCE_BLOCK.equals(enforce)) {
            throw BusinessException.badRequest("排期撞车：" + advice.get("explain")
                    + " 请调整截止日/执行人，或发起需求变更。");
        }
        // warn：留痕放行，前端通过 /schedule-advice 与 /conflict-draft 引导走变更
    }

    /**
     * 一键发起变更的预填草稿：跑一次排期建议，把冲突事实组织成变更单三要素。
     * 只生成草稿不落库，提交仍走既有 POST /api/v1/change-requests（权限/审批规则不变）。
     */
    public Map<String, Object> buildChangeDraft(Long requirementId, Long projectId, String taskName,
                                                Long assigneeId, BigDecimal estimatedHours,
                                                LocalDate dueDate, Long excludeTaskId) {
        Map<String, Object> advice = scheduleAdviceService.advise(assigneeId, estimatedHours, dueDate, excludeTaskId);

        StringBuilder impact = new StringBuilder("执行人现有 ")
                .append(advice.get("backlogTaskCount")).append(" 个未完成任务；");
        Object affected = advice.get("affectedTasks");
        if (affected instanceof List && !((List<?>) affected).isEmpty()) {
            impact.append("受影响任务：");
            for (Object o : (List<?>) affected) {
                if (o instanceof Map) {
                    impact.append("#").append(((Map<?, ?>) o).get("taskId"))
                            .append(" ").append(((Map<?, ?>) o).get("taskName")).append("；");
                }
            }
        }

        Map<String, Object> draft = new HashMap<>();
        draft.put("requirementId", requirementId);
        draft.put("projectId", projectId);
        draft.put("changeContent", "任务[" + (taskName == null ? "新任务" : taskName)
                + "]排期调整：期望截止 " + dueDate + "，按当前负载预计 "
                + advice.get("expectedFinishDate") + " 完成，需调整排期或范围。");
        draft.put("changeReason", String.valueOf(advice.get("explain")));
        draft.put("impactScope", impact.toString());
        draft.put("advice", advice);
        return draft;
    }

    /** 冲突事件审计留痕：用于统计 warn 阶段的触发量与误报率，为收紧到 block 提供数据 */
    private void recordConflictAudit(String taskName, Map<String, Object> advice, String enforce) {
        try {
            SysAuditLog log = new SysAuditLog();
            log.setUserId(SecurityContextHolder.getCurrentUserId());
            log.setModule("冲突管控");
            log.setOperation("排期撞车(" + enforce + ")");
            log.setMethod("ConflictAdvisorService.onTaskSave");
            log.setRequestParams("task=" + taskName);
            log.setAfterData(String.valueOf(advice.get("explain")));
            log.setStatus(1);
            auditLogMapper.insert(log);
        } catch (Exception ignore) {
            // 留痕失败不阻断业务
        }
    }

    private String loadEnforce() {
        SysConfig cfg = configMapper.selectOne(
                new LambdaQueryWrapper<SysConfig>().eq(SysConfig::getConfigKey, CFG_ENFORCE));
        if (cfg == null || cfg.getConfigValue() == null) return ENFORCE_WARN;
        String v = cfg.getConfigValue().trim().toLowerCase();
        return (ENFORCE_OFF.equals(v) || ENFORCE_BLOCK.equals(v)) ? v : ENFORCE_WARN;
    }
}
