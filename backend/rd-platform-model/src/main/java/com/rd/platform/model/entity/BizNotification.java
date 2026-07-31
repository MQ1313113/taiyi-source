package com.rd.platform.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("biz_notification")
public class BizNotification implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String title;
    private String content;
    private String type;
    private String priority;
    private Integer isRead;
    private String targetType;
    private Long targetId;
    private String targetUrl;
    private LocalDateTime readAt;
    private LocalDateTime createdAt;
}
