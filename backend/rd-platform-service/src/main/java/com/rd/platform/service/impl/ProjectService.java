package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.constant.BizConstants;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.*;
import com.rd.platform.model.mapper.*;
import com.rd.platform.security.context.SecurityContextHolder;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 项目业务逻辑（从原胖 Controller 抽出，Controller 仅保留 HTTP 映射与委托）。
 * 集中承载：各写接口的权限门禁(requirePermission)、框架档位仅 system:manage、
 * 成员管理、迭代管理与项目统计。
 */
@Service
public class ProjectService {

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
    private RoleChecker roleChecker;

    @Autowired
    private ProjectAccessGuard projectAccessGuard;

    /** 项目级写操作权限门禁：当前登录用户须具备指定权限点，否则 403 */
    private void requirePermission(String action, String... permissions) {
        Long operatorId = SecurityContextHolder.getCurrentUserId();
        if (!roleChecker.hasPermission(operatorId, permissions)) {
            throw BusinessException.forbidden("无权限" + action);
        }
    }

    public Page<BizProject> list(Integer pageNum, Integer pageSize, String keyword, String status) {
        Page<BizProject> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizProject> wrapper = new LambdaQueryWrapper<>();
        if (StringUtils.hasText(keyword)) {
            wrapper.like(BizProject::getProjectName, keyword);
        }
        if (StringUtils.hasText(status)) {
            wrapper.eq(BizProject::getStatus, status);
        }
        // 私有项目隔离:仅创建者本人与 admin 可见,他人连项目名都不应看到
        Long uid = SecurityContextHolder.getCurrentUserId();
        if (!projectAccessGuard.isAdmin(uid)) {
            wrapper.and(w -> w.ne(BizProject::getVisibility, "PRIVATE")
                    .or(o -> o.eq(BizProject::getVisibility, "PRIVATE").eq(BizProject::getOwnerId, uid)));
        }
        wrapper.orderByDesc(BizProject::getCreatedAt);
        return projectMapper.selectPage(page, wrapper);
    }

    public BizProject getById(Long id) {
        BizProject project = projectMapper.selectById(id);
        if (project == null) {
            throw BusinessException.badRequest("项目不存在");
        }
        // 私有项目详情同样隔离
        Long uid = SecurityContextHolder.getCurrentUserId();
        if ("PRIVATE".equals(project.getVisibility())
                && !uid.equals(project.getOwnerId()) && !projectAccessGuard.isAdmin(uid)) {
            throw BusinessException.forbidden("无权查看该项目");
        }
        return project;
    }

    public BizProject create(ProjectCreateRequest request) {
        boolean isPrivate = "PRIVATE".equalsIgnoreCase(request.getVisibility());
        if (isPrivate) {
            // 个人项目:任何登录用户可建,用于个人工作留痕(测试测外部硬件/开发做组件等)。
            // 硬约束:强制轻量档、负责人=本人、不可加成员、不计团队度量——防止沦为绕过立项的影子团队项目
            request.setOwnerId(SecurityContextHolder.getCurrentUserId());
            request.setGearLevel(BizConstants.GEAR_LIGHTWEIGHT);
        } else {
            requirePermission("创建项目", "project:create");
        }
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
        project.setVisibility(isPrivate ? "PRIVATE" : "TEAM");
        project.setStatus(isPrivate ? BizConstants.PRJ_ACTIVE : BizConstants.PRJ_PLANNING);
        project.setGearLevel(request.getGearLevel() != null ? request.getGearLevel() : BizConstants.GEAR_STANDARD);
        project.setStartDate(request.getStartDate());
        project.setEndDate(request.getEndDate());
        projectMapper.insert(project);

        // Add owner as project member
        BizProjectMember member = new BizProjectMember();
        member.setProjectId(project.getId());
        member.setUserId(project.getOwnerId());
        member.setRoleCode("PM");
        // joined_at 列 NOT NULL 且项目未配置 MetaObjectHandler,FieldFill.INSERT 不生效,必须手动赋值
        member.setCreatedAt(LocalDateTime.now());
        memberMapper.insert(member);

        return project;
    }

    public BizProject update(Long id, ProjectCreateRequest request) {
        requirePermission("更新项目", "project:edit");
        BizProject project = projectMapper.selectById(id);
        if (project == null) {
            throw BusinessException.badRequest("项目不存在");
        }
        project.setProjectName(request.getProjectName());
        project.setDescription(request.getDescription());
        project.setStartDate(request.getStartDate());
        project.setEndDate(request.getEndDate());
        projectMapper.updateById(project);
        return project;
    }

    public void changeStatus(Long id, StatusChangeRequest request) {
        requirePermission("变更项目状态", "project:edit");
        BizProject project = projectMapper.selectById(id);
        if (project == null) {
            throw BusinessException.badRequest("项目不存在");
        }
        project.setStatus(request.getStatus());
        projectMapper.updateById(project);
    }

