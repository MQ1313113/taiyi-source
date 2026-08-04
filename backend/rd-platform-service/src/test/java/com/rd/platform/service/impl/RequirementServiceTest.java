package com.rd.platform.service.impl;

import com.rd.platform.common.constant.BizConstants;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.BizRequirement;
import com.rd.platform.model.mapper.BizBugMapper;
import com.rd.platform.model.mapper.BizProjectMapper;
import com.rd.platform.model.mapper.BizRequirementMapper;
import com.rd.platform.model.mapper.BizRequirementReviewMapper;
import com.rd.platform.model.mapper.SysUserMapper;
import com.rd.platform.security.context.SecurityContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** 需求服务单元测试：R1 职责分离——创建人不能作为唯一评审人。 */
@ExtendWith(MockitoExtension.class)
class RequirementServiceTest {

    @Mock BizRequirementMapper requirementMapper;
    @Mock BizProjectMapper projectMapper;
    @Mock BizRequirementReviewMapper reviewMapper;
    @Mock NotificationService notificationService;
    @Mock RoleChecker roleChecker;
    @Mock ProjectAccessGuard projectAccessGuard;
    @Mock SysUserMapper userMapper;
    @Mock BizBugMapper bugMapper;
    @InjectMocks RequirementService service;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.setCurrentUser(1L, "u", "pm");
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clear();
    }

    /** R1 职责分离：草稿需求提交评审时，唯一评审人==创建人(当前用户) → badRequest。 */
    @Test
    void submitReview_creatorIsSoleReviewer_throws() {
        BizRequirement req = new BizRequirement();
        req.setId(2L);
        req.setProjectId(10L);
        req.setStatus(BizConstants.REQ_DRAFT);
        when(requirementMapper.selectById(2L)).thenReturn(req);

        RequirementService.ReviewSubmitRequest r = new RequirementService.ReviewSubmitRequest();
        r.setReviewerIds(Collections.singletonList(1L)); // 唯一评审人即当前用户 1L

        assertThrows(BusinessException.class, () -> service.submitReview(2L, r));
        verify(reviewMapper, never()).insert(any());
    }
}
