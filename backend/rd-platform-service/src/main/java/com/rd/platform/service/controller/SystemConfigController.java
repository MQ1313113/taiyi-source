package com.rd.platform.service.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rd.platform.common.utils.Result;
import com.rd.platform.model.entity.SysConfig;
import com.rd.platform.model.mapper.SysConfigMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import com.rd.platform.service.impl.RoleChecker;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/v1/system-config")
public class SystemConfigController {

    @Autowired
    private SysConfigMapper configMapper;

    @Autowired
    private RoleChecker roleChecker;

    /**
     * 获取指定分组的配置列表
     */
    @GetMapping
    public Result<?> listConfigs(@RequestParam(required = false) String group) {
        Long uid = SecurityContextHolder.getCurrentUserId();
        if (!roleChecker.hasPermission(uid, "system:manage")) {
            return Result.error(403, "无权访问系统配置");
        }
        LambdaQueryWrapper<SysConfig> qw = new LambdaQueryWrapper<>();
        if (group != null && !group.isEmpty()) {
            qw.eq(SysConfig::getConfigGroup, group);
        }
        qw.orderByAsc(SysConfig::getId);
        List<SysConfig> configs = configMapper.selectList(qw);
        return Result.success(configs);
    }

    /**
     * 更新配置值
     */
    @PutMapping("/{key}")
    public Result<?> updateConfig(@PathVariable String key, @RequestBody ConfigUpdateRequest request) {
        Long uid = SecurityContextHolder.getCurrentUserId();
        if (!roleChecker.hasPermission(uid, "system:manage")) {
            return Result.error(403, "无权修改系统配置");
        }
        SysConfig config = configMapper.selectOne(
                new LambdaQueryWrapper<SysConfig>().eq(SysConfig::getConfigKey, key));
        if (config == null) {
            return Result.error("配置项不存在: " + key);
        }
        // 校验token有效期范围
        if ("token.expiration.hours".equals(key)) {
            try {
                int hours = Integer.parseInt(request.getValue());
                if (hours < 1 || hours > 168) {
                    return Result.error("会话时长必须在 1~168 小时之间");
                }
            } catch (NumberFormatException e) {
                return Result.error("请输入有效的数字");
            }
        }
        config.setConfigValue(request.getValue());
        configMapper.updateById(config);
        return Result.success("配置已更新，新登录用户将使用新的会话时长");
    }

    /**
     * 获取单个配置值（公开接口，用于前端获取token过期时间等）
     */
    @GetMapping("/public/{key}")
    public Result<?> getPublicConfig(@PathVariable String key) {
        // 只允许查询特定的公开配置
        if (!"token.expiration.hours".equals(key)) {
            return Result.error(403, "该配置不可公开查询");
        }
        SysConfig config = configMapper.selectOne(
                new LambdaQueryWrapper<SysConfig>().eq(SysConfig::getConfigKey, key));
        if (config == null) {
            return Result.success(Collections.singletonMap("value", "2"));
        }
        return Result.success(Collections.singletonMap("value", config.getConfigValue()));
    }

    @Data
    public static class ConfigUpdateRequest {
        private String value;
    }
}
