package com.rd.platform.model.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("biz_knowledge")
public class BizKnowledge implements Serializable {
    private static final long serialVersionUID = 1L;

    @TableId(type = IdType.AUTO)
    private Long id;
    private Long projectId;
    private String title;
    private String content;
    private String category;
    private String tags;
    private Long authorId;
    private Integer version;
    private Integer likeCount;
    private Integer viewCount;
    private String attachmentUrls;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    @TableLogic
    private Integer deleted;
}
