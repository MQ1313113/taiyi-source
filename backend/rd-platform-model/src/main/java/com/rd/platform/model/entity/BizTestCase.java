package com.rd.platform.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("biz_test_case")
public class BizTestCase implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long projectId;
    private Long requirementId;
    private String moduleName;
    private String caseName;
    private String precondition;
    private String steps;
    private String expectedResult;
    private String priority;
    private String acRef;
    private String status;
    private String executionStatus;
    private String actualResult;
    private String evidenceUrl;
    private Long executedBy;
    private LocalDateTime executedAt;
    private Long createdBy;
    private LocalDateTime lockedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
