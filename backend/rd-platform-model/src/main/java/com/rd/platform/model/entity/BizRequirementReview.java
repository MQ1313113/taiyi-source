package com.rd.platform.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("biz_requirement_review")
public class BizRequirementReview {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long requirementId;
    private Long reviewerId;
    private String result;
    private String comment;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
