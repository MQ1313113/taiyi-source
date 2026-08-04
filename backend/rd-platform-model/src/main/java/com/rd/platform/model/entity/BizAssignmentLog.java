package com.rd.platform.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 转派/流转留痕（追加型,不可变）。
 * 每次任务/缺陷/工单换负责人时记一条,用于还原每个工作的流转路径、
 * 以及统计每人的"甩出/接入/净流入"(反甩锅)。
 */
@Data
@TableName("biz_assignment_log")
public class BizAssignmentLog {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String entityType;   // TASK/BUG/TICKET
    private Long entityId;
    private Long projectId;
    private Long fromUserId;      // 原负责人(可空,首次指派为空)
    private Long toUserId;        // 新负责人
    private Long operatorId;      // 操作人
    private String reason;
    private LocalDateTime createdAt;
}
