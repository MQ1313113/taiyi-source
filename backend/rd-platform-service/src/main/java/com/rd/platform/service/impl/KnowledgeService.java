package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.BizKnowledge;
import com.rd.platform.model.mapper.BizKnowledgeMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.validation.constraints.NotBlank;

/**
 * 知识库业务逻辑（从原胖 Controller 抽出，Controller 仅保留 HTTP 映射与委托）。
 */
@Service
public class KnowledgeService {

    @Autowired
    private BizKnowledgeMapper knowledgeMapper;

    public Page<BizKnowledge> list(Integer pageNum, Integer pageSize, Long projectId, String category, String keyword) {
        Page<BizKnowledge> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizKnowledge> wrapper = new LambdaQueryWrapper<>();
        if (projectId != null) wrapper.eq(BizKnowledge::getProjectId, projectId);
        if (StringUtils.hasText(category)) wrapper.eq(BizKnowledge::getCategory, category);
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(BizKnowledge::getTitle, keyword)
                    .or().like(BizKnowledge::getContent, keyword));
        }
        wrapper.orderByDesc(BizKnowledge::getCreatedAt);
        return knowledgeMapper.selectPage(page, wrapper);
    }

    public BizKnowledge getById(Long id) {
        BizKnowledge doc = knowledgeMapper.selectById(id);
        if (doc == null) throw BusinessException.badRequest("文档不存在");
        // Increment view count
        doc.setViewCount(doc.getViewCount() + 1);
        knowledgeMapper.updateById(doc);
        return doc;
    }

    public BizKnowledge create(KnowledgeCreateRequest request) {
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
        return doc;
    }

    public BizKnowledge update(Long id, KnowledgeCreateRequest request) {
        BizKnowledge doc = knowledgeMapper.selectById(id);
        if (doc == null) throw BusinessException.badRequest("文档不存在");
        doc.setTitle(request.getTitle());
        doc.setContent(request.getContent());
        doc.setCategory(request.getCategory());
        doc.setTags(request.getTags());
        doc.setVersion(doc.getVersion() + 1);
        knowledgeMapper.updateById(doc);
        return doc;
    }

    public void like(Long id) {
        BizKnowledge doc = knowledgeMapper.selectById(id);
        if (doc == null) throw BusinessException.badRequest("文档不存在");
        doc.setLikeCount(doc.getLikeCount() + 1);
        knowledgeMapper.updateById(doc);
    }

    public void delete(Long id) {
        knowledgeMapper.deleteById(id);
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
