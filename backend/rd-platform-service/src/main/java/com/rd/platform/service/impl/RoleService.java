package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.SysPermission;
import com.rd.platform.model.entity.SysRole;
import com.rd.platform.model.entity.SysRolePermission;
import com.rd.platform.model.entity.SysUserRole;
import com.rd.platform.model.mapper.SysPermissionMapper;
import com.rd.platform.model.mapper.SysRoleMapper;
import com.rd.platform.model.mapper.SysRolePermissionMapper;
import com.rd.platform.model.mapper.SysUserRoleMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 角色管理业务逻辑（从原胖 Controller 抽出，Controller 仅保留 HTTP 映射与委托）。
 * 角色 CRUD + 权限分配，仅系统管理员（sys_admin）可操作。
 */
@Service
public class RoleService {

    @Autowired
    private SysRoleMapper roleMapper;
    @Autowired
    private SysRolePermissionMapper rolePermissionMapper;
    @Autowired
    private SysPermissionMapper permissionMapper;
    @Autowired
    private SysUserRoleMapper userRoleMapper;
    @Autowired
    private RoleChecker roleChecker;

    /** 确保当前用户是系统管理员 */
    private void requireAdmin() {
        Long uid = SecurityContextHolder.getCurrentUserId();
        if (!roleChecker.hasPermission(uid, "system:manage")) {
            throw new BusinessException("仅系统管理员可操作角色管理");
        }
    }

