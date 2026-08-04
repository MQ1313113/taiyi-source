package com.rd.platform.service.controller;

import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.utils.Result;
import com.rd.platform.service.impl.TicketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

/**
 * 工单（统一问题入口）接口。业务逻辑在 {@link TicketService}，此处仅做 HTTP 映射与结果包装。
 */
@RestController
@RequestMapping("/api/v1/tickets")
public class TicketController {

    @Autowired
    private TicketService ticketService;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) String status,
                          @RequestParam(required = false) String category,
                          @RequestParam(required = false) Boolean mine) {
        return Result.success(ticketService.list(pageNum, pageSize, status, category, mine));
    }

    @GetMapping("/{id}")
    public Result<?> getById(@PathVariable Long id) {
        return Result.success(ticketService.getById(id));
    }

    @PostMapping
    @AuditLog(module = "工单", operation = "提交工单")
    public Result<?> create(@Valid @RequestBody TicketService.TicketCreateRequest request) {
        return Result.success("工单已提交", ticketService.create(request));
    }

    @PutMapping("/{id}/triage")
    @AuditLog(module = "工单", operation = "分诊工单")
    public Result<?> triage(@PathVariable Long id, @RequestBody TicketService.TriageRequest request) {
        return Result.success("分诊完成", ticketService.triage(id, request));
    }

    @PutMapping("/{id}/status")
    @AuditLog(module = "工单", operation = "变更工单状态")
    public Result<?> changeStatus(@PathVariable Long id, @RequestBody TicketService.StatusRequest request) {
        ticketService.changeStatus(id, request.getStatus());
        return Result.success("状态变更成功");
    }

    // ===== 路由/责任规则（分诊人维护）=====
    @GetMapping("/routing")
    public Result<?> listRouting() {
        return Result.success(ticketService.listRoutings());
    }

    @PostMapping("/routing")
    @AuditLog(module = "工单", operation = "新增路由规则")
    public Result<?> createRouting(@Valid @RequestBody TicketService.RoutingRequest request) {
        return Result.success("规则已新增", ticketService.createRouting(request));
    }

    @DeleteMapping("/routing/{id}")
    @AuditLog(module = "工单", operation = "删除路由规则")
    public Result<?> deleteRouting(@PathVariable Long id) {
        ticketService.deleteRouting(id);
        return Result.success("规则已删除");
    }
}
