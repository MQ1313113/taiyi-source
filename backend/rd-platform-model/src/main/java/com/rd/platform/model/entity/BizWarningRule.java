package com.rd.platform.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("biz_warning_rule")
public class BizWarningRule {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long projectId;
    private String ruleType;
    private String ruleName;
    private Integer thresholdValue;
    private Boolean enabled;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
