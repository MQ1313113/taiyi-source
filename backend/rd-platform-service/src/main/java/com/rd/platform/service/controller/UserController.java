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
     * 获取带角色信息的用户列表。
     * 默认过滤系统管理员（人员选择器场景）；用户管理页传 includeSysAdmin=true 展示全部。
     */
    @GetMapping("/with-roles")
    public Result<?> listWithRoles(@RequestParam(defaultValue = "false") boolean includeSysAdmin) {
        return Result.success(userService.listWithRoles(includeSysAdmin));
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

    /**
     * 业务仲裁开关:按人授予/回收流程兜底裁决权(biz:override)。
     * 仅系统管理员可操作;可多人持有;admin 自身与禁用账号不可持有。
     */
    @PutMapping("/{id}/arbiter")
    @AuditLog(module = "用户管理", operation = "配置业务仲裁")
    public Result<?> setArbiter(@PathVariable Long id, @RequestBody ArbiterRequest request) {
        return Result.success(userService.setArbiter(id, Boolean.TRUE.equals(request.getEnabled())));
    }

    public static class ArbiterRequest {
        private Boolean enabled;
        public Boolean getEnabled() { return enabled; }
        public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    }

    /**
     * 变更审批开关:把用户加入/移出变更审批人池(sys_config[change.approver.ids])。
     * 池非空=名单制,池空=回退角色规则。仅系统管理员可操作。
     */
    @PutMapping("/{id}/change-approver")
    @AuditLog(module = "用户管理", operation = "配置变更审批人")
    public Result<?> setChangeApprover(@PathVariable Long id, @RequestBody ArbiterRequest request) {
        return Result.success(userService.setChangeApprover(id, Boolean.TRUE.equals(request.getEnabled())));
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

    /** 当前登录人资料(字面路径优先于 /{id} 匹配) */
    @GetMapping("/profile")
    public Result<?> myProfile() {
        return Result.success(userService.myProfile());
    }

    /** 当前登录人自助改昵称/邮箱/手机(用户名/角色/状态仍归管理员管) */
    @PutMapping("/profile")
    @AuditLog(module = "用户管理", operation = "修改个人信息")
    public Result<?> updateMyProfile(@RequestBody UserService.ProfileRequest request) {
        userService.updateMyProfile(request);
        return Result.success("个人信息已更新");
    }

    @PutMapping("/change-password")
    public Result<?> changePassword(@RequestBody UserService.ChangePasswordRequest request) {
        userService.changePassword(request);
        return Result.success("密码修改成功");
    }
}
