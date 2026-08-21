package com.rd.platform.service.controller;

import com.rd.platform.common.exception.BusinessException;
import com.rd.platform.common.utils.Result;
import com.rd.platform.service.impl.TicketService;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 外部匿名工单入口(不登录)。整条链路在 JWT 白名单内,防滥用三件套:
 * IP 限流(每 IP 每小时 5 单) + 蜜罐字段(机器人过滤) + 字段长度上限。
 * 写入面只有"创建一张待分诊工单";读取面必须同时持有工单号与查询码且只回状态。
 */
@RestController
@RequestMapping("/api/v1/public/tickets")
public class PublicTicketController {

    private static final int MAX_PER_HOUR = 5;
    private static final long HOUR_MS = 60 * 60 * 1000L;
    /** IP → 最近一小时内的提交时间戳。条目随请求惰性清理,规模上限受限流本身约束。 */
    private final ConcurrentHashMap<String, Deque<Long>> submitLog = new ConcurrentHashMap<>();

    @Autowired
    private TicketService ticketService;

    @PostMapping
    public Result<?> submit(@RequestBody ExternalTicketRequest req, HttpServletRequest http) {
        // 蜜罐:正常用户看不到该字段,填了即机器人——返回伪成功,不入库
        if (StringUtils.hasText(req.getWebsite())) {
            Map<String, String> fake = new java.util.HashMap<>();
            fake.put("ticketCode", "TK-0000-0000");
            fake.put("queryToken", "000000000000");
            return Result.success("工单已提交", fake);
        }
        if (!StringUtils.hasText(req.getTitle())) throw BusinessException.badRequest("请填写问题标题");
        if (!StringUtils.hasText(req.getContactInfo())) throw BusinessException.badRequest("请留下联系方式(手机/邮箱),便于处理人员与您联系");
        if (req.getTitle().length() > 100) throw BusinessException.badRequest("标题不能超过100字");
        if (req.getDescription() != null && req.getDescription().length() > 2000) throw BusinessException.badRequest("问题描述不能超过2000字");
        if (req.getContactInfo().length() > 128) throw BusinessException.badRequest("联系方式不能超过128字");

        String ip = clientIp(http);
        if (!allow(ip)) throw BusinessException.badRequest("提交过于频繁,请一小时后再试");

        return Result.success("工单已提交", ticketService.createExternal(
                req.getTitle().trim(), req.getDescription(), req.getContactInfo().trim()));
    }

    @GetMapping("/status")
    public Result<?> status(@RequestParam String code, @RequestParam String token) {
        return Result.success(ticketService.queryExternal(code, token));
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(forwarded)) return forwarded.split(",")[0].trim();
        return request.getRemoteAddr();
    }

    private boolean allow(String ip) {
        long now = System.currentTimeMillis();
        Deque<Long> times = submitLog.computeIfAbsent(ip, k -> new ArrayDeque<>());
        synchronized (times) {
            while (!times.isEmpty() && now - times.peekFirst() > HOUR_MS) times.pollFirst();
            if (times.size() >= MAX_PER_HOUR) return false;
            times.addLast(now);
            return true;
        }
    }

    @Data
    public static class ExternalTicketRequest {
        private String title;
        private String description;
        private String contactInfo;
        private String website; // 蜜罐字段:界面隐藏,非空即判定为机器人
    }
}
