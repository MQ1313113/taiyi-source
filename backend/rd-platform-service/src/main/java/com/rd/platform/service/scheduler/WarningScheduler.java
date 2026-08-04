package com.rd.platform.service.scheduler;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rd.platform.common.constant.BizConstants;
import com.rd.platform.model.entity.BizProject;
import com.rd.platform.model.entity.BizRequirement;
import com.rd.platform.model.entity.BizTask;
import com.rd.platform.model.entity.BizTicket;
import com.rd.platform.model.entity.SysUserRole;
import com.rd.platform.model.mapper.BizProjectMapper;
import com.rd.platform.model.mapper.BizRequirementMapper;
import com.rd.platform.model.mapper.BizTaskMapper;
import com.rd.platform.model.mapper.BizTicketMapper;
import com.rd.platform.model.mapper.SysUserRoleMapper;
import com.rd.platform.service.impl.NotificationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
public class WarningScheduler {

    @Autowired
    private BizTaskMapper taskMapper;

    @Autowired
    private BizRequirementMapper requirementMapper;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private BizTicketMapper ticketMapper;

    @Autowired
    private BizProjectMapper projectMapper;

    @Autowired
    private SysUserRoleMapper sysUserRoleMapper;

    /** sys_admin 角色 id（种子固定为 1） */
    private static final long ADMIN_ROLE_ID = 1L;

    /**
     * 工单 SLA 超时升级（每 15 分钟）。粗链：责任人 → 项目负责人 → 系统管理员。
     * escalated_level 防重复升级；按 SLA 窗口 D 的倍数分档。
     */
    @Scheduled(cron = "0 */15 * * * ?")
    public void checkTicketSla() {
        LocalDateTime now = LocalDateTime.now();
        List<BizTicket> overdue = ticketMapper.selectList(new LambdaQueryWrapper<BizTicket>()
                .lt(BizTicket::getSlaDueAt, now)
                .notIn(BizTicket::getStatus, BizConstants.TICKET_RESOLVED, BizConstants.TICKET_CLOSED));
        int escalated = 0;
        for (BizTicket t : overdue) {
            int level = t.getEscalatedLevel() == null ? 0 : t.getEscalatedLevel();
            LocalDateTime due = t.getSlaDueAt();
            // SLA 窗口 D = 截止 - 创建
            long windowMin = (t.getCreatedAt() != null && due != null)
                    ? Math.max(30, Duration.between(t.getCreatedAt(), due).toMinutes()) : 240;
            String title = "工单超时预警";
            String content = "工单「" + t.getTitle() + "」已超过 SLA，请尽快处理";
            if (level == 0) {
                if (t.getAssigneeId() != null) {
                    notificationService.sendUrgentNotification(t.getAssigneeId(), title, content,
                            BizConstants.NOTIFY_WARNING, "TICKET", t.getId());
                }
                t.setEscalatedLevel(1);
                ticketMapper.updateById(t);
                escalated++;
            } else if (level == 1 && due.plusMinutes(windowMin / 2).isBefore(now)) {
                Long ownerId = t.getProjectId() != null ? projectOwner(t.getProjectId()) : null;
                if (ownerId != null) {
                    notificationService.sendUrgentNotification(ownerId, "工单持续超时，需您跟进",
                            content + "（责任人未及时处理，已上报项目负责人）", BizConstants.NOTIFY_WARNING, "TICKET", t.getId());
                    t.setEscalatedLevel(2);
                } else {
                    // 无项目/负责人，直接升到管理员
                    notifyAdmins(title, content, t.getId());
                    t.setEscalatedLevel(3);
                }
                ticketMapper.updateById(t);
                escalated++;
            } else if (level == 2 && due.plusMinutes((long) (windowMin * 1.5)).isBefore(now)) {
                notifyAdmins("工单严重超时", content + "（已上报系统管理员）", t.getId());
                t.setEscalatedLevel(3);
                ticketMapper.updateById(t);
                escalated++;
            }
        }
        log.info("工单 SLA 检查完成，超时 {} 单，本轮升级 {} 单", overdue.size(), escalated);
    }

