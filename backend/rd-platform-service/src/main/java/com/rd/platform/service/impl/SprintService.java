package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.constant.BizConstants;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.BizSprint;
import com.rd.platform.model.entity.BizTechDebt;
import com.rd.platform.model.entity.SysConfig;
import com.rd.platform.model.mapper.BizSprintMapper;
import com.rd.platform.model.mapper.BizTechDebtMapper;
import com.rd.platform.model.mapper.SysConfigMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 迭代业务逻辑（从原胖 Controller 抽出，Controller 仅保留 HTTP 映射与委托）。
 * 集中承载：项目级数据隔离、角色门禁、日期校验、容量测算。
 */
@Service
public class SprintService {

    @Autowired
    private BizSprintMapper sprintMapper;
    @Autowired
    private BizTechDebtMapper techDebtMapper;
    @Autowired
    private SysConfigMapper sysConfigMapper;
    @Autowired
    private ProjectAccessGuard projectAccessGuard;
    @Autowired
    private RoleChecker roleChecker;
    @Autowired
    private SprintCapacityGuard sprintCapacityGuard;
    @Autowired
    private com.rd.platform.model.mapper.BizRequirementMapper requirementMapper;
    @Autowired
    private com.rd.platform.model.mapper.BizTaskMapper taskMapper;

    /**
     * 关闭迭代(带未完成项强制处置)：
     * 迭代内存在未完成需求/任务时,必须明确处置策略——顺延到指定迭代(MOVE_TO_SPRINT)或退回待办池(BACKLOG),
     * 不提供默认值,杜绝"迭代一关,没做完的活就消失"的烂尾;关闭瞬间快照计划数/完成数,沉淀迭代完成率。
     */
    public String complete(Long id, String unfinishedAction, Long targetSprintId) {
        BizSprint sprint = mustGet(id);
        requirePermission("关闭迭代", "sprint:edit");
        projectAccessGuard.assertAccess(SecurityContextHolder.getCurrentUserId(), sprint.getProjectId(), "迭代");
        if (!isValidSprintTransition(sprint.getStatus(), BizConstants.SPRINT_COMPLETED)) {
            throw BusinessException.badRequest("非法的迭代状态流转：" + sprint.getStatus() + " → COMPLETED");
        }

        List<com.rd.platform.model.entity.BizRequirement> reqs = requirementMapper.selectList(
                new LambdaQueryWrapper<com.rd.platform.model.entity.BizRequirement>()
                        .eq(com.rd.platform.model.entity.BizRequirement::getSprintId, id));
        List<com.rd.platform.model.entity.BizTask> tasks = taskMapper.selectList(
                new LambdaQueryWrapper<com.rd.platform.model.entity.BizTask>()
                        .eq(com.rd.platform.model.entity.BizTask::getSprintId, id));
        long unfinishedReq = reqs.stream().filter(r ->
                !BizConstants.REQ_CLOSED.equals(r.getStatus()) && !BizConstants.REQ_CANCELLED.equals(r.getStatus())).count();
        long unfinishedTask = tasks.stream().filter(t -> !BizConstants.TASK_DONE.equals(t.getStatus())).count();

        if (unfinishedReq + unfinishedTask > 0) {
            if (!"MOVE_TO_SPRINT".equals(unfinishedAction) && !"BACKLOG".equals(unfinishedAction)) {
                throw BusinessException.badRequest("迭代内还有 " + unfinishedReq + " 个未完成需求、" + unfinishedTask
                        + " 个未完成任务,关闭前必须选择处置方式：顺延到指定迭代(MOVE_TO_SPRINT+targetSprintId) 或 退回待办池(BACKLOG)");
            }
            Long newSprintId = null;
            if ("MOVE_TO_SPRINT".equals(unfinishedAction)) {
                if (targetSprintId == null || targetSprintId.equals(id)) {
                    throw BusinessException.badRequest("顺延目标迭代无效");
                }
                BizSprint target = mustGet(targetSprintId);
                if (BizConstants.SPRINT_COMPLETED.equals(target.getStatus())) {
                    throw BusinessException.badRequest("不能顺延到已完成的迭代");
                }
                newSprintId = targetSprintId;
            }
            for (com.rd.platform.model.entity.BizRequirement r : reqs) {
                if (!BizConstants.REQ_CLOSED.equals(r.getStatus()) && !BizConstants.REQ_CANCELLED.equals(r.getStatus())) {
                    r.setSprintId(newSprintId);
                    requirementMapper.updateById(r);
                }
            }
            for (com.rd.platform.model.entity.BizTask t : tasks) {
                if (!BizConstants.TASK_DONE.equals(t.getStatus())) {
                    t.setSprintId(newSprintId);
                    taskMapper.updateById(t);
                }
            }
        }

        // 完成率快照
        sprint.setPlannedCount(reqs.size());
        sprint.setDoneCount((int) reqs.stream().filter(r -> BizConstants.REQ_CLOSED.equals(r.getStatus())).count());
        sprint.setStatus(BizConstants.SPRINT_COMPLETED);
        sprintMapper.updateById(sprint);
        String moved = unfinishedReq + unfinishedTask > 0
                ? ("," + (("BACKLOG".equals(unfinishedAction)) ? "未完成项已退回待办池" : "未完成项已顺延到迭代#" + targetSprintId))
                : "";
        return "迭代已完成(需求 " + sprint.getDoneCount() + "/" + sprint.getPlannedCount() + ")" + moved;
    }

