package com.rd.platform.service.impl;

import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.BizChangeRequest;
import com.rd.platform.model.mapper.BizChangeRequestMapper;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** 变更服务单元测试：R4 防自审——申请人不得审批/驳回自己提交的变更。 */
@ExtendWith(MockitoExtension.class)
class ChangeRequestServiceTest {

    @Mock BizChangeRequestMapper changeRequestMapper;
    @Mock BizRequirementMapper requirementMapper;
    @Mock RoleChecker roleChecker;
    @Mock NotificationService notificationService;
    @Mock ProjectAccessGuard projectAccessGuard;
    @InjectMocks ChangeRequestService service;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.setCurrentUser(1L, "u", "pm");
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clear();
    }

    /** R4 防自审：变更申请人==当前用户 → approve 抛 forbidden。 */
    @Test
    void approve_bySelfApplicant_forbidden() {
        BizChangeRequest cr = new BizChangeRequest();
        cr.setId(3L);
        cr.setStatus("PENDING");
        cr.setApplicantId(1L); // 申请人即当前用户 1L
        when(changeRequestMapper.selectById(3L)).thenReturn(cr);

        assertThrows(BusinessException.class, () -> service.approve(3L));
        verify(changeRequestMapper, never()).updateById(any());
    }

    /** R4 防自审：变更申请人==当前用户 → reject 抛 forbidden。 */
    @Test
    void reject_bySelfApplicant_forbidden() {
        BizChangeRequest cr = new BizChangeRequest();
        cr.setId(4L);
        cr.setStatus("PENDING");
        cr.setApplicantId(1L);
        when(changeRequestMapper.selectById(4L)).thenReturn(cr);

        ChangeRequestService.RejectRequest r = new ChangeRequestService.RejectRequest();
        r.setReason("与当前迭代目标冲突，暂缓");

        assertThrows(BusinessException.class, () -> service.reject(4L, r));
        verify(changeRequestMapper, never()).updateById(any());
    }
}
