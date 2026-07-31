package com.rd.platform.service.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rd.platform.common.constant.BizConstants;
import com.rd.platform.common.utils.Result;
import com.rd.platform.model.entity.*;
import com.rd.platform.model.mapper.*;
import com.rd.platform.security.context.SecurityContextHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

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

    @GetMapping("/overview")
    public Result<?> overview() {
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
        return Result.success(data);
    }

    /**
     * 统一"我的待办"聚合接口。
     * 底线护栏：按当前登录用户的角色 + 业务归属，仅返回归属于他且他有权操作的待办；
     * 每条待办附带后端计算的合法 actions，前端只渲染这些动作按钮，从源头杜绝越权可点。
     */
    @GetMapping("/my-todo")
    public Result<?> myTodo() {
        Long userId = SecurityContextHolder.getCurrentUserId();
        List<String> roles = SecurityContextHolder.getCurrentRoles();
        if (roles == null) roles = new ArrayList<>();

        List<Map<String, Object>> todos = new ArrayList<>();

        boolean isPm = roles.contains(BizConstants.ROLE_PM) || roles.contains(BizConstants.ROLE_SYS_ADMIN);
        boolean isTl = roles.contains("pm") || roles.contains(BizConstants.ROLE_SYS_ADMIN);
        boolean isDev = roles.contains(BizConstants.ROLE_DEV) || roles.contains(BizConstants.ROLE_SYS_ADMIN);
        boolean isQa = roles.contains(BizConstants.ROLE_QA) || roles.contains(BizConstants.ROLE_SYS_ADMIN);

        // 0) 负责人：我负责的草稿需求待提交评审（DRAFT 且 ownerId = 当前用户）
        //    修复：产品创建需求并指定负责人后，需求处于草稿，需让负责人在工作台看到并发起评审，避免流程卡死。
        List<BizRequirement> myDraftOwned = requirementMapper.selectList(
                new LambdaQueryWrapper<BizRequirement>()
                        .eq(BizRequirement::getOwnerId, userId)
                        .eq(BizRequirement::getStatus, BizConstants.REQ_DRAFT));
        for (BizRequirement req : myDraftOwned) {
            todos.add(buildTodo("REQUIREMENT_SUBMIT_REVIEW", req.getId(), "待提交评审：" + req.getTitle(),
                    req.getPriority(), req.getStatus(),
                    Arrays.asList("SUBMIT_REVIEW", "VIEW")));
        }

        // 1) 待我评审的需求（评审记录 PENDING 且 reviewerId = 当前用户）
        List<BizRequirementReview> myReviews = reviewMapper.selectList(
                new LambdaQueryWrapper<BizRequirementReview>()
                        .eq(BizRequirementReview::getReviewerId, userId)
                        .eq(BizRequirementReview::getResult, "PENDING"));
        for (BizRequirementReview rv : myReviews) {
            BizRequirement req = requirementMapper.selectById(rv.getRequirementId());
            if (req == null || !BizConstants.REQ_REVIEWING.equals(req.getStatus())) continue;
            todos.add(buildTodo("REQUIREMENT_REVIEW", req.getId(), "需求评审：" + req.getTitle(),
                    req.getPriority(), req.getStatus(),
                    Arrays.asList("REVIEW_APPROVE", "REVIEW_REJECT", "VIEW")));
        }

        // 2) 产品经理：评审通过待拆解的需求（DEVELOPING 且 ownerId = 当前用户）
        if (isTl) {
            List<BizRequirement> toBreakdown = requirementMapper.selectList(
                    new LambdaQueryWrapper<BizRequirement>()
                            .eq(BizRequirement::getOwnerId, userId)
                            .eq(BizRequirement::getStatus, BizConstants.REQ_DEVELOPING));
            for (BizRequirement req : toBreakdown) {
                todos.add(buildTodo("REQUIREMENT_BREAKDOWN", req.getId(), "待拆解任务：" + req.getTitle(),
                        req.getPriority(), req.getStatus(),
                        Arrays.asList("CREATE_TASK", "MARK_DEVELOPED", "VIEW")));
            }
        }

        // 3) 开发：指派给我的任务（TODO / IN_PROGRESS / SELF_TESTING）
        if (isDev) {
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
                todos.add(buildTodo("TASK", t.getId(), "开发任务：" + t.getTaskName(),
                        t.getPriority(), t.getStatus(), actions));
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
                todos.add(buildTodo("BUG_FIX", b.getId(), "修复缺陷：" + b.getTitle(),
                        b.getPriority(), b.getStatus(), actions));
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
                todos.add(buildTodo("SUBMIT_TEST_APPROVE", st.getId(), "提测审批：" + title,
                        null, st.getStatus(), Arrays.asList("ST_APPROVE", "ST_REJECT", "VIEW")));
            }
            // 待我验证的缺陷（FIXED，且不是我修复的——防自验）
            List<BizBug> toVerify = bugMapper.selectList(
                    new LambdaQueryWrapper<BizBug>()
                            .eq(BizBug::getReporterId, userId)
                            .eq(BizBug::getStatus, BizConstants.BUG_FIXED));
            for (BizBug b : toVerify) {
                if (b.getFixerId() != null && b.getFixerId().equals(userId)) continue; // 防自验
                todos.add(buildTodo("BUG_VERIFY", b.getId(), "验证缺陷：" + b.getTitle(),
                        b.getPriority(), b.getStatus(), Arrays.asList("BUG_VERIFY", "BUG_REOPEN", "VIEW")));
            }
            // 待测试的任务（TESTING）：开发已提测，由QA测试通过后置DONE，或打回开发
            List<BizTask> testingTasks = taskMapper.selectList(
                    new LambdaQueryWrapper<BizTask>()
                            .eq(BizTask::getStatus, BizConstants.TASK_TESTING));
            for (BizTask t : testingTasks) {
                // 防自审：QA不能验证自己作为负责人的开发任务
                if (t.getAssigneeId() != null && t.getAssigneeId().equals(userId)) continue;
                todos.add(buildTodo("TASK", t.getId(), "待测试任务：" + t.getTaskName(),
                        t.getPriority(), t.getStatus(), Arrays.asList("TASK_TEST_PASS", "TASK_TEST_REJECT", "VIEW")));
            }
        }

        // 5) 产品经理 / 负责人：开发完成待发起提测协调（DEVELOPED 且 ownerId = 当前用户）
        if (isPm || isTl) {
            List<BizRequirement> developed = requirementMapper.selectList(
                    new LambdaQueryWrapper<BizRequirement>()
                            .eq(BizRequirement::getOwnerId, userId)
                            .eq(BizRequirement::getStatus, BizConstants.REQ_DEVELOPED));
            for (BizRequirement req : developed) {
                todos.add(buildTodo("REQUIREMENT_DEVELOPED", req.getId(), "待提测协调：" + req.getTitle(),
                        req.getPriority(), req.getStatus(), Arrays.asList("VIEW")));
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("total", todos.size());
        result.put("items", todos);
        return Result.success(result);
    }

    private Map<String, Object> buildTodo(String type, Long bizId, String title,
                                          String priority, String status, List<String> actions) {
        Map<String, Object> m = new HashMap<>();
        m.put("type", type);
        m.put("bizId", bizId);
        m.put("title", title);
        m.put("priority", priority);
        m.put("status", status);
        m.put("actions", actions);
        return m;
    }

    @GetMapping("/metrics")
    public Result<?> metrics(@RequestParam(required = false) Long projectId) {
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

        return Result.success(data);
    }
}
