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

    // 工单状态
    public static final String TICKET_PENDING_TRIAGE = "PENDING_TRIAGE"; // 待分诊
    public static final String TICKET_DISPATCHED = "DISPATCHED";         // 已转派
    public static final String TICKET_PROCESSING = "PROCESSING";         // 处理中
    public static final String TICKET_RESOLVED = "RESOLVED";             // 已解决
    public static final String TICKET_CLOSED = "CLOSED";                 // 已关闭

    // 工单类型（决定分诊可转换的目标）
    public static final String TICKET_CAT_BUG = "BUG";
    public static final String TICKET_CAT_REQUIREMENT = "REQUIREMENT";
    public static final String TICKET_CAT_AFTERSALES = "AFTERSALES";
    public static final String TICKET_CAT_OTHER = "OTHER";

    // 工单转换目标类型
    public static final String TICKET_CONV_REQUIREMENT = "REQUIREMENT";
    public static final String TICKET_CONV_BUG = "BUG";
    public static final String TICKET_CONV_TASK = "TASK";

    // 打回/返工归因类别
    public static final String REWORK_REQ_UNCLEAR = "REQ_UNCLEAR"; // 需求没写清
    public static final String REWORK_DEV_POOR = "DEV_POOR";       // 开发没做好
    public static final String REWORK_TEST_MISS = "TEST_MISS";     // 测试没测到
    public static final String REWORK_OTHER = "OTHER";

    // 打回归因实体类型
    public static final String REWORK_ENTITY_REQUIREMENT = "REQUIREMENT";
    public static final String REWORK_ENTITY_TASK = "TASK";
    public static final String REWORK_ENTITY_BUG = "BUG";
    public static final String REWORK_ENTITY_SUBMIT_TEST = "SUBMIT_TEST";
    public static final String REWORK_ENTITY_CHANGE = "CHANGE";

    // 转派留痕实体类型
    public static final String ASSIGN_ENTITY_TASK = "TASK";
    public static final String ASSIGN_ENTITY_BUG = "BUG";
    public static final String ASSIGN_ENTITY_TICKET = "TICKET";
}
