package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.SysConfig;
import com.rd.platform.model.entity.SysPermission;
import com.rd.platform.model.entity.SysRole;
import com.rd.platform.model.entity.SysRolePermission;
import com.rd.platform.model.entity.SysUser;
import com.rd.platform.model.entity.SysUserRole;
import com.rd.platform.model.mapper.SysConfigMapper;
import com.rd.platform.model.mapper.SysPermissionMapper;
import com.rd.platform.model.mapper.SysRoleMapper;
import com.rd.platform.model.mapper.SysRolePermissionMapper;
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
    private SysPermissionMapper permissionMapper;

    @Autowired
    private SysRolePermissionMapper rolePermissionMapper;

    @Autowired
    private SysConfigMapper configMapper;

    @Autowired
    private RoleChecker roleChecker;

    /**
     * 业务仲裁角色编码:不是岗位角色,是"流程卡死时的兜底裁决人"标记,可与任意业务岗位叠加。
     * 唯一授予/回收入口是用户管理页的开关(setArbiter);常规角色编辑不得旁路或误删它。
     */
    public static final String ARBITER_ROLE_CODE = "biz_arbiter";

    private Long arbiterRoleId() {
        SysRole r = roleMapper.selectOne(new LambdaQueryWrapper<SysRole>()
                .eq(SysRole::getRoleCode, ARBITER_ROLE_CODE));
        return r != null ? r.getId() : null;
    }

    /**
     * 用户管理写操作门禁：仅系统管理员(system:manage)可增删改用户与重置他人密码，
     * 堵住任意登录用户自助提权 / 重置管理员密码的越权。
     */
    private void requireUserAdmin(String action) {
        roleChecker.checkPermission(SecurityContextHolder.getCurrentUserId(),
                "只有系统管理员可以" + action, "system:manage");
    }

    /**
     * 获取带角色信息的用户列表。
     * @param includeSysAdmin false=过滤系统管理员（人员选择器场景，避免把 admin 指派为执行人/评审人）；
     *                        true=包含系统管理员（系统设置-用户管理场景，管理员必须可见可管理）
     */
    public List<Map<String, Object>> listWithRoles(boolean includeSysAdmin) {
        // 获取所有用户（包括禁用的）
        List<SysUser> users = userMapper.selectList(
                new LambdaQueryWrapper<SysUser>().eq(SysUser::getDeleted, 0));
        // 获取所有角色
        List<SysRole> roles = roleMapper.selectList(null);
        Map<Long, String> roleCodeMap = new HashMap<>();
        Map<Long, String> roleNameMap = new HashMap<>();
        for (SysRole r : roles) { roleCodeMap.put(r.getId(), r.getRoleCode()); roleNameMap.put(r.getId(), r.getRoleName()); }
        // 获取用户角色关联。业务仲裁(biz_arbiter)是叠加标记而非岗位:
        // 计算"主角色"时必须跳过它,否则兼任仲裁的开发会因覆盖丢失 dev 主角色,从人员选择器里消失
        Long arbId = null;
        for (SysRole r : roles) if (ARBITER_ROLE_CODE.equals(r.getRoleCode())) arbId = r.getId();
        List<SysUserRole> userRoles = userRoleMapper.selectList(null);
        Map<Long, Long> userRoleIdMap = new HashMap<>();
        Map<Long, String> userRoleCodeMap = new HashMap<>();
        Map<Long, String> userRoleNameMap = new HashMap<>();
        Set<Long> arbiterUserIds = new HashSet<>();
        for (SysUserRole ur : userRoles) {
            if (Objects.equals(ur.getRoleId(), arbId)) {
                arbiterUserIds.add(ur.getUserId());
                continue;
            }
            userRoleIdMap.put(ur.getUserId(), ur.getRoleId());
            userRoleCodeMap.put(ur.getUserId(), roleCodeMap.getOrDefault(ur.getRoleId(), ""));
            userRoleNameMap.put(ur.getUserId(), roleNameMap.getOrDefault(ur.getRoleId(), ""));
        }
        Set<Long> approverPool = changeApproverPool();
        List<Map<String, Object>> result = new ArrayList<>();
        for (SysUser u : users) {
            String roleCode = userRoleCodeMap.getOrDefault(u.getId(), "");
            // 人员选择器场景不展示系统管理员；用户管理场景必须展示（否则 admin 被编辑赋角色后从列表消失）
            if (!includeSysAdmin && "sys_admin".equals(roleCode)) continue;
            Map<String, Object> item = new HashMap<>();
            item.put("id", u.getId());
            item.put("username", u.getUsername());
            item.put("nickname", u.getNickname());
            item.put("email", u.getEmail());
            item.put("phone", u.getPhone());
            item.put("status", u.getStatus());
            item.put("lastLoginTime", u.getLastLoginTime());
            item.put("roleId", userRoleIdMap.get(u.getId())); // 编辑弹窗回显当前角色用
            item.put("roleCode", roleCode);
            item.put("roleName", userRoleNameMap.getOrDefault(u.getId(), ""));
            item.put("bizArbiter", arbiterUserIds.contains(u.getId())); // 用户管理页仲裁开关回显
            item.put("changeApprover", approverPool.contains(u.getId())); // 用户管理页变更审批开关回显
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

        // Assign roles(业务仲裁不走这里:唯一入口是用户管理页开关,防止建号时旁路授予)
        if (request.getRoleIds() != null) {
            Long arbId = arbiterRoleId();
            for (Long roleId : request.getRoleIds()) {
                if (Objects.equals(roleId, arbId)) continue;
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
        // 超管账号防锁死：admin 的角色与启用状态不可修改（改掉 sys_admin 角色会失去全部管理权限且无人能改回）
        if ("admin".equals(user.getUsername())) {
            if (request.getRoleIds() != null) {
                throw BusinessException.badRequest("系统管理员账号(admin)不支持修改角色");
            }
            if (request.getStatus() != null && request.getStatus() == 0) {
                throw BusinessException.badRequest("系统管理员账号(admin)不支持禁用");
            }
        }
        // 外部工单占位账号(guest)必须保持"禁用+无角色":启用等于开放一个可登录的匿名口子
        if ("guest".equals(user.getUsername())) {
            if (request.getStatus() != null) {
                throw BusinessException.badRequest("guest 是外部工单的系统占位账号,必须保持禁用状态,不支持启用/禁用操作");
            }
            if (request.getRoleIds() != null) {
                throw BusinessException.badRequest("guest 是外部工单的系统占位账号,不支持分配角色");
            }
        }
        if (StringUtils.hasText(request.getNickname())) user.setNickname(request.getNickname());
        if (StringUtils.hasText(request.getEmail())) user.setEmail(request.getEmail());
        if (StringUtils.hasText(request.getPhone())) user.setPhone(request.getPhone());
        if (request.getStatus() != null) user.setStatus(request.getStatus());
        userMapper.updateById(user);

        // Update roles if provided。
        // 业务仲裁授权与岗位角色解耦:改岗前先记住是否持有仲裁,全删重插后原样保留,
        // 且提交的 roleIds 里混入仲裁角色也会被忽略(授予/回收只能走 setArbiter 开关)
        if (request.getRoleIds() != null) {
            Long arbId = arbiterRoleId();
            boolean hadArbiter = arbId != null && userRoleMapper.selectCount(
                    new LambdaQueryWrapper<SysUserRole>()
                            .eq(SysUserRole::getUserId, id)
                            .eq(SysUserRole::getRoleId, arbId)) > 0;
            userRoleMapper.delete(new LambdaQueryWrapper<SysUserRole>()
                    .eq(SysUserRole::getUserId, id));
            for (Long roleId : request.getRoleIds()) {
                if (Objects.equals(roleId, arbId)) continue;
                SysUserRole ur = new SysUserRole();
                ur.setUserId(id);
                ur.setRoleId(roleId);
                userRoleMapper.insert(ur);
            }
            if (hadArbiter) {
                SysUserRole ur = new SysUserRole();
                ur.setUserId(id);
                ur.setRoleId(arbId);
                userRoleMapper.insert(ur);
            }
        }
    }

    /**
     * 用户管理页"业务仲裁"开关:按人授予/回收 biz:override(通过 biz_arbiter 角色落地)。
     * 规则:可多人持有(休假/离职有备份,任一持有人均可裁决);admin 不可持有(系统职能保持纯粹);
     * 禁用账号不可授予;回收到 0 人时放行但返回警告(admin 工作台有常驻 P0 待办兜底提醒)。
     */
    public Map<String, Object> setArbiter(Long id, boolean enabled) {
        requireUserAdmin("配置业务仲裁权限");
        SysUser user = userMapper.selectById(id);
        if (user == null) throw BusinessException.badRequest("用户不存在");
        Long arbId = arbiterRoleId();
        if (arbId == null) throw BusinessException.badRequest("业务仲裁角色缺失,请重启应用完成系统数据同步");

        boolean has = userRoleMapper.selectCount(new LambdaQueryWrapper<SysUserRole>()
                .eq(SysUserRole::getUserId, id).eq(SysUserRole::getRoleId, arbId)) > 0;
        if (enabled) {
            if (user.getStatus() == null || user.getStatus() != 1) {
                throw BusinessException.badRequest("禁用账号不能授予业务仲裁权限");
            }
            if (roleChecker.hasAnyRole(id, "sys_admin")) {
                throw BusinessException.badRequest("系统管理员不参与业务,业务仲裁请授予业务角色成员(产品/开发等岗位均可兼任)");
            }
            if (!has) {
                SysUserRole ur = new SysUserRole();
                ur.setUserId(id);
                ur.setRoleId(arbId);
                userRoleMapper.insert(ur);
            }
        } else if (has) {
            userRoleMapper.delete(new LambdaQueryWrapper<SysUserRole>()
                    .eq(SysUserRole::getUserId, id).eq(SysUserRole::getRoleId, arbId));
        }

        long holders = countBizOverrideHolders();
        Map<String, Object> result = new HashMap<>();
        result.put("enabled", enabled);
        result.put("holderCount", holders);
        if (holders == 0) {
            result.put("warning", "当前已无人持有业务仲裁权限,流程卡死时将无人可裁决,请尽快指定新的仲裁人");
        }
        return result;
    }

    // ===== 变更审批人池:开关只是 sys_config[change.approver.ids] 的读写入口 =====
    // 审批判定仍在 ChangeRequestService(名单制:两重审批须池内成员;池空回退角色规则)

    private static final String APPROVER_POOL_KEY = "change.approver.ids";

    /** 解析池内用户ID(与 ChangeRequestService 同一分隔规则) */
    private Set<Long> changeApproverPool() {
        SysConfig cfg = configMapper.selectOne(new LambdaQueryWrapper<SysConfig>()
                .eq(SysConfig::getConfigKey, APPROVER_POOL_KEY));
        Set<Long> pool = new HashSet<>();
        if (cfg != null && cfg.getConfigValue() != null) {
            for (String s : cfg.getConfigValue().split("[,，\\s]+")) {
                try { if (!s.isEmpty()) pool.add(Long.parseLong(s.trim())); } catch (NumberFormatException ignored) { }
            }
        }
        return pool;
    }

    /**
     * 用户管理页"变更审批"开关:把用户加入/移出变更审批人池。
     * 池非空=名单制(两重审批必须池内成员);池空=回退角色规则(产品经理审批)——
     * 所以关掉最后一人不是危险操作,只是切回默认制,返回信息里说明即可。
     */
    public Map<String, Object> setChangeApprover(Long id, boolean enabled) {
        requireUserAdmin("配置变更审批人");
        SysUser user = userMapper.selectById(id);
        if (user == null) throw BusinessException.badRequest("用户不存在");
        if (enabled) {
            if (user.getStatus() == null || user.getStatus() != 1) {
                throw BusinessException.badRequest("禁用账号不能加入变更审批人池");
            }
            if (roleChecker.hasAnyRole(id, "sys_admin")) {
                throw BusinessException.badRequest("系统管理员不参与业务,变更审批请交给业务角色成员");
            }
        }
        Set<Long> pool = changeApproverPool();
        if (enabled) pool.add(id); else pool.remove(id);

        // 排序后回写,保证配置值稳定可读
        List<Long> sorted = new ArrayList<>(pool);
        Collections.sort(sorted);
        StringBuilder sb = new StringBuilder();
        for (Long uid : sorted) {
            if (sb.length() > 0) sb.append(",");
            sb.append(uid);
        }
        SysConfig cfg = configMapper.selectOne(new LambdaQueryWrapper<SysConfig>()
                .eq(SysConfig::getConfigKey, APPROVER_POOL_KEY));
        if (cfg == null) {
            cfg = new SysConfig();
            cfg.setConfigKey(APPROVER_POOL_KEY);
            cfg.setConfigName("变更审批人池");
            cfg.setConfigGroup("security");
            cfg.setDescription("逗号分隔的用户ID,由用户管理页\"变更审批\"开关维护;留空回退默认角色规则");
            cfg.setConfigValue(sb.toString());
            configMapper.insert(cfg);
        } else {
            cfg.setConfigValue(sb.toString());
            configMapper.updateById(cfg);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("enabled", enabled);
        result.put("poolCount", pool.size());
        if (pool.isEmpty()) {
            result.put("note", "审批人池已清空,变更审批回退默认角色规则(产品经理一审+需求负责人复审)");
        }
        return result;
    }

    /** 启用状态的 biz:override 持有人数(用户→角色→权限三级联查,含通过其他角色持有的情况) */
    public long countBizOverrideHolders() {
        SysPermission perm = permissionMapper.selectOne(new LambdaQueryWrapper<SysPermission>()
                .eq(SysPermission::getPermissionCode, "biz:override"));
        if (perm == null) return 0;
        List<SysRolePermission> rps = rolePermissionMapper.selectList(new LambdaQueryWrapper<SysRolePermission>()
                .eq(SysRolePermission::getPermissionId, perm.getId()));
        if (rps.isEmpty()) return 0;
        List<Long> roleIds = new ArrayList<>();
        for (SysRolePermission rp : rps) roleIds.add(rp.getRoleId());
        List<SysUserRole> urs = userRoleMapper.selectList(new LambdaQueryWrapper<SysUserRole>()
                .in(SysUserRole::getRoleId, roleIds));
        if (urs.isEmpty()) return 0;
        Set<Long> userIds = new HashSet<>();
        for (SysUserRole ur : urs) userIds.add(ur.getUserId());
        return userMapper.selectCount(new LambdaQueryWrapper<SysUser>()
                .in(SysUser::getId, userIds)
                .eq(SysUser::getStatus, 1));
    }

    public void resetPassword(Long id, PasswordRequest request) {
        requireUserAdmin("重置用户密码");
        SysUser user = userMapper.selectById(id);
        if (user == null) throw BusinessException.badRequest("用户不存在");
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        // 管理员重置的是临时密码,登录后强制本人改密
        user.setIsFirstLogin(1);
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
        // 删除 guest 会让外部匿名工单的提报人挂空(重启后种子还会重建它),直接禁止
        if ("guest".equals(user.getUsername())) {
            throw BusinessException.badRequest("guest 是外部工单的系统占位账号,不能删除");
        }
        // 先禁用用户,并把用户名改成墓碑名释放唯一索引占位:
        // 逻辑删除的行仍留在表里,不改名的话同名新建会永远撞 uk_username 唯一约束
        user.setStatus(0);
        String base = user.getUsername();
        if (base.length() > 45) base = base.substring(0, 45); // 防拼接后超出 varchar(64)
        user.setUsername(base + "#del" + user.getId());
        userMapper.updateById(user);
        // 逻辑删除（MyBatis-Plus @TableLogic 自动处理）
        userMapper.deleteById(id);
        // 清除用户角色关联
        userRoleMapper.delete(new LambdaQueryWrapper<SysUserRole>()
                .eq(SysUserRole::getUserId, id));
    }

    /** 当前登录人查看自己的资料(昵称/邮箱/手机),供右上角"个人信息"弹窗回显 */
    public SysUser myProfile() {
        SysUser user = userMapper.selectById(SecurityContextHolder.getCurrentUserId());
        if (user == null) throw BusinessException.badRequest("用户不存在");
        user.setPassword(null);
        return user;
    }

    /**
     * 当前登录人自助修改资料。只开放昵称/邮箱/手机三个无害字段:
     * 用户名(登录凭证)、角色、状态仍只能由管理员在用户管理中操作。
     */
    public void updateMyProfile(ProfileRequest request) {
        SysUser user = userMapper.selectById(SecurityContextHolder.getCurrentUserId());
        if (user == null) throw BusinessException.badRequest("用户不存在");
        if (request.getNickname() != null) {
            String nick = request.getNickname().trim();
            if (nick.isEmpty()) throw BusinessException.badRequest("昵称不能为空");
            if (nick.length() > 32) throw BusinessException.badRequest("昵称不能超过32个字符");
            user.setNickname(nick);
        }
        if (request.getEmail() != null) user.setEmail(request.getEmail().trim());
        if (request.getPhone() != null) user.setPhone(request.getPhone().trim());
        userMapper.updateById(user);
    }

    public void changePassword(ChangePasswordRequest request) {
        Long userId = SecurityContextHolder.getCurrentUserId();
        SysUser user = userMapper.selectById(userId);
        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw BusinessException.badRequest("原密码错误");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        // 完成改密才算解除"首次登录"状态(强制改密的唯一出口)
        user.setIsFirstLogin(0);
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
    public static class ProfileRequest {
        private String nickname;
        private String email;
        private String phone;
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
