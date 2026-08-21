package com.rd.platform.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 发布单(车次模型):一次发布可搭载多个需求。
 * 回滚方案必填;冒烟确认由 QA 完成后需求方可关闭——补齐"发布最后一公里"的验证卡点。
 */
@Data
@TableName("biz_release_order")
public class BizReleaseOrder implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long projectId;
    private String title;
    private String version;
    /** 发布内容清单(变更点/影响面) */
    private String content;
    /** 回滚方案(必填):可执行的回滚步骤 */
    private String rollbackPlan;
    /** DRAFT/RELEASING/SMOKE_PENDING/DONE/ROLLED_BACK */
    private String status;
    private Long createdBy;
    /** 冒烟验证人(QA) */
    private Long smokeBy;
    private LocalDateTime smokeAt;
    /** 冒烟结论 */
    private String smokeResult;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
