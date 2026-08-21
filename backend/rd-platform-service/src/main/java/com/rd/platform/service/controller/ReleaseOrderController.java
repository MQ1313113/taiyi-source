package com.rd.platform.service.controller;

import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.utils.Result;
import com.rd.platform.service.impl.ReleaseOrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

/**
 * 发布单接口:发布内容清单+回滚方案+生产冒烟确认,补齐发布环节验证卡点。
 */
@RestController
@RequestMapping("/api/v1/release-orders")
public class ReleaseOrderController {

    @Autowired
    private ReleaseOrderService releaseOrderService;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) Long projectId,
                          @RequestParam(required = false) String status) {
        return Result.success(releaseOrderService.list(pageNum, pageSize, projectId, status));
    }

    @GetMapping("/{id}")
    public Result<?> detail(@PathVariable Long id) {
        return Result.success(releaseOrderService.detail(id));
    }

    @PostMapping
    @AuditLog(module = "发布管理", operation = "创建发布单")
    public Result<?> create(@Valid @RequestBody ReleaseOrderService.CreateRequest request) {
        return Result.success("发布单创建成功", releaseOrderService.create(request));
    }

    @PutMapping("/{id}/advance")
    @AuditLog(module = "发布管理", operation = "推进发布单")
    public Result<?> advance(@PathVariable Long id) {
        return Result.success(releaseOrderService.advance(id));
    }

    @PutMapping("/{id}/smoke")
    @AuditLog(module = "发布管理", operation = "生产冒烟确认")
    public Result<?> smoke(@PathVariable Long id, @Valid @RequestBody ReleaseOrderService.SmokeRequest request) {
        return Result.success(releaseOrderService.smokeConfirm(id, request));
    }
}
