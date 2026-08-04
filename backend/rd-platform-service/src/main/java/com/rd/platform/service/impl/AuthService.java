package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.SysUser;
import com.rd.platform.model.mapper.SysUserMapper;
import com.rd.platform.security.JwtUtils;
import com.rd.platform.security.context.SecurityContextHolder;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import javax.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 认证业务逻辑（从原胖 Controller 抽出，Controller 仅保留 HTTP 映射与委托）。
 * 登录 / JWT 签发逻辑原样保留，不做改动。
 */
@Service
public class AuthService {

    @Autowired
    private SysUserMapper userMapper;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtils jwtUtils;

    public Map<String, Object> login(LoginRequest request) {
        SysUser user = userMapper.selectOne(
                new LambdaQueryWrapper<SysUser>().eq(SysUser::getUsername, request.getUsername()));

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BusinessException(401, "用户名或密码错误");
        }

        if (user.getStatus() == 0) {
            throw new BusinessException(403, "账号已被禁用，请联系管理员");
        }

        // Get roles
        List<String> roles = userMapper.selectRoleCodesByUserId(user.getId());
        String rolesStr = String.join(",", roles);

        // Generate token
        String token = jwtUtils.generateToken(user.getId(), user.getUsername(), rolesStr);

        // Update login info
        user.setLastLoginTime(LocalDateTime.now());
        user.setIsFirstLogin(0);
        userMapper.updateById(user);

        // Build response
        Map<String, Object> data = new HashMap<>();
        data.put("token", token);
        data.put("userId", user.getId());
        data.put("username", user.getUsername());
        data.put("nickname", user.getNickname());
        data.put("avatar", user.getAvatar());
        data.put("roles", roles);
        data.put("isFirstLogin", user.getIsFirstLogin());

        // Get permissions
        List<String> permissions = userMapper.selectPermissionCodesByUserId(user.getId());
        data.put("permissions", permissions);

        return data;
    }

    public Map<String, Object> getUserInfo() {
        Long userId = SecurityContextHolder.getCurrentUserId();
        if (userId == null) {
            throw new BusinessException(401, "未登录");
        }
        SysUser user = userMapper.selectById(userId);
        if (user == null) {
            throw BusinessException.badRequest("用户不存在");
        }
        List<String> roles = userMapper.selectRoleCodesByUserId(userId);
        List<String> permissions = userMapper.selectPermissionCodesByUserId(userId);

        Map<String, Object> data = new HashMap<>();
        data.put("userId", user.getId());
        data.put("username", user.getUsername());
        data.put("nickname", user.getNickname());
        data.put("avatar", user.getAvatar());
        data.put("email", user.getEmail());
        data.put("roles", roles);
        data.put("permissions", permissions);
        return data;
    }

    @Data
    public static class LoginRequest {
        @NotBlank(message = "用户名不能为空")
        private String username;
        @NotBlank(message = "密码不能为空")
        private String password;
    }
}
