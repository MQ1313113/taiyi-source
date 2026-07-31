package com.rd.platform.service.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.common.utils.Result;
import com.rd.platform.model.entity.SysUser;
import com.rd.platform.model.entity.SysUserRole;
import com.rd.platform.model.mapper.SysUserMapper;
import com.rd.platform.model.mapper.SysUserRoleMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import com.rd.platform.model.entity.SysRole;
import com.rd.platform.model.mapper.SysRoleMapper;
import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    @Autowired
    private SysUserMapper userMapper;

    @Autowired
    private SysUserRoleMapper userRoleMapper;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private SysRoleMapper roleMapper;

    /**
     * 获取带角色信息的用户列表（供前端选择器使用）
     */
    @GetMapping("/with-roles")
    public Result<?> listWithRoles() {
        // 获取所有用户（包括禁用的）
        List<SysUser> users = userMapper.selectList(
                new LambdaQueryWrapper<SysUser>().eq(SysUser::getDeleted, 0));
        // 获取所有角色
        List<SysRole> roles = roleMapper.selectList(null);
        Map<Long, String> roleCodeMap = new HashMap<>();
        Map<Long, String> roleNameMap = new HashMap<>();
        for (SysRole r : roles) { roleCodeMap.put(r.getId(), r.getRoleCode()); roleNameMap.put(r.getId(), r.getRoleName()); }
        // 获取用户角色关联
        List<SysUserRole> userRoles = userRoleMapper.selectList(null);
        Map<Long, String> userRoleCodeMap = new HashMap<>();
        Map<Long, String> userRoleNameMap = new HashMap<>();
        for (SysUserRole ur : userRoles) {
            userRoleCodeMap.put(ur.getUserId(), roleCodeMap.getOrDefault(ur.getRoleId(), ""));
            userRoleNameMap.put(ur.getUserId(), roleNameMap.getOrDefault(ur.getRoleId(), ""));
        }
        // 构建返回数据（过滤掉系统管理员，不在业务列表中展示）
        List<Map<String, Object>> result = new ArrayList<>();
        for (SysUser u : users) {
            String roleCode = userRoleCodeMap.getOrDefault(u.getId(), "");
            // 系统管理员不在人员选择列表中展示
            if ("sys_admin".equals(roleCode)) continue;
            Map<String, Object> item = new HashMap<>();
            item.put("id", u.getId());
            item.put("username", u.getUsername());
            item.put("nickname", u.getNickname());
            item.put("email", u.getEmail());
            item.put("phone", u.getPhone());
            item.put("status", u.getStatus());
            item.put("lastLoginTime", u.getLastLoginTime());
            item.put("roleCode", roleCode);
            item.put("roleName", userRoleNameMap.getOrDefault(u.getId(), ""));
            result.add(item);
        }
        return Result.success(result);
    }

    @GetMapping
    public Result<?> list(@RequestParam(defaultValue = "1") Integer pageNum,
                          @RequestParam(defaultValue = "10") Integer pageSize,
                          @RequestParam(required = false) String keyword) {
        Page<SysUser> page = new Page<>(pageNum, pageSize);
        LambdaQueryWrapper<SysUser> wrapper = new LambdaQueryWrapper<>();
        // @TableLogic 自动过滤 deleted=1 的记录
        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(SysUser::getUsername, keyword)
                    .or().like(SysUser::getNickname, keyword));
        }
        wrapper.orderByDesc(SysUser::getCreatedAt);
        Page<SysUser> result = userMapper.selectPage(page, wrapper);
        // Remove password from response
        result.getRecords().forEach(u -> u.setPassword(null));
        return Result.success(result);
    }

    @GetMapping("/{id}")
    public Result<?> getById(@PathVariable Long id) {
        SysUser user = userMapper.selectById(id);
        if (user == null) return Result.error("用户不存在");
        user.setPassword(null);
        return Result.success(user);
    }

    @PostMapping
    @AuditLog(module = "用户管理", operation = "创建用户")
    public Result<?> create(@Valid @RequestBody UserCreateRequest request) {
        // Check duplicate username
        Long count = userMapper.selectCount(
                new LambdaQueryWrapper<SysUser>().eq(SysUser::getUsername, request.getUsername()));
        if (count > 0) throw BusinessException.badRequest("用户名已存在");

        SysUser user = new SysUser();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setNickname(request.getNickname());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setStatus(1);
        user.setIsFirstLogin(1);
        userMapper.insert(user);

        // Assign roles
        if (request.getRoleIds() != null) {
            for (Long roleId : request.getRoleIds()) {
                SysUserRole ur = new SysUserRole();
                ur.setUserId(user.getId());
                ur.setRoleId(roleId);
                userRoleMapper.insert(ur);
            }
        }
        user.setPassword(null);
        return Result.success("用户创建成功", user);
    }

    @PutMapping("/{id}")
    @AuditLog(module = "用户管理", operation = "更新用户")
    public Result<?> update(@PathVariable Long id, @RequestBody UserUpdateRequest request) {
        SysUser user = userMapper.selectById(id);
        if (user == null) return Result.error("用户不存在");
        if (StringUtils.hasText(request.getNickname())) user.setNickname(request.getNickname());
        if (StringUtils.hasText(request.getEmail())) user.setEmail(request.getEmail());
        if (StringUtils.hasText(request.getPhone())) user.setPhone(request.getPhone());
        if (request.getStatus() != null) user.setStatus(request.getStatus());
        userMapper.updateById(user);

        // Update roles if provided
        if (request.getRoleIds() != null) {
            userRoleMapper.delete(new LambdaQueryWrapper<SysUserRole>()
                    .eq(SysUserRole::getUserId, id));
            for (Long roleId : request.getRoleIds()) {
                SysUserRole ur = new SysUserRole();
                ur.setUserId(id);
                ur.setRoleId(roleId);
                userRoleMapper.insert(ur);
            }
        }
        return Result.success("用户更新成功");
    }

    @PutMapping("/{id}/password")
    @AuditLog(module = "用户管理", operation = "重置密码")
    public Result<?> resetPassword(@PathVariable Long id, @RequestBody PasswordRequest request) {
        SysUser user = userMapper.selectById(id);
        if (user == null) return Result.error("用户不存在");
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userMapper.updateById(user);
        return Result.success("密码重置成功");
    }

    @DeleteMapping("/{id}")
    @AuditLog(module = "用户管理", operation = "删除用户")
    public Result<?> deleteUser(@PathVariable Long id) {
        Long currentUserId = SecurityContextHolder.getCurrentUserId();
        if (id.equals(currentUserId)) {
            throw BusinessException.badRequest("不能删除当前登录用户");
        }
        SysUser user = userMapper.selectById(id);
        if (user == null) return Result.error("用户不存在");
        if ("admin".equals(user.getUsername())) {
            throw BusinessException.badRequest("不能删除系统管理员账号");
        }
        // 先禁用用户
        user.setStatus(0);
        userMapper.updateById(user);
        // 逻辑删除（MyBatis-Plus @TableLogic 自动处理）
        userMapper.deleteById(id);
        // 清除用户角色关联
        userRoleMapper.delete(new LambdaQueryWrapper<SysUserRole>()
                .eq(SysUserRole::getUserId, id));
        return Result.success("用户已删除");
    }

    @PutMapping("/change-password")
    public Result<?> changePassword(@RequestBody ChangePasswordRequest request) {
        Long userId = SecurityContextHolder.getCurrentUserId();
        SysUser user = userMapper.selectById(userId);
        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw BusinessException.badRequest("原密码错误");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userMapper.updateById(user);
        return Result.success("密码修改成功");
    }

    @Data
    public static class UserCreateRequest {
        @NotBlank(message = "用户名不能为空")
        private String username;
        @NotBlank(message = "密码不能为空")
        private String password;
        @NotBlank(message = "昵称不能为空")
        private String nickname;
        private String email;
        private String phone;
        private List<Long> roleIds;
    }

    @Data
    public static class UserUpdateRequest {
        private String nickname;
        private String email;
        private String phone;
        private Integer status;
        private List<Long> roleIds;
    }

    @Data
    public static class PasswordRequest {
        @NotBlank(message = "新密码不能为空")
        private String newPassword;
    }

    @Data
    public static class ChangePasswordRequest {
        @NotBlank(message = "原密码不能为空")
        private String oldPassword;
        @NotBlank(message = "新密码不能为空")
        private String newPassword;
    }
}
