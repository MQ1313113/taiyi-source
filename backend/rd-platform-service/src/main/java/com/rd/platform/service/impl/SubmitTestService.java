package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.constant.BizConstants;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.BizRequirement;
import com.rd.platform.model.entity.BizSubmitTest;
import com.rd.platform.model.entity.BizTask;
import com.rd.platform.model.entity.BizTestCase;
import com.rd.platform.model.mapper.BizRequirementMapper;
import com.rd.platform.model.mapper.BizSubmitTestMapper;
import com.rd.platform.model.mapper.BizTaskMapper;
import com.rd.platform.model.mapper.BizTestCaseMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.time.LocalDateTime;

/**
 * 提测业务逻辑（从原胖 Controller 抽出，Controller 仅保留 HTTP 映射与委托）。
 * 集中承载：提测五重卡点(FP-ST-03/04/05)、审批/驳回门禁、R2 防自审、项目级数据隔离与通知。
 */
@Service
public class SubmitTestService {

    @Autowired
    private BizSubmitTestMapper submitTestMapper;

    @Autowired
    private BizRequirementMapper requirementMapper;

    @Autowired
    private BizTestCaseMapper testCaseMapper;

    @Autowired
    private BizTaskMapper taskMapper;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private RoleChecker roleChecker;

    @Autowired
    private ProjectAccessGuard projectAccessGuard;

    @Autowired
    private ReworkLogRecorder reworkLogRecorder;

    public Page<BizSubmitTest> list(Integer pageNum, Integer pageSize, Long projectId, String status) {
        Page<BizSubmitTest> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizSubmitTest> wrapper = new LambdaQueryWrapper<>();
        // 项目级数据隔离：非管理员只能看到自己所属项目的提测单
        java.util.List<Long> accessible = projectAccessGuard.accessibleProjectIds(SecurityContextHolder.getCurrentUserId());
        if (accessible != null) {
            if (accessible.isEmpty()) return page;
            wrapper.in(BizSubmitTest::getProjectId, accessible);
        }
        if (projectId != null) wrapper.eq(BizSubmitTest::getProjectId, projectId);
        if (status != null) wrapper.eq(BizSubmitTest::getStatus, status);
        wrapper.orderByDesc(BizSubmitTest::getCreatedAt);
        return submitTestMapper.selectPage(page, wrapper);
    }

    public BizSubmitTest submit(SubmitTestRequest request) {
        Long currentUserId = SecurityContextHolder.getCurrentUserId();

        // Validate requirement status
        BizRequirement req = requirementMapper.selectById(request.getRequirementId());
        if (req == null) throw BusinessException.badRequest("需求不存在");
        if (!BizConstants.REQ_DEVELOPED.equals(req.getStatus())) {
            throw BusinessException.badRequest("只有开发完成状态的需求可以提测");
        }

        // 底线护栏：提测前该需求关联的测试用例必须全部锁定(LOCKED)，且至少存在一条用例
        long totalCases = testCaseMapper.selectCount(
                new LambdaQueryWrapper<BizTestCase>()
                        .eq(BizTestCase::getRequirementId, request.getRequirementId()));
        if (totalCases == 0) {
            throw BusinessException.badRequest("提测前必须为该需求编写至少一条测试用例");
        }
        long unlockedCases = testCaseMapper.selectCount(
                new LambdaQueryWrapper<BizTestCase>()
                        .eq(BizTestCase::getRequirementId, request.getRequirementId())
                        .ne(BizTestCase::getStatus, "LOCKED"));
        if (unlockedCases > 0) {
            throw BusinessException.badRequest("提测前必须锁定所有关联的测试用例，当前还有 " + unlockedCases + " 条未锁定");
        }

        // 卡点一(FP-ST-03 / PRD 25.3.3)：该需求全部开发任务必须完成自测(SELF_TESTING以上)
        long totalTasks = taskMapper.selectCount(
                new LambdaQueryWrapper<BizTask>().eq(BizTask::getRequirementId, request.getRequirementId()));
        if (totalTasks > 0) {
            long notSelfTested = taskMapper.selectCount(
                    new LambdaQueryWrapper<BizTask>()
                            .eq(BizTask::getRequirementId, request.getRequirementId())
                            .in(BizTask::getStatus, BizConstants.TASK_TODO, BizConstants.TASK_IN_PROGRESS));
            if (notSelfTested > 0) {
                throw BusinessException.badRequest("提测前该需求下所有开发任务必须完成自测，当前还有 " + notSelfTested + " 个任务未完成自测");
            }
        }

        // 卡点二(FP-ST-04 / PRD 25.3.3)：AC覆盖率必须100%（需求每条AC都有用例覆盖）
        // 以验收标准换行数估算AC条数，用例 acRef 去重后为已覆盖AC数
        if (req.getAcceptanceCriteria() != null) {
            java.util.Set<String> coveredAc = new java.util.HashSet<>();
            for (BizTestCase c : testCaseMapper.selectList(new LambdaQueryWrapper<BizTestCase>()
                    .eq(BizTestCase::getRequirementId, request.getRequirementId()))) {
                if (c.getAcRef() != null && !c.getAcRef().trim().isEmpty()) coveredAc.add(c.getAcRef().trim());
            }
            // AC 条数口径：优先按 Given/假设 段计数（一组 Given-When-Then 为一条AC）；
            // 若无 Given 关键词，则退化为按非空行计数。
            String acText = req.getAcceptanceCriteria();
            int acTotal = 0;
            java.util.regex.Matcher gm = java.util.regex.Pattern
                    .compile("(?im)^(\\s*)(given|假设)\\b").matcher(acText);
            while (gm.find()) acTotal++;
            if (acTotal == 0) {
                for (String line : acText.split("\\n")) {
                    if (line.trim().length() > 0) acTotal++;
                }
            }
            if (acTotal > 0 && coveredAc.size() < acTotal) {
                throw BusinessException.badRequest("提测前AC覆盖率必须达100%：共 " + acTotal + " 条AC，已覆盖 " + coveredAc.size() + " 条");
            }
        }

        // 卡点三(FP-ST-05 / PRD 25.3.3)：异常/边界用例占比必须≥0.25
        long allCases = testCaseMapper.selectCount(new LambdaQueryWrapper<BizTestCase>()
                .eq(BizTestCase::getRequirementId, request.getRequirementId()));
        long abnormalCases = testCaseMapper.selectCount(new LambdaQueryWrapper<BizTestCase>()
                .eq(BizTestCase::getRequirementId, request.getRequirementId())
                .and(w -> w.like(BizTestCase::getCaseName, "异常")
                        .or().like(BizTestCase::getCaseName, "边界")
                        .or().like(BizTestCase::getCaseName, "异常")));
        if (allCases > 0 && (double) abnormalCases / allCases < 0.25) {
            throw BusinessException.badRequest("提测前异常/边界用例占比必须≥25%，当前为 "
                    + String.format("%.0f%%", 100.0 * abnormalCases / allCases));
        }

        BizSubmitTest st = new BizSubmitTest();
        st.setRequirementId(request.getRequirementId());
        st.setProjectId(request.getProjectId());
        st.setSprintId(request.getSprintId());
        st.setSubmitterId(currentUserId);
        st.setDescription(request.getDescription());
        st.setStatus("PENDING");
        submitTestMapper.insert(st);
        return st;
    }

