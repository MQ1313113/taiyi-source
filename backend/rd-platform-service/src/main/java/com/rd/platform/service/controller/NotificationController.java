package com.rd.platform.service.controller;

import com.rd.platform.common.utils.Result;
import com.rd.platform.service.impl.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

/**
 * 通知接口。业务逻辑已下沉到 {@link NotificationService}，此处仅做 HTTP 映射与结果包装。
 */
@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) Boolean unreadOnly) {
        return Result.success(notificationService.list(pageNum, pageSize, unreadOnly));
    }

    @GetMapping("/unread-count")
    public Result<?> unreadCount() {
        return Result.success(notificationService.unreadCount());
    }

    @PutMapping("/{id}/read")
    public Result<?> markAsRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return Result.success("已标记为已读");
    }

    @PutMapping("/read-all")
    public Result<?> markAllAsRead() {
        notificationService.markAllAsRead();
        return Result.success("已全部标记为已读");
    }
}
