-- v8：为 biz_task / biz_bug / biz_submit_test 增加乐观锁 version 列
-- （biz_requirement 早已有 version 列；本次补齐其余三张写频较高的表）
-- 幂等：ADD COLUMN IF NOT EXISTS，可安全重复执行。全新库 init_full.sql 已含这些列，可跳过。

ALTER TABLE `biz_task`        ADD COLUMN IF NOT EXISTS `version` int NOT NULL DEFAULT 1 COMMENT '版本号(乐观锁)';
ALTER TABLE `biz_bug`         ADD COLUMN IF NOT EXISTS `version` int NOT NULL DEFAULT 1 COMMENT '版本号(乐观锁)';
ALTER TABLE `biz_submit_test` ADD COLUMN IF NOT EXISTS `version` int NOT NULL DEFAULT 1 COMMENT '版本号(乐观锁)';
