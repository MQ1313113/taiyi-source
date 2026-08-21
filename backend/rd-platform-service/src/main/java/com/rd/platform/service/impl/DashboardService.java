package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rd.platform.common.constant.BizConstants;
import com.rd.platform.model.entity.*;
import com.rd.platform.model.mapper.*;
import com.rd.platform.security.context.SecurityContextHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 工作台业务逻辑（从原胖 Controller 抽出，Controller 仅保留 HTTP 映射与委托）。
 */
@Service
public class DashboardService {

    @Autowired
    private BizRequirementMapper requirementMapper;
    @Autowired
    private BizTaskMapper taskMapper;
    @Autowired
    private BizBugMapper bugMapper;
    @Autowired
    private BizProjectMapper projectMapper;
    @Autowired
    private BizNotificationMapper notificationMapper;
    @Autowired
    private BizSubmitTestMapper submitTestMapper;
    @Autowired
    private BizRequirementReviewMapper reviewMapper;
    @Autowired
    private BizTestCaseMapper testCaseMapper;
    @Autowired
    private BizTechDebtMapper techDebtMapper;
    @Autowired
    private BizTicketMapper ticketMapper;
    @Autowired
    private ReleaseOrderService releaseOrderService;
    @Autowired
    private RoleChecker roleChecker;
    @Autowired
    private SysPermissionMapper permissionMapper;
    @Autowired
    private SysRolePermissionMapper rolePermissionMapper;
    @Autowired
    private SysUserRoleMapper userRoleMapper;
    @Autowired
    private SysUserMapper userMapper;
    @Autowired
    private TodoRankService todoRankService;

    public Map<String, Object> overview() {
        Long userId = SecurityContextHolder.getCurrentUserId();
        Map<String, Object> data = new HashMap<>();

        data.put("myTodoTasks", taskMapper.selectCount(
                new LambdaQueryWrapper<BizTask>()
                        .eq(BizTask::getAssigneeId, userId)
                        .eq(BizTask::getStatus, "TODO")));
        data.put("myInProgressTasks", taskMapper.selectCount(
                new LambdaQueryWrapper<BizTask>()
                        .eq(BizTask::getAssigneeId, userId)
                        .eq(BizTask::getStatus, "IN_PROGRESS")));
        data.put("myOpenBugs", bugMapper.selectCount(
                new LambdaQueryWrapper<BizBug>()
                        .eq(BizBug::getAssigneeId, userId)
                        .in(BizBug::getStatus, "OPEN", "CONFIRMED", "FIXING")));
        data.put("unreadNotifications", notificationMapper.selectCount(
                new LambdaQueryWrapper<BizNotification>()
                        .eq(BizNotification::getUserId, userId)
                        .eq(BizNotification::getIsRead, 0)));
        data.put("totalProjects", projectMapper.selectCount(
                new LambdaQueryWrapper<BizProject>()
                        .eq(BizProject::getStatus, "ACTIVE")));
        return data;
    }

