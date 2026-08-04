package com.rd.platform.service.controller;

import com.rd.platform.common.utils.Result;
import com.rd.platform.service.impl.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;

/**
 * 认证接口。业务逻辑已下沉到 {@link AuthService}，此处仅做 HTTP 映射与结果包装。
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public Result<?> login(@Valid @RequestBody AuthService.LoginRequest request) {
        return Result.success("登录成功", authService.login(request));
    }

    @PostMapping("/logout")
    public Result<?> logout() {
        // JWT is stateless, client should remove token
        return Result.success("退出成功");
    }

    @GetMapping("/info")
    public Result<?> getUserInfo() {
        return Result.success(authService.getUserInfo());
    }
}
