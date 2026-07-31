package com.rd.platform.service.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.constant.BizConstants;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.common.utils.Result;
import com.rd.platform.model.entity.*;
import com.rd.platform.model.mapper.*;
import com.rd.platform.security.context.SecurityContextHolder;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;

@RestController
@RequestMapping("/api/v1/projects")
public class ProjectController {

    @Autowired
    private BizProjectMapper projectMapper;

    @Autowired
    private BizProjectMemberMapper memberMapper;

    @Autowired
    private BizSprintMapper sprintMapper;

    @Autowired
    private SysUserMapper sysUserMapper;

    @Autowired
    private SysRoleMapper sysRoleMapper;

    @Autowired
    private SysUserRoleMapper sysUserRoleMapper;

    @Autowired
    private BizRequirementMapper requirementMapper;

    @Autowired
    private BizTaskMapper taskMapper;

    @Autowired
    private BizBugMapper bugMapper;

    @Autowired
    private BizTestCaseMapper testCaseMapper;

    @Autowired
    private com.rd.platform.service.impl.RoleChecker roleChecker;
    /** 项目级写操作权限门禁：当前登录用户须具备指定权限点，否则 403 */
    private void requirePermission(String action, String... permissions) {
        Long operatorId = SecurityContextHolder.getCurrentUserId();
        if (!roleChecker.hasPermission(operatorId, permissions)) {
            throw BusinessException.forbidden("无权限" + action);
        }
    }

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) String keyword,
                          @RequestParam(required = false) String status) {
        Page<BizProject> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizProject> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.like(BizProject::getProjectName, keyword);
        }
        if (StringUtils.hasText(status)) {
            wrapper.eq(BizProject::getStatus, status);
        }
        wrapper.orderByDesc(BizProject::getCreatedAt);
        return Result.success(projectMapper.selectPage(page, wrapper));
    }

    @GetMapping("/{id}")
    public Result<?> getById(@PathVariable Long id) {
        BizProject project = projectMapper.selectById(id);
        if (project == null) {
            return Result.error("项目不存在");
        }
        return Result.success(project);
    }

    @PostMapping
    @AuditLog(module = "项目管理", operation = "创建项目")
    public Result<?> create(@Valid @RequestBody ProjectCreateRequest request) {
        requirePermission("创建项目", "project:create");
        // Check duplicate name
        Long count = projectMapper.selectCount(
                new LambdaQueryWrapper<BizProject>().eq(BizProject::getProjectName, request.getProjectName()));
        if (count > 0) {
            throw BusinessException.badRequest("项目名称已存在");
        }

        BizProject project = new BizProject();
        project.setProjectName(request.getProjectName());
        project.setProjectCode(request.getProjectCode());
        project.setDescription(request.getDescription());
        project.setOwnerId(request.getOwnerId());
        project.setStatus(BizConstants.PRJ_PLANNING);
        project.setGearLevel(request.getGearLevel() != null ? request.getGearLevel() : BizConstants.GEAR_STANDARD);
        project.setStartDate(request.getStartDate());
        project.setEndDate(request.getEndDate());
        projectMapper.insert(project);

        // Add owner as project member
        BizProjectMember member = new BizProjectMember();
        member.setProjectId(project.getId());
        member.setUserId(project.getOwnerId());
        member.setRoleCode("PM");
        memberMapper.insert(member);

        return Result.success("项目创建成功", project);
    }

    @PutMapping("/{id}")
    @AuditLog(module = "项目管理", operation = "更新项目")
    public Result<?> update(@PathVariable Long id, @Valid @RequestBody ProjectCreateRequest request) {
        requirePermission("更新项目", "project:edit");
        BizProject project = projectMapper.selectById(id);
        if (project == null) {
            return Result.error("项目不存在");
        }
        project.setProjectName(request.getProjectName());
        project.setDescription(request.getDescription());
        project.setStartDate(request.getStartDate());
        project.setEndDate(request.getEndDate());
        projectMapper.updateById(project);
        return Result.success("更新成功", project);
    }

    @PutMapping("/{id}/status")
    @AuditLog(module = "项目管理", operation = "变更项目状态")
    public Result<?> changeStatus(@PathVariable Long id, @RequestBody StatusChangeRequest request) {
        requirePermission("变更项目状态", "project:edit");
        BizProject project = projectMapper.selectById(id);
        if (project == null) {
            return Result.error("项目不存在");
        }
        project.setStatus(request.getStatus());
        projectMapper.updateById(project);
        return Result.success("状态变更成功");
    }

    @PutMapping("/{id}/gear")
    @AuditLog(module = "项目管理", operation = "变更项目档位")
    public Result<?> changeGear(@PathVariable Long id, @RequestBody GearChangeRequest request) {
        // 框架档位属于平台级治理配置，仅系统管理员可调整
        requirePermission("变更项目框架档位", "project:edit");
        BizProject project = projectMapper.selectById(id);
        if (project == null) {
            return Result.error("项目不存在");
        }
        project.setGearLevel(request.getGearLevel());
        // Set 7-day transition period
        project.setGearTransitionDate(LocalDate.now().plusDays(7));
        projectMapper.updateById(project);
        return Result.success("档位变更成功，7天过渡期内旧需求不追溯");
    }

    // --- Sprint endpoints ---
    @GetMapping("/{projectId}/sprints")
    public Result<?> listSprints(@PathVariable Long projectId) {
        List<BizSprint> sprints = sprintMapper.selectList(
                new LambdaQueryWrapper<BizSprint>()
                        .eq(BizSprint::getProjectId, projectId)
                        .orderByDesc(BizSprint::getStartDate));
        return Result.success(sprints);
    }

    @PostMapping("/{projectId}/sprints")
    @AuditLog(module = "项目管理", operation = "创建迭代")
    public Result<?> createSprint(@PathVariable Long projectId, @Valid @RequestBody SprintCreateRequest request) {
        requirePermission("创建迭代", "sprint:create");
        if (request.getEndDate().isBefore(request.getStartDate())) {
            throw BusinessException.badRequest("结束日期不能早于开始日期");
        }
        BizSprint sprint = new BizSprint();
        sprint.setProjectId(projectId);
        sprint.setSprintName(request.getSprintName());
        sprint.setGoal(request.getGoal());
        sprint.setStatus(BizConstants.SPRINT_NOT_STARTED);
        sprint.setType(request.getType() != null ? request.getType() : "NORMAL");
        sprint.setStartDate(request.getStartDate());
        sprint.setEndDate(request.getEndDate());
        sprint.setCreatedBy(SecurityContextHolder.getCurrentUserId());
        sprintMapper.insert(sprint);
        return Result.success("迭代创建成功", sprint);
    }

    @PutMapping("/{projectId}/sprints/{sprintId}/status")
    @AuditLog(module = "项目管理", operation = "变更迭代状态")
    public Result<?> changeSprintStatus(@PathVariable Long projectId, @PathVariable Long sprintId,
                                        @RequestBody StatusChangeRequest request) {
        requirePermission("变更迭代状态", "sprint:edit");
        BizSprint sprint = sprintMapper.selectById(sprintId);
        if (sprint == null) {
            return Result.error("迭代不存在");
        }
        sprint.setStatus(request.getStatus());
        sprintMapper.updateById(sprint);
        return Result.success("迭代状态变更成功");
    }

    // --- Member endpoints ---
    /**
     * 列出项目成员（含用户姓名与项目角色）
     */
    @GetMapping("/{projectId}/members")
    public Result<?> listMembers(@PathVariable Long projectId) {
        List<BizProjectMember> members = memberMapper.selectList(
                new LambdaQueryWrapper<BizProjectMember>().eq(BizProjectMember::getProjectId, projectId));
        List<Map<String, Object>> result = new ArrayList<>();
        for (BizProjectMember m : members) {
            Map<String, Object> item = new HashMap<>();
            item.put("userId", m.getUserId());
            SysUser u = sysUserMapper.selectById(m.getUserId());
            item.put("username", u != null ? u.getUsername() : null);
            item.put("nickname", u != null ? u.getNickname() : null);
            item.put("roleCode", m.getRoleCode());
            result.add(item);
        }
        return Result.success(result);
    }

    @PostMapping("/{projectId}/members")
    @AuditLog(module = "项目管理", operation = "添加项目成员")
    public Result<?> addMember(@PathVariable Long projectId, @RequestBody MemberRequest request) {
        requirePermission("添加项目成员", "project:manage_member");
        // 防重：同一项目同一用户不重复添加
        Long exists = memberMapper.selectCount(new LambdaQueryWrapper<BizProjectMember>()
                .eq(BizProjectMember::getProjectId, projectId)
                .eq(BizProjectMember::getUserId, request.getUserId()));
        if (exists != null && exists > 0) {
            throw BusinessException.badRequest("该用户已是项目成员");
        }
        // 成员在项目中的角色统一以其账号系统角色为准，不再手动指定
        List<String> codes = roleChecker.getRoleCodes(request.getUserId());
        if (codes == null || codes.isEmpty()) {
            throw BusinessException.badRequest("该用户未分配系统角色，无法加入项目");
        }
        BizProjectMember member = new BizProjectMember();
        member.setProjectId(projectId);
        member.setUserId(request.getUserId());
        member.setRoleCode(codes.get(0));
        member.setCreatedAt(LocalDateTime.now());
        memberMapper.insert(member);
        return Result.success("成员添加成功");
    }

    @DeleteMapping("/{projectId}/members/{userId}")
    @AuditLog(module = "项目管理", operation = "移除项目成员")
    public Result<?> removeMember(@PathVariable Long projectId, @PathVariable Long userId) {
        requirePermission("移除项目成员", "project:manage_member");
        memberMapper.delete(new LambdaQueryWrapper<BizProjectMember>()
                .eq(BizProjectMember::getProjectId, projectId)
                .eq(BizProjectMember::getUserId, userId));
        return Result.success("成员移除成功");
    }

    // ========== 项目统计接口 ==========
    @GetMapping("/{id}/statistics")
    public Result<?> statistics(@PathVariable Long id) {
        BizProject project = projectMapper.selectById(id);
        if (project == null) return Result.error("项目不存在");

        Map<String, Object> stats = new HashMap<>();

        // 需求统计
        List<BizRequirement> reqs = requirementMapper.selectList(
                new LambdaQueryWrapper<BizRequirement>().eq(BizRequirement::getProjectId, id));
        Map<String, Long> reqByStatus = new HashMap<>();
        for (BizRequirement r : reqs) {
            reqByStatus.merge(r.getStatus() != null ? r.getStatus() : "UNKNOWN", 1L, Long::sum);
        }
        stats.put("requirementTotal", reqs.size());
        stats.put("requirementByStatus", reqByStatus);

        // 任务统计
        List<BizTask> tasks = taskMapper.selectList(
                new LambdaQueryWrapper<BizTask>().eq(BizTask::getProjectId, id));
        Map<String, Long> taskByStatus = new HashMap<>();
        for (BizTask t : tasks) {
            taskByStatus.merge(t.getStatus() != null ? t.getStatus() : "UNKNOWN", 1L, Long::sum);
        }
        long taskDone = taskByStatus.getOrDefault("DONE", 0L) + taskByStatus.getOrDefault("CLOSED", 0L);
        stats.put("taskTotal", tasks.size());
        stats.put("taskByStatus", taskByStatus);
        stats.put("taskCompletionRate", tasks.isEmpty() ? 0 : Math.round(taskDone * 100.0 / tasks.size()));

        // 缺陷统计
        List<BizBug> bugs = bugMapper.selectList(
                new LambdaQueryWrapper<BizBug>().eq(BizBug::getProjectId, id));
        Map<String, Long> bugByStatus = new HashMap<>();
        for (BizBug b : bugs) {
            bugByStatus.merge(b.getStatus() != null ? b.getStatus() : "UNKNOWN", 1L, Long::sum);
        }
        long bugOpen = bugs.size() - bugByStatus.getOrDefault("CLOSED", 0L) - bugByStatus.getOrDefault("VERIFIED", 0L);
        stats.put("bugTotal", bugs.size());
        stats.put("bugByStatus", bugByStatus);
        stats.put("bugOpenCount", bugOpen);

        // 测试用例统计
        List<BizTestCase> cases = testCaseMapper.selectList(
                new LambdaQueryWrapper<BizTestCase>().eq(BizTestCase::getProjectId, id));
        Map<String, Long> caseByStatus = new HashMap<>();
        for (BizTestCase c : cases) {
            String es = c.getExecutionStatus() != null ? c.getExecutionStatus() : "NOT_RUN";
            caseByStatus.merge(es, 1L, Long::sum);
        }
        long casePassed = caseByStatus.getOrDefault("PASSED", 0L);
        stats.put("testCaseTotal", cases.size());
        stats.put("testCaseByStatus", caseByStatus);
        stats.put("testCasePassRate", cases.isEmpty() ? 0 : Math.round(casePassed * 100.0 / cases.size()));

        // 迭代统计
        List<BizSprint> sprints = sprintMapper.selectList(
                new LambdaQueryWrapper<BizSprint>().eq(BizSprint::getProjectId, id));
        stats.put("sprintTotal", sprints.size());
        long sprintActive = sprints.stream().filter(s -> "IN_PROGRESS".equals(s.getStatus())).count();
        stats.put("sprintActive", sprintActive);

        // 成员数
        Long memberCount = memberMapper.selectCount(
                new LambdaQueryWrapper<BizProjectMember>().eq(BizProjectMember::getProjectId, id));
        stats.put("memberCount", memberCount);

        return Result.success(stats);
    }

    // ========== 项目删除接口 ==========
    @DeleteMapping("/{id}")
    @AuditLog(module = "项目管理", operation = "删除项目")
    public Result<?> delete(@PathVariable Long id) {
        requirePermission("删除项目", "project:delete");
        BizProject project = projectMapper.selectById(id);
        if (project == null) return Result.error("项目不存在");
        projectMapper.deleteById(id);
        return Result.success("项目已删除");
    }

    // ========== 项目关联数据查询 ==========
    @GetMapping("/{id}/requirements")
    public Result<?> listRequirements(@PathVariable Long id,
                                      @RequestParam(defaultValue = "1") Integer pageNum,
                                      @RequestParam(defaultValue = "10") Integer pageSize) {
        Page<BizRequirement> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizRequirement> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(BizRequirement::getProjectId, id).orderByDesc(BizRequirement::getCreatedAt);
        return Result.success(requirementMapper.selectPage(page, wrapper));
    }

    @GetMapping("/{id}/tasks")
    public Result<?> listTasks(@PathVariable Long id,
                               @RequestParam(defaultValue = "1") Integer pageNum,
                               @RequestParam(defaultValue = "10") Integer pageSize) {
        Page<BizTask> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizTask> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(BizTask::getProjectId, id).orderByDesc(BizTask::getCreatedAt);
        return Result.success(taskMapper.selectPage(page, wrapper));
    }

    @GetMapping("/{id}/bugs")
    public Result<?> listBugs(@PathVariable Long id,
                              @RequestParam(defaultValue = "1") Integer pageNum,
                              @RequestParam(defaultValue = "10") Integer pageSize) {
        Page<BizBug> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizBug> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(BizBug::getProjectId, id).orderByDesc(BizBug::getCreatedAt);
        return Result.success(bugMapper.selectPage(page, wrapper));
    }

    @GetMapping("/{id}/test-cases")
    public Result<?> listTestCases(@PathVariable Long id,
                                   @RequestParam(defaultValue = "1") Integer pageNum,
                                   @RequestParam(defaultValue = "10") Integer pageSize) {
        Page<BizTestCase> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizTestCase> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(BizTestCase::getProjectId, id).orderByDesc(BizTestCase::getCreatedAt);
        return Result.success(testCaseMapper.selectPage(page, wrapper));
    }

    @Data
    public static class ProjectCreateRequest {
        @NotBlank(message = "项目名称不能为空")
        private String projectName;
        private String projectCode;
        private String description;
        @NotNull(message = "项目负责人不能为空")
        private Long ownerId;
        private String gearLevel;
        private LocalDate startDate;
        private LocalDate endDate;
    }

    @Data
    public static class SprintCreateRequest {
        @NotBlank(message = "迭代名称不能为空")
        private String sprintName;
        private String goal;
        private String type;
        @NotNull(message = "开始日期不能为空")
        private LocalDate startDate;
        @NotNull(message = "结束日期不能为空")
        private LocalDate endDate;
    }

    @Data
    public static class StatusChangeRequest {
        @NotBlank(message = "状态不能为空")
        private String status;
    }

    @Data
    public static class GearChangeRequest {
        @NotBlank(message = "档位不能为空")
        private String gearLevel;
    }

    @Data
    public static class MemberRequest {
        @NotNull(message = "用户ID不能为空")
        private Long userId;
        private String roleInProject;
    }
}
