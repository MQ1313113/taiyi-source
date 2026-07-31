package com.rd.platform.service.controller;

import com.rd.platform.common.annotation.AuditLog;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.common.utils.Result;
import com.rd.platform.model.entity.SysUser;
import com.rd.platform.model.mapper.SysUserMapper;
import com.rd.platform.security.JwtUtils;
import com.rd.platform.security.context.SecurityContextHolder;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import javax.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    @Autowired
    private SysUserMapper userMapper;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtils jwtUtils;

    @PostMapping("/login")
    public Result<?> login(@Valid @RequestBody LoginRequest request) {
        SysUser user = userMapper.selectOne(
                new LambdaQueryWrapper<SysUser>().eq(SysUser::getUsername, request.getUsername()));

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return Result.error(401, "用户名或密码错误");
        }

        if (user.getStatus() == 0) {
            return Result.error(403, "账号已被禁用，请联系管理员");
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

        return Result.success("登录成功", data);
    }

    @PostMapping("/logout")
    public Result<?> logout() {
        // JWT is stateless, client should remove token
        return Result.success("退出成功");
    }

    @GetMapping("/info")
    public Result<?> getUserInfo() {
        Long userId = SecurityContextHolder.getCurrentUserId();
        if (userId == null) {
            return Result.unauthorized("未登录");
        }
        SysUser user = userMapper.selectById(userId);
        if (user == null) {
            return Result.error("用户不存在");
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
        return Result.success(data);
    }

    @Data
    public static class LoginRequest {
        @NotBlank(message = "用户名不能为空")
        private String username;
        @NotBlank(message = "密码不能为空")
        private String password;
    }
}
