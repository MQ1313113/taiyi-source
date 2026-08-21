package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rd.platform.common.constant.BizConstants;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.*;
import com.rd.platform.model.mapper.*;
import com.rd.platform.security.context.SecurityContextHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

/**
 * 治理看板：责任雷达(球在谁脚下+卡多久) + 个人健康度画像 + 打回归因统计。
 * 面向管理层(pm/sys_admin),按可访问项目范围聚合。
 */
@Service
public class GovernanceService {

    private static final int STUCK_DAYS = 3;

    @Autowired private BizTaskMapper taskMapper;
    @Autowired private BizBugMapper bugMapper;
    @Autowired private BizRequirementMapper requirementMapper;
    @Autowired private BizTicketMapper ticketMapper;
    @Autowired private BizReworkLogMapper reworkLogMapper;
    @Autowired private BizAssignmentLogMapper assignmentLogMapper;
    @Autowired private SysUserMapper userMapper;
    @Autowired private ProjectAccessGuard projectAccessGuard;
    @Autowired private RoleChecker roleChecker;

    private void requireManager(Long uid) {
        if (!roleChecker.hasAnyRole(uid, "pm", "sys_admin")) { // 治理看板为观察类,admin 显式放行
            throw BusinessException.forbidden("只有产品经理或管理员可以查看治理看板");
        }
    }

    /** 生效的项目过滤列表：null=不限(管理员);空 scope→用 [-1] 匹配不到任何数据。 */
    private List<Long> effScope(List<Long> scope, Long projectId) {
        if (projectId != null) return Collections.singletonList(projectId);
        if (scope == null) return null;
        return scope.isEmpty() ? Collections.singletonList(-1L) : scope;
    }

    private Map<Long, SysUser> userMap() {
        Map<Long, SysUser> m = new HashMap<>();
        for (SysUser u : userMapper.selectList(new LambdaQueryWrapper<SysUser>().eq(SysUser::getDeleted, 0))) {
            m.put(u.getId(), u);
        }
        return m;
    }

    private long ageDays(LocalDateTime t) {
        if (t == null) return 0;
        return Math.max(0, Duration.between(t, LocalDateTime.now()).toDays());
    }

    private String nameOf(Map<Long, SysUser> um, Long id) {
        SysUser u = id != null ? um.get(id) : null;
        if (u != null) return u.getNickname() != null ? u.getNickname() : u.getUsername();
        return id != null ? "用户#" + id : "-";
    }

    /** 责任雷达：所有未闭环项,球在谁脚下、卡了多久,按最久没动排序。 */
    public List<Map<String, Object>> radar() {
        Long uid = SecurityContextHolder.getCurrentUserId();
        requireManager(uid);
        List<Long> eff = effScope(projectAccessGuard.accessibleProjectIds(uid), null);
        Map<Long, SysUser> um = userMap();
        List<Map<String, Object>> items = new ArrayList<>();

        LambdaQueryWrapper<BizTask> tw = new LambdaQueryWrapper<BizTask>().ne(BizTask::getStatus, BizConstants.TASK_DONE);
        if (eff != null) tw.in(BizTask::getProjectId, eff);
        for (BizTask t : taskMapper.selectList(tw))
            items.add(item("任务", t.getId(), t.getTaskName(), t.getAssigneeId(), t.getStatus(), ageDays(t.getUpdatedAt()), um));

        LambdaQueryWrapper<BizBug> bw = new LambdaQueryWrapper<BizBug>().notIn(BizBug::getStatus, "CLOSED", "REJECTED");
        if (eff != null) bw.in(BizBug::getProjectId, eff);
        for (BizBug b : bugMapper.selectList(bw))
            items.add(item("缺陷", b.getId(), b.getTitle(), b.getAssigneeId(), b.getStatus(), ageDays(b.getUpdatedAt()), um));

        LambdaQueryWrapper<BizRequirement> rw = new LambdaQueryWrapper<BizRequirement>()
                .notIn(BizRequirement::getStatus, BizConstants.REQ_CLOSED, BizConstants.REQ_CANCELLED);
        if (eff != null) rw.in(BizRequirement::getProjectId, eff);
        for (BizRequirement r : requirementMapper.selectList(rw))
            items.add(item("需求", r.getId(), r.getTitle(), r.getOwnerId(), r.getStatus(), ageDays(r.getUpdatedAt()), um));

        LambdaQueryWrapper<BizTicket> kw = new LambdaQueryWrapper<BizTicket>()
                .notIn(BizTicket::getStatus, BizConstants.TICKET_RESOLVED, BizConstants.TICKET_CLOSED);
        if (eff != null) kw.in(BizTicket::getProjectId, eff);
        for (BizTicket k : ticketMapper.selectList(kw))
            items.add(item("工单", k.getId(), k.getTitle(), k.getAssigneeId(), k.getStatus(), ageDays(k.getUpdatedAt()), um));

        items.sort((a, b) -> Long.compare((Long) b.get("ageDays"), (Long) a.get("ageDays")));
        return items;
    }

