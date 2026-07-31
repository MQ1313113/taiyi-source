package com.rd.platform.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("sys_permission")
public class SysPermission implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long parentId;
    private String permissionCode;
    private String permissionName;
    private Integer type;
    private String path;
    private String icon;
    private Integer sortOrder;
    private Integer status;
    private LocalDateTime createdAt;
}
