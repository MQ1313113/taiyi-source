package com.rd.platform.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 工单路由/责任规则（轻量"模块责任表"）。
 * 按 (category [+ projectId]) 命中一条 → 自动派给 ownerId；命中不到 → 回分诊人兜底。
 */
@Data
@TableName("biz_ticket_routing")
public class BizTicketRouting {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String category;   // 匹配维度：工单类型
    private Long projectId;    // 可空；填了则精确到项目，命中更优先
    private Long ownerId;      // 默认负责人
    private Integer enabled;   // 1启用/0停用
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
