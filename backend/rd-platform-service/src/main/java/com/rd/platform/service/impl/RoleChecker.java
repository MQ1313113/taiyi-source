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
 * 注意:sys_admin 不再享受任何短路放行——admin 是纯系统管理员,权限一律以权限表为准
 * (sys_admin 权限表仅含 system:manage、数据治理删除权与查看类菜单;业务兜底由 biz:override 承担)。
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
     * 不对 sys_admin 短路:需要放行管理员的检查点须显式把 "sys_admin" 传进来。
     */
    public boolean hasAnyRole(Long userId, String... roleCodes) {
        List<String> codes = getRoleCodes(userId);
        for (String rc : roleCodes) {
            if (codes.contains(rc)) return true;
        }
        return false;
    }

    /**
     * 查询某用户拥有的所有权限点 code 列表。
     * 通过 用户->角色->角色权限->权限表 链路查询,sys_admin 同样按表返回(不再全量放行)。
     */
    public List<String> getPermissionCodes(Long userId) {
        if (userId == null) return new ArrayList<>();
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
        // 注意:此处不再对 sys_admin 短路放行——admin 是纯系统管理员,业务权限一律以权限表为准
        // (权限表中 sys_admin 仅保留 system:manage、数据治理删除权与查看类菜单;业务兜底由 biz:override 承担)
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