    public void approve(Long id) {
        BizSubmitTest st = submitTestMapper.selectById(id);
        if (st == null) throw BusinessException.badRequest("提测单不存在");
        Long currentUserId = SecurityContextHolder.getCurrentUserId();
        // 角色门禁：只有测试人员可以审批提测单
        if (!roleChecker.hasPermission(currentUserId, "submit:approve")) {
            throw BusinessException.forbidden("只有测试人员可以审批提测单");
        }
        // 底线护栏 R2：提测提交人不能作为本提测单的审批人（防自审）
        if (st.getSubmitterId() != null && st.getSubmitterId().equals(currentUserId)) {
            throw BusinessException.badRequest("提测提交人不能审批自己提交的提测单，请由其他人员审批");
        }
        if (!"PENDING".equals(st.getStatus())) {
            throw BusinessException.badRequest("该提测单已被处理，不可重复审批");
        }
        st.setStatus("APPROVED");
        st.setApproverId(currentUserId);
        st.setApprovedAt(LocalDateTime.now());
        submitTestMapper.updateById(st);

        // Update requirement status to TESTING
        BizRequirement req = requirementMapper.selectById(st.getRequirementId());
        if (req != null) {
            req.setStatus(BizConstants.REQ_TESTING);
            requirementMapper.updateById(req);
        }

        // 强提醒：通知提测提交人审批已通过
        if (st.getSubmitterId() != null) {
            String reqName = req != null ? req.getTitle() : "未知需求";
            notificationService.sendNotification(st.getSubmitterId(), "提测审批通过",
                    "您提交的需求「" + reqName + "」提测单已通过审批，已进入测试阶段",
                    "STATUS_CHANGE", "SUBMIT_TEST", id);
        }
    }

    public void reject(Long id, RejectRequest request) {
        BizSubmitTest st = submitTestMapper.selectById(id);
        if (st == null) throw BusinessException.badRequest("提测单不存在");
        Long uid = SecurityContextHolder.getCurrentUserId();
        projectAccessGuard.assertAccess(uid, st.getProjectId(), "提测单");
        // 门禁：仅测试人员可驳回；且提交人不能驳回自己的提测单（R2 防自审）
        if (!roleChecker.hasPermission(uid, "submit:approve")) {
            throw BusinessException.forbidden("只有测试人员可以驳回提测单");
        }
        if (st.getSubmitterId() != null && st.getSubmitterId().equals(uid)) {
            throw BusinessException.badRequest("提测提交人不能驳回自己提交的提测单，请由其他人员处理");
        }
        if (!"PENDING".equals(st.getStatus())) {
            throw BusinessException.badRequest("该提测单已被处理，不可重复驳回");
        }
        st.setStatus("REJECTED");
        st.setApproverId(SecurityContextHolder.getCurrentUserId());
        st.setRejectReason(request.getReason());
        submitTestMapper.updateById(st);

        // 打回归因：提测被驳回=开发没做好(未达提测标准),责任方=提测提交人
        reworkLogRecorder.record(BizConstants.REWORK_ENTITY_SUBMIT_TEST, id, st.getProjectId(),
                "PENDING", "REJECTED", BizConstants.REWORK_DEV_POOR, request.getReason(),
                st.getSubmitterId(), uid);

        // 强提醒：通知提测提交人审批被驳回
        if (st.getSubmitterId() != null) {
            BizRequirement req = requirementMapper.selectById(st.getRequirementId());
            String reqName = req != null ? req.getTitle() : "未知需求";
            notificationService.sendUrgentNotification(st.getSubmitterId(), "提测被驳回",
                    "您提交的需求「" + reqName + "」提测单被驳回，原因：" + request.getReason(),
                    "STATUS_CHANGE", "SUBMIT_TEST", id);
        }
    }

    @Data
    public static class SubmitTestRequest {
        @NotNull(message = "需求ID不能为空")
        private Long requirementId;
        @NotNull(message = "项目ID不能为空")
        private Long projectId;
        private Long sprintId;
        private String description;
    }

    @Data
    public static class RejectRequest {
        @NotBlank(message = "驳回原因不能为空")
        private String reason;
    }
}
