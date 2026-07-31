package com.rd.platform.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("biz_notification_delivery")
public class BizNotificationDelivery implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long notificationId;
    private String channel;
    private String status;
    private String errorMsg;
    private LocalDateTime sentAt;
    private LocalDateTime createdAt;
}
