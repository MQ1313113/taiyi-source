package com.rd.platform.service.controller;

import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.utils.Result;
import com.rd.platform.service.impl.KnowledgeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

/**
 * 知识库管理接口。业务逻辑已下沉到 {@link KnowledgeService}，此处仅做 HTTP 映射与结果包装。
 */
@RestController
@RequestMapping("/api/v1/knowledge")
public class KnowledgeController {

    @Autowired
    private KnowledgeService knowledgeService;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) Long projectId,
                          @RequestParam(required = false) String category,
                          @RequestParam(required = false) String keyword) {
        return Result.success(knowledgeService.list(pageNum, pageSize, projectId, category, keyword));
    }

    @GetMapping("/{id}")
    public Result<?> getById(@PathVariable Long id) {
        return Result.success(knowledgeService.getById(id));
    }

    @PostMapping
    @AuditLog(module = "知识库", operation = "创建文档")
    public Result<?> create(@Valid @RequestBody KnowledgeService.KnowledgeCreateRequest request) {
        return Result.success("文档创建成功", knowledgeService.create(request));
    }

    @PutMapping("/{id}")
    @AuditLog(module = "知识库", operation = "更新文档")
    public Result<?> update(@PathVariable Long id, @Valid @RequestBody KnowledgeService.KnowledgeCreateRequest request) {
        return Result.success("文档更新成功", knowledgeService.update(id, request));
    }

    @PostMapping("/{id}/like")
    public Result<?> like(@PathVariable Long id) {
        knowledgeService.like(id);
        return Result.success("点赞成功");
    }

    @DeleteMapping("/{id}")
    @AuditLog(module = "知识库", operation = "删除文档")
    public Result<?> delete(@PathVariable Long id) {
        knowledgeService.delete(id);
        return Result.success("文档已删除");
    }
}
