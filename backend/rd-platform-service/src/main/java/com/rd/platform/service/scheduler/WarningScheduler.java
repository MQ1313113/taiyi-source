package com.rd.platform.service.scheduler;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rd.platform.common.constant.BizConstants;
import com.rd.platform.model.entity.BizRequirement;
import com.rd.platform.model.entity.BizTask;
import com.rd.platform.model.mapper.BizRequirementMapper;
import com.rd.platform.model.mapper.BizTaskMapper;
import com.rd.platform.service.impl.NotificationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

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
