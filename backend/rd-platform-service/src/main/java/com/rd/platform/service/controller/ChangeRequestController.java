package com.rd.platform.service.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.common.utils.Result;
import com.rd.platform.model.entity.BizChangeRequest;
import com.rd.platform.model.entity.BizRequirement;
import com.rd.platform.model.mapper.BizChangeRequestMapper;
import com.rd.platform.model.mapper.BizRequirementMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import com.rd.platform.service.impl.NotificationService;
import com.rd.platform.service.impl.RoleChecker;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/change-requests")
public class ChangeRequestController {

    @Autowired
    private BizChangeRequestMapper changeRequestMapper;

    @Autowired
    private BizRequirementMapper requirementMapper;

    @Autowired
    private RoleChecker roleChecker;

    @Autowired
    private NotificationService notificationService;

    // 变更状态机：PENDING(待产品经理审批) -> PM_APPROVED(待需求负责人复审) -> APPROVED；任一驳回 -> REJECTED
    private static final String ST_PENDING = "PENDING";
    private static final String ST_PM_APPROVED = "TL_APPROVED";
    private static final String ST_APPROVED = "APPROVED";
    private static final String ST_REJECTED = "REJECTED";

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) Long projectId,
                          @RequestParam(required = false) String status) {
        Page<BizChangeRequest> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizChangeRequest> wrapper = new LambdaQueryWrapper<>();
        if (projectId != null) wrapper.eq(BizChangeRequest::getProjectId, projectId);
        if (status != null) wrapper.eq(BizChangeRequest::getStatus, status);
        wrapper.orderByDesc(BizChangeRequest::getCreatedAt);
        return Result.success(changeRequestMapper.selectPage(page, wrapper));
    }

    @GetMapping("/{id}")
    public Result<?> getById(@PathVariable Long id) {
        BizChangeRequest cr = changeRequestMapper.selectById(id);
        if (cr == null) return Result.error("变更申请不存在");
        return Result.success(cr);
    }

    @PostMapping
    @AuditLog(module = "变更管理", operation = "提交变更申请")
    public Result<?> create(@Valid @RequestBody ChangeCreateRequest request) {
        Long currentUserId = SecurityContextHolder.getCurrentUserId();
        // 仅产品经理可发起需求变更(PRD 11.2)
        if (!roleChecker.hasPermission(currentUserId, "change:create")) {
            throw BusinessException.forbidden("只有产品经理可以发起需求变更");
        }
        BizChangeRequest cr = new BizChangeRequest();
        cr.setRequirementId(request.getRequirementId());
        cr.setProjectId(request.getProjectId());
        cr.setChangeContent(request.getChangeContent());
        cr.setChangeReason(request.getChangeReason());
        cr.setImpactScope(request.getImpactScope());
        cr.setStatus(ST_PENDING);
        cr.setApplicantId(currentUserId);
        changeRequestMapper.insert(cr);

        // 通知需求负责人(产品经理)先行审批
        BizRequirement req = requirementMapper.selectById(request.getRequirementId());
        if (req != null && req.getOwnerId() != null) {
            notificationService.sendNotification(req.getOwnerId(), "新需求变更待审批",
                    "需求#" + req.getId() + " 有新的变更申请待您(产品经理)审批",
                    "CHANGE_APPROVAL", "CHANGE", cr.getId());
        }
        return Result.success("变更申请已提交，进入产品经理+需求负责人双重审批流程", cr);
    }

    /**
     * 审批变更：双重审批。
     * 第一步由产品经理(pm)审批 -> PM_APPROVED；
     * 第二步由需求负责人(Owner)复审 -> APPROVED。
     * R4 防自审：变更申请人不得审批自己的变更。
     */
    @PutMapping("/{id}/approve")
    @AuditLog(module = "变更管理", operation = "审批变更")
    public Result<?> approve(@PathVariable Long id) {
        Long currentUserId = SecurityContextHolder.getCurrentUserId();
        BizChangeRequest cr = changeRequestMapper.selectById(id);
        if (cr == null) return Result.error("变更申请不存在");

        // R4 防自审
        if (cr.getApplicantId() != null && cr.getApplicantId().equals(currentUserId)) {
            throw BusinessException.forbidden("变更申请人不能审批自己提交的变更（R4防自审）");
        }
        BizRequirement req = requirementMapper.selectById(cr.getRequirementId());
        Long ownerId = req != null ? req.getOwnerId() : null;

        if (ST_PENDING.equals(cr.getStatus())) {
            // 第一重：产品经理审批
            if (!roleChecker.hasPermission(currentUserId, "change:approve")) {
                throw BusinessException.forbidden("第一重审批须由产品经理完成");
            }
            cr.setStatus(ST_PM_APPROVED);
            cr.setApproverId(currentUserId);
            changeRequestMapper.updateById(cr);
            // 通知第二重审批人（需求负责人）
            if (ownerId != null && !ownerId.equals(currentUserId)) {
                notificationService.sendNotification(ownerId, "变更待复审",
                        "变更#" + cr.getId() + " 已通过产品经理审批，待您复审", "CHANGE_APPROVAL", "CHANGE", cr.getId());
            }
            return Result.success("第一重(产品经理)审批通过，待需求负责人复审");
        } else if (ST_PM_APPROVED.equals(cr.getStatus())) {
            // 第二重：需求负责人复审；且不得与第一重审批人为同一人
            if (cr.getApproverId() != null && cr.getApproverId().equals(currentUserId)) {
                throw BusinessException.forbidden("第二重审批人不能与第一重审批人相同（双人双审）");
            }
            boolean isOwner = ownerId != null && ownerId.equals(currentUserId);
            if (!isOwner && !roleChecker.hasPermission(currentUserId, "change:approve")) {
                throw BusinessException.forbidden("第二重复审须由需求负责人或产品经理完成");
            }
            cr.setStatus(ST_APPROVED);
            cr.setApprovedAt(LocalDateTime.now());
            changeRequestMapper.updateById(cr);
            if (cr.getApplicantId() != null) {
                notificationService.sendNotification(cr.getApplicantId(), "变更已批准",
                        "您提交的变更#" + cr.getId() + " 已通过双重审批", "CHANGE_RESULT", "CHANGE", cr.getId());
            }
            return Result.success("第二重(需求负责人)复审通过，变更正式批准");
        } else {
            throw BusinessException.badRequest("当前状态[" + cr.getStatus() + "]不可审批");
        }
    }

    @PutMapping("/{id}/reject")
    @AuditLog(module = "变更管理", operation = "驳回变更")
    public Result<?> reject(@PathVariable Long id, @RequestBody RejectRequest request) {
        Long currentUserId = SecurityContextHolder.getCurrentUserId();
        BizChangeRequest cr = changeRequestMapper.selectById(id);
        if (cr == null) return Result.error("变更申请不存在");
        if (cr.getApplicantId() != null && cr.getApplicantId().equals(currentUserId)) {
            throw BusinessException.forbidden("变更申请人不能驳回自己提交的变更（R4防自审）");
        }
        if (!ST_PENDING.equals(cr.getStatus()) && !ST_PM_APPROVED.equals(cr.getStatus())) {
            throw BusinessException.badRequest("当前状态[" + cr.getStatus() + "]不可驳回");
        }
        cr.setStatus(ST_REJECTED);
        cr.setApproverId(currentUserId);
        cr.setRejectReason(request.getReason());
        changeRequestMapper.updateById(cr);
        if (cr.getApplicantId() != null) {
            notificationService.sendNotification(cr.getApplicantId(), "变更被驳回",
                    "您提交的变更#" + cr.getId() + " 被驳回：" + request.getReason(), "CHANGE_RESULT", "CHANGE", cr.getId());
        }
        return Result.success("变更已驳回");
    }

    @Data
    public static class ChangeCreateRequest {
        @NotNull(message = "需求ID不能为空")
        private Long requirementId;
        @NotNull(message = "项目ID不能为空")
        private Long projectId;
        @NotBlank(message = "变更内容不能为空")
        private String changeContent;
        @NotBlank(message = "变更原因不能为空")
        private String changeReason;
        @NotBlank(message = "影响范围不能为空")
        private String impactScope;
    }

    @Data
    public static class RejectRequest {
        @NotBlank(message = "驳回原因不能为空")
        private String reason;
    }
}
