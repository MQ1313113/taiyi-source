package com.rd.platform.service.controller;

import com.rd.platform.common.utils.Result;
import com.rd.platform.service.impl.SystemConfigService;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

/**
 * 系统配置管理接口。业务逻辑已下沉到 {@link SystemConfigService}，此处仅做 HTTP 映射与结果包装。
 */
@RestController
@RequestMapping("/api/v1/system-config")
public class SystemConfigController {

    @Autowired
    private SystemConfigService systemConfigService;

    /**
     * 获取指定分组的配置列表
     */
    @GetMapping
    public Result<?> listConfigs(@RequestParam(required = false) String group) {
        return Result.success(systemConfigService.listConfigs(group));
    }

    /**
     * 更新配置值
     */
    @PutMapping("/{key}")
    public Result<?> updateConfig(@PathVariable String key, @RequestBody ConfigUpdateRequest request) {
        systemConfigService.updateConfig(key, request.getValue());
        return Result.success("配置已更新，新登录用户将使用新的会话时长");
    }

    /**
     * 获取单个配置值（公开接口，用于前端获取token过期时间等）
     */
    @GetMapping("/public/{key}")
    public Result<?> getPublicConfig(@PathVariable String key) {
        return Result.success(systemConfigService.getPublicConfig(key));
    }

    @Data
    public static class ConfigUpdateRequest {
        private String value;
    }
}
