package com.rd.platform.service.controller;

import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.utils.Result;
import com.rd.platform.service.impl.TestCaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.validation.Valid;
import java.util.Map;

/**
 * 测试用例管理接口。业务逻辑已下沉到 {@link TestCaseService}，此处仅做 HTTP 映射与结果包装。
 */
@RestController
@RequestMapping("/api/v1/test-cases")
public class TestCaseController {

    @Autowired
    private TestCaseService testCaseService;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) Long projectId,
                          @RequestParam(required = false) Long requirementId,
                          @RequestParam(required = false) String moduleName,
                          @RequestParam(required = false) String priority,
                          @RequestParam(required = false) String keyword) {
        return Result.success(testCaseService.list(pageNum, pageSize, projectId, requirementId, moduleName, priority, keyword));
    }

    @GetMapping("/{id}")
    public Result<?> getById(@PathVariable Long id) {
        return Result.success(testCaseService.getById(id));
    }

    @PostMapping
    @AuditLog(module = "测试管理", operation = "创建测试用例")
    public Result<?> create(@Valid @RequestBody TestCaseService.TestCaseCreateRequest request) {
        return Result.success("测试用例创建成功", testCaseService.create(request));
    }

    @PutMapping("/{id}")
    @AuditLog(module = "测试管理", operation = "更新测试用例")
    public Result<?> update(@PathVariable Long id, @Valid @RequestBody TestCaseService.TestCaseCreateRequest request) {
        return Result.success("更新成功", testCaseService.update(id, request));
    }

    @PostMapping("/{id}/change-request")
    @AuditLog(module = "测试管理", operation = "提交用例变更申请")
    public Result<?> requestChange(@PathVariable Long id, @RequestBody TestCaseService.ChangeApplyRequest req) {
        return Result.success("用例变更申请已提交，需产品经理+管理员双人审批", testCaseService.requestChange(id, req));
    }

    @PutMapping("/change-request/{cid}/approve")
    @AuditLog(module = "测试管理", operation = "审批用例变更")
    public Result<?> approveChange(@PathVariable Long cid) {
        return Result.success(testCaseService.approveChange(cid));
    }

    @PutMapping("/change-request/{cid}/reject")
    @AuditLog(module = "测试管理", operation = "驳回用例变更")
    public Result<?> rejectChange(@PathVariable Long cid, @RequestBody TestCaseService.RejectReq req) {
        testCaseService.rejectChange(cid, req);
        return Result.success("已驳回用例变更申请");
    }

    @PutMapping("/{id}/lock")
    @AuditLog(module = "测试管理", operation = "锁定测试用例")
    public Result<?> lock(@PathVariable Long id) {
        testCaseService.lock(id);
        return Result.success("已锁定");
    }

    @PutMapping("/{id}/execute")
    @AuditLog(module = "测试管理", operation = "执行测试用例")
    public Result<?> execute(@PathVariable Long id, @RequestBody TestCaseService.ExecuteRequest request) {
        testCaseService.execute(id, request);
        return Result.success("执行结果已记录");
    }

    // ==================== 批量导入 ====================

    /**
     * 下载测试用例批量导入 CSV 模板（UTF-8 带 BOM，含表头 + 一行示例）。
     */
    @GetMapping("/import-template")
    public ResponseEntity<byte[]> downloadImportTemplate() {
        byte[] data = testCaseService.buildImportTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv; charset=UTF-8"));
        headers.setContentDispositionFormData("attachment", "testcase_import_template.csv");
        return new ResponseEntity<>(data, headers, org.springframework.http.HttpStatus.OK);
    }

    @PostMapping("/import")
    @AuditLog(module = "测试管理", operation = "批量导入测试用例")
    public Result<?> importTestCases(@RequestParam("file") MultipartFile file) {
        Map<String, Object> result = testCaseService.importTestCases(file);
        String msg = String.format("导入完成：成功 %d 条，失败 %d 条",
                result.get("successCount"), result.get("failureCount"));
        return Result.success(msg, result);
    }
}
