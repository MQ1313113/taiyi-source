-- 太一研发管理平台 v2 数据库迁移：表单标准化
-- 执行时间：改造3（表单标准化与必填控制）
-- 说明：为任务表和Bug表添加新的标准化字段

-- biz_task 添加任务类型和验收标准字段
ALTER TABLE biz_task ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT NULL COMMENT '任务类型(FEATURE/BUGFIX/REFACTOR/TECH_DEBT)' AFTER due_date;
ALTER TABLE biz_task ADD COLUMN IF NOT EXISTS acceptance_criteria TEXT DEFAULT NULL COMMENT '验收标准(DoD)' AFTER type;

-- biz_bug 添加测试环境、复现频率和影响范围字段
ALTER TABLE biz_bug ADD COLUMN IF NOT EXISTS environment VARCHAR(200) DEFAULT NULL COMMENT '测试环境' AFTER fixer_id;
ALTER TABLE biz_bug ADD COLUMN IF NOT EXISTS frequency VARCHAR(50) DEFAULT NULL COMMENT '复现频率(ALWAYS/OFTEN/SOMETIMES/RARELY)' AFTER environment;
ALTER TABLE biz_bug ADD COLUMN IF NOT EXISTS affected_scope TEXT DEFAULT NULL COMMENT '影响范围' AFTER frequency;
