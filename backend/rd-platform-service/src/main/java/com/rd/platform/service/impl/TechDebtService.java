package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.BizTechDebt;
import com.rd.platform.model.mapper.BizTechDebtMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 技术债务业务逻辑（从原胖 Controller 抽出，Controller 仅保留 HTTP 映射与委托）。
 */
@Service
public class TechDebtService {

    @Autowired
    private BizTechDebtMapper techDebtMapper;

    @Autowired
    private ProjectAccessGuard projectAccessGuard;

    public Page<BizTechDebt> list(Integer pageNum, Integer pageSize, Long projectId, String status, String riskLevel) {
        Page<BizTechDebt> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizTechDebt> wrapper = new LambdaQueryWrapper<>();
        // 项目级数据隔离：非管理员只能看到自己所属项目的技术债
        java.util.List<Long> accessible = projectAccessGuard.accessibleProjectIds(SecurityContextHolder.getCurrentUserId());
        if (accessible != null) {
            if (accessible.isEmpty()) return page;
            wrapper.in(BizTechDebt::getProjectId, accessible);
        }
        if (projectId != null) wrapper.eq(BizTechDebt::getProjectId, projectId);
        if (StringUtils.hasText(status)) wrapper.eq(BizTechDebt::getStatus, status);
        if (StringUtils.hasText(riskLevel)) wrapper.eq(BizTechDebt::getRiskLevel, riskLevel);
        wrapper.orderByDesc(BizTechDebt::getCreatedAt);
        return techDebtMapper.selectPage(page, wrapper);
    }

    public BizTechDebt create(TechDebtCreateRequest request) {
        BizTechDebt debt = new BizTechDebt();
        debt.setProjectId(request.getProjectId());
        debt.setTitle(request.getTitle());
        debt.setDescription(request.getDescription());
        debt.setType(request.getType());
        debt.setRiskLevel(request.getRiskLevel());
        debt.setStatus("PENDING");
        debt.setEstimatedHours(request.getEstimatedHours());
        debt.setAssigneeId(request.getAssigneeId());
        debt.setCreatedBy(SecurityContextHolder.getCurrentUserId());
        techDebtMapper.insert(debt);
        return debt;
    }

    public void schedule(Long id, Long sprintId) {
        BizTechDebt debt = techDebtMapper.selectById(id);
        if (debt == null) throw BusinessException.badRequest("技术债务不存在");
        debt.setSprintId(sprintId);
        debt.setStatus("SCHEDULED");
        techDebtMapper.updateById(debt);
    }

    public void resolve(Long id) {
        BizTechDebt debt = techDebtMapper.selectById(id);
        if (debt == null) throw BusinessException.badRequest("技术债务不存在");
        debt.setStatus("RESOLVED");
        debt.setResolvedAt(LocalDateTime.now());
        techDebtMapper.updateById(debt);
    }

    @Data
    public static class TechDebtCreateRequest {
        @NotNull(message = "项目ID不能为空")
        private Long projectId;
        @NotBlank(message = "标题不能为空")
        private String title;
        @NotBlank(message = "描述不能为空")
        private String description;
        @NotBlank(message = "类型不能为空")
        private String type;
        @NotBlank(message = "风险等级不能为空")
        private String riskLevel;
        private BigDecimal estimatedHours;
        private Long assigneeId;
    }
}
