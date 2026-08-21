package com.rd.platform.service.controller;

import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.utils.Result;
import com.rd.platform.service.impl.ChangeRequestService;
import com.rd.platform.service.impl.ConflictAdvisorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 变更管理接口。业务逻辑已下沉到 {@link ChangeRequestService}，此处仅做 HTTP 映射与结果包装。
 */
@RestController
@RequestMapping("/api/v1/change-requests")
public class ChangeRequestController {

    @Autowired
    private ChangeRequestService changeRequestService;

    @Autowired
    private ConflictAdvisorService conflictAdvisorService;

    /**
     * 排期撞车"一键发起变更"的预填草稿（只读不落库）：
     * 返回按冲突事实组织好的 changeContent/changeReason/impactScope，
     * 前端填充后仍走既有 POST 提交，权限与双重审批规则不变。
     */
    @GetMapping("/conflict-draft")
    public Result<?> conflictDraft(@RequestParam Long requirementId,
                                   @RequestParam Long projectId,
                                   @RequestParam(required = false) String taskName,
                                   @RequestParam Long assigneeId,
                                   @RequestParam BigDecimal estimatedHours,
                                   @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dueDate,
                                   @RequestParam(required = false) Long excludeTaskId) {
        return Result.success(conflictAdvisorService.buildChangeDraft(
                requirementId, projectId, taskName, assigneeId, estimatedHours, dueDate, excludeTaskId));
    }

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) Long projectId,
                          @RequestParam(required = false) String status) {
        return Result.success(changeRequestService.list(pageNum, pageSize, projectId, status));
    }

    @GetMapping("/{id}")
    public Result<?> getById(@PathVariable Long id) {
        return Result.success(changeRequestService.getById(id));
    }

    @PostMapping
    @AuditLog(module = "变更管理", operation = "提交变更申请")
    public Result<?> create(@Valid @RequestBody ChangeRequestService.ChangeCreateRequest request) {
        return Result.success("变更申请已提交，进入产品经理+需求负责人双重审批流程", changeRequestService.create(request));
    }

    @PutMapping("/{id}/approve")
    @AuditLog(module = "变更管理", operation = "审批变更")
    public Result<?> approve(@PathVariable Long id) {
        return Result.success(changeRequestService.approve(id));
    }

    @PutMapping("/{id}/reject")
    @AuditLog(module = "变更管理", operation = "驳回变更")
    public Result<?> reject(@PathVariable Long id, @RequestBody ChangeRequestService.RejectRequest request) {
        changeRequestService.reject(id, request);
        return Result.success("变更已驳回");
    }
}
