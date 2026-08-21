package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.BizProjectMember;
import com.rd.platform.model.entity.BizSprint;
import com.rd.platform.model.entity.BizTask;
import com.rd.platform.model.entity.SysUser;
import com.rd.platform.model.mapper.BizProjectMemberMapper;
import com.rd.platform.model.mapper.BizSprintMapper;
import com.rd.platform.model.mapper.BizTaskMapper;
import com.rd.platform.model.mapper.SysUserMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 迭代容量 / 成员负载测算（排期地基）。
 *
 * - 容量口径：迭代工作日数(周一~周五) × 每人每日有效工时({@link #WORK_HOURS_PER_DAY})。
 * - 负载口径：该成员在此迭代下所有任务的预估工时之和。
 *
 * 用于：拆任务进迭代时的超载拦截，以及迭代规划的成员负载视图。
 */
@Component
public class SprintCapacityGuard {

    /** 每人每日有效排期工时（预留会议/沟通缓冲，取 6h） */
    public static final double WORK_HOURS_PER_DAY = 6.0;

    @Autowired
    private BizSprintMapper sprintMapper;
    @Autowired
    private BizTaskMapper taskMapper;
    @Autowired
    private BizProjectMemberMapper memberMapper;
    @Autowired
    private SysUserMapper userMapper;
    @Autowired
    private com.rd.platform.model.mapper.BizTechDebtMapper techDebtMapper;

    /** 单人容量（小时）。迭代日期缺失时返回 0，表示不做容量限制。 */
    public double capacityHours(BizSprint sprint) {
        if (sprint == null || sprint.getStartDate() == null || sprint.getEndDate() == null) return 0;
        long workingDays = 0;
        for (LocalDate d = sprint.getStartDate(); !d.isAfter(sprint.getEndDate()); d = d.plusDays(1)) {
            DayOfWeek w = d.getDayOfWeek();
            if (w != DayOfWeek.SATURDAY && w != DayOfWeek.SUNDAY) workingDays++;
        }
        return workingDays * WORK_HOURS_PER_DAY;
    }

    /** 某成员在此迭代已排的预估工时之和(任务 + 已排期技术债——债和需求抢同一个容量池,负载才真实)。 */
    public double plannedHours(Long sprintId, Long assigneeId) {
        if (sprintId == null || assigneeId == null) return 0;
        List<BizTask> tasks = taskMapper.selectList(new LambdaQueryWrapper<BizTask>()
                .eq(BizTask::getSprintId, sprintId)
                .eq(BizTask::getAssigneeId, assigneeId));
        double sum = 0;
        for (BizTask t : tasks) {
            if (t.getEstimatedHours() != null) sum += t.getEstimatedHours().doubleValue();
        }
        List<com.rd.platform.model.entity.BizTechDebt> debts = techDebtMapper.selectList(
                new LambdaQueryWrapper<com.rd.platform.model.entity.BizTechDebt>()
                        .eq(com.rd.platform.model.entity.BizTechDebt::getSprintId, sprintId)
                        .eq(com.rd.platform.model.entity.BizTechDebt::getAssigneeId, assigneeId)
                        .eq(com.rd.platform.model.entity.BizTechDebt::getStatus, "SCHEDULED"));
        for (com.rd.platform.model.entity.BizTechDebt d : debts) {
            if (d.getEstimatedHours() != null) sum += d.getEstimatedHours().doubleValue();
        }
        return sum;
    }

    /**
     * 排期护栏：把 addHours 工时的新任务排给 assignee 时，
     * 若该成员在此迭代的总工时将超过容量，则拦截。
     */
    public void assertWithinCapacity(Long sprintId, Long assigneeId, BigDecimal addHours) {
        if (sprintId == null || assigneeId == null) return;
        BizSprint sprint = sprintMapper.selectById(sprintId);
        double cap = capacityHours(sprint);
        if (cap <= 0) return; // 迭代无有效日期区间，不做容量限制
        double add = addHours != null ? addHours.doubleValue() : 0;
        double planned = plannedHours(sprintId, assigneeId);
        double projected = planned + add;
        if (projected > cap) {
            throw BusinessException.badRequest(String.format(
                    "排期超载：该成员在本迭代已排 %.1fh，加上本任务 %.1fh 共 %.1fh，已超过容量 %.1fh，请调整工时或改派他人",
                    planned, add, projected, cap));
        }
    }

    /** 迭代内每个项目成员的负载明细（供规划/负载视图）。 */
    public List<Map<String, Object>> memberLoads(Long sprintId) {
        List<Map<String, Object>> result = new ArrayList<>();
        BizSprint sprint = sprintMapper.selectById(sprintId);
        if (sprint == null) return result;
        double cap = capacityHours(sprint);
        List<BizProjectMember> members = memberMapper.selectList(new LambdaQueryWrapper<BizProjectMember>()
                .eq(BizProjectMember::getProjectId, sprint.getProjectId()));
        for (BizProjectMember m : members) {
            double planned = plannedHours(sprintId, m.getUserId());
            SysUser u = userMapper.selectById(m.getUserId());
            Map<String, Object> row = new HashMap<>();
            row.put("userId", m.getUserId());
            row.put("nickname", u != null ? u.getNickname() : "");
            row.put("roleCode", m.getRoleCode());
            row.put("capacityHours", cap);
            row.put("plannedHours", planned);
            row.put("remainingHours", cap - planned);
            row.put("overloaded", cap > 0 && planned > cap);
            result.add(row);
        }
        return result;
    }
}
