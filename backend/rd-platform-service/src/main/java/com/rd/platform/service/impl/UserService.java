package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.SysRole;
import com.rd.platform.model.entity.SysUser;
import com.rd.platform.model.entity.SysUserRole;
import com.rd.platform.model.mapper.SysRoleMapper;
import com.rd.platform.model.mapper.SysUserMapper;
import com.rd.platform.model.mapper.SysUserRoleMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.validation.constraints.NotBlank;
import java.util.*;

/**
 * 用户业务逻辑（从原胖 Controller 抽出，Controller 仅保留 HTTP 映射与委托）。
 * 集中承载：用户管理写操作的系统管理员门禁(system:manage)、重复用户名校验、
 * 自删/删管理员防护、角色关联维护、修改密码校验。
 */
@Service
public class UserService {

    @Autowired
    private SysUserMapper userMapper;

    @Autowired
    private SysUserRoleMapper userRoleMapper;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private SysRoleMapper roleMapper;

    @Autowired
    private RoleChecker roleChecker;

    /**
     * 用户管理写操作门禁：仅系统管理员(system:manage)可增删改用户与重置他人密码，
     * 堵住任意登录用户自助提权 / 重置管理员密码的越权。
     */
    private void requireUserAdmin(String action) {
        roleChecker.checkPermission(SecurityContextHolder.getCurrentUserId(),
                "只有系统管理员可以" + action, "system:manage");
    }

    /**
     * 获取带角色信息的用户列表（供前端选择器使用）
     */
    public List<Map<String, Object>> listWithRoles() {
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
        return result;
    }

    public Page<SysUser> list(Integer pageNum, Integer pageSize, String keyword) {
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
        return result;
    }

    public SysUser getById(Long id) {
        SysUser user = userMapper.selectById(id);
        if (user == null) throw BusinessException.badRequest("用户不存在");
        user.setPassword(null);
        return user;
    }

    public SysUser create(UserCreateRequest request) {
        requireUserAdmin("创建用户");
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
        return user;
    }

    public void update(Long id, UserUpdateRequest request) {
        requireUserAdmin("修改用户信息与角色");
        SysUser user = userMapper.selectById(id);
        if (user == null) throw BusinessException.badRequest("用户不存在");
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
    }

    public void resetPassword(Long id, PasswordRequest request) {
        requireUserAdmin("重置用户密码");
        SysUser user = userMapper.selectById(id);
        if (user == null) throw BusinessException.badRequest("用户不存在");
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userMapper.updateById(user);
    }

    public void deleteUser(Long id) {
        requireUserAdmin("删除用户");
        Long currentUserId = SecurityContextHolder.getCurrentUserId();
        if (id.equals(currentUserId)) {
            throw BusinessException.badRequest("不能删除当前登录用户");
        }
        SysUser user = userMapper.selectById(id);
        if (user == null) throw BusinessException.badRequest("用户不存在");
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
    }

    public void changePassword(ChangePasswordRequest request) {
        Long userId = SecurityContextHolder.getCurrentUserId();
        SysUser user = userMapper.selectById(userId);
        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw BusinessException.badRequest("原密码错误");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userMapper.updateById(user);
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
