package com.rd.platform.service.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.utils.Result;
import com.rd.platform.model.entity.BizKnowledge;
import com.rd.platform.model.mapper.BizKnowledgeMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import javax.validation.constraints.NotBlank;

@RestController
@RequestMapping("/api/v1/knowledge")
public class KnowledgeController {

    @Autowired
    private BizKnowledgeMapper knowledgeMapper;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) Long projectId,
                          @RequestParam(required = false) String category,
                          @RequestParam(required = false) String keyword) {
        Page<BizKnowledge> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizKnowledge> wrapper = new LambdaQueryWrapper<>();
        if (projectId != null) wrapper.eq(BizKnowledge::getProjectId, projectId);
        if (StringUtils.hasText(category)) wrapper.eq(BizKnowledge::getCategory, category);
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(BizKnowledge::getTitle, keyword)
                    .or().like(BizKnowledge::getContent, keyword));
        }
        wrapper.orderByDesc(BizKnowledge::getCreatedAt);
        return Result.success(knowledgeMapper.selectPage(page, wrapper));
    }

    @GetMapping("/{id}")
    public Result<?> getById(@PathVariable Long id) {
        BizKnowledge doc = knowledgeMapper.selectById(id);
        if (doc == null) return Result.error("文档不存在");
        // Increment view count
        doc.setViewCount(doc.getViewCount() + 1);
        knowledgeMapper.updateById(doc);
        return Result.success(doc);
    }

    @PostMapping
    @AuditLog(module = "知识库", operation = "创建文档")
    public Result<?> create(@Valid @RequestBody KnowledgeCreateRequest request) {
        BizKnowledge doc = new BizKnowledge();
        doc.setProjectId(request.getProjectId());
        doc.setTitle(request.getTitle());
        doc.setContent(request.getContent());
        doc.setCategory(request.getCategory());
        doc.setTags(request.getTags());
        doc.setAuthorId(SecurityContextHolder.getCurrentUserId());
        doc.setVersion(1);
        doc.setLikeCount(0);
        doc.setViewCount(0);
        knowledgeMapper.insert(doc);
        return Result.success("文档创建成功", doc);
    }

    @PutMapping("/{id}")
    @AuditLog(module = "知识库", operation = "更新文档")
    public Result<?> update(@PathVariable Long id, @Valid @RequestBody KnowledgeCreateRequest request) {
        BizKnowledge doc = knowledgeMapper.selectById(id);
        if (doc == null) return Result.error("文档不存在");
        doc.setTitle(request.getTitle());
        doc.setContent(request.getContent());
        doc.setCategory(request.getCategory());
        doc.setTags(request.getTags());
        doc.setVersion(doc.getVersion() + 1);
        knowledgeMapper.updateById(doc);
        return Result.success("文档更新成功", doc);
    }

    @PostMapping("/{id}/like")
    public Result<?> like(@PathVariable Long id) {
        BizKnowledge doc = knowledgeMapper.selectById(id);
        if (doc == null) return Result.error("文档不存在");
        doc.setLikeCount(doc.getLikeCount() + 1);
        knowledgeMapper.updateById(doc);
        return Result.success("点赞成功");
    }

    @DeleteMapping("/{id}")
    @AuditLog(module = "知识库", operation = "删除文档")
    public Result<?> delete(@PathVariable Long id) {
        knowledgeMapper.deleteById(id);
        return Result.success("文档已删除");
    }

    @Data
    public static class KnowledgeCreateRequest {
        private Long projectId;
        @NotBlank(message = "标题不能为空")
        private String title;
        @NotBlank(message = "内容不能为空")
        private String content;
        @NotBlank(message = "分类不能为空")
        private String category;
        private String tags;
    }
}
