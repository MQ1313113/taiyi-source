-- v10：打回/返工归因日志（责任画像数据源）
-- 幂等：CREATE TABLE IF NOT EXISTS。全新库 init_full.sql 已含,可跳过。

CREATE TABLE IF NOT EXISTS `biz_rework_log` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `entity_type` varchar(24) NOT NULL COMMENT '实体类型',
  `entity_id` bigint NOT NULL COMMENT '实体ID',
  `project_id` bigint DEFAULT NULL COMMENT '项目ID',
  `from_status` varchar(32) DEFAULT NULL COMMENT '打回前状态',
  `to_status` varchar(32) DEFAULT NULL COMMENT '打回后状态',
  `category` varchar(24) NOT NULL COMMENT '归因类别',
  `reason` varchar(512) DEFAULT NULL COMMENT '原因',
  `attributed_user_id` bigint DEFAULT NULL COMMENT '责任方用户ID',
  `operator_id` bigint DEFAULT NULL COMMENT '操作人ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_attributed` (`attributed_user_id`),
  KEY `idx_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='打回/返工归因日志';
