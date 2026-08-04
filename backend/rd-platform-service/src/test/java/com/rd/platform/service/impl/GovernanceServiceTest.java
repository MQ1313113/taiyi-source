package com.rd.platform.service.impl;

import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.BizTask;
import com.rd.platform.model.mapper.*;
import com.rd.platform.security.context.SecurityContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** 治理看板单元测试：管理层门禁 + 责任雷达按滞留排序。 */
@ExtendWith(MockitoExtension.class)
class GovernanceServiceTest {

    @Mock BizTaskMapper taskMapper;
    @Mock BizBugMapper bugMapper;
    @Mock BizRequirementMapper requirementMapper;
    @Mock BizTicketMapper ticketMapper;
    @Mock BizReworkLogMapper reworkLogMapper;
    @Mock SysUserMapper userMapper;
    @Mock ProjectAccessGuard projectAccessGuard;
    @Mock RoleChecker roleChecker;
    @InjectMocks GovernanceService service;

    @BeforeEach
    void setUp() { SecurityContextHolder.setCurrentUser(1L, "u", "dev"); }

    @AfterEach
    void tearDown() { SecurityContextHolder.clear(); }

    @Test
    void radar_deniedForNonManager() {
        when(roleChecker.hasAnyRole(anyLong(), any())).thenReturn(false);
        assertThrows(BusinessException.class, () -> service.radar());
    }

    @Test
    void portrait_deniedForNonManager() {
        when(roleChecker.hasAnyRole(anyLong(), any())).thenReturn(false);
        assertThrows(BusinessException.class, () -> service.portrait(null));
    }

    @Test
    void radar_sortsMostStuckFirst() {
        when(roleChecker.hasAnyRole(anyLong(), any())).thenReturn(true);
        when(projectAccessGuard.accessibleProjectIds(anyLong())).thenReturn(null); // 管理员全量
        when(userMapper.selectList(any())).thenReturn(Collections.emptyList());

        BizTask oldT = new BizTask();
        oldT.setId(1L); oldT.setTaskName("卡很久"); oldT.setStatus("IN_PROGRESS");
        oldT.setUpdatedAt(LocalDateTime.now().minusDays(10));
        BizTask freshT = new BizTask();
        freshT.setId(2L); freshT.setTaskName("刚动过"); freshT.setStatus("IN_PROGRESS");
        freshT.setUpdatedAt(LocalDateTime.now().minusDays(1));
        when(taskMapper.selectList(any())).thenReturn(Arrays.asList(freshT, oldT));
        when(bugMapper.selectList(any())).thenReturn(Collections.emptyList());
        when(requirementMapper.selectList(any())).thenReturn(Collections.emptyList());
        when(ticketMapper.selectList(any())).thenReturn(Collections.emptyList());

        List<Map<String, Object>> radar = service.radar();

        assertEquals(2, radar.size());
        assertEquals("卡很久", radar.get(0).get("title")); // 最久没动排最前
        assertTrue((Boolean) radar.get(0).get("stuck"));   // ≥3天=卡住
        assertFalse((Boolean) radar.get(1).get("stuck"));
    }
}