    private Map<String, Object> item(String type, Long id, String title, Long holderId, String status, long age, Map<Long, SysUser> um) {
        Map<String, Object> m = new HashMap<>();
        m.put("type", type);
        m.put("id", id);
        m.put("title", title);
        m.put("holderId", holderId);
        m.put("holderName", nameOf(um, holderId));
        m.put("status", status);
        m.put("ageDays", age);
        m.put("stuck", age >= STUCK_DAYS);
        return m;
    }

    /** 个人健康度画像：在办/平均滞留/被打回次数/按时完成率。 */
    public List<Map<String, Object>> portrait(Long projectId) {
        Long uid = SecurityContextHolder.getCurrentUserId();
        requireManager(uid);
        List<Long> eff = effScope(projectAccessGuard.accessibleProjectIds(uid), projectId);
        Map<Long, SysUser> um = userMap();

        Map<Long, long[]> agg = new HashMap<>(); // [openCount, ageSum]

        LambdaQueryWrapper<BizTask> tw = new LambdaQueryWrapper<BizTask>().ne(BizTask::getStatus, BizConstants.TASK_DONE);
        if (eff != null) tw.in(BizTask::getProjectId, eff);
        for (BizTask t : taskMapper.selectList(tw)) accumulate(agg, t.getAssigneeId(), ageDays(t.getUpdatedAt()));

        LambdaQueryWrapper<BizBug> bw = new LambdaQueryWrapper<BizBug>().notIn(BizBug::getStatus, "CLOSED", "REJECTED");
        if (eff != null) bw.in(BizBug::getProjectId, eff);
        for (BizBug b : bugMapper.selectList(bw)) accumulate(agg, b.getAssigneeId(), ageDays(b.getUpdatedAt()));

        LambdaQueryWrapper<BizTicket> kw = new LambdaQueryWrapper<BizTicket>()
                .notIn(BizTicket::getStatus, BizConstants.TICKET_RESOLVED, BizConstants.TICKET_CLOSED);
        if (eff != null) kw.in(BizTicket::getProjectId, eff);
        for (BizTicket k : ticketMapper.selectList(kw)) accumulate(agg, k.getAssigneeId(), ageDays(k.getUpdatedAt()));

        // 被打回次数(责任方)
        Map<Long, Long> reworkBlamed = new HashMap<>();
        LambdaQueryWrapper<BizReworkLog> lw = new LambdaQueryWrapper<>();
        if (eff != null) lw.in(BizReworkLog::getProjectId, eff);
        for (BizReworkLog log : reworkLogMapper.selectList(lw)) {
            if (log.getAttributedUserId() != null) reworkBlamed.merge(log.getAttributedUserId(), 1L, Long::sum);
        }

        // 按时完成率(DONE 任务 completedAt<=dueDate)
        Map<Long, long[]> onTime = new HashMap<>(); // [onTime, doneTotal]
        LambdaQueryWrapper<BizTask> dw = new LambdaQueryWrapper<BizTask>().eq(BizTask::getStatus, BizConstants.TASK_DONE);
        if (eff != null) dw.in(BizTask::getProjectId, eff);
        for (BizTask t : taskMapper.selectList(dw)) {
            if (t.getAssigneeId() == null) continue;
            long[] ot = onTime.computeIfAbsent(t.getAssigneeId(), k -> new long[2]);
            ot[1]++;
            if (t.getCompletedAt() != null && t.getDueDate() != null
                    && !t.getCompletedAt().toLocalDate().isAfter(t.getDueDate())) ot[0]++;
        }

        // 转派统计：甩出(from=X)、接入(to=X 且 from 非空)——反甩锅
        Map<Long, Long> transferOut = new HashMap<>();
        Map<Long, Long> transferIn = new HashMap<>();
        LambdaQueryWrapper<BizAssignmentLog> aw = new LambdaQueryWrapper<>();
        if (eff != null) aw.in(BizAssignmentLog::getProjectId, eff);
        for (BizAssignmentLog al : assignmentLogMapper.selectList(aw)) {
            if (al.getFromUserId() != null) {
                transferOut.merge(al.getFromUserId(), 1L, Long::sum);
                if (al.getToUserId() != null) transferIn.merge(al.getToUserId(), 1L, Long::sum);
            }
        }

        Set<Long> users = new HashSet<>();
        users.addAll(agg.keySet());
        users.addAll(reworkBlamed.keySet());
        users.addAll(onTime.keySet());
        users.addAll(transferOut.keySet());
        users.addAll(transferIn.keySet());
        users.remove(null);

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Long userId : users) {
            long[] a = agg.getOrDefault(userId, new long[2]);
            long open = a[0], ageSum = a[1];
            long[] ot = onTime.getOrDefault(userId, new long[2]);
            Map<String, Object> row = new HashMap<>();
            row.put("userId", userId);
            row.put("name", nameOf(um, userId));
            row.put("openCount", open);
            row.put("avgAgeDays", open > 0 ? Math.round((double) ageSum / open) : 0);
            row.put("reworkBlamed", reworkBlamed.getOrDefault(userId, 0L));
            row.put("doneCount", ot[1]);
            row.put("onTimeRate", ot[1] > 0 ? Math.round(100.0 * ot[0] / ot[1]) : null);
            long out = transferOut.getOrDefault(userId, 0L);
            long in = transferIn.getOrDefault(userId, 0L);
            row.put("transferOut", out);
            row.put("transferIn", in);
            row.put("netIn", in - out); // 净流入:正=多接锅(扛活),负=多甩活(油条)
            rows.add(row);
        }
        // 被打回多的排前面(最该关注)
        rows.sort((x, y) -> Long.compare(
                ((Number) y.get("reworkBlamed")).longValue(),
                ((Number) x.get("reworkBlamed")).longValue()));
        return rows;
    }

    private void accumulate(Map<Long, long[]> agg, Long userId, long age) {
        if (userId == null) return;
        long[] a = agg.computeIfAbsent(userId, k -> new long[2]);
        a[0]++;
        a[1] += age;
    }

    /** 单个工作的流转路径：谁转给谁、几时、为什么(按时间正序)。 */
    public List<Map<String, Object>> flow(String entityType, Long entityId) {
        Map<Long, SysUser> um = userMap();
        List<Map<String, Object>> path = new ArrayList<>();
        List<BizAssignmentLog> logs = assignmentLogMapper.selectList(new LambdaQueryWrapper<BizAssignmentLog>()
                .eq(BizAssignmentLog::getEntityType, entityType)
                .eq(BizAssignmentLog::getEntityId, entityId)
                .orderByAsc(BizAssignmentLog::getCreatedAt));
        for (BizAssignmentLog l : logs) {
            Map<String, Object> m = new HashMap<>();
            m.put("fromName", l.getFromUserId() != null ? nameOf(um, l.getFromUserId()) : "首次指派");
            m.put("toName", nameOf(um, l.getToUserId()));
            m.put("operatorName", nameOf(um, l.getOperatorId()));
            m.put("reason", l.getReason());
            m.put("time", l.getCreatedAt());
            path.add(m);
        }
        return path;
    }
}
