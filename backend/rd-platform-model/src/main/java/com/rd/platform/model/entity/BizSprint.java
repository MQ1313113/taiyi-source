package com.rd.platform.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("biz_sprint")
public class BizSprint implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long projectId;
    private String sprintName;
    private String goal;
    private String status;
    private String type;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long createdBy;
    /** 关闭迭代时的快照:迭代内需求总数(计入完成率度量) */
    private Integer plannedCount;
    /** 关闭迭代时的快照:已关闭需求数 */
    private Integer doneCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
