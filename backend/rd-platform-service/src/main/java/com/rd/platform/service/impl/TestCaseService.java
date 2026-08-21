package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.constant.BizConstants;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.common.utils.CsvUtils;
import com.rd.platform.model.entity.BizProject;
import com.rd.platform.model.entity.BizRequirement;
import com.rd.platform.model.entity.BizTestCase;
import com.rd.platform.model.mapper.BizProjectMapper;
import com.rd.platform.model.mapper.BizRequirementMapper;
import com.rd.platform.model.mapper.BizTestCaseMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 测试用例业务逻辑（从原胖 Controller 抽出，Controller 仅保留 HTTP 映射与委托）。
 * 集中承载：需求评审后才可编写用例、LOCKED 用例双人审批、P0/P1 证据必填、
 * AC 关联、批量导入护栏与项目级数据隔离。
 */
@Service
public class TestCaseService {

    @Autowired
    private BizTestCaseMapper testCaseMapper;

    @Autowired
    private BizRequirementMapper requirementMapper;

    @Autowired
    private com.rd.platform.model.mapper.BizTestCaseChangeMapper changeMapper;

    @Autowired
    private RoleChecker roleChecker;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private BizProjectMapper projectMapper;

    @Autowired
    private ProjectAccessGuard projectAccessGuard;

    public Page<BizTestCase> list(Integer pageNum, Integer pageSize, Long projectId, Long requirementId,
                                  String moduleName, String priority, String keyword) {
        Page<BizTestCase> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizTestCase> wrapper = new LambdaQueryWrapper<>();
        // 项目级数据隔离：非管理员只能看到自己所属项目的用例
        java.util.List<Long> accessible = projectAccessGuard.accessibleProjectIds(SecurityContextHolder.getCurrentUserId());
        if (accessible != null) {
            if (accessible.isEmpty()) return page;
            wrapper.in(BizTestCase::getProjectId, accessible);
        }
        if (projectId != null) wrapper.eq(BizTestCase::getProjectId, projectId);
        if (requirementId != null) wrapper.eq(BizTestCase::getRequirementId, requirementId);
        if (StringUtils.hasText(moduleName)) wrapper.eq(BizTestCase::getModuleName, moduleName);
        if (StringUtils.hasText(priority)) wrapper.eq(BizTestCase::getPriority, priority);
        if (StringUtils.hasText(keyword)) wrapper.like(BizTestCase::getCaseName, keyword);
        wrapper.orderByDesc(BizTestCase::getCreatedAt);
        return testCaseMapper.selectPage(page, wrapper);
    }

    public BizTestCase getById(Long id) {
        BizTestCase tc = testCaseMapper.selectById(id);
        if (tc == null) throw BusinessException.badRequest("测试用例不存在");
        return tc;
    }

    public BizTestCase create(TestCaseCreateRequest request) {
        // 个人项目直通:测试测外部系统/硬件的用例留痕,免关联需求与AC(没有对应需求可挂)
        boolean privateOwner = projectAccessGuard.isPrivateOwner(
                SecurityContextHolder.getCurrentUserId(), request.getProjectId());
        // 底线护栏：测试用例必须在需求评审通过、进入开发阶段后才能编写；
        // 草稿/评审中的需求变动极大，禁止提前编写用例。
        if (request.getRequirementId() != null) {
            BizRequirement req = requirementMapper.selectById(request.getRequirementId());
            if (req == null) {
                throw BusinessException.badRequest("关联的需求不存在");
            }
            if (BizConstants.REQ_DRAFT.equals(req.getStatus()) || BizConstants.REQ_REVIEWING.equals(req.getStatus())) {
                throw BusinessException.badRequest("需求尚未评审通过进入开发阶段，禁止编写测试用例");
            }
        }
        // FP-TC-04 / PRD 23.2：用例必须关联需求验收标准(AC)，保证可追溯(个人项目豁免)
        if (!privateOwner && request.getRequirementId() == null) {
            throw BusinessException.badRequest("测试用例必须关联需求");
        }
        if (!privateOwner && !StringUtils.hasText(request.getAcRef())) {
            throw BusinessException.badRequest("测试用例必须关联到需求的某条验收标准(AC)");
        }
        // 档位=团队成熟度：标准/完整档强制测试步骤为编号分步格式("1. xxx"),仅轻量档放开
        validateStepsStructure(request.getProjectId(), request.getSteps());
        BizTestCase tc = new BizTestCase();
        tc.setProjectId(request.getProjectId());
        tc.setRequirementId(request.getRequirementId());
        tc.setModuleName(request.getModuleName());
        tc.setCaseName(request.getCaseName());
        tc.setPrecondition(request.getPrecondition());
        tc.setSteps(request.getSteps());
        tc.setExpectedResult(request.getExpectedResult());
        tc.setPriority(request.getPriority());
        tc.setAcRef(request.getAcRef());
        tc.setStatus("DRAFT");
        tc.setCreatedBy(SecurityContextHolder.getCurrentUserId());
        testCaseMapper.insert(tc);
        return tc;
    }