    /**
     * 统一"我的待办"聚合接口。
     * 底线护栏：按当前登录用户的角色 + 业务归属，仅返回归属于他且他有权操作的待办；
     * 每条待办附带后端计算的合法 actions，前端只渲染这些动作按钮，从源头杜绝越权可点。
     */
    public Map<String, Object> myTodo() {
        Long userId = SecurityContextHolder.getCurrentUserId();
        List<String> roles = SecurityContextHolder.getCurrentRoles();
        if (roles == null) roles = new ArrayList<>();

        List<Map<String, Object>> todos = new ArrayList<>();

        // admin 是纯系统管理员,不再冒充业务角色接收业务待办;业务兜底由持有 biz:override 的角色(默认项目经理)承担
        boolean isOverride = roleChecker.hasPermission(userId, "biz:override");
        boolean isPm = roles.contains(BizConstants.ROLE_PM) || isOverride;
        boolean isTl = roles.contains("pm") || isOverride;
        boolean isDev = roles.contains(BizConstants.ROLE_DEV);
        boolean isQa = roles.contains(BizConstants.ROLE_QA);

        // 配置缺失预警(admin 专属):业务仲裁权限无人持有时,流程卡死将无人可裁决。
        // 常驻 P0 待办直到配置解决——如无项目经理,可挂给产品经理或开发负责人(角色权限页配置)
        if (roles.contains(BizConstants.ROLE_SYS_ADMIN) && !bizOverrideHolderExists()) {
            todos.add(enrich(buildTodo("CONFIG_MISSING", null, 0L,
                    "业务仲裁权限当前无人持有,流程卡死时将无人裁决。请在[系统设置-用户管理]为可信成员打开\"业务仲裁\"开关(产品/开发等岗位均可兼任,建议至少2人)",
                    "P0", "PENDING", null, Arrays.asList("VIEW")), "配置缺失", null, null));
        }

        // 0) 负责人：我负责的草稿需求待提交评审（DRAFT 且 ownerId = 当前用户）
        //    修复：产品创建需求并指定负责人后，需求处于草稿，需让负责人在工作台看到并发起评审，避免流程卡死。
        List<BizRequirement> myDraftOwned = requirementMapper.selectList(
                new LambdaQueryWrapper<BizRequirement>()
                        .eq(BizRequirement::getOwnerId, userId)
                        .eq(BizRequirement::getStatus, BizConstants.REQ_DRAFT));
        for (BizRequirement req : myDraftOwned) {
            todos.add(enrich(buildTodo("REQUIREMENT_SUBMIT_REVIEW", req.getProjectId(), req.getId(), req.getTitle(),
                    req.getPriority(), req.getStatus(), req.getExpectedCompletionDate(),
                    Arrays.asList("SUBMIT_REVIEW", "VIEW")), "待提交评审", req.getCreatedAt(), req.getCreatedBy()));
        }

        // 1) 待我评审的需求（评审记录 PENDING 且 reviewerId = 当前用户）
        List<BizRequirementReview> myReviews = reviewMapper.selectList(
                new LambdaQueryWrapper<BizRequirementReview>()
                        .eq(BizRequirementReview::getReviewerId, userId)
                        .eq(BizRequirementReview::getResult, "PENDING"));
        for (BizRequirementReview rv : myReviews) {
            BizRequirement req = requirementMapper.selectById(rv.getRequirementId());
            if (req == null || !BizConstants.REQ_REVIEWING.equals(req.getStatus())) continue;
            todos.add(enrich(buildTodo("REQUIREMENT_REVIEW", req.getProjectId(), req.getId(), req.getTitle(),
                    req.getPriority(), req.getStatus(), req.getExpectedCompletionDate(),
                    Arrays.asList("REVIEW_APPROVE", "REVIEW_REJECT", "VIEW")), "需求评审", req.getCreatedAt(), req.getCreatedBy()));
        }

        // 2) 产品经理：评审通过待拆解的需求（DEVELOPING 且 ownerId = 当前用户）
        if (isTl) {
            List<BizRequirement> toBreakdown = requirementMapper.selectList(
                    new LambdaQueryWrapper<BizRequirement>()
                            .eq(BizRequirement::getOwnerId, userId)
                            .eq(BizRequirement::getStatus, BizConstants.REQ_DEVELOPING));
            for (BizRequirement req : toBreakdown) {
                todos.add(enrich(buildTodo("REQUIREMENT_BREAKDOWN", req.getProjectId(), req.getId(), req.getTitle(),
                        req.getPriority(), req.getStatus(), req.getExpectedCompletionDate(),
                        Arrays.asList("CREATE_TASK", "MARK_DEVELOPED", "VIEW")), "待拆解任务", req.getCreatedAt(), req.getCreatedBy()));
            }
        }

        // 3) 指派给我的任务（TODO / IN_PROGRESS / SELF_TESTING）。
        // 不限开发角色:单人项目的任务可属于任何岗位(产品记灵感/测试跟硬件),按 assignee=me 查询天然安全
        {
            List<BizTask> myTasks = taskMapper.selectList(
                    new LambdaQueryWrapper<BizTask>()
                            .eq(BizTask::getAssigneeId, userId)
                            .in(BizTask::getStatus, BizConstants.TASK_TODO,
                                    BizConstants.TASK_IN_PROGRESS, BizConstants.TASK_SELF_TESTING));
            for (BizTask t : myTasks) {
                List<String> actions = new ArrayList<>();
                if (BizConstants.TASK_TODO.equals(t.getStatus())) actions.add("TASK_START");
                else if (BizConstants.TASK_IN_PROGRESS.equals(t.getStatus())) actions.add("TASK_SELF_TEST");
                else if (BizConstants.TASK_SELF_TESTING.equals(t.getStatus())) actions.add("TASK_SUBMIT_TEST");
                actions.add("VIEW");
                Map<String, Object> m = enrich(buildTodo("TASK", t.getProjectId(), t.getId(), t.getTaskName(),
                        t.getPriority(), t.getStatus(), t.getDueDate(), actions), "开发任务", t.getCreatedAt(), t.getCreatedBy());
                m.put("estimatedHours", t.getEstimatedHours());
                todos.add(m);
            }
            // 指派给我修复的 Bug（OPEN/CONFIRMED/FIXING/REOPENED）
            List<BizBug> myBugs = bugMapper.selectList(
                    new LambdaQueryWrapper<BizBug>()
                            .eq(BizBug::getAssigneeId, userId)
                            .in(BizBug::getStatus, BizConstants.BUG_OPEN, BizConstants.BUG_CONFIRMED,
                                    BizConstants.BUG_FIXING, BizConstants.BUG_REOPENED));
            for (BizBug b : myBugs) {
                List<String> actions = new ArrayList<>();
                if (BizConstants.BUG_OPEN.equals(b.getStatus()) || BizConstants.BUG_REOPENED.equals(b.getStatus()))
                    actions.add("BUG_CONFIRM");
                else if (BizConstants.BUG_CONFIRMED.equals(b.getStatus())) actions.add("BUG_START_FIX");
                else if (BizConstants.BUG_FIXING.equals(b.getStatus())) actions.add("BUG_FIXED");
                actions.add("VIEW");
                Map<String, Object> m = enrich(buildTodo("BUG_FIX", b.getProjectId(), b.getId(), b.getTitle(),
                        b.getPriority(), b.getStatus(), null, actions), "修复缺陷", b.getCreatedAt(), b.getReporterId());
                m.put("severity", b.getSeverity());
                todos.add(m);
            }
        }

        // 4) 测试：待审批的提测单（PENDING，且不是我自己提交的——防自审）
        if (isQa) {
            List<BizSubmitTest> pendingSt = submitTestMapper.selectList(
                    new LambdaQueryWrapper<BizSubmitTest>()
                            .eq(BizSubmitTest::getStatus, "PENDING"));
            for (BizSubmitTest st : pendingSt) {
                if (st.getSubmitterId() != null && st.getSubmitterId().equals(userId)) continue; // 防自审：不展示自己提交的
                BizRequirement req = requirementMapper.selectById(st.getRequirementId());
                String title = req != null ? req.getTitle() : ("#" + st.getRequirementId());
                todos.add(enrich(buildTodo("SUBMIT_TEST_APPROVE", st.getProjectId(), st.getId(), title,
                        null, st.getStatus(), null, Arrays.asList("ST_APPROVE", "ST_REJECT", "VIEW")),
                        "提测审批", st.getCreatedAt(), st.getSubmitterId()));
            }
            // 待验证的缺陷（FIXED，且不是我修复的——防自验）。
            // 不限报告人：验证是 QA 的职责,PM 报告的缺陷修复后同样需要 QA 验证,
            // 否则 FIXED 状态会无人认领而滞留
            List<BizBug> toVerify = bugMapper.selectList(
                    new LambdaQueryWrapper<BizBug>()
                            .eq(BizBug::getStatus, BizConstants.BUG_FIXED));
            for (BizBug b : toVerify) {
                if (b.getFixerId() != null && b.getFixerId().equals(userId)) continue; // 防自验
                // 等待时长从修复完成算起:验证积压的是"修好后没人验"的时间
                Map<String, Object> m = enrich(buildTodo("BUG_VERIFY", b.getProjectId(), b.getId(), b.getTitle(),
                        b.getPriority(), b.getStatus(), null, Arrays.asList("BUG_VERIFY", "BUG_REOPEN", "VIEW")),
                        "验证缺陷", b.getFixedAt() != null ? b.getFixedAt() : b.getCreatedAt(), b.getFixerId());
                m.put("severity", b.getSeverity());
                todos.add(m);
            }
            // 待测试的任务（TESTING）：开发已提测，由QA测试通过后置DONE，或打回开发
            List<BizTask> testingTasks = taskMapper.selectList(
                    new LambdaQueryWrapper<BizTask>()
                            .eq(BizTask::getStatus, BizConstants.TASK_TESTING));
            for (BizTask t : testingTasks) {
                // 防自审：QA不能验证自己作为负责人的开发任务
                if (t.getAssigneeId() != null && t.getAssigneeId().equals(userId)) continue;
                Map<String, Object> m = enrich(buildTodo("TASK", t.getProjectId(), t.getId(), t.getTaskName(),
                        t.getPriority(), t.getStatus(), t.getDueDate(),
                        Arrays.asList("TASK_TEST_PASS", "TASK_TEST_REJECT", "VIEW")),
                        "待测试任务", t.getCreatedAt(), t.getAssigneeId());
                m.put("estimatedHours", t.getEstimatedHours());
                todos.add(m);
            }
        }

        // 5) 产品经理 / 负责人：开发完成待发起提测协调（DEVELOPED 且 ownerId = 当前用户）
        if (isPm || isTl) {
            List<BizRequirement> developed = requirementMapper.selectList(
                    new LambdaQueryWrapper<BizRequirement>()
                            .eq(BizRequirement::getOwnerId, userId)
                            .eq(BizRequirement::getStatus, BizConstants.REQ_DEVELOPED));
            for (BizRequirement req : developed) {
                todos.add(enrich(buildTodo("REQUIREMENT_DEVELOPED", req.getProjectId(), req.getId(), req.getTitle(),
                        req.getPriority(), req.getStatus(), req.getExpectedCompletionDate(),
                        Arrays.asList("VIEW")), "待提测协调", req.getCreatedAt(), req.getCreatedBy()));
            }
        }

        // 5.5) QA:待生产冒烟确认的发布单(发布最后一公里卡点)
        if (isQa) {
            for (BizReleaseOrder ro : releaseOrderService.pendingSmoke()) {
                todos.add(enrich(buildTodo("RELEASE_SMOKE", ro.getProjectId(), ro.getId(), ro.getTitle(),
                        "P0", ro.getStatus(), null, Arrays.asList("VIEW")),
                        "生产冒烟验证", ro.getCreatedAt(), ro.getCreatedBy()));
            }
        }

        // 5.7) 工单:待分诊的单进分诊人(ticket:triage)待办;SLA 截止日参与逾期打分,越临期越靠前
        if (roleChecker.hasPermission(userId, "ticket:triage")) {
            for (BizTicket t : ticketMapper.selectList(new LambdaQueryWrapper<BizTicket>()
                    .eq(BizTicket::getStatus, BizConstants.TICKET_PENDING_TRIAGE))) {
                Map<String, Object> m = enrich(buildTodo("TICKET_TRIAGE", t.getProjectId(), t.getId(), t.getTitle(),
                        t.getPriority(), t.getStatus(),
                        t.getSlaDueAt() != null ? t.getSlaDueAt().toLocalDate() : null,
                        Arrays.asList("TRIAGE", "VIEW")), "工单分诊", t.getCreatedAt(), t.getReporterId());
                m.put("bizCode", t.getTicketCode());
                m.put("source", t.getSource());
                m.put("category", t.getCategory());
                todos.add(m);
            }
        }
        // 5.8) 我负责处理的工单(已分派/处理中)
        for (BizTicket t : ticketMapper.selectList(new LambdaQueryWrapper<BizTicket>()
                .eq(BizTicket::getAssigneeId, userId)
                .in(BizTicket::getStatus, BizConstants.TICKET_DISPATCHED, BizConstants.TICKET_PROCESSING))) {
            Map<String, Object> m = enrich(buildTodo("TICKET_HANDLE", t.getProjectId(), t.getId(), t.getTitle(),
                    t.getPriority(), t.getStatus(),
                    t.getSlaDueAt() != null ? t.getSlaDueAt().toLocalDate() : null,
                    Arrays.asList("VIEW")), "处理工单", t.getCreatedAt(), t.getReporterId());
            m.put("bizCode", t.getTicketCode());
            m.put("source", t.getSource());
            m.put("category", t.getCategory());
            todos.add(m);
        }

        // 6) 我负责的未解决技术债(OPEN/SCHEDULED)——债务入待办,低权重常驻提醒,消除"记了白记"
        List<BizTechDebt> myDebts = techDebtMapper.selectList(
                new LambdaQueryWrapper<BizTechDebt>()
                        .in(BizTechDebt::getStatus, "PENDING", "OPEN", "SCHEDULED")
                        .and(w -> w.eq(BizTechDebt::getAssigneeId, userId)
                                .or(o -> o.isNull(BizTechDebt::getAssigneeId).eq(BizTechDebt::getCreatedBy, userId))));
        for (BizTechDebt d : myDebts) {
            Map<String, Object> m = enrich(buildTodo("TECH_DEBT", d.getProjectId(), d.getId(), d.getTitle(),
                    "P3", d.getStatus(), null, Arrays.asList("VIEW")), "技术债待偿还", d.getCreatedAt(), d.getCreatedBy());
            m.put("estimatedHours", d.getEstimatedHours());
            todos.add(m);
        }

        // 回填项目名与单人项目标记:多项目并行时,待办必须一眼可辨"这是哪个项目的活"
        java.util.Set<Long> pids = new java.util.HashSet<>();
        for (Map<String, Object> t : todos) {
            Object pid = t.get("projectId");
            if (pid instanceof Long) pids.add((Long) pid);
        }
        if (!pids.isEmpty()) {
            Map<Long, BizProject> pmap = new HashMap<>();
            for (BizProject p : projectMapper.selectBatchIds(pids)) pmap.put(p.getId(), p);
            for (Map<String, Object> t : todos) {
                Object pid = t.get("projectId");
                BizProject p = pid instanceof Long ? pmap.get(pid) : null;
                boolean priv = p != null && "PRIVATE".equals(p.getVisibility());
                t.put("projectName", p != null ? p.getProjectName() : null);
                t.put("privateProject", priv);
                // 单人项目任务提供"转报团队"入口:验证有价值的工作一键升级为正式流程
                if (priv && "TASK".equals(t.get("type"))) {
                    List<String> acts = new ArrayList<>((List<String>) t.get("actions"));
                    acts.add(0, "PROMOTE");
                    t.put("actions", acts);
                }
            }
        }

        // 回填相关人昵称:一眼看出"这活谁提的/谁在等我"(评审=创建人、缺陷=报告人、验证=修复人、工单=提交人)
        java.util.Set<Long> uids = new java.util.HashSet<>();
        for (Map<String, Object> t : todos) {
            Object uid = t.get("fromUserId");
            if (uid instanceof Long) uids.add((Long) uid);
        }
        if (!uids.isEmpty()) {
            Map<Long, String> umap = new HashMap<>();
            for (SysUser u : userMapper.selectBatchIds(uids)) {
                umap.put(u.getId(), org.springframework.util.StringUtils.hasText(u.getNickname())
                        ? u.getNickname() : u.getUsername());
            }
            for (Map<String, Object> t : todos) {
                Object uid = t.get("fromUserId");
                if (uid instanceof Long) t.put("fromUser", umap.get(uid));
            }
        }

        // 统一按"优先级+逾期+状态+类型"打分降序：最该做的排最前，附带 score/scoreExplain 供前端展示
        todoRankService.rank(todos);

        Map<String, Object> result = new HashMap<>();
        result.put("total", todos.size());
        result.put("items", todos);
        return result;
    }

