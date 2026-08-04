package com.rd.platform.service.impl;

import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.BizTicket;
import com.rd.platform.model.entity.BizTicketRouting;
import com.rd.platform.model.mapper.*;
import com.rd.platform.security.context.SecurityContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** 工单服务单元测试：路由命中/未命中、分诊门禁、状态机。 */
@ExtendWith(MockitoExtension.class)
class TicketServiceTest {

    @Mock BizTicketMapper ticketMapper;
    @Mock BizTicketRoutingMapper routingMapper;
    @Mock BizRequirementMapper requirementMapper;
    @Mock BizBugMapper bugMapper;
    @Mock ProjectAccessGuard projectAccessGuard;
    @Mock RoleChecker roleChecker;
    @Mock NotificationService notificationService;
    @InjectMocks TicketService service;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.setCurrentUser(1L, "u", "pm");
        // insert 时回填 id，保证 ticketCode 生成不 NPE
        lenient().when(ticketMapper.insert(any())).thenAnswer(inv -> {
            ((BizTicket) inv.getArgument(0)).setId(100L);
            return 1;
        });
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clear();
    }

    private TicketService.TicketCreateRequest req(String category) {
        TicketService.TicketCreateRequest r = new TicketService.TicketCreateRequest();
        r.setSource("SALES");
        r.setCategory(category);
        r.setTitle("客户反馈支付失败");
        r.setPriority("P2");
        return r;
    }

    @Test
    void create_whenRoutingMatches_autoDispatch() {
        BizTicketRouting rule = new BizTicketRouting();
        rule.setCategory("BUG");
        rule.setProjectId(null);
        rule.setOwnerId(9L);
        when(routingMapper.selectList(any())).thenReturn(Arrays.asList(rule));

        BizTicket t = service.create(req("BUG"));

        assertEquals("DISPATCHED", t.getStatus());
        assertEquals(9L, t.getAssigneeId());
        assertTrue(t.getTicketCode().startsWith("TK-"));
        assertNotNull(t.getSlaDueAt());
    }

    @Test
    void create_whenNoRouting_pendingTriage() {
        when(routingMapper.selectList(any())).thenReturn(Collections.emptyList());

        BizTicket t = service.create(req("OTHER"));

        assertEquals("PENDING_TRIAGE", t.getStatus());
        assertNull(t.getAssigneeId());
    }

    @Test
    void triage_deniedForNonTriager() {
        doThrow(BusinessException.forbidden("只有分诊人可以分诊工单"))
                .when(roleChecker).checkPermission(anyLong(), anyString(), any());
        TicketService.TriageRequest tr = new TicketService.TriageRequest();
        assertThrows(BusinessException.class, () -> service.triage(1L, tr));
        verify(ticketMapper, never()).updateById(any());
    }

    @Test
    void changeStatus_invalidTransition_throws() {
        BizTicket t = new BizTicket();
        t.setId(5L);
        t.setStatus("DISPATCHED");
        t.setAssigneeId(1L);
        when(ticketMapper.selectById(5L)).thenReturn(t);
        when(roleChecker.hasPermission(anyLong(), any())).thenReturn(true); // isTriager

        // DISPATCHED 不能直接到 CLOSED（只能 PROCESSING/RESOLVED）
        assertThrows(BusinessException.class, () -> service.changeStatus(5L, "CLOSED"));
    }

    @Test
    void changeStatus_validTransition_ok() {
        BizTicket t = new BizTicket();
        t.setId(6L);
        t.setStatus("DISPATCHED");
        t.setAssigneeId(1L);
        when(ticketMapper.selectById(6L)).thenReturn(t);
        when(roleChecker.hasPermission(anyLong(), any())).thenReturn(true);

        assertDoesNotThrow(() -> service.changeStatus(6L, "PROCESSING"));
        assertEquals("PROCESSING", t.getStatus());
    }
}
