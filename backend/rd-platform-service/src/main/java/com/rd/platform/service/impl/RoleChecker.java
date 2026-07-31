package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rd.platform.model.entity.SysPermission;
import com.rd.platform.model.entity.SysRole;
import com.rd.platform.model.entity.SysRolePermission;
import com.rd.platform.model.entity.SysUserRole;
import com.rd.platform.model.mapper.SysPermissionMapper;
import com.rd.platform.model.mapper.SysRoleMapper;
import com.rd.platform.model.mapper.SysRolePermissionMapper;
import com.rd.platform.model.mapper.SysUserRoleMapper;
import com.rd.platform.common.exception.BusinessException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 权限校验工具：支持角色检查和细粒度权限点检查。
 * 系统管理员(sys_admin)拥有所有权限，对任何检查一律放行。
 */
@Component
public class RoleChecker {

    @Autowired
    private SysUserRoleMapper userRoleMapper;
    @Autowired
    private SysRoleMapper roleMapper;
    @Autowired
    private SysRolePermissionMapper rolePermissionMapper;
    @Autowired
    private SysPermissionMapper permissionMapper;

    /** 查询某用户的全部角色 code */
    public List<String> getRoleCodes(Long userId) {
        if (userId == null) return new ArrayList<>();
        List<SysUserRole> urs = userRoleMapper.selectList(
                new LambdaQueryWrapper<SysUserRole>().eq(SysUserRole::getUserId, userId));
        if (urs == null || urs.isEmpty()) return new ArrayList<>();
        List<Long> roleIds = urs.stream().map(SysUserRole::getRoleId).collect(Collectors.toList());
        List<SysRole> roles = roleMapper.selectBatchIds(roleIds);
        return roles.stream().map(SysRole::getRoleCode).collect(Collectors.toList());
    }

    /**
     * 判断某用户是否具备指定角色中的任意一个。
     * 系统管理员对任意角色校验一律直接放行。
     */
    public boolean hasAnyRole(Long userId, String... roleCodes) {
        List<String> codes = getRoleCodes(userId);
        if (codes.contains("sys_admin")) return true;
        for (String rc : roleCodes) {
            if (codes.contains(rc)) return true;
        }
        return false;
    }

    /**
     * 查询某用户拥有的所有权限点 code 列表。
     * 通过 用户->角色->角色权限->权限表 链路查询。
     * 系统管理员拥有所有权限。
     */
    public List<String> getPermissionCodes(Long userId) {
        if (userId == null) return new ArrayList<>();
        List<String> roleCodes = getRoleCodes(userId);
        if (roleCodes.contains("sys_admin")) {
            List<SysPermission> allPerms = permissionMapper.selectList(null);
            return allPerms.stream().map(SysPermission::getPermissionCode).collect(Collectors.toList());
        }
        List<SysUserRole> urs = userRoleMapper.selectList(
                new LambdaQueryWrapper<SysUserRole>().eq(SysUserRole::getUserId, userId));
        if (urs == null || urs.isEmpty()) return new ArrayList<>();
        List<Long> roleIds = urs.stream().map(SysUserRole::getRoleId).collect(Collectors.toList());
        List<SysRolePermission> rps = rolePermissionMapper.selectList(
                new LambdaQueryWrapper<SysRolePermission>().in(SysRolePermission::getRoleId, roleIds));
        if (rps == null || rps.isEmpty()) return new ArrayList<>();
        List<Long> permIds = rps.stream().map(SysRolePermission::getPermissionId).distinct().collect(Collectors.toList());
        List<SysPermission> perms = permissionMapper.selectBatchIds(permIds);
        return perms.stream().map(SysPermission::getPermissionCode).distinct().collect(Collectors.toList());
    }

    /**
     * 检查用户是否拥有指定权限点中的任意一个。
     * 系统管理员自动拥有所有权限。
     */
    public boolean hasPermission(Long userId, String... permissionCodes) {
        if (userId == null) return false;
        List<String> roleCodes = getRoleCodes(userId);
        if (roleCodes.contains("sys_admin")) return true;
        List<String> userPerms = getPermissionCodes(userId);
        for (String pc : permissionCodes) {
            if (userPerms.contains(pc)) return true;
        }
        return false;
    }

    /**
     * 检查用户是否拥有指定权限，如果没有则抛出异常。
     */
    public void checkPermission(Long userId, String errorMessage, String... permissionCodes) {
        if (!hasPermission(userId, permissionCodes)) {
            throw BusinessException.forbidden(errorMessage);
        }
    }

    /** 角色 code 转中文名，用于错误提示 */
    public String roleCodeText(Long userId) {
        List<String> codes = getRoleCodes(userId);
        return String.join(",", codes);
    }
}
