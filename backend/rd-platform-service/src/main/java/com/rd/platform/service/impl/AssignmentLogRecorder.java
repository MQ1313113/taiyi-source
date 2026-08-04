package com.rd.platform.service.impl;

import com.rd.platform.model.entity.BizAssignmentLog;
import com.rd.platform.model.mapper.BizAssignmentLogMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * 转派/流转留痕记录器。在换负责人的节点调用,追加写入。
 * 治理旁路数据,记录失败不阻断主流程,但必须落 error 日志告警。仅当真正发生变更(from != to)时记录。
 */
@Slf4j
@Component
public class AssignmentLogRecorder {

    @Autowired
    private BizAssignmentLogMapper assignmentLogMapper;

    public void record(String entityType, Long entityId, Long projectId,
                       Long fromUserId, Long toUserId, Long operatorId, String reason) {
        if (toUserId == null) return;
        if (toUserId.equals(fromUserId)) return; // 未变更,不记
        try {
            BizAssignmentLog entry = new BizAssignmentLog();
            entry.setEntityType(entityType);
            entry.setEntityId(entityId);
            entry.setProjectId(projectId);
            entry.setFromUserId(fromUserId);
            entry.setToUserId(toUserId);
            entry.setOperatorId(operatorId);
            entry.setReason(reason);
            assignmentLogMapper.insert(entry);
        } catch (Exception e) {
            // 旁路数据,失败不阻断主流程,但落 error 告警,避免转派留痕静默丢失
            log.error("转派留痕写入失败 entityType={} entityId={} {}->{}: {}",
                    entityType, entityId, fromUserId, toUserId, e.getMessage(), e);
        }
    }
}
