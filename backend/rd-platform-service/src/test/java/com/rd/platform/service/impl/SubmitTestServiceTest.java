package com.rd.platform.service.impl;

import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.BizSubmitTest;
import com.rd.platform.model.mapper.BizRequirementMapper;
import com.rd.platform.model.mapper.BizSubmitTestMapper;
import com.rd.platform.model.mapper.BizTaskMapper;
import com.rd.platform.model.mapper.BizTestCaseMapper;
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

/** 提测服务单元测试：submit:approve 权限门禁 + R2 防自审(提交人不得审批自己的提测单)。 */
@ExtendWith(MockitoExtension.class)
class SubmitTestServiceTest {

    @Mock BizSubmitTestMapper submitTestMapper;
    @Mock BizRequirementMapper requirementMapper;
    @Mock BizTestCaseMapper testCaseMapper;
    @Mock BizTaskMapper taskMapper;
    @Mock NotificationService notificationService;
    @Mock RoleChecker roleChecker;
    @Mock ProjectAccessGuard projectAccessGuard;
    @InjectMocks SubmitTestService service;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.setCurrentUser(1L, "u", "qa");
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clear();
    }

    /** R2 防自审：提测提交人==当前用户 → badRequest（先过 submit:approve 权限再命中该门禁）。 */
    @Test
    void approve_bySelfSubmitter_throws() {
        BizSubmitTest st = new BizSubmitTest();
        st.setId(7L);
        st.setStatus("PENDING");
        st.setSubmitterId(1L); // 提交人即当前用户 1L
        when(submitTestMapper.selectById(7L)).thenReturn(st);
        when(roleChecker.hasPermission(anyLong(), any())).thenReturn(true);

        assertThrows(BusinessException.class, () -> service.approve(7L));
        verify(submitTestMapper, never()).updateById(any());
    }

    /** 权限门禁：无 submit:approve 权限 → forbidden。 */
    @Test
    void approve_withoutApprovePermission_forbidden() {
        BizSubmitTest st = new BizSubmitTest();
        st.setId(8L);
        st.setStatus("PENDING");
        st.setSubmitterId(2L);
        when(submitTestMapper.selectById(8L)).thenReturn(st);
        when(roleChecker.hasPermission(anyLong(), any())).thenReturn(false);

        assertThrows(BusinessException.class, () -> service.approve(8L));
        verify(submitTestMapper, never()).updateById(any());
    }
}
