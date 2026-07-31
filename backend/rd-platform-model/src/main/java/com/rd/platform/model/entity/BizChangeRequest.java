package com.rd.platform.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("biz_change_request")
public class BizChangeRequest implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long requirementId;
    private Long projectId;
    private String changeContent;
    private String changeReason;
    private String impactScope;
    private String status;
    private Long applicantId;
    private Long approverId;
    private LocalDateTime approvedAt;
    private String rejectReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
