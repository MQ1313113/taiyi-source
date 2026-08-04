-- v9：统一问题入口(工单)
-- 新增 biz_ticket / biz_ticket_routing 两表，并为 需求/缺陷/任务 增加 source_ticket_id 追溯列。
-- 幂等：CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS，可安全重复。全新库 init_full.sql 已含。

CREATE TABLE IF NOT EXISTS `biz_ticket` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `ticket_code` varchar(32) NOT NULL COMMENT '工单编号',
  `source` varchar(16) NOT NULL COMMENT '来源(SALES/SUPPORT/CUSTOMER/PRODUCT/INTERNAL)',
  `category` varchar(16) NOT NULL COMMENT '类型(BUG/REQUIREMENT/AFTERSALES/OTHER)',
  `title` varchar(256) NOT NULL COMMENT '标题',
  `description` text COMMENT '描述',
  `priority` varchar(8) NOT NULL DEFAULT 'P2' COMMENT '优先级',
  `project_id` bigint DEFAULT NULL COMMENT '项目ID',
  `reporter_id` bigint NOT NULL COMMENT '提报人ID',
  `assignee_id` bigint DEFAULT NULL COMMENT '责任人ID',
  `status` varchar(32) NOT NULL DEFAULT 'PENDING_TRIAGE' COMMENT '状态',
  `converted_type` varchar(16) DEFAULT NULL COMMENT '转换目标类型',
  `converted_id` bigint DEFAULT NULL COMMENT '转换目标ID',
  `sla_due_at` datetime DEFAULT NULL COMMENT 'SLA截止时间',
  `escalated_level` int NOT NULL DEFAULT '0' COMMENT '升级级别',
  `resolved_at` datetime DEFAULT NULL COMMENT '解决时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_assignee` (`assignee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='工单(统一问题入口)';

CREATE TABLE IF NOT EXISTS `biz_ticket_routing` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `category` varchar(16) NOT NULL COMMENT '匹配类型',
  `project_id` bigint DEFAULT NULL COMMENT '项目ID(可空)',
  `owner_id` bigint NOT NULL COMMENT '默认负责人ID',
  `enabled` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='工单路由/责任规则';

ALTER TABLE `biz_requirement` ADD COLUMN IF NOT EXISTS `source_ticket_id` bigint DEFAULT NULL COMMENT '来源工单ID(追溯)';
ALTER TABLE `biz_bug`         ADD COLUMN IF NOT EXISTS `source_ticket_id` bigint DEFAULT NULL COMMENT '来源工单ID(追溯)';
ALTER TABLE `biz_task`        ADD COLUMN IF NOT EXISTS `source_ticket_id` bigint DEFAULT NULL COMMENT '来源工单ID(追溯)';
