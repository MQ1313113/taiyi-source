package com.rd.platform.service.controller;

import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.utils.Result;
import com.rd.platform.service.impl.RequirementService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.validation.Valid;
import java.util.Map;

/**
 * 需求管理接口。业务逻辑已下沉到 {@link RequirementService}，此处仅做 HTTP 映射与结果包装。
 */
@RestController
@RequestMapping("/api/v1/requirements")
public class RequirementController {

    @Autowired
    private RequirementService requirementService;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) Long projectId,
                          @RequestParam(required = false) Long sprintId,
                          @RequestParam(required = false) String status,
                          @RequestParam(required = false) String priority,
                          @RequestParam(required = false) String keyword) {
        return Result.success(requirementService.list(pageNum, pageSize, projectId, sprintId, status, priority, keyword));
    }

    @GetMapping("/{id}")
    public Result<?> getById(@PathVariable Long id) {
        return Result.success(requirementService.getById(id));
    }

    @PostMapping
    @AuditLog(module = "需求管理", operation = "创建需求")
    public Result<?> create(@Valid @RequestBody RequirementService.RequirementCreateRequest request) {
        return Result.success("需求创建成功", requirementService.create(request));
    }

    @PutMapping("/{id}")
    @AuditLog(module = "需求管理", operation = "更新需求")
    public Result<?> update(@PathVariable Long id, @Valid @RequestBody RequirementService.RequirementCreateRequest request) {
        return Result.success("需求更新成功", requirementService.update(id, request));
    }

    @PostMapping("/{id}/submit-review")
    @AuditLog(module = "需求管理", operation = "提交评审")
    public Result<?> submitReview(@PathVariable Long id, @RequestBody RequirementService.ReviewSubmitRequest request) {
        requirementService.submitReview(id, request);
        return Result.success("已提交评审");
    }

    @PostMapping("/{id}/review")
    @AuditLog(module = "需求管理", operation = "评审需求")
    public Result<?> review(@PathVariable Long id, @RequestBody RequirementService.ReviewActionRequest request) {
        return Result.success(requirementService.review(id, request));
    }

    @DeleteMapping("/{id}")
    @AuditLog(module = "需求管理", operation = "删除需求")
    public Result<?> delete(@PathVariable Long id) {
        requirementService.delete(id);
        return Result.success("需求已删除");
    }

    // ==================== 批量导入 ====================

    /**
     * 下载需求批量导入 CSV 模板（UTF-8 带 BOM，含表头 + 一行示例）。
     */
    @GetMapping("/import-template")
    public ResponseEntity<byte[]> downloadImportTemplate() {
        byte[] data = requirementService.buildImportTemplate();
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
        Map<String, Object> result = requirementService.importRequirements(file);
        String msg = String.format("导入完成：成功 %d 条，失败 %d 条",
                result.get("successCount"), result.get("failureCount"));
        return Result.success(msg, result);
    }

    /**
     * 受控的需求状态流转接口。
     * 底线护栏：严禁越级跳转，仅允许状态机定义的相邻合法流转；
     * 评审/提测/上线等关键卡点必须经由各自的业务接口完成，不能从此处直接跳过。
     */
    @PutMapping("/{id}/status")
    @AuditLog(module = "需求管理", operation = "变更需求状态")
    public Result<?> changeStatus(@PathVariable Long id, @RequestBody RequirementService.StatusRequest request) {
        requirementService.changeStatus(id, request);
        return Result.success("状态变更成功");
    }

    /**
     * 开发完成：DEVELOPING → DEVELOPED 的受控正向通道。
     * 补齐原先缺失的"开发完成"入口，使需求可以合法地进入可提测状态。
     */
    @PostMapping("/{id}/mark-developed")
    @AuditLog(module = "需求管理", operation = "标记开发完成")
    public Result<?> markDeveloped(@PathVariable Long id) {
        requirementService.markDeveloped(id);
        return Result.success("已标记开发完成");
    }
}
