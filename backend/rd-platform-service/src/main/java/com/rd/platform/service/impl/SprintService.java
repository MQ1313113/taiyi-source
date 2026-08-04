package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.constant.BizConstants;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.BizSprint;
import com.rd.platform.model.mapper.BizSprintMapper;
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
    private ProjectAccessGuard projectAccessGuard;
    @Autowired
    private RoleChecker roleChecker;
    @Autowired
    private SprintCapacityGuard sprintCapacityGuard;

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
        sprint.setStatus(targetStatus);
        sprintMapper.updateById(sprint);
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
