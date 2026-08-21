package com.rd.platform.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.io.Serializable;
import java.time.LocalDateTime;

/** 发布单-需求关联(多对多):发布单是车次,需求是乘客 */
@Data
@TableName("biz_release_order_item")
public class BizReleaseOrderItem implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long releaseOrderId;
    private Long requirementId;
    private LocalDateTime createdAt;
}