    private void requirePermission(String action, String... permissions) {
        if (!roleChecker.hasPermission(SecurityContextHolder.getCurrentUserId(), permissions)) {
            throw BusinessException.forbidden("无权限" + action);
        }
    }

    private BizSprint mustGet(Long id) {
        BizSprint sprint = sprintMapper.selectById(id);
        if (sprint == null) throw BusinessException.badRequest("迭代不存在");
        return sprint;
    }

    public Page<BizSprint> list(Integer pageNum, Integer pageSize, Long projectId, String status) {
        Page<BizSprint> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizSprint> wrapper = new LambdaQueryWrapper<>();
        // 项目级数据隔离：非管理员只能看到自己所属项目的迭代
        List<Long> accessible = projectAccessGuard.accessibleProjectIds(SecurityContextHolder.getCurrentUserId());
        if (accessible != null) {
            if (accessible.isEmpty()) return page;
            wrapper.in(BizSprint::getProjectId, accessible);
        }
        if (projectId != null) wrapper.eq(BizSprint::getProjectId, projectId);
        if (status != null) wrapper.eq(BizSprint::getStatus, status);
        wrapper.orderByDesc(BizSprint::getCreatedAt);
        return sprintMapper.selectPage(page, wrapper);
    }

    public BizSprint getById(Long id) {
        BizSprint sprint = mustGet(id);
        projectAccessGuard.assertAccess(SecurityContextHolder.getCurrentUserId(), sprint.getProjectId(), "迭代");
        return sprint;
    }

    public List<Map<String, Object>> capacity(Long id) {
        BizSprint sprint = mustGet(id);
        projectAccessGuard.assertAccess(SecurityContextHolder.getCurrentUserId(), sprint.getProjectId(), "迭代");
        return sprintCapacityGuard.memberLoads(id);
    }

    public BizSprint create(Long projectId, String name, String goal, LocalDate start, LocalDate end) {
        requirePermission("规划迭代", "sprint:create");
        Long uid = SecurityContextHolder.getCurrentUserId();
        projectAccessGuard.assertAccess(uid, projectId, "迭代");
        if (end.isBefore(start)) throw BusinessException.badRequest("迭代结束日期不能早于开始日期");
        BizSprint sprint = new BizSprint();
        sprint.setProjectId(projectId);
        sprint.setSprintName(name);
        sprint.setGoal(goal);
        sprint.setStartDate(start);
        sprint.setEndDate(end);
        sprint.setStatus(BizConstants.SPRINT_NOT_STARTED);
        sprint.setType("NORMAL");
        sprint.setCreatedBy(uid);
        sprintMapper.insert(sprint);
        return sprint;
    }