    // ============ 角色列表 ============
    public List<Map<String, Object>> list() {
        List<SysRole> roles = roleMapper.selectList(
                new LambdaQueryWrapper<SysRole>().orderByAsc(SysRole::getSortOrder));
        // 附带每个角色的权限 code 列表
        List<Map<String, Object>> result = new ArrayList<>();
        for (SysRole role : roles) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", role.getId());
            item.put("roleCode", role.getRoleCode());
            item.put("roleName", role.getRoleName());
            item.put("description", role.getDescription());
            item.put("sortOrder", role.getSortOrder());
            item.put("status", role.getStatus());
            item.put("createdAt", role.getCreatedAt());
            item.put("updatedAt", role.getUpdatedAt());
            // 是否内置角色（不可删除）
            item.put("builtIn", isBuiltIn(role.getRoleCode()));
            // 权限列表
            List<SysRolePermission> rps = rolePermissionMapper.selectList(
                    new LambdaQueryWrapper<SysRolePermission>().eq(SysRolePermission::getRoleId, role.getId()));
            List<Long> permIds = rps.stream().map(SysRolePermission::getPermissionId).collect(Collectors.toList());
            List<String> permCodes = new ArrayList<>();
            if (!permIds.isEmpty()) {
                List<SysPermission> perms = permissionMapper.selectBatchIds(permIds);
                permCodes = perms.stream().map(SysPermission::getPermissionCode).collect(Collectors.toList());
            }
            item.put("permissions", permCodes);
            // 用户数
            long userCount = userRoleMapper.selectCount(
                    new LambdaQueryWrapper<SysUserRole>().eq(SysUserRole::getRoleId, role.getId()));
            item.put("userCount", userCount);
            result.add(item);
        }
        return result;
    }

    // ============ 获取所有权限列表（供勾选） ============
    public List<SysPermission> allPermissions() {
        return permissionMapper.selectList(
                new LambdaQueryWrapper<SysPermission>().orderByAsc(SysPermission::getSortOrder));
    }

    // ============ 新增角色 ============
    public Long create(RoleRequest request) {
        requireAdmin();
        // 检查 code 唯一
        Long exists = roleMapper.selectCount(
                new LambdaQueryWrapper<SysRole>().eq(SysRole::getRoleCode, request.getRoleCode()));
        if (exists > 0) {
            throw new BusinessException("角色编码已存在：" + request.getRoleCode());
        }
        SysRole role = new SysRole();
        role.setRoleCode(request.getRoleCode());
        role.setRoleName(request.getRoleName());
        role.setDescription(request.getDescription());
        role.setSortOrder(request.getSortOrder() != null ? request.getSortOrder() : 99);
        role.setStatus(1);
        roleMapper.insert(role);
        // 分配权限
        if (request.getPermissionIds() != null && !request.getPermissionIds().isEmpty()) {
            saveRolePermissions(role.getId(), request.getPermissionIds());
        }
        return role.getId();
    }

    // ============ 修改角色 ============
    public void update(Long id, RoleRequest request) {
        requireAdmin();
        SysRole role = roleMapper.selectById(id);
        if (role == null) throw new BusinessException("角色不存在");
        // 内置角色不允许修改 code
        if (isBuiltIn(role.getRoleCode()) && !role.getRoleCode().equals(request.getRoleCode())) {
            throw new BusinessException("内置角色不允许修改编码");
        }
        // 检查 code 唯一（排除自身）
        Long exists = roleMapper.selectCount(
                new LambdaQueryWrapper<SysRole>()
                        .eq(SysRole::getRoleCode, request.getRoleCode())
                        .ne(SysRole::getId, id));
        if (exists > 0) {
            throw new BusinessException("角色编码已存在：" + request.getRoleCode());
        }
        role.setRoleCode(request.getRoleCode());
        role.setRoleName(request.getRoleName());
        role.setDescription(request.getDescription());
        if (request.getSortOrder() != null) role.setSortOrder(request.getSortOrder());
        roleMapper.updateById(role);
        // 更新权限（先删后插）
        if (request.getPermissionIds() != null) {
            rolePermissionMapper.delete(
                    new LambdaQueryWrapper<SysRolePermission>().eq(SysRolePermission::getRoleId, id));
            if (!request.getPermissionIds().isEmpty()) {
                saveRolePermissions(id, request.getPermissionIds());
            }
        }
    }

    // ============ 删除角色 ============
    public void delete(Long id) {
        requireAdmin();
        SysRole role = roleMapper.selectById(id);
        if (role == null) throw new BusinessException("角色不存在");
        if (isBuiltIn(role.getRoleCode())) {
            throw new BusinessException("内置角色（" + role.getRoleName() + "）不允许删除");
        }
        // 检查是否有用户关联
        long userCount = userRoleMapper.selectCount(
                new LambdaQueryWrapper<SysUserRole>().eq(SysUserRole::getRoleId, id));
        if (userCount > 0) {
            throw new BusinessException("该角色下还有 " + userCount + " 个用户，请先移除用户后再删除");
        }
        // 删除权限关联
        rolePermissionMapper.delete(
                new LambdaQueryWrapper<SysRolePermission>().eq(SysRolePermission::getRoleId, id));
        // 删除角色
        roleMapper.deleteById(id);
    }

    // ============ 单独更新角色权限 ============
    public void assignPermissions(Long id, PermissionAssignRequest request) {
        requireAdmin();
        SysRole role = roleMapper.selectById(id);
        if (role == null) throw new BusinessException("角色不存在");
        // sys_admin 不允许修改权限（始终全权限）
        if ("sys_admin".equals(role.getRoleCode())) {
            throw new BusinessException("系统管理员角色权限不可修改（始终拥有全部权限）");
        }
        // 先删后插
        rolePermissionMapper.delete(
                new LambdaQueryWrapper<SysRolePermission>().eq(SysRolePermission::getRoleId, id));
        if (request.getPermissionIds() != null && !request.getPermissionIds().isEmpty()) {
            saveRolePermissions(id, request.getPermissionIds());
        }
    }

    // ============ 获取当前用户的权限（供前端动态菜单） ============
    public Map<String, Object> myPermissions() {
        Long uid = SecurityContextHolder.getCurrentUserId();
        List<String> roleCodes = roleChecker.getRoleCodes(uid);
        // 查询用户所有角色的权限合集(sys_admin 同样按权限表返回,不再全量放行)
        List<SysUserRole> urs = userRoleMapper.selectList(
                new LambdaQueryWrapper<SysUserRole>().eq(SysUserRole::getUserId, uid));
        Set<Long> permIdSet = new HashSet<>();
        for (SysUserRole ur : urs) {
            List<SysRolePermission> rps = rolePermissionMapper.selectList(
                    new LambdaQueryWrapper<SysRolePermission>().eq(SysRolePermission::getRoleId, ur.getRoleId()));
            rps.forEach(rp -> permIdSet.add(rp.getPermissionId()));
        }
        List<String> permCodes = new ArrayList<>();
        if (!permIdSet.isEmpty()) {
            List<SysPermission> perms = permissionMapper.selectBatchIds(new ArrayList<>(permIdSet));
            permCodes = perms.stream().map(SysPermission::getPermissionCode).collect(Collectors.toList());
        }
        Map<String, Object> data = new HashMap<>();
        data.put("roles", roleCodes);
        data.put("permissions", permCodes);
        return data;
    }

    // ============ 辅助方法 ============
    private boolean isBuiltIn(String roleCode) {
        // support: 售后工程师; biz_arbiter: 业务仲裁(用户管理开关的落地角色,删了开关就失效)
        return "sys_admin".equals(roleCode) || "pm".equals(roleCode)
                || "dev".equals(roleCode) || "qa".equals(roleCode)
                || "support".equals(roleCode) || "biz_arbiter".equals(roleCode);
    }

    private void saveRolePermissions(Long roleId, List<Long> permissionIds) {
        for (Long pid : permissionIds) {
            SysRolePermission rp = new SysRolePermission();
            rp.setRoleId(roleId);
            rp.setPermissionId(pid);
            rolePermissionMapper.insert(rp);
        }
    }

    // ============ 请求体 ============
    @Data
    public static class RoleRequest {
        @NotBlank(message = "角色编码不能为空")
        private String roleCode;
        @NotBlank(message = "角色名称不能为空")
        private String roleName;
        private String description;
        private Integer sortOrder;
        private List<Long> permissionIds;
    }

    @Data
    public static class PermissionAssignRequest {
        @NotNull(message = "权限列表不能为空")
        private List<Long> permissionIds;
    }
}
