package com.rd.platform.service.controller;

import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.utils.Result;
import com.rd.platform.service.impl.SubmitTestService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

/**
 * 提测管理接口。业务逻辑已下沉到 {@link SubmitTestService}，此处仅做 HTTP 映射与结果包装。
 */
@RestController
@RequestMapping("/api/v1/submit-tests")
public class SubmitTestController {

    @Autowired
    private SubmitTestService submitTestService;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) Long projectId,
                          @RequestParam(required = false) String status) {
        return Result.success(submitTestService.list(pageNum, pageSize, projectId, status));
    }

    @PostMapping
    @AuditLog(module = "提测管理", operation = "提交提测申请")
    public Result<?> submit(@Valid @RequestBody SubmitTestService.SubmitTestRequest request) {
        return Result.success("提测申请已提交", submitTestService.submit(request));
    }

    @PutMapping("/{id}/approve")
    @AuditLog(module = "提测管理", operation = "审批提测")
    public Result<?> approve(@PathVariable Long id) {
        submitTestService.approve(id);
        return Result.success("提测已通过");
    }

    @PutMapping("/{id}/reject")
    @AuditLog(module = "提测管理", operation = "驳回提测")
    public Result<?> reject(@PathVariable Long id, @RequestBody SubmitTestService.RejectRequest request) {
        submitTestService.reject(id, request);
        return Result.success("提测已驳回");
    }
}
