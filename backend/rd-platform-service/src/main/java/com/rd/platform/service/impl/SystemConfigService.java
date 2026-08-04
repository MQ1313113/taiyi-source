package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.SysConfig;
import com.rd.platform.model.mapper.SysConfigMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * 系统配置业务逻辑（从原胖 Controller 抽出，Controller 仅保留 HTTP 映射与委托）。
 */
@Service
public class SystemConfigService {

    @Autowired
    private SysConfigMapper configMapper;

    @Autowired
    private RoleChecker roleChecker;

    /**
     * 获取指定分组的配置列表
     */
    public List<SysConfig> listConfigs(String group) {
        Long uid = SecurityContextHolder.getCurrentUserId();
        if (!roleChecker.hasPermission(uid, "system:manage")) {
            throw BusinessException.forbidden("无权访问系统配置");
        }
        LambdaQueryWrapper<SysConfig> qw = new LambdaQueryWrapper<>();
        if (group != null && !group.isEmpty()) {
            qw.eq(SysConfig::getConfigGroup, group);
        }
        qw.orderByAsc(SysConfig::getId);
        List<SysConfig> configs = configMapper.selectList(qw);
        return configs;
    }

    /**
     * 更新配置值
     */
    public void updateConfig(String key, String value) {
        Long uid = SecurityContextHolder.getCurrentUserId();
        if (!roleChecker.hasPermission(uid, "system:manage")) {
            throw BusinessException.forbidden("无权修改系统配置");
        }
        SysConfig config = configMapper.selectOne(
                new LambdaQueryWrapper<SysConfig>().eq(SysConfig::getConfigKey, key));
        if (config == null) {
            throw BusinessException.badRequest("配置项不存在: " + key);
        }
        // 校验token有效期范围
        if ("token.expiration.hours".equals(key)) {
            try {
                int hours = Integer.parseInt(value);
                if (hours < 1 || hours > 168) {
                    throw new BusinessException("会话时长必须在 1~168 小时之间");
                }
            } catch (NumberFormatException e) {
                throw new BusinessException("请输入有效的数字");
            }
        }
        config.setConfigValue(value);
        configMapper.updateById(config);
    }

    /**
     * 获取单个配置值（公开接口，用于前端获取token过期时间等）
     */
    public Map<String, String> getPublicConfig(String key) {
        // 只允许查询特定的公开配置
        if (!"token.expiration.hours".equals(key)) {
            throw BusinessException.forbidden("该配置不可公开查询");
        }
        SysConfig config = configMapper.selectOne(
                new LambdaQueryWrapper<SysConfig>().eq(SysConfig::getConfigKey, key));
        if (config == null) {
            return Collections.singletonMap("value", "2");
        }
        return Collections.singletonMap("value", config.getConfigValue());
    }
}