    private Long projectOwner(Long projectId) {
        BizProject p = projectMapper.selectById(projectId);
        return p != null ? p.getOwnerId() : null;
    }

    private void notifyAdmins(String title, String content, Long ticketId) {
        List<SysUserRole> admins = sysUserRoleMapper.selectList(
                new LambdaQueryWrapper<SysUserRole>().eq(SysUserRole::getRoleId, ADMIN_ROLE_ID));
        for (SysUserRole ur : admins) {
            notificationService.sendUrgentNotification(ur.getUserId(), title, content,
                    BizConstants.NOTIFY_WARNING, "TICKET", ticketId);
        }
    }

    /**
     * Check overdue tasks every hour
     */
    @Scheduled(cron = "0 0 * * * ?")
    public void checkOverdueTasks() {
        log.info("开始检查延期任务...");
        LambdaQueryWrapper<BizTask> wrapper = new LambdaQueryWrapper<>();
        wrapper.lt(BizTask::getDueDate, LocalDate.now())
               .notIn(BizTask::getStatus, "DONE");
        List<BizTask> overdueTasks = taskMapper.selectList(wrapper);

        for (BizTask task : overdueTasks) {
            notificationService.sendUrgentNotification(task.getAssigneeId(),
                    "任务延期预警",
                    "任务 [" + task.getTaskName() + "] 已超过截止日期，请尽快处理",
                    BizConstants.NOTIFY_WARNING, "TASK", task.getId());
        }
        log.info("延期任务检查完成，发现 {} 个延期任务", overdueTasks.size());
    }

    /**
     * 需求逾期检测（每天 09:07）。期望完成日期已过、且尚未关闭/取消的需求，每日提醒负责人。
     * 补齐原先只覆盖任务 dueDate 与工单 SLA、需求级逾期无告警的盲区。
     */
    @Scheduled(cron = "0 7 9 * * ?")
    public void checkOverdueRequirements() {
        log.info("开始检查逾期需求...");
        LambdaQueryWrapper<BizRequirement> wrapper = new LambdaQueryWrapper<>();
        wrapper.lt(BizRequirement::getExpectedCompletionDate, LocalDate.now())
               .notIn(BizRequirement::getStatus, BizConstants.REQ_CLOSED, BizConstants.REQ_CANCELLED);
        List<BizRequirement> overdue = requirementMapper.selectList(wrapper);
        for (BizRequirement req : overdue) {
            if (req.getOwnerId() == null) continue;
            notificationService.sendUrgentNotification(req.getOwnerId(),
                    "需求逾期预警",
                    "需求 [" + req.getTitle() + "] 已超过期望完成日期(" + req.getExpectedCompletionDate()
                            + ")仍未完成，请尽快推进",
                    BizConstants.NOTIFY_WARNING, "REQUIREMENT", req.getId());
        }
        log.info("逾期需求检查完成，发现 {} 个逾期需求", overdue.size());
    }

    /**
     * Check fast track expiration every 30 minutes
     */
    @Scheduled(cron = "0 */30 * * * ?")
    public void checkFastTrackExpiration() {
        log.info("开始检查快速通道过期...");
        LambdaQueryWrapper<BizRequirement> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(BizRequirement::getIsFastTrack, 1)
               .eq(BizRequirement::getFastTrackViolated, 0)
               .lt(BizRequirement::getFastTrackExpireTime, LocalDateTime.now())
               .eq(BizRequirement::getStatus, BizConstants.REQ_DRAFT);

        List<BizRequirement> expired = requirementMapper.selectList(wrapper);
        for (BizRequirement req : expired) {
            req.setFastTrackViolated(1);
            requirementMapper.updateById(req);
            notificationService.sendUrgentNotification(req.getOwnerId(),
                    "快速通道违规",
                    "需求 [" + req.getTitle() + "] 快速通道48h内未补齐信息，已标记违规",
                    BizConstants.NOTIFY_WARNING, "REQUIREMENT", req.getId());
        }
        log.info("快速通道过期检查完成，发现 {} 个违规", expired.size());
    }
}
