package com.rd.platform.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.io.Serializable;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@TableName("sys_user_notification_setting")
public class SysUserNotificationSetting implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String channel;
    private Integer enabled;
    private String webhookUrl;
    private String notifyLevel;
    private LocalTime quietStart;
    private LocalTime quietEnd;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
