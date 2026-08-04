package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.SysUserNotificationSetting;
import com.rd.platform.model.mapper.SysUserNotificationSettingMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.List;

/**
 * 通知渠道设置业务逻辑（从原胖 Controller 抽出，Controller 仅保留 HTTP 映射与委托）。
 */
@Service
public class NotificationSettingService {

    @Autowired
    private SysUserNotificationSettingMapper settingMapper;

    /**
     * 获取当前用户的所有通知渠道设置
     */
    public List<SysUserNotificationSetting> getMySettings() {
        Long userId = SecurityContextHolder.getCurrentUserId();
        List<SysUserNotificationSetting> settings = settingMapper.selectList(
                new LambdaQueryWrapper<SysUserNotificationSetting>()
                        .eq(SysUserNotificationSetting::getUserId, userId)
                        .orderByAsc(SysUserNotificationSetting::getId)
        );
        return settings;
    }

    /**
     * 新增或更新通知渠道设置
     */
    public void saveOrUpdate(SettingRequest request) {
        Long userId = SecurityContextHolder.getCurrentUserId();

        // 查找是否已存在该渠道设置
        SysUserNotificationSetting existing = settingMapper.selectOne(
                new LambdaQueryWrapper<SysUserNotificationSetting>()
                        .eq(SysUserNotificationSetting::getUserId, userId)
                        .eq(SysUserNotificationSetting::getChannel, request.getChannel())
        );

        if (existing != null) {
            // 更新
            existing.setEnabled(request.getEnabled());
            existing.setWebhookUrl(request.getWebhookUrl());
            existing.setNotifyLevel(request.getNotifyLevel());
            existing.setQuietStart(request.getQuietStart() != null ? LocalTime.parse(request.getQuietStart()) : null);
            existing.setQuietEnd(request.getQuietEnd() != null ? LocalTime.parse(request.getQuietEnd()) : null);
            settingMapper.updateById(existing);
        } else {
            // 新增
            SysUserNotificationSetting setting = new SysUserNotificationSetting();
            setting.setUserId(userId);
            setting.setChannel(request.getChannel());
            setting.setEnabled(request.getEnabled());
            setting.setWebhookUrl(request.getWebhookUrl());
            setting.setNotifyLevel(request.getNotifyLevel() != null ? request.getNotifyLevel() : "ALL");
            setting.setQuietStart(request.getQuietStart() != null ? LocalTime.parse(request.getQuietStart()) : null);
            setting.setQuietEnd(request.getQuietEnd() != null ? LocalTime.parse(request.getQuietEnd()) : null);
            settingMapper.insert(setting);
        }
    }

    /**
     * 批量保存通知设置
     */
    public void batchSave(List<SettingRequest> requests) {
        Long userId = SecurityContextHolder.getCurrentUserId();

        for (SettingRequest request : requests) {
            SysUserNotificationSetting existing = settingMapper.selectOne(
                    new LambdaQueryWrapper<SysUserNotificationSetting>()
                            .eq(SysUserNotificationSetting::getUserId, userId)
                            .eq(SysUserNotificationSetting::getChannel, request.getChannel())
            );

            if (existing != null) {
                existing.setEnabled(request.getEnabled());
                existing.setWebhookUrl(request.getWebhookUrl());
                existing.setNotifyLevel(request.getNotifyLevel());
                existing.setQuietStart(request.getQuietStart() != null ? LocalTime.parse(request.getQuietStart()) : null);
                existing.setQuietEnd(request.getQuietEnd() != null ? LocalTime.parse(request.getQuietEnd()) : null);
                settingMapper.updateById(existing);
            } else {
                SysUserNotificationSetting setting = new SysUserNotificationSetting();
                setting.setUserId(userId);
                setting.setChannel(request.getChannel());
                setting.setEnabled(request.getEnabled());
                setting.setWebhookUrl(request.getWebhookUrl());
                setting.setNotifyLevel(request.getNotifyLevel() != null ? request.getNotifyLevel() : "ALL");
                setting.setQuietStart(request.getQuietStart() != null ? LocalTime.parse(request.getQuietStart()) : null);
                setting.setQuietEnd(request.getQuietEnd() != null ? LocalTime.parse(request.getQuietEnd()) : null);
                settingMapper.insert(setting);
            }
        }
    }

    /**
     * 删除某个渠道设置（站内信不可删除）
     */
    public void delete(String channel) {
        if ("SITE".equals(channel)) {
            throw new BusinessException("站内信通知不可删除，只能调整通知级别");
        }
        Long userId = SecurityContextHolder.getCurrentUserId();
        settingMapper.delete(
                new LambdaQueryWrapper<SysUserNotificationSetting>()
                        .eq(SysUserNotificationSetting::getUserId, userId)
                        .eq(SysUserNotificationSetting::getChannel, channel)
        );
    }

    /**
     * 测试Webhook连通性
     */
    public String testWebhook(String channel, String webhookUrl) {
        try {
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);

            String body = buildTestBody(channel);
            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(body, headers);
            org.springframework.http.ResponseEntity<String> response = restTemplate.exchange(
                    webhookUrl, org.springframework.http.HttpMethod.POST, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                return "Webhook测试成功，消息已发送";
            } else {
                throw new BusinessException("Webhook测试失败: HTTP " + response.getStatusCodeValue());
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException("Webhook测试失败: " + e.getMessage());
        }
    }

    private String buildTestBody(String channel) {
        String title = "太一研发平台 - 通知测试";
        String content = "这是一条测试消息，如果您收到此消息说明Webhook配置正确。";

        switch (channel) {
            case "FEISHU":
                return String.format(
                        "{\"msg_type\":\"interactive\",\"card\":{\"header\":{\"title\":{\"tag\":\"plain_text\",\"content\":\"%s\"},\"template\":\"green\"},\"elements\":[{\"tag\":\"div\",\"text\":{\"tag\":\"plain_text\",\"content\":\"%s\"}}]}}",
                        title, content);
            case "DINGTALK":
                return String.format(
                        "{\"msgtype\":\"markdown\",\"markdown\":{\"title\":\"%s\",\"text\":\"### %s\\n\\n%s\\n\\n---\\n*来自太一研发管理平台*\"}}",
                        title, title, content);
            case "WECHAT_WORK":
                return String.format(
                        "{\"msgtype\":\"markdown\",\"markdown\":{\"content\":\"### %s\\n%s\\n> 来自太一研发管理平台\"}}",
                        title, content);
            default:
                return String.format("{\"title\":\"%s\",\"content\":\"%s\"}", title, content);
        }
    }

    @Data
    public static class SettingRequest {
        private String channel;
        private Integer enabled;
        private String webhookUrl;
        private String notifyLevel;
        private String quietStart;
        private String quietEnd;
    }
}