    /**
     * 个人周报:本周(周一起)我完成的任务(团队/单人分组)+关闭的缺陷+执行的用例,附一键复制的文本。
     * 单人项目是正式工作,周报正是其"留痕"价值的出口。
     */
    public Map<String, Object> myWeek() {
        Long userId = SecurityContextHolder.getCurrentUserId();
        LocalDate monday = LocalDate.now().with(java.time.DayOfWeek.MONDAY);
        java.time.LocalDateTime weekStart = monday.atStartOfDay();

        List<BizTask> done = taskMapper.selectList(new LambdaQueryWrapper<BizTask>()
                .eq(BizTask::getAssigneeId, userId)
                .eq(BizTask::getStatus, BizConstants.TASK_DONE)
                .ge(BizTask::getCompletedAt, weekStart));
        List<BizTask> doing = taskMapper.selectList(new LambdaQueryWrapper<BizTask>()
                .eq(BizTask::getAssigneeId, userId)
                .in(BizTask::getStatus, BizConstants.TASK_IN_PROGRESS, BizConstants.TASK_SELF_TESTING, BizConstants.TASK_TESTING));
        long bugsClosed = bugMapper.selectCount(new LambdaQueryWrapper<BizBug>()
                .eq(BizBug::getFixerId, userId)
                .in(BizBug::getStatus, BizConstants.BUG_VERIFIED, BizConstants.BUG_CLOSED)
                .ge(BizBug::getClosedAt, weekStart));
        long casesRun = testCaseMapper.selectCount(new LambdaQueryWrapper<BizTestCase>()
                .eq(BizTestCase::getExecutedBy, userId)
                .ge(BizTestCase::getExecutedAt, weekStart));

        // 项目名映射与团队/单人分组
        java.util.Set<Long> pset = new java.util.HashSet<>();
        for (BizTask t : done) if (t.getProjectId() != null) pset.add(t.getProjectId());
        for (BizTask t : doing) if (t.getProjectId() != null) pset.add(t.getProjectId());
        Map<Long, BizProject> pm = new HashMap<>();
        if (!pset.isEmpty()) for (BizProject p : projectMapper.selectBatchIds(pset)) pm.put(p.getId(), p);

        double hours = 0;
        StringBuilder team = new StringBuilder(), solo = new StringBuilder(), plan = new StringBuilder();
        for (BizTask t : done) {
            BizProject p = pm.get(t.getProjectId());
            boolean priv = p != null && "PRIVATE".equals(p.getVisibility());
            String line = "- [" + (p != null ? p.getProjectName() : "-") + "] " + t.getTaskName()
                    + (t.getActualHours() != null && t.getActualHours().doubleValue() > 0
                        ? "(" + t.getActualHours() + "h)" : "") + "\n";
            if (priv) solo.append(line); else team.append(line);
            if (t.getActualHours() != null) hours += t.getActualHours().doubleValue();
        }
        for (BizTask t : doing) {
            BizProject p = pm.get(t.getProjectId());
            plan.append("- [").append(p != null ? p.getProjectName() : "-").append("] ")
                .append(t.getTaskName()).append("(进行中)\n");
        }
        StringBuilder rpt = new StringBuilder("【本周工作汇报】\n");
        if (team.length() > 0) rpt.append("一、团队项目完成:\n").append(team);
        if (solo.length() > 0) rpt.append("二、个人负责项目完成:\n").append(solo);
        if (bugsClosed > 0 || casesRun > 0) {
            rpt.append("三、质量工作: 关闭缺陷 ").append(bugsClosed).append(" 个,执行用例 ").append(casesRun).append(" 条\n");
        }
        if (plan.length() > 0) rpt.append("四、进行中/下周继续:\n").append(plan);
        rpt.append("本周投入工时合计: ").append(hours).append("h");

        Map<String, Object> r = new HashMap<>();
        r.put("doneCount", done.size());
        r.put("doingCount", doing.size());
        r.put("bugsClosed", bugsClosed);
        r.put("casesRun", casesRun);
        r.put("totalHours", hours);
        r.put("reportText", rpt.toString());
        return r;
    }

