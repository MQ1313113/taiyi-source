package com.rd.platform.service.controller;

import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.utils.Result;
import com.rd.platform.service.impl.RoleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

/**
 * 角色管理 Controller：角色 CRUD + 权限分配
 * 仅系统管理员（sys_admin）可操作
 * 业务逻辑已下沉到 {@link RoleService}，此处仅做 HTTP 映射与结果包装。
 */
@RestController
@RequestMapping("/api/v1/roles")
public class RoleController {

    @Autowired
    private RoleService roleService;

    // ============ 角色列表 ============
    @GetMapping
    public Result<?> list() {
        return Result.success(roleService.list());
    }

    // ============ 获取所有权限列表（供勾选） ============
    @GetMapping("/permissions")
    public Result<?> allPermissions() {
        return Result.success(roleService.allPermissions());
    }

    // ============ 新增角色 ============
    @PostMapping
    @AuditLog(module = "角色管理", operation = "新增角色")
    public Result<?> create(@Valid @RequestBody RoleService.RoleRequest request) {
        return Result.success(roleService.create(request));
    }

    // ============ 修改角色 ============
    @PutMapping("/{id}")
    @AuditLog(module = "角色管理", operation = "修改角色")
    public Result<?> update(@PathVariable Long id, @Valid @RequestBody RoleService.RoleRequest request) {
        roleService.update(id, request);
        return Result.success("角色已更新");
    }

    // ============ 删除角色 ============
    @DeleteMapping("/{id}")
    @AuditLog(module = "角色管理", operation = "删除角色")
    public Result<?> delete(@PathVariable Long id) {
        roleService.delete(id);
        return Result.success("角色已删除");
    }

    // ============ 单独更新角色权限 ============
    @PutMapping("/{id}/permissions")
    @AuditLog(module = "角色管理", operation = "分配权限")
    public Result<?> assignPermissions(@PathVariable Long id, @RequestBody RoleService.PermissionAssignRequest request) {
        roleService.assignPermissions(id, request);
        return Result.success("权限已更新");
    }

    // ============ 获取当前用户的权限（供前端动态菜单） ============
    @GetMapping("/my-permissions")
    public Result<?> myPermissions() {
        return Result.success(roleService.myPermissions());
    }
}
