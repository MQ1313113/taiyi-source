package com.rd.platform.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("biz_dependency")
public class BizDependency implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long requirementId;
    private Long projectId;
    private String dependencyDesc;
    private String externalTeam;
    private String status;
    private LocalDate expectedResolveDate;
    private LocalDateTime resolvedAt;
    private Long createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