    /** 标准/完整档强制测试步骤为编号行格式;轻量档(团队已被认可自觉)不限制 */
    private void validateStepsStructure(Long projectId, String steps) {
        if (projectId == null) return;
        BizProject project = projectMapper.selectById(projectId);
        String gear = BizConstants.normalizeGear(project != null ? project.getGearLevel() : null);
        if (BizConstants.GEAR_LIGHTWEIGHT.equals(gear)) return;

        boolean ok = steps != null && java.util.Arrays.stream(steps.split("\r?\n"))
                .map(String::trim).filter(l -> !l.isEmpty())
                .allMatch(l -> l.matches("^\\d+[.、)]\\s*.+$"))
                && steps.trim().length() > 0;
        if (!ok) {
            throw BusinessException.badRequest(
                    (BizConstants.GEAR_FULL.equals(gear) ? "完整档" : "标准档")
                    + "项目要求测试步骤逐条编号填写(如: 1. 打开页面)");
        }
    }

    public BizTestCase update(Long id, TestCaseCreateRequest request) {
        BizTestCase tc = testCaseMapper.selectById(id);
        if (tc == null) throw BusinessException.badRequest("测试用例不存在");
        // 已锁定用例的修改必须走双人审批（产品经理+管理员），禁止直接编辑
        if ("LOCKED".equals(tc.getStatus())) {
            throw BusinessException.badRequest("已锁定用例不可直接修改，请提交用例变更申请并经产品经理+管理员双人审批");
        }
        tc.setCaseName(request.getCaseName());
        tc.setPrecondition(request.getPrecondition());
        tc.setSteps(request.getSteps());
        tc.setExpectedResult(request.getExpectedResult());
        tc.setPriority(request.getPriority());
        testCaseMapper.updateById(tc);
        return tc;
    }

    /**
     * 用例变更申请(FP-TC-LIB / PRD 22)：任何用户可提交“修改/删除”申请，
     * 但必须经产品经理 + 管理员双人审批后才生效。
     */
    public com.rd.platform.model.entity.BizTestCaseChange requestChange(Long id, ChangeApplyRequest req) {
        BizTestCase tc = testCaseMapper.selectById(id);
        if (tc == null) throw BusinessException.badRequest("测试用例不存在");
        if (!"UPDATE".equals(req.getChangeType()) && !"DELETE".equals(req.getChangeType())) {
            throw BusinessException.badRequest("变更类型仅支持 UPDATE / DELETE");
        }
        com.rd.platform.model.entity.BizTestCaseChange ch = new com.rd.platform.model.entity.BizTestCaseChange();
        ch.setTestCaseId(id);
        ch.setChangeType(req.getChangeType());
        ch.setPayload(req.getPayload());
        ch.setReason(req.getReason());
        ch.setApplicantId(SecurityContextHolder.getCurrentUserId());
        ch.setStatus("PENDING");
        changeMapper.insert(ch);
        return ch;
    }

