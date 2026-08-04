package com.rd.platform.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("biz_task")
public class BizTask implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long requirementId;
    private Long projectId;
    private Long sprintId;
    private String taskName;
    private String description;
    private String status;
    private String priority;
    private Long assigneeId;
    private Long createdBy;
    private BigDecimal estimatedHours;
    private BigDecimal actualHours;
    private LocalDate startDate;
    private LocalDate dueDate;
    private String type;
    private String acceptanceCriteria;
    private LocalDateTime completedAt;
    private Long sourceTicketId; // 来源工单ID（追溯）
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    @Version
    private Integer version;
    @TableLogic
    private Integer deleted;
}
