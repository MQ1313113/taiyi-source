package com.rd.platform.service.impl;

import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.BizSprint;
import com.rd.platform.model.entity.BizTask;
import com.rd.platform.model.mapper.BizProjectMemberMapper;
import com.rd.platform.model.mapper.BizSprintMapper;
import com.rd.platform.model.mapper.BizTaskMapper;
import com.rd.platform.model.mapper.SysUserMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/** 迭代容量守卫单元测试：容量=工作日×6h、超载拦截、无日期不限制。 */
@ExtendWith(MockitoExtension.class)
class SprintCapacityGuardTest {

    @Mock BizSprintMapper sprintMapper;
    @Mock BizTaskMapper taskMapper;
    @Mock BizProjectMemberMapper memberMapper;
    @Mock SysUserMapper userMapper;
    @InjectMocks SprintCapacityGuard guard;

    private BizSprint week(LocalDate start, LocalDate end) {
        BizSprint s = new BizSprint();
        s.setStartDate(start);
        s.setEndDate(end);
        return s;
    }

    @Test
    void capacity_countsOnlyWeekdays() {
        // 2026-08-03(周一) ~ 2026-08-09(周日) => 5 个工作日 × 6h = 30h
        BizSprint s = week(LocalDate.of(2026, 8, 3), LocalDate.of(2026, 8, 9));
        assertEquals(30.0, guard.capacityHours(s), 0.001);
    }

    @Test
    void capacity_zeroWhenNoDates() {
        assertEquals(0.0, guard.capacityHours(new BizSprint()), 0.001);
    }

    @Test
    void assertWithinCapacity_throwsWhenOverloaded() {
        // 5 工作日 = 30h 容量；已排 28h，再加 5h => 33h 超载
        when(sprintMapper.selectById(1L)).thenReturn(week(LocalDate.of(2026, 8, 3), LocalDate.of(2026, 8, 7)));
        BizTask t = new BizTask();
        t.setEstimatedHours(new BigDecimal("28"));
        when(taskMapper.selectList(any())).thenReturn(Arrays.asList(t));
        assertThrows(BusinessException.class,
                () -> guard.assertWithinCapacity(1L, 2L, new BigDecimal("5")));
    }

    @Test
    void assertWithinCapacity_okWhenWithin() {
        when(sprintMapper.selectById(1L)).thenReturn(week(LocalDate.of(2026, 8, 3), LocalDate.of(2026, 8, 7)));
        when(taskMapper.selectList(any())).thenReturn(Collections.emptyList());
        assertDoesNotThrow(() -> guard.assertWithinCapacity(1L, 2L, new BigDecimal("10")));
    }

    @Test
    void noLimit_whenSprintDatesMissing() {
        when(sprintMapper.selectById(1L)).thenReturn(new BizSprint());
        assertDoesNotThrow(() -> guard.assertWithinCapacity(1L, 2L, new BigDecimal("999")));
    }
}