    /**
     * 双人审批：产品经理与管理员各签一次，集齐后生效。
     */
    public String approveChange(Long cid) {
        Long uid = SecurityContextHolder.getCurrentUserId();
        com.rd.platform.model.entity.BizTestCaseChange ch = changeMapper.selectById(cid);
        if (ch == null) throw BusinessException.badRequest("变更申请不存在");
        if ("REJECTED".equals(ch.getStatus()) || "APPROVED".equals(ch.getStatus())) {
            throw BusinessException.badRequest("该申请已结束，不可重复审批");
        }
        boolean isTL = roleChecker.hasPermission(uid, "testcase:approve");
        boolean isPM = roleChecker.hasPermission(uid, "testcase:approve");
        if (!isTL && !isPM) {
            throw BusinessException.forbidden("只有产品经理或管理员可审批用例变更");
        }
        // 记录双签
        if (isTL && ch.getTlApproverId() == null) ch.setTlApproverId(uid);
        if (isPM && ch.getPmApproverId() == null && (ch.getTlApproverId() == null || !ch.getTlApproverId().equals(uid)))
            ch.setPmApproverId(uid);
        // 双人不能为同一人（除非sys_admin）
        if (ch.getTlApproverId() != null && ch.getTlApproverId().equals(ch.getPmApproverId())
                && !roleChecker.hasPermission(uid, "testcase:manage_locked")) {
            throw BusinessException.badRequest("产品经理与管理员审批人不能为同一人");
        }
        boolean bothSigned = ch.getTlApproverId() != null && ch.getPmApproverId() != null;
        if (!bothSigned) {
            ch.setStatus("TL_APPROVED");
            changeMapper.updateById(ch);
            return "已签批，等待另一角色（产品经理/管理员）复审";
        }
        // 双签齐备，执行变更
        BizTestCase tc = testCaseMapper.selectById(ch.getTestCaseId());
        if (tc == null) throw BusinessException.badRequest("关联用例不存在");
        if ("DELETE".equals(ch.getChangeType())) {
            testCaseMapper.deleteById(tc.getId());
        } else {
            // UPDATE：用 payload 覆盖字段
            try {
                com.fasterxml.jackson.databind.JsonNode n = new com.fasterxml.jackson.databind.ObjectMapper().readTree(ch.getPayload());
                if (n.hasNonNull("caseName")) tc.setCaseName(n.get("caseName").asText());
                if (n.hasNonNull("precondition")) tc.setPrecondition(n.get("precondition").asText());
                if (n.hasNonNull("steps")) tc.setSteps(n.get("steps").asText());
                if (n.hasNonNull("expectedResult")) tc.setExpectedResult(n.get("expectedResult").asText());
                if (n.hasNonNull("priority")) tc.setPriority(n.get("priority").asText());
                testCaseMapper.updateById(tc);
            } catch (Exception e) {
                throw BusinessException.badRequest("变更内容payload解析失败: " + e.getMessage());
            }
        }
        ch.setStatus("APPROVED");
        changeMapper.updateById(ch);
        if (ch.getApplicantId() != null) {
            notificationService.sendNotification(ch.getApplicantId(), "用例变更已生效",
                    "您申请的用例" + ch.getChangeType() + "变更已通过双人审批并生效", "TC_CHANGE", "TEST_CASE", ch.getTestCaseId());
        }
        return "双人审批完成，用例变更已生效";
    }

    public void rejectChange(Long cid, RejectReq req) {
        Long uid = SecurityContextHolder.getCurrentUserId();
        com.rd.platform.model.entity.BizTestCaseChange ch = changeMapper.selectById(cid);
        if (ch == null) throw BusinessException.badRequest("变更申请不存在");
        if (!roleChecker.hasPermission(uid, "testcase:approve")) {
            throw BusinessException.forbidden("只有产品经理或管理员可驳回用例变更");
        }
        ch.setStatus("REJECTED");
        ch.setRejectReason(req.getReason());
        changeMapper.updateById(ch);
    }

    public void lock(Long id) {
        BizTestCase tc = testCaseMapper.selectById(id);
        if (tc == null) throw BusinessException.badRequest("测试用例不存在");
        tc.setStatus("LOCKED");
        tc.setLockedAt(LocalDateTime.now());
        testCaseMapper.updateById(tc);
    }

