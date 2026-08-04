-- v11：转派/流转留痕（反甩锅:还原流转路径 + 甩出/接入统计）
-- 幂等：CREATE TABLE IF NOT EXISTS。全新库 init_full.sql 已含,可跳过。

CREATE TABLE IF NOT EXISTS `biz_assignment_log` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `entity_type` varchar(24) NOT NULL COMMENT '实体类型(TASK/BUG/TICKET)',
  `entity_id` bigint NOT NULL COMMENT '实体ID',
  `project_id` bigint DEFAULT NULL COMMENT '项目ID',
  `from_user_id` bigint DEFAULT NULL COMMENT '原负责人ID',
  `to_user_id` bigint DEFAULT NULL COMMENT '新负责人ID',
  `operator_id` bigint DEFAULT NULL COMMENT '操作人ID',
  `reason` varchar(512) DEFAULT NULL COMMENT '转派原因',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_entity` (`entity_type`,`entity_id`),
  KEY `idx_from` (`from_user_id`),
  KEY `idx_to` (`to_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='转派/流转留痕';
