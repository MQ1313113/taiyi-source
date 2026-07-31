package com.rd.platform.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("biz_project_member")
public class BizProjectMember {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long projectId;
    private Long userId;
    @TableField("role_in_project")
    private String roleCode;
    @TableField(value = "joined_at", fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
