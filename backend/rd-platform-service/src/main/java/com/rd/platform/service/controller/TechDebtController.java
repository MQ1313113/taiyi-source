package com.rd.platform.service.controller;

import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.utils.Result;
import com.rd.platform.service.impl.TechDebtService;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import javax.validation.constraints.NotNull;

/**
 * 技术债务管理接口。业务逻辑已下沉到 {@link TechDebtService}，此处仅做 HTTP 映射与结果包装。
 */
@RestController
@RequestMapping("/api/v1/tech-debts")
public class TechDebtController {

    @Autowired
    private TechDebtService techDebtService;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) Long projectId,
                          @RequestParam(required = false) String status,
                          @RequestParam(required = false) String riskLevel) {
        return Result.success(techDebtService.list(pageNum, pageSize, projectId, status, riskLevel));
    }

    @PostMapping
    @AuditLog(module = "技术债务", operation = "创建技术债务")
    public Result<?> create(@Valid @RequestBody TechDebtService.TechDebtCreateRequest request) {
        return Result.success("技术债务创建成功", techDebtService.create(request));
    }

    @PutMapping("/{id}/schedule")
    @AuditLog(module = "技术债务", operation = "排入迭代")
    public Result<?> schedule(@PathVariable Long id, @RequestBody ScheduleRequest request) {
        techDebtService.schedule(id, request.getSprintId());
        return Result.success("已排入迭代");
    }

    @PutMapping("/{id}/resolve")
    @AuditLog(module = "技术债务", operation = "解决技术债务")
    public Result<?> resolve(@PathVariable Long id) {
        techDebtService.resolve(id);
        return Result.success("已解决");
    }

    @Data
    public static class ScheduleRequest {
        @NotNull(message = "迭代ID不能为空")
        private Long sprintId;
    }
}
