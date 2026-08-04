package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.BizDependency;
import com.rd.platform.model.mapper.BizDependencyMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 跨团队依赖业务逻辑（从原胖 Controller 抽出，Controller 仅保留 HTTP 映射与委托）。
 */
@Service
public class DependencyService {

    @Autowired
    private BizDependencyMapper dependencyMapper;

    @Autowired
    private ProjectAccessGuard projectAccessGuard;

    public Page<BizDependency> list(Integer pageNum, Integer pageSize, Long projectId, String status) {
        Page<BizDependency> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizDependency> wrapper = new LambdaQueryWrapper<>();
        // 项目级数据隔离：非管理员只能看到自己所属项目的依赖
        java.util.List<Long> accessible = projectAccessGuard.accessibleProjectIds(SecurityContextHolder.getCurrentUserId());
        if (accessible != null) {
            if (accessible.isEmpty()) return page;
            wrapper.in(BizDependency::getProjectId, accessible);
        }
        if (projectId != null) wrapper.eq(BizDependency::getProjectId, projectId);
        if (StringUtils.hasText(status)) wrapper.eq(BizDependency::getStatus, status);
        wrapper.orderByDesc(BizDependency::getCreatedAt);
        return dependencyMapper.selectPage(page, wrapper);
    }

    public BizDependency create(DependencyCreateRequest request) {
        BizDependency dep = new BizDependency();
        dep.setRequirementId(request.getRequirementId());
        dep.setProjectId(request.getProjectId());
        dep.setDependencyDesc(request.getDependencyDesc());
        dep.setExternalTeam(request.getExternalTeam());
        dep.setStatus("BLOCKING");
        dep.setExpectedResolveDate(request.getExpectedResolveDate());
        dep.setCreatedBy(SecurityContextHolder.getCurrentUserId());
        dependencyMapper.insert(dep);
        return dep;
    }

    public void resolve(Long id) {
        BizDependency dep = dependencyMapper.selectById(id);
        if (dep == null) throw BusinessException.badRequest("依赖不存在");
        dep.setStatus("RESOLVED");
        dep.setResolvedAt(LocalDateTime.now());
        dependencyMapper.updateById(dep);
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