    public void update(Long id, String name, String goal, LocalDate start, LocalDate end) {
        BizSprint sprint = mustGet(id);
        requirePermission("规划迭代", "sprint:edit");
        projectAccessGuard.assertAccess(SecurityContextHolder.getCurrentUserId(), sprint.getProjectId(), "迭代");
        if (end.isBefore(start)) throw BusinessException.badRequest("迭代结束日期不能早于开始日期");
        sprint.setSprintName(name);
        sprint.setGoal(goal);
        sprint.setStartDate(start);
        sprint.setEndDate(end);
        sprintMapper.updateById(sprint);
    }

    /** 迭代状态流转（启动/关闭），统一做门禁、项目隔离与状态机校验。 */
    public void changeStatus(Long id, String action, String targetStatus) {
        BizSprint sprint = mustGet(id);
        requirePermission(action, "sprint:edit");
        projectAccessGuard.assertAccess(SecurityContextHolder.getCurrentUserId(), sprint.getProjectId(), "迭代");
        // 底线护栏：仅允许状态机定义的相邻正向流转，禁止越级跳转（如未开始直接跳已完成）
        if (!isValidSprintTransition(sprint.getStatus(), targetStatus)) {
            throw BusinessException.badRequest("非法的迭代状态流转：" + sprint.getStatus() + " → " + targetStatus + "，禁止越级跳转");
        }
        // 债务闸门：启动迭代前,项目未偿还技术债存量超过阈值(sys_config: debt.max.hours,0=不限)则拦截,
        // 逼团队先排债再开新活——债务只记不还会持续侵蚀交付质量
        if (BizConstants.SPRINT_IN_PROGRESS.equals(targetStatus)) {
            assertDebtUnderThreshold(sprint.getProjectId());
        }
        sprint.setStatus(targetStatus);
        sprintMapper.updateById(sprint);
    }

    private void assertDebtUnderThreshold(Long projectId) {
        SysConfig cfg = sysConfigMapper.selectOne(new LambdaQueryWrapper<SysConfig>()
                .eq(SysConfig::getConfigKey, "debt.max.hours"));
        double max = 40;
        if (cfg != null && cfg.getConfigValue() != null) {
            try { max = Double.parseDouble(cfg.getConfigValue().trim()); } catch (NumberFormatException ignored) { }
        }
        if (max <= 0) return; // 0 或负数 = 关闭闸门
        List<BizTechDebt> debts = techDebtMapper.selectList(new LambdaQueryWrapper<BizTechDebt>()
                .eq(BizTechDebt::getProjectId, projectId)
                .in(BizTechDebt::getStatus, "PENDING", "OPEN", "SCHEDULED"));
        double total = 0;
        for (BizTechDebt d : debts) {
            if (d.getEstimatedHours() != null) total += d.getEstimatedHours().doubleValue();
        }
        if (total > max) {
            throw BusinessException.badRequest(String.format(
                    "项目未偿还技术债存量 %.1fh 已超过阈值 %.1fh,请先将部分债务排入迭代偿还(或在系统设置调整 debt.max.hours)",
                    total, max));
        }
    }

    /** 迭代状态机：仅允许 未开始 → 进行中 → 已完成 的相邻正向流转。 */
    private boolean isValidSprintTransition(String from, String to) {
        if (from == null || to == null) return false;
        switch (from) {
            case BizConstants.SPRINT_NOT_STARTED:
            case BizConstants.PRJ_PLANNING: // 兼容历史脏数据（旧版误将迭代写为 PLANNING）
                return BizConstants.SPRINT_IN_PROGRESS.equals(to);
            case BizConstants.SPRINT_IN_PROGRESS:
                return BizConstants.SPRINT_COMPLETED.equals(to);
            default:
                return false;
        }
    }
}
