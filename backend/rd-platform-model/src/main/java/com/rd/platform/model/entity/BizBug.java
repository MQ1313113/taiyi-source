package com.rd.platform.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("biz_bug")
public class BizBug implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long projectId;
    private Long sprintId;
    private Long requirementId;
    private Long taskId;
    private String title;
    private String description;
    private String expectedResult;
    private String actualResult;
    private String severity;
    private String priority;
    private String moduleName;
    private String status;
    private Long reporterId;
    private Long assigneeId;
    private Long fixerId;
    private String environment;
    private String frequency;
    private String affectedScope;
    private String rootCause;
    private String introducePhase;
    private String attachmentUrls;
    private LocalDateTime confirmedAt;
    private LocalDateTime fixedAt;
    private LocalDateTime closedAt;
    private Long sourceTicketId; // 来源工单ID（追溯）
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    @Version
    private Integer version;
    @TableLogic
    private Integer deleted;
}
