package com.rd.platform.service.controller;

import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.utils.Result;
import com.rd.platform.service.impl.DependencyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

/**
 * 跨团队依赖管理接口。业务逻辑已下沉到 {@link DependencyService}，此处仅做 HTTP 映射与结果包装。
 */
@RestController
@RequestMapping("/api/v1/dependencies")
public class DependencyController {

    @Autowired
    private DependencyService dependencyService;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) Long projectId,
                          @RequestParam(required = false) String status) {
        return Result.success(dependencyService.list(pageNum, pageSize, projectId, status));
    }

    @PostMapping
    @AuditLog(module = "依赖管理", operation = "创建跨团队依赖")
    public Result<?> create(@Valid @RequestBody DependencyService.DependencyCreateRequest request) {
        return Result.success("依赖创建成功", dependencyService.create(request));
    }

    @PutMapping("/{id}/resolve")
    @AuditLog(module = "依赖管理", operation = "解决依赖")
    public Result<?> resolve(@PathVariable Long id) {
        dependencyService.resolve(id);
        return Result.success("依赖已解决");
    }
}
