package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.SysAuditLog;
import com.rd.platform.model.mapper.SysAuditLogMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * 审计日志业务逻辑（从原胖 Controller 抽出，Controller 仅保留 HTTP 映射与委托）。
 */
@Service
public class AuditLogService {

    @Autowired
    private SysAuditLogMapper auditLogMapper;

    public Page<SysAuditLog> list(Integer pageNum, Integer pageSize, String module, String username,
                                  String startDate, String endDate) {
        // Only admin can view audit logs
        if (!SecurityContextHolder.hasRole("sys_admin")) {
            throw BusinessException.forbidden("仅管理员可查看审计日志");
        }
        Page<SysAuditLog> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<SysAuditLog> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(module)) wrapper.eq(SysAuditLog::getModule, module);
        if (StringUtils.hasText(username)) wrapper.like(SysAuditLog::getUsername, username);
        if (StringUtils.hasText(startDate)) wrapper.ge(SysAuditLog::getCreatedAt, startDate + " 00:00:00");
        if (StringUtils.hasText(endDate)) wrapper.le(SysAuditLog::getCreatedAt, endDate + " 23:59:59");
        wrapper.orderByDesc(SysAuditLog::getCreatedAt);
        return auditLogMapper.selectPage(page, wrapper);
    }
}
