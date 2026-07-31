package com.rd.platform.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("sys_audit_log")
public class SysAuditLog implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String username;
    private String operation;
    private String module;
    private String method;
    private String requestUrl;
    private String requestParams;
    private String ipAddress;
    private String beforeData;
    private String afterData;
    private Integer status;
    private String errorMsg;
    private Long executionTime;
    private LocalDateTime createdAt;
}