    public void changeGear(Long id, GearChangeRequest request) {
        // 框架档位属于平台级治理配置，仅系统管理员(system:manage)可调整；
        // 不能用 project:edit —— 该权限 pm 也持有，会架空"档位仅管理员"的治理定位。
        requirePermission("变更项目框架档位", "system:manage");
        BizProject project = projectMapper.selectById(id);
        if (project == null) {
            throw BusinessException.badRequest("项目不存在");
        }
        if ("PRIVATE".equals(project.getVisibility())) {
            throw BusinessException.badRequest("个人项目固定为轻量档,不支持调整档位");
        }
        project.setGearLevel(request.getGearLevel());
        // Set 7-day transition period
        project.setGearTransitionDate(LocalDate.now().plusDays(7));
        projectMapper.updateById(project);
    }

    // --- Sprint endpoints ---
    public List<BizSprint> listSprints(Long projectId) {
        return sprintMapper.selectList(
                new LambdaQueryWrapper<BizSprint>()
                        .eq(BizSprint::getProjectId, projectId)
                        .orderByDesc(BizSprint::getStartDate));
    }

    public BizSprint createSprint(Long projectId, SprintCreateRequest request) {
        BizProject prjForSprint = projectMapper.selectById(projectId);
        if (prjForSprint != null && "PRIVATE".equals(prjForSprint.getVisibility())) {
            throw BusinessException.badRequest("个人项目不支持迭代(其工时不进入团队容量池)");
        }
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
        return sprint;
    }

    public void changeSprintStatus(Long projectId, Long sprintId, StatusChangeRequest request) {
        requirePermission("变更迭代状态", "sprint:edit");
        BizSprint sprint = sprintMapper.selectById(sprintId);
        if (sprint == null) {
            throw BusinessException.badRequest("迭代不存在");
        }
        sprint.setStatus(request.getStatus());
        sprintMapper.updateById(sprint);
    }

    // --- Member endpoints ---
    /**
     * 列出项目成员（含用户姓名与项目角色）
     */
    public List<Map<String, Object>> listMembers(Long projectId) {
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
        return result;
    }

    public void addMember(Long projectId, MemberRequest request) {
        BizProject prjForVis = projectMapper.selectById(projectId);
        if (prjForVis != null && "PRIVATE".equals(prjForVis.getVisibility())) {
            throw BusinessException.badRequest("个人项目不允许添加成员;如需团队协作请走正式立项(可联系产品经理创建团队项目)");
        }
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
    }

    public void removeMember(Long projectId, Long userId) {
        requirePermission("移除项目成员", "project:manage_member");
        memberMapper.delete(new LambdaQueryWrapper<BizProjectMember>()
                .eq(BizProjectMember::getProjectId, projectId)
                .eq(BizProjectMember::getUserId, userId));
    }

    // ========== 项目统计接口 ==========
    public Map<String, Object> statistics(Long id) {
        BizProject project = projectMapper.selectById(id);
        if (project == null) throw BusinessException.badRequest("项目不存在");

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

        return stats;
    }

    // ========== 项目删除接口 ==========
    public void delete(Long id) {
        requirePermission("删除项目", "project:delete");
        BizProject project = projectMapper.selectById(id);
        if (project == null) throw BusinessException.badRequest("项目不存在");
        projectMapper.deleteById(id);
    }

    // ========== 项目关联数据查询 ==========
    public Page<BizRequirement> listRequirements(Long id, Integer pageNum, Integer pageSize) {
        Page<BizRequirement> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizRequirement> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(BizRequirement::getProjectId, id).orderByDesc(BizRequirement::getCreatedAt);
        return requirementMapper.selectPage(page, wrapper);
    }

    public Page<BizTask> listTasks(Long id, Integer pageNum, Integer pageSize) {
        Page<BizTask> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizTask> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(BizTask::getProjectId, id).orderByDesc(BizTask::getCreatedAt);
        return taskMapper.selectPage(page, wrapper);
    }

    public Page<BizBug> listBugs(Long id, Integer pageNum, Integer pageSize) {
        Page<BizBug> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizBug> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(BizBug::getProjectId, id).orderByDesc(BizBug::getCreatedAt);
        return bugMapper.selectPage(page, wrapper);
    }

    public Page<BizTestCase> listTestCases(Long id, Integer pageNum, Integer pageSize) {
        Page<BizTestCase> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<BizTestCase> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(BizTestCase::getProjectId, id).orderByDesc(BizTestCase::getCreatedAt);
        return testCaseMapper.selectPage(page, wrapper);
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
        /** TEAM(默认)/PRIVATE 个人项目 */
        private String visibility;
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
