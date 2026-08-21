-- =====================================================
-- V12: 业务优先级口径归一
-- 背景: biz_task/biz_bug/biz_requirement 的 priority 列注释为 P0/P1/P2/P3,
--       但历史数据混入 HIGH/MEDIUM/LOW/URGENT 及中文"高/中/低"。
-- 口径: 统一为 P0(紧急)/P1(高)/P2(中)/P3(低)。
--       biz_notification 的 URGENT/NORMAL 为通知级别, 独立口径, 不迁移。
-- 幂等: 可重复执行, 已归一的行不受影响。
-- =====================================================

UPDATE `biz_task` SET `priority` = CASE UPPER(`priority`)
    WHEN 'URGENT' THEN 'P0' WHEN '紧急' THEN 'P0'
    WHEN 'HIGH' THEN 'P1' WHEN '高' THEN 'P1'
    WHEN 'MEDIUM' THEN 'P2' WHEN 'NORMAL' THEN 'P2' WHEN '中' THEN 'P2'
    WHEN 'LOW' THEN 'P3' WHEN '低' THEN 'P3'
    ELSE `priority` END
WHERE `priority` NOT IN ('P0','P1','P2','P3');

UPDATE `biz_bug` SET `priority` = CASE UPPER(`priority`)
    WHEN 'URGENT' THEN 'P0' WHEN '紧急' THEN 'P0'
    WHEN 'HIGH' THEN 'P1' WHEN '高' THEN 'P1'
    WHEN 'MEDIUM' THEN 'P2' WHEN 'NORMAL' THEN 'P2' WHEN '中' THEN 'P2'
    WHEN 'LOW' THEN 'P3' WHEN '低' THEN 'P3'
    ELSE `priority` END
WHERE `priority` NOT IN ('P0','P1','P2','P3');

UPDATE `biz_requirement` SET `priority` = CASE UPPER(`priority`)
    WHEN 'URGENT' THEN 'P0' WHEN '紧急' THEN 'P0'
    WHEN 'HIGH' THEN 'P1' WHEN '高' THEN 'P1'
    WHEN 'MEDIUM' THEN 'P2' WHEN 'NORMAL' THEN 'P2' WHEN '中' THEN 'P2'
    WHEN 'LOW' THEN 'P3' WHEN '低' THEN 'P3'
    ELSE `priority` END
WHERE `priority` NOT IN ('P0','P1','P2','P3');

-- 兜底: 迁移后仍不在枚举内的残留值(拼写错误等)归为默认 P2
UPDATE `biz_task` SET `priority` = 'P2' WHERE `priority` NOT IN ('P0','P1','P2','P3');
UPDATE `biz_bug` SET `priority` = 'P2' WHERE `priority` NOT IN ('P0','P1','P2','P3');
UPDATE `biz_requirement` SET `priority` = 'P2' WHERE `priority` NOT IN ('P0','P1','P2','P3');

-- 排期辅助: 每日可用工时配置(默认 6 小时, 留 2 小时给会议/沟通), 可在系统配置页调整
INSERT INTO `sys_config` (`config_key`, `config_value`, `config_name`, `config_group`, `description`)
SELECT 'schedule.daily_hours', '6', '每日可用工时', 'schedule', '排期辅助建议按此折算完成日(小时/人/天)'
FROM DUAL WHERE NOT EXISTS (
    SELECT 1 FROM `sys_config` WHERE `config_key` = 'schedule.daily_hours');

-- 冲突管控总开关: off=关闭 / warn=留痕放行(默认) / block=撞车拒绝保存
-- 上线先跑 warn, 通过审计日志(模块=冲突管控)统计误报率, 可接受后再收紧为 block
INSERT INTO `sys_config` (`config_key`, `config_value`, `config_name`, `config_group`, `description`)
SELECT 'conflict.enforce', 'warn', '排期冲突管控模式', 'schedule', 'off/warn/block: 任务保存时排期撞车的处置策略'
FROM DUAL WHERE NOT EXISTS (
    SELECT 1 FROM `sys_config` WHERE `config_key` = 'conflict.enforce');
