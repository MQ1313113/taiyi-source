package com.rd.platform.service.impl;

import com.rd.platform.model.entity.BizReworkLog;
import com.rd.platform.model.mapper.BizReworkLogMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * 打回/返工归因记录器。在各"打回/驳回/重开"节点调用,幂等无关、追加写入。
 * 记录失败不阻断主流程（治理数据是旁路），但必须落 error 日志告警，避免留痕静默丢失。
 */
@Slf4j
@Component
public class ReworkLogRecorder {

    @Autowired
    private BizReworkLogMapper reworkLogMapper;

    public void record(String entityType, Long entityId, Long projectId,
                       String fromStatus, String toStatus,
                       String category, String reason,
                       Long attributedUserId, Long operatorId) {
        try {
            BizReworkLog entry = new BizReworkLog();
            entry.setEntityType(entityType);
            entry.setEntityId(entityId);
            entry.setProjectId(projectId);
            entry.setFromStatus(fromStatus);
            entry.setToStatus(toStatus);
            entry.setCategory(category);
            entry.setReason(reason);
            entry.setAttributedUserId(attributedUserId);
            entry.setOperatorId(operatorId);
            reworkLogMapper.insert(entry);
        } catch (Exception e) {
            // 治理旁路数据,记录失败不阻断主流程,但落 error 告警,避免留痕静默丢失
            log.error("返工归因留痕写入失败 entityType={} entityId={} {}->{} category={}: {}",
                    entityType, entityId, fromStatus, toStatus, category, e.getMessage(), e);
        }
    }
}
