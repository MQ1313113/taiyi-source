package com.rd.platform.service.impl;

import com.rd.platform.common.constant.BizConstants;
import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.model.entity.BizTask;
import com.rd.platform.model.mapper.BizRequirementMapper;
import com.rd.platform.model.mapper.BizTaskMapper;
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

/** 任务服务单元测试：测试侧防自审(QA 不得验证自己负责的任务) + 状态机非法越级流转。 */
@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock BizTaskMapper taskMapper;
    @Mock NotificationService notificationService;
    @Mock RoleChecker roleChecker;
    @Mock BizRequirementMapper requirementMapper;
    @Mock ProjectAccessGuard projectAccessGuard;
    @Mock SprintCapacityGuard sprintCapacityGuard;
    @InjectMocks TaskService service;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.setCurrentUser(1L, "u", "qa");
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clear();
    }

    /** 防自审：TESTING→DONE 时任务负责人(assignee)==当前用户 → forbidden（先过 task:test_verify 门禁）。 */
    @Test
    void changeStatus_qaVerifiesOwnTask_forbidden() {
        BizTask task = new BizTask();
        task.setId(9L);
        task.setProjectId(10L);
        task.setStatus(BizConstants.TASK_TESTING);
        task.setAssigneeId(1L); // 负责人即当前用户 1L
        when(taskMapper.selectById(9L)).thenReturn(task);
        // 放行 task:test_verify(及 sys_admin 兜底)，以命中其后的防自审判断
        when(roleChecker.hasPermission(anyLong(), any())).thenReturn(true);

        TaskService.StatusChangeRequest r = new TaskService.StatusChangeRequest();
        r.setStatus(BizConstants.TASK_DONE);

        assertThrows(BusinessException.class, () -> service.changeStatus(9L, r));
        verify(taskMapper, never()).updateById(any());
    }

    /** 状态机：非法越级 TODO→DONE → badRequest（在权限校验前即拦截）。 */
    @Test
    void changeStatus_invalidTransition_throws() {
        BizTask task = new BizTask();
        task.setId(11L);
        task.setProjectId(10L);
        task.setStatus(BizConstants.TASK_TODO);
        task.setAssigneeId(1L);
        when(taskMapper.selectById(11L)).thenReturn(task);

        TaskService.StatusChangeRequest r = new TaskService.StatusChangeRequest();
        r.setStatus(BizConstants.TASK_DONE);

        assertThrows(BusinessException.class, () -> service.changeStatus(11L, r));
        verify(taskMapper, never()).updateById(any());
    }
}
