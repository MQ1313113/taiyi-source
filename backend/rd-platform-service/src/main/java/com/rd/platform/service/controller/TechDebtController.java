package com.rd.platform.service.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.utils.Result;
import com.rd.platform.model.entity.BizTechDebt;
import com.rd.platform.model.mapper.BizTechDebtMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/tech-debts")
public class TechDebtController {

    @Autowired
    private BizTechDebtMapper techDebtMapper;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) Long projectId,
                          @RequestParam(required = false) String status,
                          @RequestParam(required = false) String riskLevel) {
        Page<BizTechDebt> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizTechDebt> wrapper = new LambdaQueryWrapper<>();
        if (projectId != null) wrapper.eq(BizTechDebt::getProjectId, projectId);
        if (StringUtils.hasText(status)) wrapper.eq(BizTechDebt::getStatus, status);
        if (StringUtils.hasText(riskLevel)) wrapper.eq(BizTechDebt::getRiskLevel, riskLevel);
        wrapper.orderByDesc(BizTechDebt::getCreatedAt);
        return Result.success(techDebtMapper.selectPage(page, wrapper));
    }

    @PostMapping
    @AuditLog(module = "技术债务", operation = "创建技术债务")
    public Result<?> create(@Valid @RequestBody TechDebtCreateRequest request) {
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
        return Result.success("技术债务创建成功", debt);
    }

    @PutMapping("/{id}/schedule")
    @AuditLog(module = "技术债务", operation = "排入迭代")
    public Result<?> schedule(@PathVariable Long id, @RequestBody ScheduleRequest request) {
        BizTechDebt debt = techDebtMapper.selectById(id);
        if (debt == null) return Result.error("技术债务不存在");
        debt.setSprintId(request.getSprintId());
        debt.setStatus("SCHEDULED");
        techDebtMapper.updateById(debt);
        return Result.success("已排入迭代");
    }

    @PutMapping("/{id}/resolve")
    @AuditLog(module = "技术债务", operation = "解决技术债务")
    public Result<?> resolve(@PathVariable Long id) {
        BizTechDebt debt = techDebtMapper.selectById(id);
        if (debt == null) return Result.error("技术债务不存在");
        debt.setStatus("RESOLVED");
        debt.setResolvedAt(LocalDateTime.now());
        techDebtMapper.updateById(debt);
        return Result.success("已解决");
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

    @Data
    public static class ScheduleRequest {
        @NotNull(message = "迭代ID不能为空")
        private Long sprintId;
    }
}
