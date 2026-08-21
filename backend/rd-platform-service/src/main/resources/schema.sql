-- ============================================================
-- 启动自动建表脚本(由 database/init_full.sql 提取生成, 全部幂等)
-- 由 spring.sql.init 在应用启动时执行: 首次建表, 之后自动跳过。
-- 结构变更请同步维护 database/ 下的迁移脚本(唯一权威来源)。
-- ============================================================

CREATE TABLE IF NOT EXISTS `biz_bug` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `project_id` bigint NOT NULL COMMENT '项目ID',
  `sprint_id` bigint DEFAULT NULL COMMENT '迭代ID',
  `requirement_id` bigint DEFAULT NULL COMMENT '关联需求ID',
  `task_id` bigint DEFAULT NULL COMMENT '关联任务ID',
  `title` varchar(256) NOT NULL COMMENT 'Bug标题',
  `description` text NOT NULL COMMENT '复现步骤',
  `expected_result` text NOT NULL COMMENT '预期结果',
  `actual_result` text NOT NULL COMMENT '实际结果',
  `severity` varchar(16) NOT NULL COMMENT '严重程度(CRITICAL/MAJOR/MINOR/TRIVIAL)',
  `priority` varchar(8) NOT NULL COMMENT '优先级(P0/P1/P2/P3)',
  `module_name` varchar(128) NOT NULL COMMENT '所属模块',
  `status` varchar(32) NOT NULL DEFAULT 'OPEN' COMMENT '状态(OPEN/CONFIRMED/FIXING/FIXED/VERIFIED/CLOSED/REJECTED/REOPENED)',
  `reporter_id` bigint NOT NULL COMMENT '提交人ID',
  `assignee_id` bigint NOT NULL COMMENT '负责人ID',
  `fixer_id` bigint DEFAULT NULL COMMENT '修复人ID',
  `environment` varchar(200) DEFAULT NULL COMMENT '测试环境',
  `frequency` varchar(50) DEFAULT NULL COMMENT '复现频率(ALWAYS/OFTEN/SOMETIMES/RARELY)',
  `affected_scope` text COMMENT '影响范围',
  `root_cause` text COMMENT '根因分析',
  `introduce_phase` varchar(32) DEFAULT NULL COMMENT '引入阶段(REQUIREMENT/DESIGN/CODING/INTEGRATION)',
  `attachment_urls` text COMMENT '附件URL列表(JSON)',
  `confirmed_at` datetime DEFAULT NULL COMMENT '确认时间',
  `fixed_at` datetime DEFAULT NULL COMMENT '修复时间',
  `closed_at` datetime DEFAULT NULL COMMENT '关闭时间',
  `source_ticket_id` bigint DEFAULT NULL COMMENT '来源工单ID(追溯)',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `version` int NOT NULL DEFAULT '1' COMMENT '版本号(乐观锁)',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_project_sprint` (`project_id`,`sprint_id`),
  KEY `idx_assignee` (`assignee_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='缺陷表';

CREATE TABLE IF NOT EXISTS `biz_change_request` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `requirement_id` bigint NOT NULL COMMENT '需求ID',
  `project_id` bigint NOT NULL COMMENT '项目ID',
  `change_content` text NOT NULL COMMENT '变更内容',
  `change_reason` text NOT NULL COMMENT '变更原因',
  `impact_scope` text NOT NULL COMMENT '影响范围',
  `status` varchar(32) NOT NULL DEFAULT 'PENDING' COMMENT '状态(PENDING/APPROVED/REJECTED)',
  `applicant_id` bigint NOT NULL COMMENT '申请人ID',
  `approver_id` bigint DEFAULT NULL COMMENT '审批人ID',
  `approved_at` datetime DEFAULT NULL COMMENT '审批时间',
  `reject_reason` text COMMENT '驳回原因',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_requirement_id` (`requirement_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='需求变更表';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='转派/流转留痕';

