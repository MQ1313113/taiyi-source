package com.rd.platform.service.controller;

import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.utils.Result;
import com.rd.platform.service.impl.ProjectService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

/**
 * 项目管理接口。业务逻辑已下沉到 {@link ProjectService}，此处仅做 HTTP 映射与结果包装。
 */
@RestController
@RequestMapping("/api/v1/projects")
public class ProjectController {

    @Autowired
    private ProjectService projectService;

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) String keyword,
                          @RequestParam(required = false) String status) {
        return Result.success(projectService.list(pageNum, pageSize, keyword, status));
    }

    @GetMapping("/{id}")
    public Result<?> getById(@PathVariable Long id) {
        return Result.success(projectService.getById(id));
    }

    @PostMapping
    @AuditLog(module = "项目管理", operation = "创建项目")
    public Result<?> create(@Valid @RequestBody ProjectService.ProjectCreateRequest request) {
        return Result.success("项目创建成功", projectService.create(request));
    }

    @PutMapping("/{id}")
    @AuditLog(module = "项目管理", operation = "更新项目")
    public Result<?> update(@PathVariable Long id, @Valid @RequestBody ProjectService.ProjectCreateRequest request) {
        return Result.success("更新成功", projectService.update(id, request));
    }

    @PutMapping("/{id}/status")
    @AuditLog(module = "项目管理", operation = "变更项目状态")
    public Result<?> changeStatus(@PathVariable Long id, @RequestBody ProjectService.StatusChangeRequest request) {
        projectService.changeStatus(id, request);
        return Result.success("状态变更成功");
    }

    @PutMapping("/{id}/gear")
    @AuditLog(module = "项目管理", operation = "变更项目档位")
    public Result<?> changeGear(@PathVariable Long id, @RequestBody ProjectService.GearChangeRequest request) {
        projectService.changeGear(id, request);
        return Result.success("档位变更成功，7天过渡期内旧需求不追溯");
    }

    // --- Sprint endpoints ---
    @GetMapping("/{projectId}/sprints")
    public Result<?> listSprints(@PathVariable Long projectId) {
        return Result.success(projectService.listSprints(projectId));
    }

    @PostMapping("/{projectId}/sprints")
    @AuditLog(module = "项目管理", operation = "创建迭代")
    public Result<?> createSprint(@PathVariable Long projectId, @Valid @RequestBody ProjectService.SprintCreateRequest request) {
        return Result.success("迭代创建成功", projectService.createSprint(projectId, request));
    }

    @PutMapping("/{projectId}/sprints/{sprintId}/status")
    @AuditLog(module = "项目管理", operation = "变更迭代状态")
    public Result<?> changeSprintStatus(@PathVariable Long projectId, @PathVariable Long sprintId,
                                        @RequestBody ProjectService.StatusChangeRequest request) {
        projectService.changeSprintStatus(projectId, sprintId, request);
        return Result.success("迭代状态变更成功");
    }

    // --- Member endpoints ---
    /**
     * 列出项目成员（含用户姓名与项目角色）
     */
    @GetMapping("/{projectId}/members")
    public Result<?> listMembers(@PathVariable Long projectId) {
        return Result.success(projectService.listMembers(projectId));
    }

    @PostMapping("/{projectId}/members")
    @AuditLog(module = "项目管理", operation = "添加项目成员")
    public Result<?> addMember(@PathVariable Long projectId, @RequestBody ProjectService.MemberRequest request) {
        projectService.addMember(projectId, request);
        return Result.success("成员添加成功");
    }

    @DeleteMapping("/{projectId}/members/{userId}")
    @AuditLog(module = "项目管理", operation = "移除项目成员")
    public Result<?> removeMember(@PathVariable Long projectId, @PathVariable Long userId) {
        projectService.removeMember(projectId, userId);
        return Result.success("成员移除成功");
    }

    // ========== 项目统计接口 ==========
    @GetMapping("/{id}/statistics")
    public Result<?> statistics(@PathVariable Long id) {
        return Result.success(projectService.statistics(id));
    }

    // ========== 项目删除接口 ==========
    @DeleteMapping("/{id}")
    @AuditLog(module = "项目管理", operation = "删除项目")
    public Result<?> delete(@PathVariable Long id) {
        projectService.delete(id);
        return Result.success("项目已删除");
    }

    // ========== 项目关联数据查询 ==========
    @GetMapping("/{id}/requirements")
    public Result<?> listRequirements(@PathVariable Long id,
                                      @RequestParam(defaultValue = "1") Integer pageNum,
                                      @RequestParam(defaultValue = "10") Integer pageSize) {
        return Result.success(projectService.listRequirements(id, pageNum, pageSize));
    }

    @GetMapping("/{id}/tasks")
    public Result<?> listTasks(@PathVariable Long id,
                               @RequestParam(defaultValue = "1") Integer pageNum,
                               @RequestParam(defaultValue = "10") Integer pageSize) {
        return Result.success(projectService.listTasks(id, pageNum, pageSize));
    }

    @GetMapping("/{id}/bugs")
    public Result<?> listBugs(@PathVariable Long id,
                              @RequestParam(defaultValue = "1") Integer pageNum,
                              @RequestParam(defaultValue = "10") Integer pageSize) {
        return Result.success(projectService.listBugs(id, pageNum, pageSize));
    }

    @GetMapping("/{id}/test-cases")
    public Result<?> listTestCases(@PathVariable Long id,
                                   @RequestParam(defaultValue = "1") Integer pageNum,
                                   @RequestParam(defaultValue = "10") Integer pageSize) {
        return Result.success(projectService.listTestCases(id, pageNum, pageSize));
    }
}