    public void execute(Long id, ExecuteRequest request) {
        BizTestCase tc = testCaseMapper.selectById(id);
        if (tc == null) throw BusinessException.badRequest("测试用例不存在");
        if (!StringUtils.hasText(request.getExecutionStatus())) {
            throw BusinessException.badRequest("执行状态不能为空");
        }
        // FP-TC-07/08 / PRD 23.1：执行证据链。实际结果必填且不少于10字
        if (!StringUtils.hasText(request.getActualResult()) || request.getActualResult().trim().length() < 10) {
            throw BusinessException.badRequest("实际结果必填且不少于10个字");
        }
        // P0/P1 用例执行必须上传证据（截图/日志）;个人项目留痕场景豁免
        if (!projectAccessGuard.isPrivateOwner(SecurityContextHolder.getCurrentUserId(), tc.getProjectId())
                && ("P0".equals(tc.getPriority()) || "P1".equals(tc.getPriority()))
                && !StringUtils.hasText(request.getEvidenceUrl())) {
            throw BusinessException.badRequest("P0/P1用例执行必须上传证据(截图/日志)");
        }
        tc.setExecutionStatus(request.getExecutionStatus());
        tc.setActualResult(request.getActualResult());
        tc.setEvidenceUrl(request.getEvidenceUrl());
        tc.setExecutedBy(SecurityContextHolder.getCurrentUserId());
        tc.setExecutedAt(LocalDateTime.now());
        testCaseMapper.updateById(tc);
    }

    // ==================== 批量导入 ====================

    private static final String[] IMPORT_HEADERS = {
            "项目名称*", "关联需求标题*", "模块名称*", "用例名称*",
            "前置条件*", "操作步骤*", "预期结果*", "优先级*(P0/P1/P2/P3)", "关联验收标准AC*"
    };

    /**
     * 生成测试用例批量导入 CSV 模板字节（UTF-8 带 BOM，含表头 + 一行示例）。
     */
    public byte[] buildImportTemplate() {
        StringBuilder sb = new StringBuilder();
        sb.append(CsvUtils.BOM);
        sb.append(CsvUtils.toCsvLine(java.util.Arrays.asList(IMPORT_HEADERS))).append("\r\n");
        sb.append(CsvUtils.toCsvLine(java.util.Arrays.asList(
                "太一商城重构项目", "用户登录支持手机号验证码", "登录模块", "手机号验证码登录-正常登录",
                "用户已在登录页，且手机号已注册", "1.输入正确手机号;2.点击获取验证码;3.输入验证码;4.点击登录",
                "登录成功并跳转首页", "P0", "当输入正确手机号和验证码时成功登录"
        ))).append("\r\n");
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    /**
     * 批量导入测试用例。逐行独立校验，某行失败不影响其他行；
     * 项目/需求用名称、标题填写，后端映射为 ID；复用单条创建的业务护栏。
     */
    public Map<String, Object> importTestCases(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw BusinessException.badRequest("请上传 CSV 文件");
        }
        Long currentUserId = SecurityContextHolder.getCurrentUserId();
        List<List<String>> rows;
        try {
            rows = CsvUtils.parse(file.getBytes());
        } catch (Exception e) {
            throw BusinessException.badRequest("文件解析失败，请使用下载的模板另存为 CSV(UTF-8) 后重试");
        }
        if (rows.size() <= 1) {
            throw BusinessException.badRequest("文件内容为空，请在模板中至少填写一行数据");
        }
        int success = 0;
        List<Map<String, Object>> failures = new ArrayList<>();
        for (int i = 1; i < rows.size(); i++) {
            List<String> row = rows.get(i);
            int lineNo = i + 1;
            if (CsvUtils.isBlankRow(row)) {
                continue;
            }
            try {
                importOneTestCase(row, currentUserId);
                success++;
            } catch (Exception ex) {
                Map<String, Object> f = new HashMap<>();
                f.put("line", lineNo);
                f.put("title", CsvUtils.cell(row, 3));
                f.put("reason", ex instanceof BusinessException ? ex.getMessage()
                        : (ex.getMessage() == null ? "数据格式错误" : ex.getMessage()));
                failures.add(f);
            }
        }
        Map<String, Object> result = new HashMap<>();
        result.put("successCount", success);
        result.put("failureCount", failures.size());
        result.put("failures", failures);
        return result;
    }

