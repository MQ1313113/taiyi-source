package com.rd.platform.service.controller;

import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.utils.Result;
import com.rd.platform.service.impl.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

/**
 * 用户管理接口。业务逻辑已下沉到 {@link UserService}，此处仅做 HTTP 映射与结果包装。
 */
@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    @Autowired
    private UserService userService;

    /**
     * 获取带角色信息的用户列表（供前端选择器使用）
     */
    @GetMapping("/with-roles")
    public Result<?> listWithRoles() {
        return Result.success(userService.listWithRoles());
    }

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) String keyword) {
        return Result.success(userService.list(pageNum, pageSize, keyword));
    }

    @GetMapping("/{id}")
    public Result<?> getById(@PathVariable Long id) {
        return Result.success(userService.getById(id));
    }

    @PostMapping
    @AuditLog(module = "用户管理", operation = "创建用户")
    public Result<?> create(@Valid @RequestBody UserService.UserCreateRequest request) {
        return Result.success("用户创建成功", userService.create(request));
    }

    @PutMapping("/{id}")
    @AuditLog(module = "用户管理", operation = "更新用户")
    public Result<?> update(@PathVariable Long id, @RequestBody UserService.UserUpdateRequest request) {
        userService.update(id, request);
        return Result.success("用户更新成功");
    }

    @PutMapping("/{id}/password")
    @AuditLog(module = "用户管理", operation = "重置密码")
    public Result<?> resetPassword(@PathVariable Long id, @RequestBody UserService.PasswordRequest request) {
        userService.resetPassword(id, request);
        return Result.success("密码重置成功");
    }

    @DeleteMapping("/{id}")
    @AuditLog(module = "用户管理", operation = "删除用户")
    public Result<?> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return Result.success("用户已删除");
    }

    @PutMapping("/change-password")
    public Result<?> changePassword(@RequestBody UserService.ChangePasswordRequest request) {
        userService.changePassword(request);
        return Result.success("密码修改成功");
    }
}
