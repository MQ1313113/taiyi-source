package com.rd.platform.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.BizProject;
import com.rd.platform.model.entity.BizProjectMember;
import com.rd.platform.model.mapper.BizProjectMapper;
import com.rd.platform.model.mapper.BizProjectMemberMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 项目级数据隔离守卫（"关联即可见 + 自动补录"策略）。
 *
 * 访问口径：
 * - sys_admin 全量放行，数据不设范围；
 * - 其余用户可访问"自己是项目成员或项目 owner"的项目。
 *
 * 为避免 biz_project_member 初期为空导致一次性锁死试点，采用自动补录：
 * 在派任务 / 派缺陷 / 设需求负责人 / 加评审人等"产生关联"的节点调用 {@link #enroll}，
 * 把相关人幂等纳入项目成员，成员关系随使用逐渐完整、隔离逐渐变严。
 */
@Component
public class ProjectAccessGuard {

    @Autowired
    private BizProjectMemberMapper memberMapper;
    @Autowired
    private BizProjectMapper projectMapper;
    @Autowired
    private RoleChecker roleChecker;

    /** 是否系统管理员（数据不设范围）。 */
    /**
     * 个人项目直通判定:项目为 PRIVATE 且操作人=负责人。
     * 私有项目是个人留痕本(测试测外部硬件/开发做组件),岗位实体免协作依赖:
     * 任务免拆解与QA验收、用例免关联需求与证据、缺陷免防自审——防御对象(他人)不存在。
     */
    public boolean isPrivateOwner(Long userId, Long projectId) {
        if (userId == null || projectId == null) return false;
        BizProject p = projectMapper.selectById(projectId);
        return p != null && "PRIVATE".equals(p.getVisibility())
                && userId.equals(p.getOwnerId());
    }

    public boolean isAdmin(Long userId) {
        return userId != null && roleChecker.getRoleCodes(userId).contains("sys_admin");
    }

    /**
     * 当前用户可访问的项目 ID 列表。
     * 返回 {@code null} 表示"不限范围"（管理员）；返回空列表表示"无任何可访问项目"。
     */
    public List<Long> accessibleProjectIds(Long userId) {
        if (userId == null) return new ArrayList<>();
        if (isAdmin(userId)) return null;
        List<Long> ids = memberMapper.selectList(
                        new LambdaQueryWrapper<BizProjectMember>().eq(BizProjectMember::getUserId, userId))
                .stream().map(BizProjectMember::getProjectId).collect(Collectors.toList());
        // 项目 owner 即便未登记成员，也可访问其项目
        projectMapper.selectList(new LambdaQueryWrapper<BizProject>().eq(BizProject::getOwnerId, userId))
                .forEach(p -> ids.add(p.getId()));
        return ids.stream().distinct().collect(Collectors.toList());
    }

    /** 用户能否访问指定项目（projectId 为空的对象不拦截）。 */
    public boolean canAccess(Long userId, Long projectId) {
        if (projectId == null) return true;
        List<Long> ids = accessibleProjectIds(userId);
        return ids == null || ids.contains(projectId);
    }

    /** 断言访问权，无权则 403。 */
    public void assertAccess(Long userId, Long projectId, String action) {
        if (!canAccess(userId, projectId)) {
            throw BusinessException.forbidden("无权访问该项目下的" + action + "（非项目成员）");
        }
    }

    /** 幂等补录：把用户纳入项目成员（已是成员则跳过）。 */
    public void enroll(Long userId, Long projectId) {
        if (userId == null || projectId == null) return;
        Long exists = memberMapper.selectCount(new LambdaQueryWrapper<BizProjectMember>()
                .eq(BizProjectMember::getProjectId, projectId)
                .eq(BizProjectMember::getUserId, userId));
        if (exists != null && exists > 0) return;
        BizProjectMember m = new BizProjectMember();
        m.setProjectId(projectId);
        m.setUserId(userId);
        List<String> roles = roleChecker.getRoleCodes(userId);
        m.setRoleCode(roles.isEmpty() ? "" : roles.get(0));
        memberMapper.insert(m);
    }
}
