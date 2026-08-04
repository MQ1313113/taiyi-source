package com.rd.platform.service.impl;

import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.BizProject;
import com.rd.platform.model.entity.BizProjectMember;
import com.rd.platform.model.mapper.BizProjectMapper;
import com.rd.platform.model.mapper.BizProjectMemberMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** 项目数据隔离守卫单元测试：验证 admin 全量、成员/owner 可见、非成员拦截、补录幂等。 */
@ExtendWith(MockitoExtension.class)
class ProjectAccessGuardTest {

    @Mock BizProjectMemberMapper memberMapper;
    @Mock BizProjectMapper projectMapper;
    @Mock RoleChecker roleChecker;
    @InjectMocks ProjectAccessGuard guard;

    @Test
    void admin_hasNullScope_andCanAccessAnything() {
        when(roleChecker.getRoleCodes(1L)).thenReturn(Arrays.asList("sys_admin"));
        assertNull(guard.accessibleProjectIds(1L), "管理员不限范围应返回 null");
        assertTrue(guard.canAccess(1L, 999L));
    }

    @Test
    void member_seesOnlyOwnedAndMemberProjects() {
        when(roleChecker.getRoleCodes(2L)).thenReturn(Arrays.asList("dev"));
        BizProjectMember m = new BizProjectMember();
        m.setProjectId(10L);
        m.setUserId(2L);
        when(memberMapper.selectList(any())).thenReturn(Arrays.asList(m));
        BizProject owned = new BizProject();
        owned.setId(20L);
        when(projectMapper.selectList(any())).thenReturn(Arrays.asList(owned));

        List<Long> ids = guard.accessibleProjectIds(2L);
        assertTrue(ids.contains(10L));
        assertTrue(ids.contains(20L));
        assertTrue(guard.canAccess(2L, 10L));
        assertFalse(guard.canAccess(2L, 999L));
    }

    @Test
    void nullProject_isNotBlocked_andDoesNotQuery() {
        assertTrue(guard.canAccess(2L, null));
        verifyNoInteractions(memberMapper, projectMapper, roleChecker);
    }

    @Test
    void assertAccess_throwsForNonMember() {
        when(roleChecker.getRoleCodes(2L)).thenReturn(Arrays.asList("dev"));
        when(memberMapper.selectList(any())).thenReturn(Collections.emptyList());
        when(projectMapper.selectList(any())).thenReturn(Collections.emptyList());
        assertThrows(BusinessException.class, () -> guard.assertAccess(2L, 5L, "需求"));
    }

    @Test
    void enroll_isIdempotent_whenAlreadyMember() {
        when(memberMapper.selectCount(any())).thenReturn(1L);
        guard.enroll(2L, 10L);
        verify(memberMapper, never()).insert(any());
    }

    @Test
    void enroll_insertsWhenNotMember() {
        when(memberMapper.selectCount(any())).thenReturn(0L);
        when(roleChecker.getRoleCodes(2L)).thenReturn(Arrays.asList("dev"));
        guard.enroll(2L, 10L);
        verify(memberMapper, times(1)).insert(any());
    }
}
