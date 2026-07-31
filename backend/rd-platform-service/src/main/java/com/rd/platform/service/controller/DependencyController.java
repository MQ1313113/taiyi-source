package com.rd.platform.service.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.utils.Result;
import com.rd.platform.model.entity.BizDependency;
import com.rd.platform.model.mapper.BizDependencyMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/dependencies")
public class DependencyController {

    @Autowired
    private BizDependencyMapper dependencyMapper;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) Long projectId,
                          @RequestParam(required = false) String status) {
        Page<BizDependency> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizDependency> wrapper = new LambdaQueryWrapper<>();
        if (projectId != null) wrapper.eq(BizDependency::getProjectId, projectId);
        if (StringUtils.hasText(status)) wrapper.eq(BizDependency::getStatus, status);
        wrapper.orderByDesc(BizDependency::getCreatedAt);
        return Result.success(dependencyMapper.selectPage(page, wrapper));
    }

    @PostMapping
    @AuditLog(module = "依赖管理", operation = "创建跨团队依赖")
    public Result<?> create(@Valid @RequestBody DependencyCreateRequest request) {
        BizDependency dep = new BizDependency();
        dep.setRequirementId(request.getRequirementId());
        dep.setProjectId(request.getProjectId());
        dep.setDependencyDesc(request.getDependencyDesc());
        dep.setExternalTeam(request.getExternalTeam());
        dep.setStatus("BLOCKING");
        dep.setExpectedResolveDate(request.getExpectedResolveDate());
        dep.setCreatedBy(SecurityContextHolder.getCurrentUserId());
        dependencyMapper.insert(dep);
        return Result.success("依赖创建成功", dep);
    }

    @PutMapping("/{id}/resolve")
    @AuditLog(module = "依赖管理", operation = "解决依赖")
    public Result<?> resolve(@PathVariable Long id) {
        BizDependency dep = dependencyMapper.selectById(id);
        if (dep == null) return Result.error("依赖不存在");
        dep.setStatus("RESOLVED");
        dep.setResolvedAt(LocalDateTime.now());
        dependencyMapper.updateById(dep);
        return Result.success("依赖已解决");
    }

    @Data
    public static class DependencyCreateRequest {
        @NotNull(message = "需求ID不能为空")
        private Long requirementId;
        @NotNull(message = "项目ID不能为空")
        private Long projectId;
        @NotBlank(message = "依赖描述不能为空")
        private String dependencyDesc;
        private String externalTeam;
        private LocalDate expectedResolveDate;
    }
}
