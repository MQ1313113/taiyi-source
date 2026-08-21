package com.rd.platform.service.controller;

import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.utils.Result;
import com.rd.platform.service.impl.BugService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

/**
 * 缺陷管理接口。业务逻辑已下沉到 {@link BugService}，此处仅做 HTTP 映射与结果包装。
 */
@RestController
@RequestMapping("/api/v1/bugs")
public class BugController {

    @Autowired
    private BugService bugService;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) Long projectId,
                          @RequestParam(required = false) Long sprintId,
                          @RequestParam(required = false) Long assigneeId,
                          @RequestParam(required = false) String status,
                          @RequestParam(required = false) String severity,
                          @RequestParam(required = false) String keyword) {
        return Result.success(bugService.list(pageNum, pageSize, projectId, sprintId, assigneeId, status, severity, keyword));
    }

    @GetMapping("/{id}")
    public Result<?> getById(@PathVariable Long id) {
        return Result.success(bugService.getById(id));
    }

    @PostMapping
    @AuditLog(module = "缺陷管理", operation = "提交缺陷")
    public Result<?> create(@Valid @RequestBody BugService.BugCreateRequest request) {
        return Result.success("缺陷提交成功", bugService.create(request));
    }

    @PutMapping("/{id}/status")
    @AuditLog(module = "缺陷管理", operation = "变更缺陷状态")
    public Result<?> changeStatus(@PathVariable Long id, @RequestBody BugService.BugStatusRequest request) {
        bugService.changeStatus(id, request);
        return Result.success("状态变更成功");
    }

    @PostMapping("/{id}/to-knowledge")
    @AuditLog(module = "缺陷管理", operation = "缺陷沉淀为知识")
    public Result<?> toKnowledge(@PathVariable Long id) {
        return Result.success("已沉淀到知识库", bugService.toKnowledge(id));
    }

    @PutMapping("/{id}/reassign")
    @AuditLog(module = "缺陷管理", operation = "转派缺陷")
    public Result<?> reassign(@PathVariable Long id, @RequestBody BugService.ReassignRequest request) {
        bugService.reassign(id, request);
        return Result.success("转派成功");
    }
}
