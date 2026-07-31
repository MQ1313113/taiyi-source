package com.rd.platform.service.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.common.utils.Result;
import com.rd.platform.model.entity.SysAuditLog;
import com.rd.platform.model.mapper.SysAuditLogMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/audit-logs")
public class AuditLogController {

    @Autowired
    private SysAuditLogMapper auditLogMapper;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) String module,
                          @RequestParam(required = false) String username,
                          @RequestParam(required = false) String startDate,
                          @RequestParam(required = false) String endDate) {
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
        return Result.success(auditLogMapper.selectPage(page, wrapper));
    }
}
