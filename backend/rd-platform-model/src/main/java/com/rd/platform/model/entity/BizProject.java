package com.rd.platform.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.io.Serializable;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("biz_project")
public class BizProject implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;
    private String projectName;
    private String projectCode;
    private String description;
    private Long ownerId;
    private String status;
    private String gearLevel;
    /** 可见性:TEAM 团队项目 / PRIVATE 个人项目(仅创建者与admin可见,岗位实体直通) */
    private String visibility;
    private LocalDate gearTransitionDate;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
