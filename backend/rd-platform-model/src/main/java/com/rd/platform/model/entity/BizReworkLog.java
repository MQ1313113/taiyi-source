package com.rd.platform.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 打回/返工归因日志（追加型,不可变）。
 * 在任务被测试打回、缺陷重开、需求退回、提测/变更/评审驳回等节点记录一条,
 * 用于责任画像与"不专业到底集中在哪个环节/谁"的统计。
 */
@Data
@TableName("biz_rework_log")
public class BizReworkLog {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String entityType;        // REQUIREMENT/TASK/BUG/SUBMIT_TEST/CHANGE
    private Long entityId;
    private Long projectId;
    private String fromStatus;
    private String toStatus;
    private String category;          // REQ_UNCLEAR/DEV_POOR/TEST_MISS/OTHER
    private String reason;
    private Long attributedUserId;    // 责任方(被打回对象的负责人)
    private Long operatorId;          // 打回操作人
    private LocalDateTime createdAt;
}
