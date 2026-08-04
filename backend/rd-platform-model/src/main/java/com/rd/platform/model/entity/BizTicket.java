package com.rd.platform.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 工单（统一问题入口）。销售/售后/客户/产品/内部提报的问题的载体，
 * 进门即单号+责任人+留痕，经分诊转成需求/缺陷/任务，可双向追溯。
 */
@Data
@TableName("biz_ticket")
public class BizTicket {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String ticketCode;      // TK-yyyy-序号
    private String source;          // SALES/SUPPORT/CUSTOMER/PRODUCT/INTERNAL
    private String category;        // BUG/REQUIREMENT/AFTERSALES/OTHER
    private String title;
    private String description;
    private String priority;        // P0/P1/P2/P3
    private Long projectId;         // 可空，分诊时补
    private Long reporterId;
    private Long assigneeId;        // 责任人（自动派或分诊指派）
    private String status;          // PENDING_TRIAGE/DISPATCHED/PROCESSING/RESOLVED/CLOSED
    private String convertedType;   // REQUIREMENT/BUG/TASK（分诊转换后）
    private Long convertedId;
    private LocalDateTime slaDueAt;  // 落地时按优先级计算
    private Integer escalatedLevel;  // 0未升级/1责任人/2项目负责人/3管理员，防重复升级
    private LocalDateTime resolvedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