    private void importOneTestCase(List<String> row, Long currentUserId) {
        String projectName = CsvUtils.cell(row, 0);
        String reqTitle = CsvUtils.cell(row, 1);
        String moduleName = CsvUtils.cell(row, 2);
        String caseName = CsvUtils.cell(row, 3);
        String precondition = CsvUtils.cell(row, 4);
        String steps = CsvUtils.cell(row, 5);
        String expectedResult = CsvUtils.cell(row, 6);
        String priority = CsvUtils.cell(row, 7);
        String acRef = CsvUtils.cell(row, 8);

        if (!StringUtils.hasText(projectName)) throw BusinessException.badRequest("项目名称不能为空");
        if (!StringUtils.hasText(reqTitle)) throw BusinessException.badRequest("关联需求标题不能为空（测试用例必须关联需求）");
        if (!StringUtils.hasText(moduleName)) throw BusinessException.badRequest("模块名称不能为空");
        if (!StringUtils.hasText(caseName)) throw BusinessException.badRequest("用例名称不能为空");
        if (!StringUtils.hasText(precondition)) throw BusinessException.badRequest("前置条件不能为空");
        if (!StringUtils.hasText(steps)) throw BusinessException.badRequest("操作步骤不能为空");
        if (!StringUtils.hasText(expectedResult)) throw BusinessException.badRequest("预期结果不能为空");
        if (!StringUtils.hasText(priority)) throw BusinessException.badRequest("优先级不能为空");
        if (!StringUtils.hasText(acRef)) throw BusinessException.badRequest("必须关联需求的某条验收标准(AC)");

        BizProject project = projectMapper.selectOne(
                new QueryWrapper<BizProject>().eq("project_name", projectName).last("LIMIT 1"));
        if (project == null) throw BusinessException.badRequest("项目「" + projectName + "」不存在");

        // 需求标题 -> ID（同项目下匹配）
        BizRequirement req = requirementMapper.selectOne(
                new QueryWrapper<BizRequirement>()
                        .eq("title", reqTitle).eq("project_id", project.getId()).last("LIMIT 1"));
        if (req == null) {
            // 回退：不限项目再匹配一次，给出更友好提示
            req = requirementMapper.selectOne(
                    new QueryWrapper<BizRequirement>().eq("title", reqTitle).last("LIMIT 1"));
        }
        if (req == null) throw BusinessException.badRequest("关联需求「" + reqTitle + "」不存在");

        // 底线护栏：需求需已评审通过进入开发阶段，禁止提前编写用例
        if (BizConstants.REQ_DRAFT.equals(req.getStatus()) || BizConstants.REQ_REVIEWING.equals(req.getStatus())) {
            throw BusinessException.badRequest("关联需求「" + reqTitle + "」尚未评审通过进入开发阶段，禁止提前编写测试用例");
        }

        BizTestCase tc = new BizTestCase();
        tc.setProjectId(project.getId());
        tc.setRequirementId(req.getId());
        tc.setModuleName(moduleName);
        tc.setCaseName(caseName);
        tc.setPrecondition(precondition);
        tc.setSteps(steps);
        tc.setExpectedResult(expectedResult);
        tc.setPriority(priority);
        tc.setAcRef(acRef);
        tc.setStatus("DRAFT");
        tc.setCreatedBy(currentUserId);
        testCaseMapper.insert(tc);
    }

    @Data
    public static class TestCaseCreateRequest {
        @NotNull(message = "项目ID不能为空")
        private Long projectId;
        private Long requirementId;
        @NotBlank(message = "模块名称不能为空")
        private String moduleName;
        @NotBlank(message = "用例名称不能为空")
        private String caseName;
        @NotBlank(message = "前置条件不能为空")
        private String precondition;
        @NotBlank(message = "操作步骤不能为空")
        private String steps;
        @NotBlank(message = "预期结果不能为空")
        private String expectedResult;
        @NotBlank(message = "优先级不能为空")
        private String priority;
        // 关联的需求验收标准(AC)
        private String acRef;
    }

    @Data
    public static class ChangeApplyRequest {
        private String changeType; // UPDATE / DELETE
        private String payload;
        private String reason;
    }

    @Data
    public static class RejectReq {
        private String reason;
    }

    @Data
    public static class ExecuteRequest {
        @NotBlank(message = "执行状态不能为空")
        private String executionStatus;
        private String actualResult;
        private String evidenceUrl;
    }
}
