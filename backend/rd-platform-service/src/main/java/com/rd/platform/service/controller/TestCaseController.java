package com.rd.platform.service.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.common.constant.BizConstants;
import com.rd.platform.common.utils.Result;
import com.rd.platform.common.utils.CsvUtils;
import com.rd.platform.model.entity.BizProject;
import com.rd.platform.model.entity.BizRequirement;
import com.rd.platform.model.entity.BizTestCase;
import com.rd.platform.model.mapper.BizProjectMapper;
import com.rd.platform.model.mapper.BizRequirementMapper;
import com.rd.platform.model.mapper.BizTestCaseMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/test-cases")
public class TestCaseController {

    @Autowired
    private BizTestCaseMapper testCaseMapper;

    @Autowired
    private BizRequirementMapper requirementMapper;

    @Autowired
    private com.rd.platform.model.mapper.BizTestCaseChangeMapper changeMapper;

    @Autowired
    private com.rd.platform.service.impl.RoleChecker roleChecker;

    @Autowired
    private com.rd.platform.service.impl.NotificationService notificationService;

    @Autowired
    private BizProjectMapper projectMapper;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) Long projectId,
                          @RequestParam(required = false) Long requirementId,
                          @RequestParam(required = false) String moduleName,
                          @RequestParam(required = false) String priority,
                          @RequestParam(required = false) String keyword) {
        Page<BizTestCase> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizTestCase> wrapper = new LambdaQueryWrapper<>();
        if (projectId != null) wrapper.eq(BizTestCase::getProjectId, projectId);
        if (requirementId != null) wrapper.eq(BizTestCase::getRequirementId, requirementId);
        if (StringUtils.hasText(moduleName)) wrapper.eq(BizTestCase::getModuleName, moduleName);
        if (StringUtils.hasText(priority)) wrapper.eq(BizTestCase::getPriority, priority);
        if (StringUtils.hasText(keyword)) wrapper.like(BizTestCase::getCaseName, keyword);
        wrapper.orderByDesc(BizTestCase::getCreatedAt);
        return Result.success(testCaseMapper.selectPage(page, wrapper));
    }

    @GetMapping("/{id}")
    public Result<?> getById(@PathVariable Long id) {
        BizTestCase tc = testCaseMapper.selectById(id);
        if (tc == null) return Result.error("测试用例不存在");
        return Result.success(tc);
    }

    @PostMapping
    @AuditLog(module = "测试管理", operation = "创建测试用例")
    public Result<?> create(@Valid @RequestBody TestCaseCreateRequest request) {
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
        // FP-TC-04 / PRD 23.2：用例必须关联需求验收标准(AC)，保证可追溯
        if (request.getRequirementId() == null) {
            throw BusinessException.badRequest("测试用例必须关联需求");
        }
        if (!StringUtils.hasText(request.getAcRef())) {
            throw BusinessException.badRequest("测试用例必须关联到需求的某条验收标准(AC)");
        }
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
        return Result.success("测试用例创建成功", tc);
    }

    @PutMapping("/{id}")
    @AuditLog(module = "测试管理", operation = "更新测试用例")
    public Result<?> update(@PathVariable Long id, @Valid @RequestBody TestCaseCreateRequest request) {
        BizTestCase tc = testCaseMapper.selectById(id);
        if (tc == null) return Result.error("测试用例不存在");
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
        return Result.success("更新成功", tc);
    }

    /**
     * 用例变更申请(FP-TC-LIB / PRD 22)：任何用户可提交“修改/删除”申请，
     * 但必须经产品经理 + 管理员双人审批后才生效。
     */
    @PostMapping("/{id}/change-request")
    @AuditLog(module = "测试管理", operation = "提交用例变更申请")
    public Result<?> requestChange(@PathVariable Long id, @RequestBody ChangeApplyRequest req) {
        BizTestCase tc = testCaseMapper.selectById(id);
        if (tc == null) return Result.error("测试用例不存在");
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
        return Result.success("用例变更申请已提交，需产品经理+管理员双人审批", ch);
    }

    /**
     * 双人审批：产品经理与管理员各签一次，集齐后生效。
     */
    @PutMapping("/change-request/{cid}/approve")
    @AuditLog(module = "测试管理", operation = "审批用例变更")
    public Result<?> approveChange(@PathVariable Long cid) {
        Long uid = SecurityContextHolder.getCurrentUserId();
        com.rd.platform.model.entity.BizTestCaseChange ch = changeMapper.selectById(cid);
        if (ch == null) return Result.error("变更申请不存在");
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
            return Result.success("已签批，等待另一角色（产品经理/管理员）复审");
        }
        // 双签齐备，执行变更
        BizTestCase tc = testCaseMapper.selectById(ch.getTestCaseId());
        if (tc == null) return Result.error("关联用例不存在");
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
        return Result.success("双人审批完成，用例变更已生效");
    }

    @PutMapping("/change-request/{cid}/reject")
    @AuditLog(module = "测试管理", operation = "驳回用例变更")
    public Result<?> rejectChange(@PathVariable Long cid, @RequestBody com.rd.platform.service.controller.TestCaseController.RejectReq req) {
        Long uid = SecurityContextHolder.getCurrentUserId();
        com.rd.platform.model.entity.BizTestCaseChange ch = changeMapper.selectById(cid);
        if (ch == null) return Result.error("变更申请不存在");
        if (!roleChecker.hasPermission(uid, "testcase:approve")) {
            throw BusinessException.forbidden("只有产品经理或管理员可驳回用例变更");
        }
        ch.setStatus("REJECTED");
        ch.setRejectReason(req.getReason());
        changeMapper.updateById(ch);
        return Result.success("已驳回用例变更申请");
    }

    @PutMapping("/{id}/lock")
    @AuditLog(module = "测试管理", operation = "锁定测试用例")
    public Result<?> lock(@PathVariable Long id) {
        BizTestCase tc = testCaseMapper.selectById(id);
        if (tc == null) return Result.error("测试用例不存在");
        tc.setStatus("LOCKED");
        tc.setLockedAt(LocalDateTime.now());
        testCaseMapper.updateById(tc);
        return Result.success("已锁定");
    }

    @PutMapping("/{id}/execute")
    @AuditLog(module = "测试管理", operation = "执行测试用例")
    public Result<?> execute(@PathVariable Long id, @RequestBody ExecuteRequest request) {
        BizTestCase tc = testCaseMapper.selectById(id);
        if (tc == null) return Result.error("测试用例不存在");
        if (!StringUtils.hasText(request.getExecutionStatus())) {
            throw BusinessException.badRequest("执行状态不能为空");
        }
        // FP-TC-07/08 / PRD 23.1：执行证据链。实际结果必填且不少于10字
        if (!StringUtils.hasText(request.getActualResult()) || request.getActualResult().trim().length() < 10) {
            throw BusinessException.badRequest("实际结果必填且不少于10个字");
        }
        // P0/P1 用例执行必须上传证据（截图/日得）
        if (("P0".equals(tc.getPriority()) || "P1".equals(tc.getPriority()))
                && !StringUtils.hasText(request.getEvidenceUrl())) {
            throw BusinessException.badRequest("P0/P1用例执行必须上传证据(截图/日得)");
        }
        tc.setExecutionStatus(request.getExecutionStatus());
        tc.setActualResult(request.getActualResult());
        tc.setEvidenceUrl(request.getEvidenceUrl());
        tc.setExecutedBy(SecurityContextHolder.getCurrentUserId());
        tc.setExecutedAt(LocalDateTime.now());
        testCaseMapper.updateById(tc);
        return Result.success("执行结果已记录");
    }

    // ==================== 批量导入 ====================

    private static final String[] IMPORT_HEADERS = {
            "项目名称*", "关联需求标题*", "模块名称*", "用例名称*",
            "前置条件*", "操作步骤*", "预期结果*", "优先级*(P0/P1/P2/P3)", "关联验收标准AC*"
    };

    /**
     * 下载测试用例批量导入 CSV 模板（UTF-8 带 BOM，含表头 + 一行示例）。
     */
    @GetMapping("/import-template")
    public ResponseEntity<byte[]> downloadImportTemplate() {
        StringBuilder sb = new StringBuilder();
        sb.append(CsvUtils.BOM);
        sb.append(CsvUtils.toCsvLine(java.util.Arrays.asList(IMPORT_HEADERS))).append("\r\n");
        sb.append(CsvUtils.toCsvLine(java.util.Arrays.asList(
                "太一商城重构项目", "用户登录支持手机号验证码", "登录模块", "手机号验证码登录-正常登录",
                "用户已在登录页，且手机号已注册", "1.输入正确手机号;2.点击获取验证码;3.输入验证码;4.点击登录",
                "登录成功并跳转首页", "P0", "当输入正确手机号和验证码时成功登录"
        ))).append("\r\n");
        byte[] data = sb.toString().getBytes(StandardCharsets.UTF_8);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv; charset=UTF-8"));
        headers.setContentDispositionFormData("attachment", "testcase_import_template.csv");
        return new ResponseEntity<>(data, headers, org.springframework.http.HttpStatus.OK);
    }

    /**
     * 批量导入测试用例。逐行独立校验，某行失败不影响其他行；
     * 项目/需求用名称、标题填写，后端映射为 ID；复用单条创建的业务护栏。
     */
    @PostMapping("/import")
    @AuditLog(module = "测试管理", operation = "批量导入测试用例")
    public Result<?> importTestCases(@RequestParam("file") MultipartFile file) {
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
        String msg = String.format("导入完成：成功 %d 条，失败 %d 条", success, failures.size());
        return Result.success(msg, result);
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
