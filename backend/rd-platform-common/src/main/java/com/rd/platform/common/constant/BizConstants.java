package com.rd.platform.common.constant;

public class BizConstants {

    // 需求状态 (9状态)
    public static final String REQ_DRAFT = "DRAFT";
    public static final String REQ_REVIEWING = "REVIEWING";
    public static final String REQ_DEVELOPING = "DEVELOPING";
    public static final String REQ_DEVELOPED = "DEVELOPED";
    public static final String REQ_TESTING = "TESTING";
    public static final String REQ_TESTED = "TESTED";
    public static final String REQ_RELEASING = "RELEASING";
    public static final String REQ_CLOSED = "CLOSED";
    public static final String REQ_CANCELLED = "CANCELLED";

    // 任务状态 (5状态)
    public static final String TASK_TODO = "TODO";
    public static final String TASK_IN_PROGRESS = "IN_PROGRESS";
    public static final String TASK_SELF_TESTING = "SELF_TESTING";
    public static final String TASK_TESTING = "TESTING";
    public static final String TASK_DONE = "DONE";

    // Bug状态 (8状态)
    public static final String BUG_OPEN = "OPEN";
    public static final String BUG_CONFIRMED = "CONFIRMED";
    public static final String BUG_FIXING = "FIXING";
    public static final String BUG_FIXED = "FIXED";
    public static final String BUG_VERIFIED = "VERIFIED";
    public static final String BUG_CLOSED = "CLOSED";
    public static final String BUG_REJECTED = "REJECTED";
    public static final String BUG_REOPENED = "REOPENED";

    // 项目状态
    public static final String PRJ_PLANNING = "PLANNING";
    public static final String PRJ_ACTIVE = "ACTIVE";
    public static final String PRJ_ARCHIVED = "ARCHIVED";

    // 迭代状态
    public static final String SPRINT_NOT_STARTED = "NOT_STARTED";
    public static final String SPRINT_IN_PROGRESS = "IN_PROGRESS";
    public static final String SPRINT_COMPLETED = "COMPLETED";

    // 档位
    public static final String GEAR_LIGHTWEIGHT = "L1";
    public static final String GEAR_STANDARD = "L2";
    public static final String GEAR_FULL = "L3";

    // 评审结果
    public static final String REVIEW_APPROVED = "APPROVED";
    public static final String REVIEW_REJECTED = "REJECTED";
    public static final String REVIEW_PENDING = "PENDING";

    // 角色编码
    public static final String ROLE_SYS_ADMIN = "sys_admin";
    public static final String ROLE_PM = "pm";
    // ROLE_TECH_LEADER 已废弃，角色已删除
    public static final String ROLE_DEV = "dev";
    public static final String ROLE_QA = "qa";

    // 快速通道
    public static final double FAST_TRACK_LIMIT_RATIO = 0.2;
    public static final int FAST_TRACK_EXPIRE_HOURS = 48;

    // 通知类型
    public static final String NOTIFY_TASK_ASSIGN = "TASK_ASSIGN";
    public static final String NOTIFY_REVIEW_INVITE = "REVIEW_INVITE";
    public static final String NOTIFY_BUG_ASSIGN = "BUG_ASSIGN";
    public static final String NOTIFY_STATUS_CHANGE = "STATUS_CHANGE";
    public static final String NOTIFY_WARNING = "WARNING";
    public static final String NOTIFY_SYSTEM = "SYSTEM";
}