CREATE TABLE IF NOT EXISTS `biz_rework_log` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `entity_type` varchar(24) NOT NULL COMMENT '实体类型(REQUIREMENT/TASK/BUG/SUBMIT_TEST/CHANGE)',
  `entity_id` bigint NOT NULL COMMENT '实体ID',
  `project_id` bigint DEFAULT NULL COMMENT '项目ID',
  `from_status` varchar(32) DEFAULT NULL COMMENT '打回前状态',
  `to_status` varchar(32) DEFAULT NULL COMMENT '打回后状态',
  `category` varchar(24) NOT NULL COMMENT '归因类别(REQ_UNCLEAR/DEV_POOR/TEST_MISS/OTHER)',
  `reason` varchar(512) DEFAULT NULL COMMENT '原因',
  `attributed_user_id` bigint DEFAULT NULL COMMENT '责任方用户ID',
  `operator_id` bigint DEFAULT NULL COMMENT '操作人ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_attributed` (`attributed_user_id`),
  KEY `idx_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='打回/返工归因日志';

CREATE TABLE IF NOT EXISTS `biz_ticket` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `ticket_code` varchar(32) NOT NULL COMMENT '工单编号',
  `source` varchar(16) NOT NULL COMMENT '来源(SALES/SUPPORT/CUSTOMER/PRODUCT/INTERNAL/EXTERNAL外部匿名)',
  `category` varchar(16) NOT NULL COMMENT '类型(BUG/REQUIREMENT/AFTERSALES/OTHER)',
  `title` varchar(256) NOT NULL COMMENT '标题',
  `description` text COMMENT '描述',
  `priority` varchar(8) NOT NULL DEFAULT 'P2' COMMENT '优先级(P0/P1/P2/P3)',
  `project_id` bigint DEFAULT NULL COMMENT '项目ID(分诊时补)',
  `reporter_id` bigint NOT NULL COMMENT '提报人ID',
  `assignee_id` bigint DEFAULT NULL COMMENT '责任人ID',
  `status` varchar(32) NOT NULL DEFAULT 'PENDING_TRIAGE' COMMENT '状态',
  `converted_type` varchar(16) DEFAULT NULL COMMENT '转换目标类型(REQUIREMENT/BUG/TASK)',
  `converted_id` bigint DEFAULT NULL COMMENT '转换目标ID',
  `contact_info` varchar(128) DEFAULT NULL COMMENT '外部提交人联系方式(内部单为空)',
  `query_token` varchar(64) DEFAULT NULL COMMENT '外部单进度查询码',
  `sla_due_at` datetime DEFAULT NULL COMMENT 'SLA截止时间',
  `escalated_level` int NOT NULL DEFAULT '0' COMMENT '升级级别(0未升/1责任人/2项目负责人/3管理员)',
  `resolved_at` datetime DEFAULT NULL COMMENT '解决时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_assignee` (`assignee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工单(统一问题入口)';

CREATE TABLE IF NOT EXISTS `biz_ticket_routing` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `category` varchar(16) NOT NULL COMMENT '匹配类型',
  `project_id` bigint DEFAULT NULL COMMENT '项目ID(可空,填了则更优先)',
  `owner_id` bigint NOT NULL COMMENT '默认负责人ID',
  `enabled` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工单路由/责任规则';

CREATE TABLE IF NOT EXISTS `biz_dependency` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `requirement_id` bigint NOT NULL COMMENT '需求ID',
  `project_id` bigint NOT NULL COMMENT '项目ID',
  `dependency_desc` text NOT NULL COMMENT '依赖描述',
  `external_team` varchar(128) DEFAULT NULL COMMENT '外部团队',
  `status` varchar(32) NOT NULL DEFAULT 'BLOCKING' COMMENT '状态(BLOCKING/RESOLVED)',
  `expected_resolve_date` date DEFAULT NULL COMMENT '预计解决日期',
  `resolved_at` datetime DEFAULT NULL COMMENT '实际解决时间',
  `created_by` bigint NOT NULL COMMENT '创建人ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_requirement_id` (`requirement_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='跨团队依赖表';

CREATE TABLE IF NOT EXISTS `biz_knowledge` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `project_id` bigint DEFAULT NULL COMMENT '项目ID(NULL表示全局)',
  `title` varchar(256) NOT NULL COMMENT '文档标题',
  `content` longtext NOT NULL COMMENT '文档内容(富文本)',
  `category` varchar(64) NOT NULL COMMENT '分类',
  `tags` varchar(512) DEFAULT NULL COMMENT '标签(JSON数组)',
  `author_id` bigint NOT NULL COMMENT '作者ID',
  `version` int NOT NULL DEFAULT '1' COMMENT '版本号',
  `like_count` int NOT NULL DEFAULT '0' COMMENT '点赞数',
  `view_count` int NOT NULL DEFAULT '0' COMMENT '浏览数',
  `attachment_urls` text COMMENT '附件URL列表(JSON)',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_project_category` (`project_id`,`category`),
  FULLTEXT KEY `ft_title_content` (`title`,`content`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='知识库文档表';

CREATE TABLE IF NOT EXISTS `biz_notification` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` bigint NOT NULL COMMENT '接收人ID',
  `title` varchar(256) NOT NULL COMMENT '通知标题',
  `content` text NOT NULL COMMENT '通知内容',
  `type` varchar(32) NOT NULL COMMENT '类型(TASK_ASSIGN/REVIEW_INVITE/BUG_ASSIGN/STATUS_CHANGE/WARNING/SYSTEM)',
  `priority` varchar(16) NOT NULL DEFAULT 'NORMAL' COMMENT '优先级(URGENT/NORMAL)',
  `is_read` tinyint NOT NULL DEFAULT '0' COMMENT '是否已读(0:未读 1:已读)',
  `target_type` varchar(32) DEFAULT NULL COMMENT '目标类型(REQUIREMENT/TASK/BUG/CHANGE)',
  `target_id` bigint DEFAULT NULL COMMENT '目标ID',
  `target_url` varchar(512) DEFAULT NULL COMMENT '跳转URL',
  `read_at` datetime DEFAULT NULL COMMENT '已读时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_read` (`user_id`,`is_read`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知消息表';

CREATE TABLE IF NOT EXISTS `biz_notification_delivery` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `notification_id` bigint NOT NULL COMMENT '通知ID',
  `channel` varchar(32) NOT NULL COMMENT '发送渠道',
  `status` varchar(16) NOT NULL DEFAULT 'PENDING' COMMENT '发送状态(PENDING/SUCCESS/FAILED)',
  `error_msg` varchar(512) DEFAULT NULL COMMENT '失败原因',
  `sent_at` datetime DEFAULT NULL COMMENT '发送时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_notification_id` (`notification_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='通知发送记录表';

CREATE TABLE IF NOT EXISTS `biz_project` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `project_name` varchar(128) NOT NULL COMMENT '项目名称',
  `project_code` varchar(64) DEFAULT NULL COMMENT '项目编码',
  `description` text COMMENT '项目描述',
  `owner_id` bigint NOT NULL COMMENT '项目负责人ID',
  `status` varchar(32) NOT NULL DEFAULT 'PLANNING' COMMENT '状态(PLANNING/ACTIVE/ARCHIVED)',
  `gear_level` varchar(16) NOT NULL DEFAULT 'STANDARD' COMMENT '档位(LIGHTWEIGHT/STANDARD/FULL)',
  `visibility` varchar(16) NOT NULL DEFAULT 'TEAM' COMMENT '可见性(TEAM团队/PRIVATE个人:仅创建者与admin可见)',
  `gear_transition_date` date DEFAULT NULL COMMENT '档位过渡截止日期',
  `start_date` date DEFAULT NULL COMMENT '开始日期',
  `end_date` date DEFAULT NULL COMMENT '结束日期',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_name` (`project_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目表';

CREATE TABLE IF NOT EXISTS `biz_project_member` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `project_id` bigint NOT NULL COMMENT '项目ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `role_in_project` varchar(32) NOT NULL COMMENT '项目内角色(PM/TECH_LEADER/DEV/QA)',
  `joined_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_user` (`project_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='项目成员表';

CREATE TABLE IF NOT EXISTS `biz_requirement` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `project_id` bigint NOT NULL COMMENT '项目ID',
  `sprint_id` bigint DEFAULT NULL COMMENT '迭代ID',
  `title` varchar(256) NOT NULL COMMENT '需求标题',
  `type` varchar(32) NOT NULL COMMENT '需求类型(FEATURE/OPTIMIZATION/BUGFIX)',
  `priority` varchar(8) NOT NULL COMMENT '优先级(P0/P1/P2/P3)',
  `status` varchar(32) NOT NULL DEFAULT 'DRAFT' COMMENT '状态(DRAFT/REVIEWING/DEVELOPING/DEVELOPED/TESTING/TESTED/RELEASING/CLOSED/CANCELLED)',
  `description` text COMMENT '详细描述',
  `acceptance_criteria` text NOT NULL COMMENT '验收标准(AC)',
  `business_value` text COMMENT '业务价值(L2)',
  `prototype_url` varchar(512) DEFAULT NULL COMMENT '原型图URL(MinIO)',
  `data_dictionary` text COMMENT '数据字典(L3)',
  `api_contract` text COMMENT '接口契约(L3)',
  `performance_baseline` text COMMENT '性能基线(L3)',
  `owner_id` bigint NOT NULL COMMENT '负责人ID',
  `created_by` bigint NOT NULL COMMENT '创建人ID',
  `expected_completion_date` date NOT NULL COMMENT '期望完成日期',
  `is_fast_track` tinyint NOT NULL DEFAULT '0' COMMENT '是否快速通道(0:否 1:是)',
  `fast_track_expire_time` datetime DEFAULT NULL COMMENT '快速通道过期时间(48h)',
  `fast_track_violated` tinyint NOT NULL DEFAULT '0' COMMENT '快速通道是否违规(0:否 1:是)',
  `source_ticket_id` bigint DEFAULT NULL COMMENT '来源工单ID(追溯)',
  `version` int NOT NULL DEFAULT '1' COMMENT '版本号',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_project_sprint` (`project_id`,`sprint_id`),
  KEY `idx_status` (`status`),
  KEY `idx_owner` (`owner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='需求表';

CREATE TABLE IF NOT EXISTS `biz_requirement_review` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `requirement_id` bigint NOT NULL COMMENT '需求ID',
  `reviewer_id` bigint NOT NULL COMMENT '评审人ID',
  `result` varchar(16) DEFAULT NULL COMMENT '评审结果(APPROVED/REJECTED/PENDING)',
  `comment` text COMMENT '评审意见',
  `reviewed_at` datetime DEFAULT NULL COMMENT '评审时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_requirement_id` (`requirement_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='需求评审表';

CREATE TABLE IF NOT EXISTS `biz_sprint` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `project_id` bigint NOT NULL COMMENT '项目ID',
  `sprint_name` varchar(128) NOT NULL COMMENT '迭代名称',
  `goal` text COMMENT '迭代目标',
  `status` varchar(32) NOT NULL DEFAULT 'NOT_STARTED' COMMENT '状态(NOT_STARTED/IN_PROGRESS/COMPLETED)',
  `type` varchar(32) NOT NULL DEFAULT 'NORMAL' COMMENT '类型(NORMAL/HOTFIX)',
  `start_date` date NOT NULL COMMENT '开始日期',
  `end_date` date NOT NULL COMMENT '结束日期',
  `created_by` bigint NOT NULL COMMENT '创建人ID',
  `planned_count` int DEFAULT NULL COMMENT '关闭快照:迭代内需求总数',
  `done_count` int DEFAULT NULL COMMENT '关闭快照:已关闭需求数',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_project_id` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='迭代表';

CREATE TABLE IF NOT EXISTS `biz_submit_test` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `requirement_id` bigint NOT NULL COMMENT '需求ID',
  `project_id` bigint NOT NULL COMMENT '项目ID',
  `sprint_id` bigint DEFAULT NULL COMMENT '迭代ID',
  `submitter_id` bigint NOT NULL COMMENT '提测人ID',
  `description` text COMMENT '提测说明',
  `status` varchar(32) NOT NULL DEFAULT 'PENDING' COMMENT '状态(PENDING/APPROVED/REJECTED)',
  `approver_id` bigint DEFAULT NULL COMMENT '审批人ID',
  `approved_at` datetime DEFAULT NULL COMMENT '审批时间',
  `reject_reason` text COMMENT '驳回原因',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `version` int NOT NULL DEFAULT '1' COMMENT '版本号(乐观锁)',
  PRIMARY KEY (`id`),
  KEY `idx_requirement_id` (`requirement_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='提测单表';

CREATE TABLE IF NOT EXISTS `biz_task` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `requirement_id` bigint DEFAULT NULL COMMENT '关联需求ID(个人项目任务可空)',
  `project_id` bigint NOT NULL COMMENT '项目ID',
  `sprint_id` bigint DEFAULT NULL COMMENT '迭代ID',
  `task_name` varchar(256) NOT NULL COMMENT '任务名称',
  `description` text COMMENT '任务描述',
  `status` varchar(32) NOT NULL DEFAULT 'TODO' COMMENT '状态(TODO/IN_PROGRESS/SELF_TESTING/TESTING/DONE)',
  `priority` varchar(8) NOT NULL DEFAULT 'P1' COMMENT '优先级',
  `assignee_id` bigint NOT NULL COMMENT '负责人ID',
  `created_by` bigint NOT NULL COMMENT '创建人(技术负责人)',
  `estimated_hours` decimal(5,1) DEFAULT NULL COMMENT '预估工时(小时)',
  `actual_hours` decimal(5,1) DEFAULT '0.0' COMMENT '实际工时(小时)',
  `start_date` date DEFAULT NULL COMMENT '开始日期',
  `due_date` date NOT NULL COMMENT '截止日期',
  `type` varchar(50) DEFAULT NULL COMMENT '任务类型(FEATURE/BUGFIX/REFACTOR/TECH_DEBT)',
  `acceptance_criteria` text COMMENT '验收标准(DoD)',
  `completed_at` datetime DEFAULT NULL COMMENT '完成时间',
  `source_ticket_id` bigint DEFAULT NULL COMMENT '来源工单ID(追溯)',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `version` int NOT NULL DEFAULT '1' COMMENT '版本号(乐观锁)',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_requirement_id` (`requirement_id`),
  KEY `idx_assignee` (`assignee_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='开发任务表';

CREATE TABLE IF NOT EXISTS `biz_tech_debt` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `project_id` bigint NOT NULL COMMENT '项目ID',
  `sprint_id` bigint DEFAULT NULL COMMENT '排入迭代ID',
  `title` varchar(256) NOT NULL COMMENT '债务标题',
  `description` text NOT NULL COMMENT '债务描述',
  `type` varchar(32) NOT NULL COMMENT '类型(CODE_QUALITY/ARCHITECTURE/PERFORMANCE/SECURITY)',
  `risk_level` varchar(16) NOT NULL COMMENT '风险等级(HIGH/MEDIUM/LOW)',
  `status` varchar(32) NOT NULL DEFAULT 'PENDING' COMMENT '状态(PENDING/SCHEDULED/IN_PROGRESS/RESOLVED)',
  `estimated_hours` decimal(5,1) DEFAULT NULL COMMENT '预估工时',
  `assignee_id` bigint DEFAULT NULL COMMENT '负责人ID',
  `created_by` bigint NOT NULL COMMENT '创建人ID',
  `resolved_at` datetime DEFAULT NULL COMMENT '解决时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='技术债务表';

CREATE TABLE IF NOT EXISTS `biz_test_case` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `project_id` bigint NOT NULL COMMENT '项目ID',
  `requirement_id` bigint DEFAULT NULL COMMENT '关联需求ID',
  `module_name` varchar(128) NOT NULL COMMENT '所属模块',
  `case_name` varchar(256) NOT NULL COMMENT '用例名称',
  `precondition` text NOT NULL COMMENT '前置条件',
  `steps` text NOT NULL COMMENT '操作步骤(JSON)',
  `expected_result` text NOT NULL COMMENT '预期结果',
  `priority` varchar(8) NOT NULL COMMENT '优先级(P0/P1/P2)',
  `ac_ref` varchar(512) DEFAULT NULL COMMENT 'AC关联引用',
  `status` varchar(32) NOT NULL DEFAULT 'DRAFT' COMMENT '状态(DRAFT/LOCKED/DEPRECATED)',
  `execution_status` varchar(32) DEFAULT NULL COMMENT '执行状态(PASS/FAIL/BLOCKED/NOT_RUN)',
  `actual_result` text COMMENT '实际结果',
  `evidence_url` varchar(512) DEFAULT NULL COMMENT '证据截图URL',
  `executed_by` bigint DEFAULT NULL COMMENT '执行人',
  `executed_at` datetime DEFAULT NULL COMMENT '执行时间',
  `created_by` bigint NOT NULL COMMENT '创建人ID',
  `locked_at` datetime DEFAULT NULL COMMENT '锁定时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_project_module` (`project_id`,`module_name`),
  KEY `idx_requirement_id` (`requirement_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='测试用例表';

CREATE TABLE IF NOT EXISTS `biz_warning_rule` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `project_id` bigint DEFAULT NULL COMMENT '项目ID(NULL表示全局)',
  `rule_name` varchar(128) NOT NULL COMMENT '规则名称',
  `rule_type` varchar(32) NOT NULL COMMENT '规则类型(TASK_OVERDUE/SPRINT_DEVIATION/BUG_TIMEOUT/RESOURCE_OVERLOAD)',
  `threshold_value` int NOT NULL COMMENT '阈值',
  `threshold_unit` varchar(16) NOT NULL COMMENT '阈值单位(DAY/HOUR/PERCENT)',
  `is_enabled` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用',
  `notify_roles` varchar(255) DEFAULT NULL COMMENT '通知角色(JSON数组)',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='预警规则配置表';

CREATE TABLE IF NOT EXISTS `sys_audit_log` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` bigint NOT NULL COMMENT '操作人ID',
  `username` varchar(64) NOT NULL COMMENT '操作人用户名',
  `operation` varchar(128) NOT NULL COMMENT '操作描述',
  `module` varchar(64) NOT NULL COMMENT '操作模块',
  `method` varchar(256) DEFAULT NULL COMMENT '请求方法',
  `request_url` varchar(512) DEFAULT NULL COMMENT '请求URL',
  `request_params` text COMMENT '请求参数',
  `ip_address` varchar(64) DEFAULT NULL COMMENT 'IP地址',
  `before_data` text COMMENT '变更前数据(JSON)',
  `after_data` text COMMENT '变更后数据(JSON)',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '操作状态(1:成功 0:失败)',
  `error_msg` text COMMENT '错误信息',
  `execution_time` bigint DEFAULT NULL COMMENT '执行耗时(ms)',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_module` (`module`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='审计日志表';

CREATE TABLE IF NOT EXISTS `sys_config` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `config_key` varchar(100) NOT NULL COMMENT '配置键',
  `config_value` varchar(500) NOT NULL COMMENT '配置值',
  `config_name` varchar(200) NOT NULL COMMENT '配置名称（中文）',
  `config_group` varchar(50) DEFAULT 'system' COMMENT '配置分组',
  `description` varchar(500) DEFAULT NULL COMMENT '说明',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';

CREATE TABLE IF NOT EXISTS `sys_permission` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `parent_id` bigint NOT NULL DEFAULT '0' COMMENT '父权限ID',
  `permission_code` varchar(128) NOT NULL COMMENT '权限编码',
  `permission_name` varchar(64) NOT NULL COMMENT '权限名称',
  `type` tinyint NOT NULL COMMENT '类型(1:菜单 2:按钮 3:接口)',
  `path` varchar(255) DEFAULT NULL COMMENT '路由路径',
  `icon` varchar(64) DEFAULT NULL COMMENT '图标',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态(1:启用 0:禁用)',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_permission_code` (`permission_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统权限表';

CREATE TABLE IF NOT EXISTS `sys_role` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `role_code` varchar(64) NOT NULL COMMENT '角色编码',
  `role_name` varchar(64) NOT NULL COMMENT '角色名称',
  `description` varchar(255) DEFAULT NULL COMMENT '描述',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态(1:启用 0:禁用)',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_code` (`role_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统角色表';

CREATE TABLE IF NOT EXISTS `sys_role_permission` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `role_id` bigint NOT NULL COMMENT '角色ID',
  `permission_id` bigint NOT NULL COMMENT '权限ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_permission` (`role_id`,`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色权限关联表';

CREATE TABLE IF NOT EXISTS `sys_user` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `username` varchar(64) NOT NULL COMMENT '用户名',
  `password` varchar(255) NOT NULL COMMENT '密码(BCrypt加密)',
  `nickname` varchar(64) NOT NULL COMMENT '昵称',
  `email` varchar(128) DEFAULT NULL COMMENT '邮箱',
  `phone` varchar(20) DEFAULT NULL COMMENT '手机号',
  `avatar` varchar(512) DEFAULT NULL COMMENT '头像URL',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态(1:启用 0:禁用)',
  `is_first_login` tinyint NOT NULL DEFAULT '1' COMMENT '是否首次登录(1:是 0:否)',
  `last_login_time` datetime DEFAULT NULL COMMENT '最后登录时间',
  `last_login_ip` varchar(64) DEFAULT NULL COMMENT '最后登录IP',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除(0:未删除 1:已删除)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统用户表';

CREATE TABLE IF NOT EXISTS `sys_user_notification_setting` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `channel` varchar(32) NOT NULL COMMENT '通知渠道(SITE:站内信, FEISHU:飞书, DINGTALK:钉钉, WECHAT_WORK:企业微信)',
  `enabled` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用(1:启用 0:禁用)',
  `webhook_url` varchar(512) DEFAULT NULL COMMENT 'Webhook地址(外部渠道)',
  `notify_level` varchar(16) NOT NULL DEFAULT 'ALL' COMMENT '通知级别(ALL:全部, URGENT:仅紧急, NONE:不接收)',
  `quiet_start` time DEFAULT NULL COMMENT '免打扰开始时间',
  `quiet_end` time DEFAULT NULL COMMENT '免打扰结束时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_channel` (`user_id`,`channel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户通知偏好设置表';

CREATE TABLE IF NOT EXISTS `sys_user_role` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `role_id` bigint NOT NULL COMMENT '角色ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_role` (`user_id`,`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户角色关联表';

-- 用例变更审批表(实体 BizTestCaseChange; 此前所有脚本均缺失, 首次在此补齐)
CREATE TABLE IF NOT EXISTS `biz_test_case_change` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `test_case_id` bigint NOT NULL COMMENT '用例ID',
  `change_type` varchar(16) NOT NULL COMMENT '变更类型(UPDATE/DELETE)',
  `payload` text COMMENT '修改内容JSON',
  `reason` varchar(500) DEFAULT NULL COMMENT '变更原因',
  `applicant_id` bigint NOT NULL COMMENT '申请人ID',
  `status` varchar(32) NOT NULL DEFAULT 'PENDING' COMMENT '状态(PENDING/TL_APPROVED/APPROVED/REJECTED)',
  `tl_approver_id` bigint DEFAULT NULL COMMENT '一审审批人ID',
  `pm_approver_id` bigint DEFAULT NULL COMMENT '二审审批人ID',
  `reject_reason` varchar(500) DEFAULT NULL COMMENT '驳回原因',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_test_case_id` (`test_case_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用例变更审批表';


CREATE TABLE IF NOT EXISTS `biz_release_order` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `project_id` bigint NOT NULL COMMENT '项目ID',
  `title` varchar(256) NOT NULL COMMENT '发布标题',
  `version` varchar(64) DEFAULT NULL COMMENT '版本号',
  `content` text COMMENT '发布内容清单',
  `rollback_plan` text NOT NULL COMMENT '回滚方案(必填)',
  `status` varchar(32) NOT NULL DEFAULT 'DRAFT' COMMENT '状态(DRAFT/RELEASING/SMOKE_PENDING/DONE/ROLLED_BACK)',
  `created_by` bigint NOT NULL COMMENT '创建人ID',
  `smoke_by` bigint DEFAULT NULL COMMENT '冒烟验证人(QA)',
  `smoke_at` datetime DEFAULT NULL COMMENT '冒烟时间',
  `smoke_result` text COMMENT '冒烟结论',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_project_status` (`project_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='发布单(车次模型)';

CREATE TABLE IF NOT EXISTS `biz_release_order_item` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `release_order_id` bigint NOT NULL COMMENT '发布单ID',
  `requirement_id` bigint NOT NULL COMMENT '需求ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_release_order` (`release_order_id`),
  KEY `idx_requirement` (`requirement_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='发布单-需求关联';