    /** 是否存在启用状态的 biz:override 持有人(用户→角色→权限 三级联查) */
    private boolean bizOverrideHolderExists() {
        SysPermission perm = permissionMapper.selectOne(new LambdaQueryWrapper<SysPermission>()
                .eq(SysPermission::getPermissionCode, "biz:override"));
        if (perm == null) return false;
        List<SysRolePermission> rps = rolePermissionMapper.selectList(new LambdaQueryWrapper<SysRolePermission>()
                .eq(SysRolePermission::getPermissionId, perm.getId()));
        if (rps.isEmpty()) return false;
        List<Long> roleIds = new ArrayList<>();
        for (SysRolePermission rp : rps) roleIds.add(rp.getRoleId());
        List<SysUserRole> urs = userRoleMapper.selectList(new LambdaQueryWrapper<SysUserRole>()
                .in(SysUserRole::getRoleId, roleIds));
        if (urs.isEmpty()) return false;
        List<Long> userIds = new ArrayList<>();
        for (SysUserRole ur : urs) userIds.add(ur.getUserId());
        return userMapper.selectCount(new LambdaQueryWrapper<SysUser>()
                .in(SysUser::getId, userIds)
                .eq(SysUser::getStatus, 1)) > 0;
    }

    /**
     * 补充待办明细:类型中文标签(前端渲染彩色标签,标题不再带前缀)、创建时间(算等待时长)、
     * 相关人(创建/报告/修复/提交人,统一回填昵称到 fromUser)。
     */
    private Map<String, Object> enrich(Map<String, Object> m, String typeLabel,
                                       LocalDateTime createdAt, Long fromUserId) {
        m.put("typeLabel", typeLabel);
        m.put("createdAt", createdAt);
        m.put("fromUserId", fromUserId);
        return m;
    }

