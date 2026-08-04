package com.rd.platform.service.impl;

import com.rd.platform.common.constant.BizConstants;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.BizBug;
import com.rd.platform.model.mapper.BizBugMapper;
import com.rd.platform.model.mapper.BizRequirementMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** 缺陷服务单元测试：权限门禁(bug:create) + R3 职责分离 + FIXED→VERIFIED 防自审。 */
@ExtendWith(MockitoExtension.class)
class BugServiceTest {

    @Mock BizBugMapper bugMapper;
    @Mock NotificationService notificationService;
    @Mock RoleChecker roleChecker;
    @Mock BizRequirementMapper requirementMapper;
    @Mock ProjectAccessGuard projectAccessGuard;
    @InjectMocks BugService service;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.setCurrentUser(1L, "u", "pm");
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clear();
    }

    private BugService.BugCreateRequest req(Long assigneeId) {
        BugService.BugCreateRequest r = new BugService.BugCreateRequest();
        r.setProjectId(10L);
        r.setTitle("支付回调偶发失败");
        r.setAssigneeId(assigneeId);
        return r;
    }

    /** R3 职责分离：提交人==负责人 → badRequest（先过 bug:create 权限再命中该门禁）。 */
    @Test
    void create_reporterEqualsAssignee_throws() {
        when(roleChecker.hasPermission(anyLong(), any())).thenReturn(true);
        // 当前用户 1L，负责人也指定为 1L
        assertThrows(BusinessException.class, () -> service.create(req(1L)));
        verify(bugMapper, never()).insert(any());
    }

    /** 权限门禁：无 bug:create 权限（开发越权提 Bug）→ forbidden。 */
    @Test
    void create_withoutBugCreatePermission_forbidden() {
        when(roleChecker.hasPermission(anyLong(), any())).thenReturn(false);
        assertThrows(BusinessException.class, () -> service.create(req(2L)));
        verify(bugMapper, never()).insert(any());
    }

    /** 防自审(R4)：FIXED→VERIFIED 时修复人(fixerId)==当前用户 → badRequest。 */
    @Test
    void changeStatus_verifierEqualsFixer_throws() {
        BizBug bug = new BizBug();
        bug.setId(5L);
        bug.setProjectId(10L);
        bug.setStatus(BizConstants.BUG_FIXED);
        bug.setFixerId(1L); // 修复人即当前用户 1L
        when(bugMapper.selectById(5L)).thenReturn(bug);
        // 放行状态门禁(含 sys_admin 兜底)，以命中其后的防自审判断
        when(roleChecker.hasPermission(anyLong(), any())).thenReturn(true);

        BugService.BugStatusRequest r = new BugService.BugStatusRequest();
        r.setStatus(BizConstants.BUG_VERIFIED);

        assertThrows(BusinessException.class, () -> service.changeStatus(5L, r));
        verify(bugMapper, never()).updateById(any());
    }
}
