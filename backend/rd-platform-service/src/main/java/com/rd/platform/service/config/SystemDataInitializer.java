package com.rd.platform.service.config;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rd.platform.model.entity.SysPermission;
import com.rd.platform.model.entity.SysRole;
import com.rd.platform.model.entity.SysRolePermission;
import com.rd.platform.model.mapper.SysPermissionMapper;
import com.rd.platform.model.mapper.SysRoleMapper;
import com.rd.platform.model.mapper.SysRolePermissionMapper;
import com.rd.platform.model.mapper.SysUserRoleMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * 系统配置数据初始化器
 * 
 * 在应用启动时自动校验并修正数据库中的RBAC配置数据，确保与代码中定义的标准数据一致。
 * 
 * 校验范围：
 * 1. sys_permission - 权限标识表
 * 2. sys_role - 角色表
 * 3. sys_role_permission - 角色权限关联表
 * 
 * 校验策略：
 * - 缺失的记录：自动新增
 * - 已存在但字段不一致的记录：自动更新
 * - 代码中已删除但数据库中仍存在的记录：自动清理
 * 
 * 注意：此初始化器不会修改业务数据（如用户表、项目表等），仅处理系统配置数据。
 */
@Component
public class SystemDataInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SystemDataInitializer.class);

    @Resource
    private SysPermissionMapper permissionMapper;

    @Resource
    private SysRoleMapper roleMapper;

    @Resource
    private SysRolePermissionMapper rolePermissionMapper;

    @Resource
    private SysUserRoleMapper userRoleMapper;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void run(ApplicationArguments args) throws Exception {
        log.info("========== 系统配置数据校验开始 ==========");
        long startTime = System.currentTimeMillis();

        try {
            syncPermissions();
            syncRoles();
            syncRolePermissions();
            warnIfBizOverrideMissing();

            long elapsed = System.currentTimeMillis() - startTime;
            log.info("========== 系统配置数据校验完成，耗时 {}ms ==========", elapsed);
        } catch (Exception e) {
            log.error("系统配置数据校验失败", e);
            throw e;
        }
    }

    /**
     * 业务仲裁权限(biz:override)持有人检查:无启用用户持有时启动告警。
     * 该权限是流程卡死时的裁决出口,缺失则卡单无人能解;admin 工作台亦有常驻待办提醒。
     */
    private void warnIfBizOverrideMissing() {
        try {
            SysPermission perm = permissionMapper.selectList(null).stream()
                    .filter(p -> "biz:override".equals(p.getPermissionCode())).findFirst().orElse(null);
            boolean ok = false;
            if (perm != null) {
                java.util.Set<Long> roleIds = new java.util.HashSet<>();
                for (SysRolePermission rp : rolePermissionMapper.selectList(null)) {
                    if (perm.getId().equals(rp.getPermissionId())) roleIds.add(rp.getRoleId());
                }
                if (!roleIds.isEmpty()) {
                    ok = userRoleMapper.selectList(null).stream().anyMatch(ur -> roleIds.contains(ur.getRoleId()));
                }
            }
            if (!ok) {
                log.warn("[配置缺失] 业务仲裁权限(biz:override)当前无人持有!流程卡死时将无人可裁决,"
                        + "请在[系统设置-用户管理]为可信成员打开\"业务仲裁\"开关(任意业务岗位可兼任,建议至少2人)");
            }
        } catch (Exception e) {
            log.warn("[配置检查] biz:override 持有人检查失败: {}", e.getMessage());
        }
    }

    /**
     * 同步权限标识数据
     */
    private void syncPermissions() throws Exception {
        log.info("[权限标识] 开始校验...");

        // 从JSON文件读取标准权限数据
        List<PermissionDef> standardPermissions = loadJsonResource(
                "system-data/permissions.json",
                new TypeReference<List<PermissionDef>>() {}
        );

        // 获取数据库中现有的权限数据
        List<SysPermission> dbPermissions = permissionMapper.selectList(null);
        Map<String, SysPermission> dbPermMap = dbPermissions.stream()
                .collect(Collectors.toMap(SysPermission::getPermissionCode, p -> p, (a, b) -> a));

        Set<String> standardCodes = new HashSet<>();
        int inserted = 0, updated = 0, deleted = 0;

        for (PermissionDef def : standardPermissions) {
            standardCodes.add(def.permissionCode);
            SysPermission existing = dbPermMap.get(def.permissionCode);

            if (existing == null) {
                // 新增缺失的权限
                SysPermission perm = new SysPermission();
                perm.setId(def.id);
                perm.setParentId(def.parentId);
                perm.setPermissionCode(def.permissionCode);
                perm.setPermissionName(def.permissionName);
                perm.setType(def.type);
                perm.setPath(def.path);
                perm.setIcon(def.icon);
                perm.setSortOrder(def.sortOrder);
                perm.setStatus(1);
                perm.setCreatedAt(LocalDateTime.now());

                // 使用INSERT IGNORE避免ID冲突
                try {
                    permissionMapper.insert(perm);
                    inserted++;
                    log.info("[权限标识] 新增: {} ({})", def.permissionCode, def.permissionName);
                } catch (Exception e) {
                    // ID冲突时尝试更新
                    perm.setId(null);
                    permissionMapper.insert(perm);
                    inserted++;
                    log.info("[权限标识] 新增(自动ID): {} ({})", def.permissionCode, def.permissionName);
                }
            } else {
                // 检查是否需要更新（空字符串和null视为相等）
                boolean needUpdate = false;
                if (!Objects.equals(existing.getPermissionName(), def.permissionName)) needUpdate = true;
                if (!Objects.equals(existing.getParentId(), def.parentId)) needUpdate = true;
                if (!Objects.equals(existing.getType(), def.type)) needUpdate = true;
                if (!nullSafeEquals(existing.getPath(), def.path)) needUpdate = true;
                if (!Objects.equals(existing.getSortOrder(), def.sortOrder)) needUpdate = true;

                if (needUpdate) {
                    existing.setPermissionName(def.permissionName);
                    existing.setParentId(def.parentId);
                    existing.setType(def.type);
                    existing.setPath(def.path);
                    existing.setIcon(def.icon);
                    existing.setSortOrder(def.sortOrder);
                    permissionMapper.updateById(existing);
                    updated++;
                    log.info("[权限标识] 更新: {} ({})", def.permissionCode, def.permissionName);
                }
            }
        }

        // 清理代码中已删除的权限（仅清理type=2的按钮级权限，菜单级权限保留以防误删）
        for (SysPermission dbPerm : dbPermissions) {
            if (!standardCodes.contains(dbPerm.getPermissionCode()) && dbPerm.getType() != null && dbPerm.getType() == 2) {
                permissionMapper.deleteById(dbPerm.getId());
                deleted++;
                log.info("[权限标识] 删除过期: {} ({})", dbPerm.getPermissionCode(), dbPerm.getPermissionName());
            }
        }

        log.info("[权限标识] 校验完成 - 新增:{}, 更新:{}, 删除:{}, 总计标准数据:{}",
                inserted, updated, deleted, standardPermissions.size());
    }

    /**
     * 同步角色数据
     */
    private void syncRoles() throws Exception {
        log.info("[角色] 开始校验...");

        List<RoleDef> standardRoles = loadJsonResource(
                "system-data/roles.json",
                new TypeReference<List<RoleDef>>() {}
        );

        List<SysRole> dbRoles = roleMapper.selectList(null);
        Map<String, SysRole> dbRoleMap = dbRoles.stream()
                .collect(Collectors.toMap(SysRole::getRoleCode, r -> r, (a, b) -> a));

        int inserted = 0, updated = 0;

        for (RoleDef def : standardRoles) {
            SysRole existing = dbRoleMap.get(def.roleCode);

            if (existing == null) {
                // 新增缺失的角色
                SysRole role = new SysRole();
                role.setId(def.id);
                role.setRoleCode(def.roleCode);
                role.setRoleName(def.roleName);
                role.setDescription(def.description);
                role.setSortOrder(def.sortOrder);
                role.setStatus(def.status);
                role.setCreatedAt(LocalDateTime.now());
                role.setUpdatedAt(LocalDateTime.now());

                try {
                    roleMapper.insert(role);
                    inserted++;
                    log.info("[角色] 新增: {} ({})", def.roleCode, def.roleName);
                } catch (Exception e) {
                    role.setId(null);
                    roleMapper.insert(role);
                    inserted++;
                    log.info("[角色] 新增(自动ID): {} ({})", def.roleCode, def.roleName);
                }
            } else {
                // 检查是否需要更新
                boolean needUpdate = false;
                if (!Objects.equals(existing.getRoleName(), def.roleName)) needUpdate = true;
                if (!Objects.equals(existing.getDescription(), def.description)) needUpdate = true;
                if (!Objects.equals(existing.getSortOrder(), def.sortOrder)) needUpdate = true;
                if (!Objects.equals(existing.getStatus(), def.status)) needUpdate = true;

                if (needUpdate) {
                    existing.setRoleName(def.roleName);
                    existing.setDescription(def.description);
                    existing.setSortOrder(def.sortOrder);
                    existing.setStatus(def.status);
                    existing.setUpdatedAt(LocalDateTime.now());
                    roleMapper.updateById(existing);
                    updated++;
                    log.info("[角色] 更新: {} ({})", def.roleCode, def.roleName);
                }
            }
        }

        log.info("[角色] 校验完成 - 新增:{}, 更新:{}, 总计标准数据:{}", inserted, updated, standardRoles.size());
    }

    /**
     * 同步角色-权限关联数据
     */
    private void syncRolePermissions() throws Exception {
        log.info("[角色权限关联] 开始校验...");

        // 读取标准角色-权限关联配置
        Map<String, List<String>> standardRolePerms = loadJsonResource(
                "system-data/role-permissions.json",
                new TypeReference<Map<String, List<String>>>() {}
        );

        // 获取角色和权限的映射关系
        List<SysRole> allRoles = roleMapper.selectList(null);
        Map<String, Long> roleCodeToId = allRoles.stream()
                .collect(Collectors.toMap(SysRole::getRoleCode, SysRole::getId));

        List<SysPermission> allPerms = permissionMapper.selectList(null);
        Map<String, Long> permCodeToId = allPerms.stream()
                .collect(Collectors.toMap(SysPermission::getPermissionCode, SysPermission::getId, (a, b) -> a));

        int inserted = 0, deleted = 0;

        for (Map.Entry<String, List<String>> entry : standardRolePerms.entrySet()) {
            String roleCode = entry.getKey();
            List<String> permCodes = entry.getValue();

            Long roleId = roleCodeToId.get(roleCode);
            if (roleId == null) {
                log.warn("[角色权限关联] 角色不存在，跳过: {}", roleCode);
                continue;
            }

            // 获取该角色当前在数据库中的所有权限ID
            LambdaQueryWrapper<SysRolePermission> wrapper = new LambdaQueryWrapper<>();
            wrapper.eq(SysRolePermission::getRoleId, roleId);
            List<SysRolePermission> dbRolePerms = rolePermissionMapper.selectList(wrapper);
            Set<Long> dbPermIds = dbRolePerms.stream()
                    .map(SysRolePermission::getPermissionId)
                    .collect(Collectors.toSet());

            // 计算标准权限ID集合
            Set<Long> standardPermIds = new HashSet<>();
            for (String permCode : permCodes) {
                Long permId = permCodeToId.get(permCode);
                if (permId != null) {
                    standardPermIds.add(permId);
                } else {
                    log.warn("[角色权限关联] 权限标识不存在，跳过: {} -> {}", roleCode, permCode);
                }
            }

            // 新增缺失的关联
            for (Long permId : standardPermIds) {
                if (!dbPermIds.contains(permId)) {
                    SysRolePermission rp = new SysRolePermission();
                    rp.setRoleId(roleId);
                    rp.setPermissionId(permId);
                    rp.setCreatedAt(LocalDateTime.now());
                    rolePermissionMapper.insert(rp);
                    inserted++;
                }
            }

            // 删除多余的关联（数据库中有但标准配置中没有的）
            for (SysRolePermission dbRp : dbRolePerms) {
                if (!standardPermIds.contains(dbRp.getPermissionId())) {
                    rolePermissionMapper.deleteById(dbRp.getId());
                    deleted++;
                }
            }
        }

        log.info("[角色权限关联] 校验完成 - 新增:{}, 删除:{}", inserted, deleted);
    }

    /**
     * 从classpath加载JSON资源文件
     */
    private <T> T loadJsonResource(String path, TypeReference<T> typeRef) throws Exception {
        ClassPathResource resource = new ClassPathResource(path);
        try (InputStream is = resource.getInputStream()) {
            return objectMapper.readValue(is, typeRef);
        }
    }

    /**
     * 空字符串和null视为相等的比较
     */
    private boolean nullSafeEquals(String a, String b) {
        String normalA = (a == null || a.isEmpty()) ? null : a;
        String normalB = (b == null || b.isEmpty()) ? null : b;
        return Objects.equals(normalA, normalB);
    }

    // ========== 内部数据定义类 ==========

    static class PermissionDef {
        public Long id;
        public Long parentId;
        public String permissionCode;
        public String permissionName;
        public Integer type;
        public String path;
        public String icon;
        public Integer sortOrder;
    }

    static class RoleDef {
        public Long id;
        public String roleCode;
        public String roleName;
        public String description;
        public Integer sortOrder;
        public Integer status;
    }
}