    private Map<String, Object> buildTodo(String type, Long projectId, Long bizId, String title,
                                          String priority, String status, LocalDate dueDate,
                                          List<String> actions) {
        Map<String, Object> m = new HashMap<>();
        m.put("type", type);
        m.put("projectId", projectId);
        m.put("bizId", bizId);
        m.put("title", title);
        m.put("priority", priority);
        m.put("status", status);
        m.put("dueDate", dueDate);
        m.put("actions", actions);
        return m;
    }

    public Map<String, Object> metrics(Long projectId) {
        Map<String, Object> data = new HashMap<>();

        LambdaQueryWrapper<BizRequirement> reqWrapper = new LambdaQueryWrapper<>();
        if (projectId != null) reqWrapper.eq(BizRequirement::getProjectId, projectId);
        data.put("totalRequirements", requirementMapper.selectCount(reqWrapper));

        reqWrapper = new LambdaQueryWrapper<>();
        if (projectId != null) reqWrapper.eq(BizRequirement::getProjectId, projectId);
        reqWrapper.eq(BizRequirement::getStatus, "CLOSED");
        data.put("closedRequirements", requirementMapper.selectCount(reqWrapper));

        LambdaQueryWrapper<BizTask> taskWrapper = new LambdaQueryWrapper<>();
        if (projectId != null) taskWrapper.eq(BizTask::getProjectId, projectId);
        data.put("totalTasks", taskMapper.selectCount(taskWrapper));

        taskWrapper = new LambdaQueryWrapper<>();
        if (projectId != null) taskWrapper.eq(BizTask::getProjectId, projectId);
        taskWrapper.eq(BizTask::getStatus, "DONE");
        data.put("doneTasks", taskMapper.selectCount(taskWrapper));

        LambdaQueryWrapper<BizBug> bugWrapper = new LambdaQueryWrapper<>();
        if (projectId != null) bugWrapper.eq(BizBug::getProjectId, projectId);
        data.put("totalBugs", bugMapper.selectCount(bugWrapper));

        bugWrapper = new LambdaQueryWrapper<>();
        if (projectId != null) bugWrapper.eq(BizBug::getProjectId, projectId);
        bugWrapper.eq(BizBug::getStatus, "CLOSED");
        data.put("closedBugs", bugMapper.selectCount(bugWrapper));

        bugWrapper = new LambdaQueryWrapper<>();
        if (projectId != null) bugWrapper.eq(BizBug::getProjectId, projectId);
        bugWrapper.eq(BizBug::getSeverity, "CRITICAL");
        bugWrapper.notIn(BizBug::getStatus, "CLOSED", "VERIFIED");
        data.put("criticalOpenBugs", bugMapper.selectCount(bugWrapper));

        return data;
    }
}
