package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.BizNotification;
import com.rd.platform.model.entity.BizNotificationDelivery;
import com.rd.platform.model.entity.SysUserNotificationSetting;
import com.rd.platform.model.mapper.BizNotificationDeliveryMapper;
import com.rd.platform.model.mapper.BizNotificationMapper;
import com.rd.platform.model.mapper.SysUserNotificationSettingMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class NotificationService {

    @Autowired
    private BizNotificationMapper notificationMapper;

    @Autowired
    private BizNotificationDeliveryMapper deliveryMapper;

    @Autowired
    private SysUserNotificationSettingMapper settingMapper;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 发送普通通知（多渠道分发）
     */
    public void sendNotification(Long userId, String title, String content,
                                  String type, String targetType, Long targetId) {
        doSend(userId, title, content, type, "NORMAL", targetType, targetId);
    }

    /**
     * 发送紧急通知（多渠道分发，忽略免打扰时段）
     */
    public void sendUrgentNotification(Long userId, String title, String content,
                                        String type, String targetType, Long targetId) {
        doSend(userId, title, content, type, "URGENT", targetType, targetId);
    }

    private void doSend(Long userId, String title, String content,
                        String type, String priority, String targetType, Long targetId) {
        // 1. 写入站内信数据库
        BizNotification notification = new BizNotification();
        notification.setUserId(userId);
        notification.setTitle(title);
        notification.setContent(content);
        notification.setType(type);
        notification.setPriority(priority);
        notification.setIsRead(0);
        notification.setTargetType(targetType);
        notification.setTargetId(targetId);
        notificationMapper.insert(notification);

        // 2. WebSocket 实时推送到前端（站内信强提醒）
        pushWebSocket(userId, notification);

        // 3. 异步分发到外部渠道
        dispatchToExternalChannels(userId, notification, priority);
    }

    /**
     * WebSocket 实时推送：前端订阅 /user/{userId}/queue/notifications
     */
    private void pushWebSocket(Long userId, BizNotification notification) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("id", notification.getId());
            payload.put("title", notification.getTitle());
            payload.put("content", notification.getContent());
            payload.put("type", notification.getType());
            payload.put("priority", notification.getPriority());
            payload.put("targetType", notification.getTargetType());
            payload.put("targetId", notification.getTargetId());
            payload.put("createdAt", notification.getCreatedAt());
            payload.put("isRead", false);

            messagingTemplate.convertAndSendToUser(
                    String.valueOf(userId),
                    "/queue/notifications",
                    payload
            );
            log.debug("WebSocket推送成功: userId={}, title={}", userId, notification.getTitle());
        } catch (Exception e) {
            log.warn("WebSocket推送失败: userId={}, error={}", userId, e.getMessage());
        }
    }

    /**
     * 异步分发到外部渠道（飞书/钉钉/企业微信）
     */
    @Async
    public void dispatchToExternalChannels(Long userId, BizNotification notification, String priority) {
        List<SysUserNotificationSetting> settings = settingMapper.selectList(
                new LambdaQueryWrapper<SysUserNotificationSetting>()
                        .eq(SysUserNotificationSetting::getUserId, userId)
                        .eq(SysUserNotificationSetting::getEnabled, 1)
                        .ne(SysUserNotificationSetting::getChannel, "SITE") // 站内信已处理
        );

        for (SysUserNotificationSetting setting : settings) {
            // 检查通知级别过滤
            if ("URGENT".equals(setting.getNotifyLevel()) && !"URGENT".equals(priority)) {
                continue; // 该渠道只接收紧急通知
            }
            if ("NONE".equals(setting.getNotifyLevel())) {
                continue;
            }

            // 检查免打扰时段（URGENT 通知忽略免打扰）
            if (!"URGENT".equals(priority) && isInQuietHours(setting)) {
                continue;
            }

            // 发送到对应渠道
            sendToChannel(setting, notification);
        }
    }

    private boolean isInQuietHours(SysUserNotificationSetting setting) {
        if (setting.getQuietStart() == null || setting.getQuietEnd() == null) {
            return false;
        }
        LocalTime now = LocalTime.now();
        LocalTime start = setting.getQuietStart();
        LocalTime end = setting.getQuietEnd();

        if (start.isBefore(end)) {
            return !now.isBefore(start) && !now.isAfter(end);
        } else {
            // 跨午夜：如 22:00 ~ 08:00
            return !now.isBefore(start) || !now.isAfter(end);
        }
    }

    private void sendToChannel(SysUserNotificationSetting setting, BizNotification notification) {
        BizNotificationDelivery delivery = new BizNotificationDelivery();
        delivery.setNotificationId(notification.getId());
        delivery.setChannel(setting.getChannel());
        delivery.setStatus("PENDING");

        try {
            String webhookUrl = setting.getWebhookUrl();
            if (webhookUrl == null || webhookUrl.isEmpty()) {
                delivery.setStatus("FAILED");
                delivery.setErrorMsg("Webhook地址未配置");
                deliveryMapper.insert(delivery);
                return;
            }

            String body = buildWebhookBody(setting.getChannel(), notification);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<String> entity = new HttpEntity<>(body, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    webhookUrl, HttpMethod.POST, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                delivery.setStatus("SUCCESS");
                delivery.setSentAt(LocalDateTime.now());
            } else {
                delivery.setStatus("FAILED");
                delivery.setErrorMsg("HTTP " + response.getStatusCodeValue());
            }
        } catch (Exception e) {
            delivery.setStatus("FAILED");
            delivery.setErrorMsg(e.getMessage() != null ? e.getMessage().substring(0, Math.min(e.getMessage().length(), 500)) : "Unknown error");
            log.warn("外部渠道推送失败: channel={}, notificationId={}, error={}",
                    setting.getChannel(), notification.getId(), e.getMessage());
        }

        deliveryMapper.insert(delivery);
    }

    /**
     * 根据渠道类型构建不同的Webhook请求体
     */
    private String buildWebhookBody(String channel, BizNotification notification) {
        String title = notification.getTitle();
        String content = notification.getContent();
        String priorityTag = "URGENT".equals(notification.getPriority()) ? "[紧急] " : "";

        switch (channel) {
            case "FEISHU":
                // 飞书机器人消息格式
                return String.format(
                        "{\"msg_type\":\"interactive\",\"card\":{\"header\":{\"title\":{\"tag\":\"plain_text\",\"content\":\"%s%s\"},\"template\":\"%s\"},\"elements\":[{\"tag\":\"div\",\"text\":{\"tag\":\"plain_text\",\"content\":\"%s\"}}]}}",
                        priorityTag, escapeJson(title),
                        "URGENT".equals(notification.getPriority()) ? "red" : "blue",
                        escapeJson(content)
                );

            case "DINGTALK":
                // 钉钉机器人消息格式
                return String.format(
                        "{\"msgtype\":\"markdown\",\"markdown\":{\"title\":\"%s%s\",\"text\":\"### %s%s\\n\\n%s\\n\\n---\\n*来自太一研发管理平台*\"}}",
                        priorityTag, escapeJson(title),
                        priorityTag, escapeJson(title),
                        escapeJson(content)
                );

            case "WECHAT_WORK":
                // 企业微信机器人消息格式
                return String.format(
                        "{\"msgtype\":\"markdown\",\"markdown\":{\"content\":\"### %s%s\\n%s\\n> 来自太一研发管理平台\"}}",
                        priorityTag, escapeJson(title),
                        escapeJson(content)
                );

            default:
                return String.format(
                        "{\"title\":\"%s%s\",\"content\":\"%s\"}",
                        priorityTag, escapeJson(title), escapeJson(content)
                );
        }
    }

    private String escapeJson(String text) {
        if (text == null) return "";
        return text.replace("\\", "\\\\")
                   .replace("\"", "\\\"")
                   .replace("\n", "\\n")
                   .replace("\r", "\\r")
                   .replace("\t", "\\t");
    }

    // ============ 站内信收件箱（从 NotificationController 下沉） ============

    public Page<BizNotification> list(Integer pageNum, Integer pageSize, Boolean unreadOnly) {
        Long userId = SecurityContextHolder.getCurrentUserId();
        Page<BizNotification> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizNotification> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(BizNotification::getUserId, userId);
        if (Boolean.TRUE.equals(unreadOnly)) {
            wrapper.eq(BizNotification::getIsRead, 0);
        }
        wrapper.orderByDesc(BizNotification::getCreatedAt);
        return notificationMapper.selectPage(page, wrapper);
    }

    public Map<String, Object> unreadCount() {
        Long userId = SecurityContextHolder.getCurrentUserId();
        Long count = notificationMapper.selectCount(
                new LambdaQueryWrapper<BizNotification>()
                        .eq(BizNotification::getUserId, userId)
                        .eq(BizNotification::getIsRead, 0));
        Map<String, Object> data = new HashMap<>();
        data.put("count", count);
        return data;
    }

    public void markAsRead(Long id) {
        BizNotification notification = notificationMapper.selectById(id);
        if (notification == null) throw BusinessException.badRequest("通知不存在");
        notification.setIsRead(1);
        notification.setReadAt(LocalDateTime.now());
        notificationMapper.updateById(notification);
    }

    public void markAllAsRead() {
        Long userId = SecurityContextHolder.getCurrentUserId();
        BizNotification update = new BizNotification();
        update.setIsRead(1);
        update.setReadAt(LocalDateTime.now());
        notificationMapper.update(update,
                new LambdaQueryWrapper<BizNotification>()
                        .eq(BizNotification::getUserId, userId)
                        .eq(BizNotification::getIsRead, 0));
    }
}
