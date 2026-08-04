package com.rd.platform.service.controller;

import com.rd.platform.common.utils.Result;
import com.rd.platform.service.impl.GovernanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

/**
 * 治理看板接口：责任雷达 + 个人健康度画像。业务逻辑在 {@link GovernanceService}。
 */
@RestController
@RequestMapping("/api/v1/governance")
public class GovernanceController {

    @Autowired
    private GovernanceService governanceService;

    /** 责任雷达：所有未闭环项,球在谁脚下、卡了多久,按最久没动排序。 */
    @GetMapping("/radar")
    public Result<?> radar() {
        return Result.success(governanceService.radar());
    }

    /** 个人健康度画像：在办/平均滞留/被打回次数/按时完成率/转出转入净流入。 */
    @GetMapping("/portrait")
    public Result<?> portrait(@RequestParam(required = false) Long projectId) {
        return Result.success(governanceService.portrait(projectId));
    }

    /** 单个工作的流转路径(转派留痕)。 */
    @GetMapping("/flow")
    public Result<?> flow(@RequestParam String entityType, @RequestParam Long entityId) {
        return Result.success(governanceService.flow(entityType, entityId));
    }
}
