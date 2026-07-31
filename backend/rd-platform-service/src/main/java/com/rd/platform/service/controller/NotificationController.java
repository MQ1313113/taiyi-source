package com.rd.platform.service.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.utils.Result;
import com.rd.platform.model.entity.BizNotification;
import com.rd.platform.model.mapper.BizNotificationMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    @Autowired
    private BizNotificationMapper notificationMapper;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) Boolean unreadOnly) {
        Long userId = SecurityContextHolder.getCurrentUserId();
        Page<BizNotification> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizNotification> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(BizNotification::getUserId, userId);
        if (Boolean.TRUE.equals(unreadOnly)) {
            wrapper.eq(BizNotification::getIsRead, 0);
        }
        wrapper.orderByDesc(BizNotification::getCreatedAt);
        return Result.success(notificationMapper.selectPage(page, wrapper));
    }

    @GetMapping("/unread-count")
    public Result<?> unreadCount() {
        Long userId = SecurityContextHolder.getCurrentUserId();
        Long count = notificationMapper.selectCount(
                new LambdaQueryWrapper<BizNotification>()
                        .eq(BizNotification::getUserId, userId)
                        .eq(BizNotification::getIsRead, 0));
        Map<String, Object> data = new HashMap<>();
        data.put("count", count);
        return Result.success(data);
    }

    @PutMapping("/{id}/read")
    public Result<?> markAsRead(@PathVariable Long id) {
        BizNotification notification = notificationMapper.selectById(id);
        if (notification == null) return Result.error("通知不存在");
        notification.setIsRead(1);
        notification.setReadAt(LocalDateTime.now());
        notificationMapper.updateById(notification);
        return Result.success("已标记为已读");
    }

    @PutMapping("/read-all")
    public Result<?> markAllAsRead() {
        Long userId = SecurityContextHolder.getCurrentUserId();
        BizNotification update = new BizNotification();
        update.setIsRead(1);
        update.setReadAt(LocalDateTime.now());
        notificationMapper.update(update,
                new LambdaQueryWrapper<BizNotification>()
                        .eq(BizNotification::getUserId, userId)
                        .eq(BizNotification::getIsRead, 0));
        return Result.success("已全部标记为已读");
    }
}
