package com.rd.platform.service.controller;

import com.rd.platform.common.utils.Result;
import com.rd.platform.service.impl.AuditLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

/**
 * 审计日志查询接口。业务逻辑已下沉到 {@link AuditLogService}，此处仅做 HTTP 映射与结果包装。
 */
@RestController
@RequestMapping("/api/v1/audit-logs")
public class AuditLogController {

    @Autowired
    private AuditLogService auditLogService;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) String module,
                          @RequestParam(required = false) String username,
                          @RequestParam(required = false) String startDate,
                          @RequestParam(required = false) String endDate) {
        return Result.success(auditLogService.list(pageNum, pageSize, module, username, startDate, endDate));
    }
}
