package com.rd.platform.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("biz_requirement")
public class BizRequirement implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long projectId;
    private Long sprintId;
    private String title;
    private String type;
    private String priority;
    private String status;
    private String description;
    private String acceptanceCriteria;
    private String businessValue;
    private String prototypeUrl;
    private String dataDictionary;
    private String apiContract;
    private String performanceBaseline;
    private Long ownerId;
    private Long createdBy;
    private LocalDate expectedCompletionDate;
    private Integer isFastTrack;
    private LocalDateTime fastTrackExpireTime;
    private Integer fastTrackViolated;
    private Long sourceTicketId; // 来源工单ID（由工单分诊转换而来时回填，用于追溯）
    @Version
    private Integer version;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
