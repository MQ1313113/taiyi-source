package com.rd.platform.service.controller;

import com.rd.platform.common.utils.Result;
import com.rd.platform.service.impl.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

/**
 * 工作台接口。业务逻辑已下沉到 {@link DashboardService}，此处仅做 HTTP 映射与结果包装。
 */
@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    @Autowired
    private DashboardService dashboardService;

    @GetMapping("/overview")
    public Result<?> overview() {
        return Result.success(dashboardService.overview());
    }

    /**
     * 统一"我的待办"聚合接口。
     * 底线护栏：按当前登录用户的角色 + 业务归属，仅返回归属于他且他有权操作的待办；
     * 每条待办附带后端计算的合法 actions，前端只渲染这些动作按钮，从源头杜绝越权可点。
     */
    @GetMapping("/my-todo")
    public Result<?> myTodo() {
        return Result.success(dashboardService.myTodo());
    }

    @GetMapping("/my-week")
    public Result<?> myWeek() {
        return Result.success(dashboardService.myWeek());
    }

    @GetMapping("/metrics")
    public Result<?> metrics(@RequestParam(required = false) Long projectId) {
        return Result.success(dashboardService.metrics(projectId));
    }
}
