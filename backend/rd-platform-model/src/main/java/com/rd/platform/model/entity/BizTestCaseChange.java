package com.rd.platform.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("biz_test_case_change")
public class BizTestCaseChange implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long testCaseId;
    private String changeType; // UPDATE / DELETE
    private String payload;     // 修改内容JSON
    private String reason;
    private Long applicantId;
    private String status;      // PENDING / TL_APPROVED / APPROVED / REJECTED
    private Long tlApproverId;
    private Long pmApproverId;
    private String rejectReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
