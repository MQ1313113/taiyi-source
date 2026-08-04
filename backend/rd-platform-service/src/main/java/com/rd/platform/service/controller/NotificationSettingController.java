package com.rd.platform.service.controller;

import com.rd.platform.common.utils.Result;
import com.rd.platform.service.impl.NotificationSettingService;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 通知渠道设置接口。业务逻辑已下沉到 {@link NotificationSettingService}，此处仅做 HTTP 映射与结果包装。
 */
@RestController
@RequestMapping("/api/v1/notification-settings")
public class NotificationSettingController {

    @Autowired
    private NotificationSettingService notificationSettingService;

    /**
     * 获取当前用户的所有通知渠道设置
     */
    @GetMapping
    public Result<?> getMySettings() {
        return Result.success(notificationSettingService.getMySettings());
    }

    /**
     * 新增或更新通知渠道设置
     */
    @PostMapping
    public Result<?> saveOrUpdate(@RequestBody NotificationSettingService.SettingRequest request) {
        notificationSettingService.saveOrUpdate(request);
        return Result.success("通知设置已保存");
    }

    /**
     * 批量保存通知设置
     */
    @PutMapping("/batch")
    public Result<?> batchSave(@RequestBody List<NotificationSettingService.SettingRequest> requests) {
        notificationSettingService.batchSave(requests);
        return Result.success("通知设置已批量保存");
    }

    /**
     * 删除某个渠道设置（站内信不可删除）
     */
    @DeleteMapping("/{channel}")
    public Result<?> delete(@PathVariable String channel) {
        notificationSettingService.delete(channel);
        return Result.success("已删除该渠道设置");
    }

    /**
     * 测试Webhook连通性
     */
    @PostMapping("/test-webhook")
    public Result<?> testWebhook(@RequestBody TestWebhookRequest request) {
        return Result.success(notificationSettingService.testWebhook(request.getChannel(), request.getWebhookUrl()));
    }

    @Data
    public static class TestWebhookRequest {
        private String channel;
        private String webhookUrl;
    }
}
