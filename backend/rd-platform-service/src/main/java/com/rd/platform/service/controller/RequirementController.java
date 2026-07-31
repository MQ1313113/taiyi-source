package com.rd.platform.service.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.constant.BizConstants;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.common.utils.Result;
import com.rd.platform.common.utils.CsvUtils;
import com.rd.platform.model.entity.BizProject;
import com.rd.platform.model.entity.SysUser;
import com.rd.platform.model.mapper.SysUserMapper;
import com.rd.platform.model.entity.BizRequirement;
import com.rd.platform.model.entity.BizRequirementReview;
import com.rd.platform.model.mapper.BizProjectMapper;
import com.rd.platform.model.mapper.BizRequirementMapper;
import com.rd.platform.model.mapper.BizRequirementReviewMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import com.rd.platform.service.impl.NotificationService;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;

import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/requirements")
public class RequirementController {

    @Autowired
    private BizRequirementMapper requirementMapper;

    @Autowired
    private BizProjectMapper projectMapper;

    @Autowired
    private BizRequirementReviewMapper reviewMapper;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private com.rd.platform.service.impl.RoleChecker roleChecker;

    @Autowired
    private SysUserMapper userMapper;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) Long projectId,
                          @RequestParam(required = false) Long sprintId,
                          @RequestParam(required = false) String status,
                          @RequestParam(required = false) String priority,
                          @RequestParam(required = false) String keyword) {
        Page<BizRequirement> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizRequirement> wrapper = new LambdaQueryWrapper<>();
        if (projectId != null) wrapper.eq(BizRequirement::getProjectId, projectId);
        if (sprintId != null) wrapper.eq(BizRequirement::getSprintId, sprintId);
        if (StringUtils.hasText(status)) wrapper.eq(BizRequirement::getStatus, status);
        if (StringUtils.hasText(priority)) wrapper.eq(BizRequirement::getPriority, priority);
        if (StringUtils.hasText(keyword)) wrapper.like(BizRequirement::getTitle, keyword);
        wrapper.orderByDesc(BizRequirement::getCreatedAt);
        return Result.success(requirementMapper.selectPage(page, wrapper));
    }

    @GetMapping("/{id}")
    public Result<?> getById(@PathVariable Long id) {
        BizRequirement req = requirementMapper.selectById(id);
        if (req == null) return Result.error("需求不存在");
        return Result.success(req);
    }

    @PostMapping
    @AuditLog(module = "需求管理", operation = "创建需求")
    public Result<?> create(@Valid @RequestBody RequirementCreateRequest request) {
        Long currentUserId = SecurityContextHolder.getCurrentUserId();

        // 权限门禁(FP-RBAC-06)：只有产品经理或项目负责人可创建需求
        if (!roleChecker.hasPermission(currentUserId, "requirement:create")) {
            throw BusinessException.forbidden("只有产品经理或项目负责人可以创建需求");
        }
        // 负责人角色校验：需求负责人必须是产品经理或开发人员
        if (request.getOwnerId() == null
                || !roleChecker.hasPermission(request.getOwnerId(), "requirement:create", "requirement:edit", "requirement:dev_progress")) {
            throw BusinessException.badRequest("需求负责人必须指派给产品经理或开发人员");
        }

        // AC 三段式校验(FP-REQ-07 / PRD 23.5)：验收标准必须包含 Given/When/Then 结构
        String ac = request.getAcceptanceCriteria();
        if (ac != null) {
            String acUpper = ac.toUpperCase();
            boolean hasGwt = (acUpper.contains("GIVEN") && acUpper.contains("WHEN") && acUpper.contains("THEN"))
                    || (ac.contains("假设") && ac.contains("当") && ac.contains("那么"));
            if (!hasGwt) {
                throw BusinessException.badRequest("验收标准(AC)必须采用 Given-When-Then 三段式结构描述");
            }
        }

        // Validate gear level fields
        BizProject project = projectMapper.selectById(request.getProjectId());
        if (project == null) throw BusinessException.badRequest("项目不存在");
        validateGearFields(project.getGearLevel(), request);

        // Fast track validation
        if (request.getIsFastTrack() != null && request.getIsFastTrack() == 1) {
            validateFastTrackLimit(request.getProjectId(), request.getSprintId());
        }

        BizRequirement req = new BizRequirement();
        req.setProjectId(request.getProjectId());
        req.setSprintId(request.getSprintId());
        req.setTitle(request.getTitle());
        req.setType(request.getType());
        req.setPriority(request.getPriority());
        req.setStatus(BizConstants.REQ_DRAFT);
        req.setDescription(request.getDescription());
        req.setAcceptanceCriteria(request.getAcceptanceCriteria());
        req.setBusinessValue(request.getBusinessValue());
        req.setPrototypeUrl(request.getPrototypeUrl());
        req.setDataDictionary(request.getDataDictionary());
        req.setApiContract(request.getApiContract());
        req.setPerformanceBaseline(request.getPerformanceBaseline());
        req.setOwnerId(request.getOwnerId());
        req.setCreatedBy(currentUserId);
        req.setExpectedCompletionDate(request.getExpectedCompletionDate());
        req.setVersion(1);

        if (request.getIsFastTrack() != null && request.getIsFastTrack() == 1) {
            req.setIsFastTrack(1);
            req.setFastTrackExpireTime(LocalDateTime.now().plusHours(BizConstants.FAST_TRACK_EXPIRE_HOURS));
        } else {
            req.setIsFastTrack(0);
        }
        req.setFastTrackViolated(0);

        requirementMapper.insert(req);

        // 流转到本人强提醒：需求创建后，立即通知负责人“有新需求待提交评审”，避免负责人看不到、流程卡死。
        if (req.getOwnerId() != null) {
            notificationService.sendNotification(req.getOwnerId(), "新需求待提交评审",
                    "需求 [" + req.getTitle() + "] 已创建并指定您为负责人，请在工作台发起评审",
                    BizConstants.NOTIFY_STATUS_CHANGE, "REQUIREMENT", req.getId());
        }
        return Result.success("需求创建成功", req);
    }

    @PutMapping("/{id}")
    @AuditLog(module = "需求管理", operation = "更新需求")
    public Result<?> update(@PathVariable Long id, @Valid @RequestBody RequirementCreateRequest request) {
        BizRequirement req = requirementMapper.selectById(id);
        if (req == null) return Result.error("需求不存在");

        req.setTitle(request.getTitle());
        req.setType(request.getType());
        req.setPriority(request.getPriority());
        req.setDescription(request.getDescription());
        req.setAcceptanceCriteria(request.getAcceptanceCriteria());
        req.setBusinessValue(request.getBusinessValue());
        req.setPrototypeUrl(request.getPrototypeUrl());
        req.setExpectedCompletionDate(request.getExpectedCompletionDate());
        requirementMapper.updateById(req);
        return Result.success("需求更新成功", req);
    }

    @PostMapping("/{id}/submit-review")
    @AuditLog(module = "需求管理", operation = "提交评审")
    public Result<?> submitReview(@PathVariable Long id, @RequestBody ReviewSubmitRequest request) {
        BizRequirement req = requirementMapper.selectById(id);
        if (req == null) return Result.error("需求不存在");
        if (!BizConstants.REQ_DRAFT.equals(req.getStatus())) {
            throw BusinessException.badRequest("只有草稿状态的需求可以提交评审");
        }

        Long currentUserId = SecurityContextHolder.getCurrentUserId();

        // Cross-check R1: Creator cannot be the sole reviewer
        if (request.getReviewerIds().size() == 1 && request.getReviewerIds().get(0).equals(currentUserId)) {
            throw BusinessException.badRequest("创建人不能作为唯一审批人");
        }

        // Create review records
        for (Long reviewerId : request.getReviewerIds()) {
            BizRequirementReview review = new BizRequirementReview();
            review.setRequirementId(id);
            review.setReviewerId(reviewerId);
            review.setResult("PENDING");
            review.setCreatedAt(LocalDateTime.now());
            reviewMapper.insert(review);
            notificationService.sendNotification(reviewerId, "需求评审邀请",
                    "您有新的需求评审待处理: " + req.getTitle(),
                    BizConstants.NOTIFY_REVIEW_INVITE, "REQUIREMENT", id);
        }

        req.setStatus(BizConstants.REQ_REVIEWING);
        requirementMapper.updateById(req);
        return Result.success("已提交评审");
    }

    @PostMapping("/{id}/review")
    @AuditLog(module = "需求管理", operation = "评审需求")
    public Result<?> review(@PathVariable Long id, @RequestBody ReviewActionRequest request) {
        BizRequirement req = requirementMapper.selectById(id);
        if (req == null) return Result.error("需求不存在");
        if (!BizConstants.REQ_REVIEWING.equals(req.getStatus())) {
            throw BusinessException.badRequest("需求不在评审中状态");
        }

        Long currentUserId = SecurityContextHolder.getCurrentUserId();

        // Validate rejection reason length
        if (BizConstants.REVIEW_REJECTED.equals(request.getResult()) &&
                (request.getComment() == null || request.getComment().length() < 20)) {
            throw BusinessException.badRequest("驳回原因不少于20字");
        }

        // Update review record
        BizRequirementReview reviewRecord = reviewMapper.selectOne(
                new LambdaQueryWrapper<BizRequirementReview>()
                        .eq(BizRequirementReview::getRequirementId, id)
                        .eq(BizRequirementReview::getReviewerId, currentUserId)
                        .eq(BizRequirementReview::getResult, "PENDING"));
        // 权限门禁：只有被指定且状态仍为 PENDING 的评审人才能评审，防止非评审人越权推进流程
        if (reviewRecord == null) {
            throw BusinessException.forbidden("只有被指定的评审人才能进行评审");
        }
        reviewRecord.setResult(request.getResult());
        reviewRecord.setComment(request.getComment());
        reviewMapper.updateById(reviewRecord);

        // If rejected, requirement goes back to DRAFT
        if (BizConstants.REVIEW_REJECTED.equals(request.getResult())) {
            req.setStatus(BizConstants.REQ_DRAFT);
            requirementMapper.updateById(req);
            notificationService.sendNotification(req.getCreatedBy(), "需求评审驳回",
                    "您的需求 [" + req.getTitle() + "] 已被驳回",
                    BizConstants.NOTIFY_STATUS_CHANGE, "REQUIREMENT", id);
            return Result.success("已驳回");
        }

        // Check if all reviewers approved
        long pendingCount = reviewMapper.selectCount(
                new LambdaQueryWrapper<BizRequirementReview>()
                        .eq(BizRequirementReview::getRequirementId, id)
                        .eq(BizRequirementReview::getResult, "PENDING"));
        if (pendingCount == 0) {
            req.setStatus(BizConstants.REQ_DEVELOPING);
            requirementMapper.updateById(req);
            notificationService.sendNotification(req.getOwnerId(), "需求评审通过",
                    "需求 [" + req.getTitle() + "] 评审通过，请安排拆解",
                    BizConstants.NOTIFY_STATUS_CHANGE, "REQUIREMENT", id);
        }
        return Result.success("评审完成");
    }

    @DeleteMapping("/{id}")
    @AuditLog(module = "需求管理", operation = "删除需求")
    public Result<?> delete(@PathVariable Long id) {
        BizRequirement req = requirementMapper.selectById(id);
        if (req == null) return Result.error("需求不存在");
        if (!"DRAFT".equals(req.getStatus())) {
            throw BusinessException.badRequest("只有草稿状态的需求可以删除");
        }
        requirementMapper.deleteById(id);
        return Result.success("需求已删除");
    }

    // ==================== 批量导入 ====================

    /** CSV 模板列顺序（与导入解析保持一致） */
    private static final String[] IMPORT_HEADERS = {
            "项目名称*", "需求标题*", "需求类型*(功能/优化/缺陷/技术)", "优先级*(高/中/低)",
            "详细描述", "验收标准*(需含 假设/当/那么 或 Given/When/Then)",
            "业务价值", "负责人*(用户昵称)", "期望完成日期*(YYYY-MM-DD)"
    };

    /**
     * 下载需求批量导入 CSV 模板（UTF-8 带 BOM，含表头 + 一行示例）。
     */
    @GetMapping("/import-template")
    public ResponseEntity<byte[]> downloadImportTemplate() {
        StringBuilder sb = new StringBuilder();
        sb.append(CsvUtils.BOM);
        sb.append(CsvUtils.toCsvLine(java.util.Arrays.asList(IMPORT_HEADERS))).append("\r\n");
        // 示例行（供用户参照，导入时可删除）
        sb.append(CsvUtils.toCsvLine(java.util.Arrays.asList(
                "太一商城重构项目", "用户登录支持手机号验证码", "功能", "高",
                "用户可通过手机号获取验证码完成登录",
                "假设用户在登录页；当输入正确手机号和验证码；那么成功登录并跳转首页",
                "提升登录转化率，降低密码遗忘流失", "张三(产品经理)", "2026-12-31"
        ))).append("\r\n");
        byte[] data = sb.toString().getBytes(StandardCharsets.UTF_8);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv; charset=UTF-8"));
        headers.setContentDispositionFormData("attachment", "requirement_import_template.csv");
        return new ResponseEntity<>(data, headers, org.springframework.http.HttpStatus.OK);
    }

    /**
     * 批量导入需求。逐行独立校验，某行失败不影响其他行，最终汇总成功数与失败明细。
     * 项目、负责人用名称/昵称填写，后端映射为 ID；复用与单条创建一致的校验规则。
     */
    @PostMapping("/import")
    @AuditLog(module = "需求管理", operation = "批量导入需求")
    public Result<?> importRequirements(@RequestParam("file") MultipartFile file) {
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
        // 从第 2 行开始（第 1 行为表头）
        for (int i = 1; i < rows.size(); i++) {
            List<String> row = rows.get(i);
            int lineNo = i + 1; // 展示给用户的行号（含表头，从 1 计）
            if (CsvUtils.isBlankRow(row)) {
                continue;
            }
            try {
                importOneRequirement(row, currentUserId);
                success++;
            } catch (Exception ex) {
                Map<String, Object> f = new HashMap<>();
                f.put("line", lineNo);
                f.put("title", CsvUtils.cell(row, 1));
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

    private void importOneRequirement(List<String> row, Long currentUserId) {
        String projectName = CsvUtils.cell(row, 0);
        String title = CsvUtils.cell(row, 1);
        String type = CsvUtils.cell(row, 2);
        String priority = CsvUtils.cell(row, 3);
        String description = CsvUtils.cell(row, 4);
        String ac = CsvUtils.cell(row, 5);
        String businessValue = CsvUtils.cell(row, 6);
        String ownerName = CsvUtils.cell(row, 7);
        String dateStr = CsvUtils.cell(row, 8);

        if (!StringUtils.hasText(projectName)) throw BusinessException.badRequest("项目名称不能为空");
        if (!StringUtils.hasText(title)) throw BusinessException.badRequest("需求标题不能为空");
        if (!StringUtils.hasText(type)) throw BusinessException.badRequest("需求类型不能为空");
        if (!StringUtils.hasText(priority)) throw BusinessException.badRequest("优先级不能为空");
        if (!StringUtils.hasText(ac)) throw BusinessException.badRequest("验收标准不能为空");
        if (!StringUtils.hasText(ownerName)) throw BusinessException.badRequest("负责人不能为空");
        if (!StringUtils.hasText(dateStr)) throw BusinessException.badRequest("期望完成日期不能为空");

        // 项目名 -> ID
        BizProject project = projectMapper.selectOne(
                new QueryWrapper<BizProject>().eq("project_name", projectName).last("LIMIT 1"));
        if (project == null) throw BusinessException.badRequest("项目「" + projectName + "」不存在");

        // 负责人昵称 -> ID（必须为产品经理或开发人员）
        SysUser owner = userMapper.selectOne(
                new QueryWrapper<SysUser>().eq("nickname", ownerName).last("LIMIT 1"));
        if (owner == null) throw BusinessException.badRequest("负责人「" + ownerName + "」不存在");
        if (!roleChecker.hasPermission(owner.getId(), "requirement:create", "requirement:edit", "requirement:dev_progress")) {
            throw BusinessException.badRequest("负责人「" + ownerName + "」不是产品经理或开发人员，需求负责人必须指派给产品经理或开发人员");
        }

        // AC 三段式校验
        String acUpper = ac.toUpperCase();
        boolean hasGwt = (acUpper.contains("GIVEN") && acUpper.contains("WHEN") && acUpper.contains("THEN"))
                || (ac.contains("假设") && ac.contains("当") && ac.contains("那么"));
        if (!hasGwt) throw BusinessException.badRequest("验收标准(AC)必须采用 Given-When-Then 三段式结构描述");

        // 日期解析
        LocalDate expectedDate;
        try {
            expectedDate = LocalDate.parse(dateStr.trim());
        } catch (Exception e) {
            throw BusinessException.badRequest("期望完成日期格式错误，应为 YYYY-MM-DD，如 2026-12-31");
        }

        // 档位必填校验（复用同一规则）
        String gear = project.getGearLevel();
        if (BizConstants.GEAR_STANDARD.equals(gear) || BizConstants.GEAR_FULL.equals(gear)) {
            if (!StringUtils.hasText(businessValue)) throw BusinessException.badRequest("业务价值为必填项(标准档及以上)");
            if (!StringUtils.hasText(description)) throw BusinessException.badRequest("详细描述为必填项(标准档及以上)");
        }

        BizRequirement req = new BizRequirement();
        req.setProjectId(project.getId());
        req.setTitle(title);
        req.setType(type);
        req.setPriority(priority);
        req.setStatus(BizConstants.REQ_DRAFT);
        req.setDescription(description);
        req.setAcceptanceCriteria(ac);
        req.setBusinessValue(businessValue);
        req.setOwnerId(owner.getId());
        req.setCreatedBy(currentUserId);
        req.setExpectedCompletionDate(expectedDate);
        req.setVersion(1);
        req.setIsFastTrack(0);
        req.setFastTrackViolated(0);
        requirementMapper.insert(req);
        notificationService.sendNotification(owner.getId(), "新需求待提交评审",
                "需求 [" + title + "] 已通过批量导入创建并指定您为负责人，请在工作台发起评审",
                BizConstants.NOTIFY_STATUS_CHANGE, "REQUIREMENT", req.getId());
    }

    /**
     * 受控的需求状态流转接口。
     * 底线护栏：严禁越级跳转，仅允许状态机定义的相邻合法流转；
     * 评审/提测/上线等关键卡点必须经由各自的业务接口完成，不能从此处直接跳过。
     */
    @PutMapping("/{id}/status")
    @AuditLog(module = "需求管理", operation = "变更需求状态")
    public Result<?> changeStatus(@PathVariable Long id, @RequestBody StatusRequest request) {
        BizRequirement req = requirementMapper.selectById(id);
        if (req == null) return Result.error("需求不存在");
        String from = req.getStatus();
        String to = request.getStatus();
        if (from != null && from.equals(to)) {
            throw BusinessException.badRequest("目标状态与当前状态相同");
        }
        if (!isValidReqTransition(from, to)) {
            throw BusinessException.badRequest("非法的状态流转：" + from + " → " + to + "，禁止越级跳转");
        }
        // 关键质量卡点不允许从通用状态接口直接推进，必须走专用业务接口
        if (BizConstants.REQ_REVIEWING.equals(to) || BizConstants.REQ_TESTING.equals(to)) {
            throw BusinessException.badRequest("该状态需通过对应业务流程（提交评审/提测审批）推进，禁止直接变更");
        }
        // 角色门禁(FE-REQ-01)：按目标状态做职责分离校验，禁止越权变更需求状态。
        // sys_admin 全程兜底放行；其余按职责归属限定。
        Long operatorId = SecurityContextHolder.getCurrentUserId();
        if (!roleChecker.hasPermission(operatorId, "requirement:delete")) {
            checkStatusChangePermission(operatorId, from, to);
        }
        req.setStatus(to);
        requirementMapper.updateById(req);
        // 流转留痕 + 通知负责人（退回操作发送紧急通知）
        if (req.getOwnerId() != null) {
            boolean isReject = (BizConstants.REQ_TESTING.equals(from) && BizConstants.REQ_DEVELOPING.equals(to))
                    || (BizConstants.REQ_TESTED.equals(from) && BizConstants.REQ_TESTING.equals(to));
            if (isReject) {
                notificationService.sendUrgentNotification(req.getOwnerId(), "需求被退回",
                        "需求「" + req.getTitle() + "」已被退回，从 " + from + " 退回到 " + to + "，请尽快处理",
                        BizConstants.NOTIFY_STATUS_CHANGE, "REQUIREMENT", id);
            } else {
                notificationService.sendNotification(req.getOwnerId(), "需求状态变更",
                        "需求 [" + req.getTitle() + "] 状态由 " + from + " 变更为 " + to,
                        BizConstants.NOTIFY_STATUS_CHANGE, "REQUIREMENT", id);
            }
        }
        return Result.success("状态变更成功");
    }

    /**
     * 开发完成：DEVELOPING → DEVELOPED 的受控正向通道。
     * 补齐原先缺失的"开发完成"入口，使需求可以合法地进入可提测状态。
     */
    @PostMapping("/{id}/mark-developed")
    @AuditLog(module = "需求管理", operation = "标记开发完成")
    public Result<?> markDeveloped(@PathVariable Long id) {
        BizRequirement req = requirementMapper.selectById(id);
        if (req == null) return Result.error("需求不存在");
        if (!BizConstants.REQ_DEVELOPING.equals(req.getStatus())) {
            throw BusinessException.badRequest("只有开发中的需求可以标记为开发完成");
        }
        req.setStatus(BizConstants.REQ_DEVELOPED);
        requirementMapper.updateById(req);
        notificationService.sendNotification(req.getOwnerId(), "需求开发完成",
                "需求 [" + req.getTitle() + "] 已开发完成，可发起提测",
                BizConstants.NOTIFY_STATUS_CHANGE, "REQUIREMENT", id);
        return Result.success("已标记开发完成");
    }

    /**
     * 角色门禁(FE-REQ-01)：根据需求状态流转的 from→to 校验操作人角色。
     * 职责分离原则：PM 管需求与发布/取消/研发推进，QA 管测试结论。
     * （sys_admin 已在调用前兜底放行，不进入此方法。）
     */
    private void checkStatusChangePermission(Long operatorId, String from, String to) {
        // 取消需求：仅 PM（需求归属方）
        if (BizConstants.REQ_CANCELLED.equals(to)) {
            if (!roleChecker.hasPermission(operatorId, "requirement:cancel")) {
                throw BusinessException.forbidden("只有产品经理可以取消需求");
            }
            return;
        }
        // 测试通过：TESTING → TESTED，仅测试
        if (BizConstants.REQ_TESTING.equals(from) && BizConstants.REQ_TESTED.equals(to)) {
            if (!roleChecker.hasPermission(operatorId, "requirement:test_pass")) {
                throw BusinessException.forbidden("只有测试人员可以将需求置为测试通过");
            }
            return;
        }
        // 测试退回开发：TESTING → DEVELOPING，测试或产品经理
        if (BizConstants.REQ_TESTING.equals(from) && BizConstants.REQ_DEVELOPING.equals(to)) {
            if (!roleChecker.hasPermission(operatorId, "requirement:test_reject")) {
                throw BusinessException.forbidden("只有测试人员或产品经理可以将需求退回开发");
            }
            return;
        }
        // 进入发布 / 退回测试 / 关闭：PM 或管理员
        if ((BizConstants.REQ_TESTED.equals(from) && BizConstants.REQ_RELEASING.equals(to))
                || (BizConstants.REQ_TESTED.equals(from) && BizConstants.REQ_TESTING.equals(to))
                || (BizConstants.REQ_RELEASING.equals(from) && BizConstants.REQ_CLOSED.equals(to))) {
            if (!roleChecker.hasPermission(operatorId, "requirement:release")) {
                throw BusinessException.forbidden("只有产品经理或管理员可以推进发布/关闭或退回测试");
            }
            return;
        }
        // 开发完成 / 打回开发：DEVELOPING→DEVELOPED 或 DEVELOPED→DEVELOPING，产品经理或开发
        if ((BizConstants.REQ_DEVELOPING.equals(from) && BizConstants.REQ_DEVELOPED.equals(to))
                || (BizConstants.REQ_DEVELOPED.equals(from) && BizConstants.REQ_DEVELOPING.equals(to))) {
            if (!roleChecker.hasPermission(operatorId, "requirement:dev_progress")) {
                throw BusinessException.forbidden("只有产品经理或开发人员可以变更开发阶段状态");
            }
            return;
        }
        // 其余未明确归属的流转，保守拒绝（除 sys_admin）
        throw BusinessException.forbidden("当前角色无权执行该需求状态流转");
    }

    /**
     * 需求状态机合法转移矩阵。返回 true 表示 from→to 为允许的流转。
     * 注意：进入 REVIEWING / TESTING 的流转虽在矩阵中合法，但必须由专用业务接口触发。
     */
    private boolean isValidReqTransition(String from, String to) {
        if (from == null || to == null) return false;
        switch (from) {
            case BizConstants.REQ_DRAFT:
                return BizConstants.REQ_REVIEWING.equals(to) || BizConstants.REQ_CANCELLED.equals(to);
            case BizConstants.REQ_REVIEWING:
                return BizConstants.REQ_DRAFT.equals(to) || BizConstants.REQ_DEVELOPING.equals(to)
                        || BizConstants.REQ_CANCELLED.equals(to);
            case BizConstants.REQ_DEVELOPING:
                return BizConstants.REQ_DEVELOPED.equals(to) || BizConstants.REQ_CANCELLED.equals(to);
            case BizConstants.REQ_DEVELOPED:
                return BizConstants.REQ_TESTING.equals(to) || BizConstants.REQ_DEVELOPING.equals(to);
            case BizConstants.REQ_TESTING:
                return BizConstants.REQ_TESTED.equals(to) || BizConstants.REQ_DEVELOPING.equals(to);
            case BizConstants.REQ_TESTED:
                return BizConstants.REQ_RELEASING.equals(to) || BizConstants.REQ_TESTING.equals(to);
            case BizConstants.REQ_RELEASING:
                return BizConstants.REQ_CLOSED.equals(to);
            case BizConstants.REQ_CLOSED:
            case BizConstants.REQ_CANCELLED:
                return false;
            default:
                return false;
        }
    }

    private void validateGearFields(String gearLevel, RequirementCreateRequest request) {
        // L1 fields always required
        if (!StringUtils.hasText(request.getTitle())) throw BusinessException.badRequest("标题不能为空");
        if (!StringUtils.hasText(request.getAcceptanceCriteria())) throw BusinessException.badRequest("验收标准不能为空");
        if (request.getOwnerId() == null) throw BusinessException.badRequest("负责人不能为空");
        if (request.getExpectedCompletionDate() == null) throw BusinessException.badRequest("期望完成日期不能为空");

        // L2 fields for STANDARD and FULL
        if (BizConstants.GEAR_STANDARD.equals(gearLevel) || BizConstants.GEAR_FULL.equals(gearLevel)) {
            if (!StringUtils.hasText(request.getBusinessValue())) throw BusinessException.badRequest("业务价值为必填项(标准档)");
            if (!StringUtils.hasText(request.getDescription())) throw BusinessException.badRequest("详细描述为必填项(标准档)");
        }

        // L3 fields for FULL only
        if (BizConstants.GEAR_FULL.equals(gearLevel)) {
            if (!StringUtils.hasText(request.getDataDictionary())) throw BusinessException.badRequest("数据字典为必填项(完整档)");
            if (!StringUtils.hasText(request.getApiContract())) throw BusinessException.badRequest("接口契约为必填项(完整档)");
            if (!StringUtils.hasText(request.getPerformanceBaseline())) throw BusinessException.badRequest("性能基线为必填项(完整档)");
        }
    }

    private void validateFastTrackLimit(Long projectId, Long sprintId) {
        if (sprintId == null) return;
        LambdaQueryWrapper<BizRequirement> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(BizRequirement::getProjectId, projectId)
               .eq(BizRequirement::getSprintId, sprintId);
        long total = requirementMapper.selectCount(wrapper);

        wrapper.eq(BizRequirement::getIsFastTrack, 1);
        long fastTrackCount = requirementMapper.selectCount(wrapper);

        if (total > 0 && (double)(fastTrackCount + 1) / (total + 1) > BizConstants.FAST_TRACK_LIMIT_RATIO) {
            throw BusinessException.badRequest("本迭代快速通道比例已达上限(20%)，需管理员审批");
        }
    }

    @Data
    public static class RequirementCreateRequest {
        @NotNull(message = "项目ID不能为空")
        private Long projectId;
        private Long sprintId;
        @NotBlank(message = "标题不能为空")
        private String title;
        @NotBlank(message = "需求类型不能为空")
        private String type;
        @NotBlank(message = "优先级不能为空")
        private String priority;
        private String description;
        @NotBlank(message = "验收标准不能为空")
        private String acceptanceCriteria;
        private String businessValue;
        private String prototypeUrl;
        private String dataDictionary;
        private String apiContract;
        private String performanceBaseline;
        @NotNull(message = "负责人不能为空")
        private Long ownerId;
        @NotNull(message = "期望完成日期不能为空")
        private LocalDate expectedCompletionDate;
        private Integer isFastTrack;
    }

    @Data
    public static class ReviewSubmitRequest {
        @NotNull(message = "评审人列表不能为空")
        private List<Long> reviewerIds;
    }

    @Data
    public static class ReviewActionRequest {
        @NotBlank(message = "评审结果不能为空")
        private String result;
        private String comment;
    }

    @Data
    public static class StatusRequest {
        @NotBlank(message = "状态不能为空")
        private String status;
    }
}
