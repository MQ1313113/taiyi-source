-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: localhost    Database: rd_platform
-- ------------------------------------------------------
-- Server version	8.0.46-0ubuntu0.24.04.3

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `biz_bug`
--

DROP TABLE IF EXISTS `biz_bug`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biz_bug` (
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
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='缺陷表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `biz_bug`
--

LOCK TABLES `biz_bug` WRITE;
/*!40000 ALTER TABLE `biz_bug` DISABLE KEYS */;
INSERT INTO `biz_bug` (`id`, `project_id`, `sprint_id`, `requirement_id`, `task_id`, `title`, `description`, `expected_result`, `actual_result`, `severity`, `priority`, `module_name`, `status`, `reporter_id`, `assignee_id`, `fixer_id`, `root_cause`, `introduce_phase`, `attachment_urls`, `confirmed_at`, `fixed_at`, `closed_at`, `created_at`, `updated_at`, `deleted`) VALUES (1,1,NULL,NULL,NULL,'验证流转-测试Bug','复现步骤','正确','错误','MAJOR','MEDIUM','测试模块','CLOSED',5,4,4,'代码逻辑错误','开发',NULL,'2026-07-17 06:56:49','2026-07-17 06:56:49','2026-07-17 06:56:50','2026-07-17 06:56:48','2026-07-17 06:56:48',0),(2,1,NULL,NULL,NULL,'验证Bug流转','测试Bug状态机','ok','fail','MAJOR','HIGH','核心模块','CLOSED',5,4,4,NULL,NULL,NULL,'2026-07-17 07:34:01','2026-07-17 07:34:38','2026-07-17 07:34:38','2026-07-17 07:34:00','2026-07-17 07:34:00',0),(3,1,NULL,NULL,NULL,'负面用例','test','ok','fail','MINOR','LOW','测试模块','CONFIRMED',5,4,NULL,NULL,NULL,NULL,'2026-07-17 07:34:01',NULL,NULL,'2026-07-17 07:34:00','2026-07-17 07:34:00',0),(4,1,NULL,NULL,NULL,'负面测试Bug','test','ok','fail','MINOR','LOW','测试模块','CONFIRMED',5,4,NULL,NULL,NULL,NULL,'2026-07-17 07:35:00',NULL,NULL,'2026-07-17 07:34:59','2026-07-17 07:34:59',0),(5,1,NULL,NULL,NULL,'权限验证Bug','test','ok','fail','MINOR','LOW','测试','CONFIRMED',5,4,NULL,NULL,NULL,NULL,'2026-07-17 07:38:19',NULL,NULL,'2026-07-17 07:38:18','2026-07-17 07:38:18',0),(6,1,NULL,NULL,NULL,'最终验证Bug','test','ok','fail','MINOR','LOW','验证模块','CONFIRMED',5,4,NULL,NULL,NULL,NULL,'2026-07-17 07:38:45',NULL,NULL,'2026-07-17 07:38:44','2026-07-17 07:38:44',0),(7,1,NULL,NULL,NULL,'E2E验证Bug','test','ok','fail','MAJOR','HIGH','核心模块','CLOSED',5,4,4,NULL,NULL,NULL,'2026-07-17 07:43:16','2026-07-17 07:43:16','2026-07-17 07:43:16','2026-07-17 07:43:16','2026-07-17 07:43:16',0),(8,1,NULL,NULL,NULL,'E2E验证Bug','test','ok','fail','MAJOR','HIGH','核心模块','CLOSED',5,4,4,NULL,NULL,NULL,'2026-07-17 07:44:09','2026-07-17 07:44:09','2026-07-17 07:44:09','2026-07-17 07:44:08','2026-07-17 07:44:08',0);
/*!40000 ALTER TABLE `biz_bug` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `biz_change_request`
--

DROP TABLE IF EXISTS `biz_change_request`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biz_change_request` (
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='需求变更表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `biz_change_request`
--

LOCK TABLES `biz_change_request` WRITE;
/*!40000 ALTER TABLE `biz_change_request` DISABLE KEYS */;
INSERT INTO `biz_change_request` (`id`, `requirement_id`, `project_id`, `change_content`, `change_reason`, `impact_scope`, `status`, `applicant_id`, `approver_id`, `approved_at`, `reject_reason`, `created_at`, `updated_at`) VALUES (1,1,1,'验证双重审批','测试需要','无影响','APPROVED',2,3,'2026-07-17 06:56:50',NULL,'2026-07-17 06:56:49','2026-07-17 06:56:49'),(2,3,1,'测试驳回流程','验证驳回','无影响','REJECTED',2,3,NULL,'测试驳回原因说明','2026-07-17 07:01:27','2026-07-17 07:01:27'),(3,4,1,'E2E变更内容','验证流转','低影响','APPROVED',2,1,'2026-07-17 07:45:46',NULL,'2026-07-17 07:45:06','2026-07-17 07:45:06');
/*!40000 ALTER TABLE `biz_change_request` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `biz_dependency`
--

DROP TABLE IF EXISTS `biz_assignment_log`;
CREATE TABLE `biz_assignment_log` (
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

DROP TABLE IF EXISTS `biz_rework_log`;
CREATE TABLE `biz_rework_log` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='打回/返工归因日志';

DROP TABLE IF EXISTS `biz_ticket`;
CREATE TABLE `biz_ticket` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `ticket_code` varchar(32) NOT NULL COMMENT '工单编号',
  `source` varchar(16) NOT NULL COMMENT '来源(SALES/SUPPORT/CUSTOMER/PRODUCT/INTERNAL)',
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
  `sla_due_at` datetime DEFAULT NULL COMMENT 'SLA截止时间',
  `escalated_level` int NOT NULL DEFAULT '0' COMMENT '升级级别(0未升/1责任人/2项目负责人/3管理员)',
  `resolved_at` datetime DEFAULT NULL COMMENT '解决时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_assignee` (`assignee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='工单(统一问题入口)';

DROP TABLE IF EXISTS `biz_ticket_routing`;
CREATE TABLE `biz_ticket_routing` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `category` varchar(16) NOT NULL COMMENT '匹配类型',
  `project_id` bigint DEFAULT NULL COMMENT '项目ID(可空,填了则更优先)',
  `owner_id` bigint NOT NULL COMMENT '默认负责人ID',
  `enabled` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='工单路由/责任规则';

DROP TABLE IF EXISTS `biz_dependency`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biz_dependency` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='跨团队依赖表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `biz_dependency`
--

LOCK TABLES `biz_dependency` WRITE;
/*!40000 ALTER TABLE `biz_dependency` DISABLE KEYS */;
/*!40000 ALTER TABLE `biz_dependency` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `biz_knowledge`
--

DROP TABLE IF EXISTS `biz_knowledge`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biz_knowledge` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='知识库文档表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `biz_knowledge`
--

LOCK TABLES `biz_knowledge` WRITE;
/*!40000 ALTER TABLE `biz_knowledge` DISABLE KEYS */;
/*!40000 ALTER TABLE `biz_knowledge` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `biz_notification`
--

DROP TABLE IF EXISTS `biz_notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biz_notification` (
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
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='通知消息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `biz_notification`
--

LOCK TABLES `biz_notification` WRITE;
/*!40000 ALTER TABLE `biz_notification` DISABLE KEYS */;
INSERT INTO `biz_notification` (`id`, `user_id`, `title`, `content`, `type`, `priority`, `is_read`, `target_type`, `target_id`, `target_url`, `read_at`, `created_at`) VALUES (1,3,'新需求待提交评审','需求 [批量导入测试需求A] 已通过批量导入创建并指定您为负责人，请在工作台发起评审','STATUS_CHANGE','NORMAL',0,'REQUIREMENT',1,NULL,NULL,'2026-07-03 09:40:14'),(2,3,'新需求待提交评审','需求 [批量导入测试需求A] 已通过批量导入创建并指定您为负责人，请在工作台发起评审','STATUS_CHANGE','NORMAL',0,'REQUIREMENT',2,NULL,NULL,'2026-07-03 09:46:04'),(3,4,'新缺陷分配','您有新的Bug需要处理: 验证流转-测试Bug','BUG_ASSIGN','NORMAL',0,'BUG',1,NULL,NULL,'2026-07-17 06:56:48'),(4,3,'新需求变更待审批','需求#1 有新的变更申请待您(产品经理)审批','CHANGE_APPROVAL','NORMAL',0,'CHANGE',1,NULL,NULL,'2026-07-17 06:56:49'),(5,2,'变更已批准','您提交的变更#1 已通过双重审批','CHANGE_RESULT','NORMAL',0,'CHANGE',1,NULL,NULL,'2026-07-17 06:56:49'),(6,2,'新需求待提交评审','需求 [验证流转-测试需求] 已创建并指定您为负责人，请在工作台发起评审','STATUS_CHANGE','NORMAL',0,'REQUIREMENT',3,NULL,NULL,'2026-07-17 06:58:27'),(7,3,'需求评审邀请','您有新的需求评审待处理: 验证流转-测试需求','REVIEW_INVITE','NORMAL',0,'REQUIREMENT',3,NULL,NULL,'2026-07-17 06:59:03'),(8,2,'需求评审通过','需求 [验证流转-测试需求] 评审通过，请安排拆解','STATUS_CHANGE','NORMAL',0,'REQUIREMENT',3,NULL,NULL,'2026-07-17 07:00:13'),(9,2,'需求开发完成','需求 [验证流转-测试需求] 已开发完成，可发起提测','STATUS_CHANGE','NORMAL',0,'REQUIREMENT',3,NULL,NULL,'2026-07-17 07:00:25'),(10,2,'需求状态变更','需求 [验证流转-测试需求] 状态由 TESTED 变更为 RELEASING','STATUS_CHANGE','NORMAL',0,'REQUIREMENT',3,NULL,NULL,'2026-07-17 07:00:25'),(11,2,'需求状态变更','需求 [验证流转-测试需求] 状态由 RELEASING 变更为 CLOSED','STATUS_CHANGE','NORMAL',0,'REQUIREMENT',3,NULL,NULL,'2026-07-17 07:00:26'),(12,4,'新任务分配','您有新的开发任务: 验证流转-开发任务','TASK_ASSIGN','NORMAL',0,'TASK',1,NULL,NULL,'2026-07-17 07:00:47'),(13,4,'新任务分配','您有新的开发任务: 测试打回','TASK_ASSIGN','NORMAL',0,'TASK',2,NULL,NULL,'2026-07-17 07:01:16'),(14,2,'新需求变更待审批','需求#3 有新的变更申请待您(产品经理)审批','CHANGE_APPROVAL','NORMAL',0,'CHANGE',2,NULL,NULL,'2026-07-17 07:01:27'),(15,2,'变更被驳回','您提交的变更#2 被驳回：测试驳回原因说明','CHANGE_RESULT','NORMAL',0,'CHANGE',2,NULL,NULL,'2026-07-17 07:01:28'),(16,4,'新缺陷分配','您有新的Bug需要处理: 验证Bug流转','BUG_ASSIGN','NORMAL',0,'BUG',2,NULL,NULL,'2026-07-17 07:34:00'),(17,4,'新缺陷分配','您有新的Bug需要处理: 负面用例','BUG_ASSIGN','NORMAL',0,'BUG',3,NULL,NULL,'2026-07-17 07:34:00'),(18,4,'新缺陷分配','您有新的Bug需要处理: 负面测试Bug','BUG_ASSIGN','NORMAL',0,'BUG',4,NULL,NULL,'2026-07-17 07:34:59'),(19,4,'新缺陷分配','您有新的Bug需要处理: 权限验证Bug','BUG_ASSIGN','NORMAL',0,'BUG',5,NULL,NULL,'2026-07-17 07:38:18'),(20,4,'新缺陷分配','您有新的Bug需要处理: 最终验证Bug','BUG_ASSIGN','NORMAL',0,'BUG',6,NULL,NULL,'2026-07-17 07:38:44'),(21,4,'新缺陷分配','您有新的Bug需要处理: E2E验证Bug','BUG_ASSIGN','NORMAL',0,'BUG',7,NULL,NULL,'2026-07-17 07:43:16'),(22,4,'新缺陷分配','您有新的Bug需要处理: E2E验证Bug','BUG_ASSIGN','NORMAL',0,'BUG',8,NULL,NULL,'2026-07-17 07:44:08'),(23,2,'新需求待提交评审','需求 [E2E测试需求] 已创建并指定您为负责人，请在工作台发起评审','STATUS_CHANGE','NORMAL',0,'REQUIREMENT',4,NULL,NULL,'2026-07-17 07:44:27'),(24,2,'需求评审邀请','您有新的需求评审待处理: E2E测试需求','REVIEW_INVITE','NORMAL',0,'REQUIREMENT',4,NULL,NULL,'2026-07-17 07:44:38'),(25,3,'需求评审邀请','您有新的需求评审待处理: E2E测试需求','REVIEW_INVITE','NORMAL',0,'REQUIREMENT',4,NULL,NULL,'2026-07-17 07:44:38'),(26,2,'需求评审通过','需求 [E2E测试需求] 评审通过，请安排拆解','STATUS_CHANGE','NORMAL',0,'REQUIREMENT',4,NULL,NULL,'2026-07-17 07:44:38'),(27,4,'新任务分配','您有新的开发任务: E2E测试任务','TASK_ASSIGN','NORMAL',0,'TASK',3,NULL,NULL,'2026-07-17 07:44:54'),(28,4,'新任务分配','您有新的开发任务: 负面测试任务','TASK_ASSIGN','NORMAL',0,'TASK',4,NULL,NULL,'2026-07-17 07:44:54'),(29,2,'新需求变更待审批','需求#4 有新的变更申请待您(产品经理)审批','CHANGE_APPROVAL','NORMAL',0,'CHANGE',3,NULL,NULL,'2026-07-17 07:45:06'),(30,2,'变更待复审','变更#3 已通过产品经理审批，待您复审','CHANGE_APPROVAL','NORMAL',0,'CHANGE',3,NULL,NULL,'2026-07-17 07:45:06'),(31,2,'需求开发完成','需求 [E2E测试需求] 已开发完成，可发起提测','STATUS_CHANGE','NORMAL',0,'REQUIREMENT',4,NULL,NULL,'2026-07-17 07:45:37'),(32,2,'变更已批准','您提交的变更#3 已通过双重审批','CHANGE_RESULT','NORMAL',0,'CHANGE',3,NULL,NULL,'2026-07-17 07:45:46'),(33,2,'需求状态变更','需求 [E2E测试需求] 状态由 TESTING 变更为 TESTED','STATUS_CHANGE','NORMAL',0,'REQUIREMENT',4,NULL,NULL,'2026-07-17 07:54:03'),(34,2,'需求状态变更','需求 [E2E测试需求] 状态由 TESTED 变更为 RELEASING','STATUS_CHANGE','NORMAL',0,'REQUIREMENT',4,NULL,NULL,'2026-07-17 07:54:03'),(35,2,'需求状态变更','需求 [E2E测试需求] 状态由 RELEASING 变更为 CLOSED','STATUS_CHANGE','NORMAL',0,'REQUIREMENT',4,NULL,NULL,'2026-07-17 07:54:03');
/*!40000 ALTER TABLE `biz_notification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `biz_notification_delivery`
--

DROP TABLE IF EXISTS `biz_notification_delivery`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biz_notification_delivery` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `notification_id` bigint NOT NULL COMMENT '通知ID',
  `channel` varchar(32) NOT NULL COMMENT '发送渠道',
  `status` varchar(16) NOT NULL DEFAULT 'PENDING' COMMENT '发送状态(PENDING/SUCCESS/FAILED)',
  `error_msg` varchar(512) DEFAULT NULL COMMENT '失败原因',
  `sent_at` datetime DEFAULT NULL COMMENT '发送时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_notification_id` (`notification_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='通知发送记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `biz_notification_delivery`
--

LOCK TABLES `biz_notification_delivery` WRITE;
/*!40000 ALTER TABLE `biz_notification_delivery` DISABLE KEYS */;
/*!40000 ALTER TABLE `biz_notification_delivery` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `biz_project`
--

DROP TABLE IF EXISTS `biz_project`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biz_project` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `project_name` varchar(128) NOT NULL COMMENT '项目名称',
  `project_code` varchar(64) DEFAULT NULL COMMENT '项目编码',
  `description` text COMMENT '项目描述',
  `owner_id` bigint NOT NULL COMMENT '项目负责人ID',
  `status` varchar(32) NOT NULL DEFAULT 'PLANNING' COMMENT '状态(PLANNING/ACTIVE/ARCHIVED)',
  `gear_level` varchar(16) NOT NULL DEFAULT 'STANDARD' COMMENT '档位(LIGHTWEIGHT/STANDARD/FULL)',
  `gear_transition_date` date DEFAULT NULL COMMENT '档位过渡截止日期',
  `start_date` date DEFAULT NULL COMMENT '开始日期',
  `end_date` date DEFAULT NULL COMMENT '结束日期',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_name` (`project_name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='项目表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `biz_project`
--

LOCK TABLES `biz_project` WRITE;
/*!40000 ALTER TABLE `biz_project` DISABLE KEYS */;
INSERT INTO `biz_project` (`id`, `project_name`, `project_code`, `description`, `owner_id`, `status`, `gear_level`, `gear_transition_date`, `start_date`, `end_date`, `created_at`, `updated_at`, `deleted`) VALUES (1,'太一商城重构项目','TYMALL','电商平台重构',3,'PLANNING','L2',NULL,'2026-07-01','2026-12-31','2026-07-03 09:39:39','2026-07-16 08:40:57',0);
/*!40000 ALTER TABLE `biz_project` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `biz_project_member`
--

DROP TABLE IF EXISTS `biz_project_member`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biz_project_member` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `project_id` bigint NOT NULL COMMENT '项目ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `role_in_project` varchar(32) NOT NULL COMMENT '项目内角色(PM/TECH_LEADER/DEV/QA)',
  `joined_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_user` (`project_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='项目成员表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `biz_project_member`
--

LOCK TABLES `biz_project_member` WRITE;
/*!40000 ALTER TABLE `biz_project_member` DISABLE KEYS */;
/*!40000 ALTER TABLE `biz_project_member` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `biz_requirement`
--

DROP TABLE IF EXISTS `biz_requirement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biz_requirement` (
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='需求表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `biz_requirement`
--

LOCK TABLES `biz_requirement` WRITE;
/*!40000 ALTER TABLE `biz_requirement` DISABLE KEYS */;
INSERT INTO `biz_requirement` (`id`, `project_id`, `sprint_id`, `title`, `type`, `priority`, `status`, `description`, `acceptance_criteria`, `business_value`, `prototype_url`, `data_dictionary`, `api_contract`, `performance_baseline`, `owner_id`, `created_by`, `expected_completion_date`, `is_fast_track`, `fast_track_expire_time`, `fast_track_violated`, `version`, `created_at`, `updated_at`, `deleted`) VALUES (1,1,NULL,'批量导入测试需求A','功能','高','DEVELOPING','支持商品批量上架功能','Given 运营已登录 When 上传商品表格 Then 商品批量创建成功','提升运营效率',NULL,NULL,NULL,NULL,3,1,'2026-09-01',0,NULL,0,1,'2026-07-03 09:40:14','2026-07-17 08:08:44',0),(2,1,NULL,'批量导入测试需求A','功能','高','DRAFT','支持商品批量上架功能','Given 运营已登录 When 上传商品表格 Then 商品批量创建成功','提升运营效率',NULL,NULL,NULL,NULL,3,1,'2026-09-01',0,NULL,0,1,'2026-07-03 09:46:04','2026-07-17 08:08:44',0),(3,1,NULL,'验证流转-测试需求','FUNCTIONAL','HIGH','CLOSED','全链路测试','Given 用户登录\nWhen 点击按钮\nThen 显示结果','提升用户体验',NULL,NULL,NULL,NULL,2,2,'2026-08-01',0,NULL,0,1,'2026-07-17 06:58:27','2026-07-17 07:00:25',0),(4,1,NULL,'E2E测试需求','FEATURE','HIGH','CLOSED','端到端验证','Given 用户已登录\nWhen 点击提交按钮\nThen 数据保存成功','HIGH',NULL,NULL,NULL,NULL,2,2,'2026-08-01',0,NULL,0,1,'2026-07-17 07:44:27','2026-07-17 07:44:27',0);
/*!40000 ALTER TABLE `biz_requirement` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `biz_requirement_review`
--

DROP TABLE IF EXISTS `biz_requirement_review`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biz_requirement_review` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `requirement_id` bigint NOT NULL COMMENT '需求ID',
  `reviewer_id` bigint NOT NULL COMMENT '评审人ID',
  `result` varchar(16) DEFAULT NULL COMMENT '评审结果(APPROVED/REJECTED/PENDING)',
  `comment` text COMMENT '评审意见',
  `reviewed_at` datetime DEFAULT NULL COMMENT '评审时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_requirement_id` (`requirement_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='需求评审表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `biz_requirement_review`
--

LOCK TABLES `biz_requirement_review` WRITE;
/*!40000 ALTER TABLE `biz_requirement_review` DISABLE KEYS */;
INSERT INTO `biz_requirement_review` (`id`, `requirement_id`, `reviewer_id`, `result`, `comment`, `reviewed_at`, `created_at`) VALUES (1,3,3,'APPROVED','评审通过',NULL,'2026-07-17 06:59:03'),(2,4,2,'APPROVED','同意',NULL,'2026-07-17 07:44:39'),(3,4,3,'APPROVED','同意',NULL,'2026-07-17 07:44:39');
/*!40000 ALTER TABLE `biz_requirement_review` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `biz_sprint`
--

DROP TABLE IF EXISTS `biz_sprint`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biz_sprint` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `project_id` bigint NOT NULL COMMENT '项目ID',
  `sprint_name` varchar(128) NOT NULL COMMENT '迭代名称',
  `goal` text COMMENT '迭代目标',
  `status` varchar(32) NOT NULL DEFAULT 'NOT_STARTED' COMMENT '状态(NOT_STARTED/IN_PROGRESS/COMPLETED)',
  `type` varchar(32) NOT NULL DEFAULT 'NORMAL' COMMENT '类型(NORMAL/HOTFIX)',
  `start_date` date NOT NULL COMMENT '开始日期',
  `end_date` date NOT NULL COMMENT '结束日期',
  `created_by` bigint NOT NULL COMMENT '创建人ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_project_id` (`project_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='迭代表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `biz_sprint`
--

LOCK TABLES `biz_sprint` WRITE;
/*!40000 ALTER TABLE `biz_sprint` DISABLE KEYS */;
INSERT INTO `biz_sprint` (`id`, `project_id`, `sprint_name`, `goal`, `status`, `type`, `start_date`, `end_date`, `created_by`, `created_at`, `updated_at`) VALUES (1,1,'Sprint 2026-W29','完成审计日志增强','NOT_STARTED','NORMAL','2026-07-14','2026-07-28',1,'2026-07-16 07:24:25','2026-07-16 07:24:25'),(2,1,'Sprint 2026-W30','完成知识库公共私人区域功能','PLANNING','NORMAL','2026-07-21','2026-08-04',1,'2026-07-16 07:25:07','2026-07-16 07:25:07'),(3,1,'Sprint Test PM','测试产品经理创建迭代','NOT_STARTED','NORMAL','2026-07-21','2026-08-04',3,'2026-07-16 08:06:00','2026-07-16 08:06:00'),(4,1,'Sprint PM Test','','PLANNING','NORMAL','2026-08-01','2026-08-15',3,'2026-07-16 08:07:06','2026-07-16 08:07:06'),(5,1,'123','123','PLANNING','NORMAL','2026-07-30','2026-07-31',2,'2026-07-16 08:07:41','2026-07-16 08:07:41');
/*!40000 ALTER TABLE `biz_sprint` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `biz_submit_test`
--

DROP TABLE IF EXISTS `biz_submit_test`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biz_submit_test` (
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='提测单表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `biz_submit_test`
--

LOCK TABLES `biz_submit_test` WRITE;
/*!40000 ALTER TABLE `biz_submit_test` DISABLE KEYS */;
INSERT INTO `biz_submit_test` (`id`, `requirement_id`, `project_id`, `sprint_id`, `submitter_id`, `description`, `status`, `approver_id`, `approved_at`, `reject_reason`, `created_at`, `updated_at`) VALUES (1,4,1,NULL,2,NULL,'APPROVED',5,'2026-07-17 07:53:33',NULL,'2026-07-17 07:52:18','2026-07-17 07:52:18');
/*!40000 ALTER TABLE `biz_submit_test` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `biz_task`
--

DROP TABLE IF EXISTS `biz_task`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biz_task` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `requirement_id` bigint NOT NULL COMMENT '需求ID',
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='开发任务表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `biz_task`
--

LOCK TABLES `biz_task` WRITE;
/*!40000 ALTER TABLE `biz_task` DISABLE KEYS */;
INSERT INTO `biz_task` (`id`, `requirement_id`, `project_id`, `sprint_id`, `task_name`, `description`, `status`, `priority`, `assignee_id`, `created_by`, `estimated_hours`, `actual_hours`, `start_date`, `due_date`, `completed_at`, `created_at`, `updated_at`, `deleted`) VALUES (1,3,1,NULL,'验证流转-开发任务','全链路测试','DONE','HIGH',4,2,NULL,0.0,NULL,'2026-08-01','2026-07-17 07:01:04','2026-07-17 07:00:47','2026-07-17 07:00:47',0),(2,3,1,NULL,'测试打回','测试','TESTING','MEDIUM',4,2,NULL,0.0,NULL,'2026-08-01','2026-07-17 07:32:43','2026-07-17 07:01:16','2026-07-17 07:32:43',0),(3,4,1,NULL,'E2E测试任务','验证任务流转','DONE','HIGH',4,2,8.0,0.0,NULL,'2026-08-01','2026-07-17 07:44:54','2026-07-17 07:44:54','2026-07-17 07:44:54',0),(4,4,1,NULL,'负面测试任务','test','TESTING','LOW',4,2,4.0,0.0,NULL,'2026-08-01',NULL,'2026-07-17 07:44:54','2026-07-17 07:44:54',0);
/*!40000 ALTER TABLE `biz_task` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `biz_tech_debt`
--

DROP TABLE IF EXISTS `biz_tech_debt`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biz_tech_debt` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='技术债务表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `biz_tech_debt`
--

LOCK TABLES `biz_tech_debt` WRITE;
/*!40000 ALTER TABLE `biz_tech_debt` DISABLE KEYS */;
/*!40000 ALTER TABLE `biz_tech_debt` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `biz_test_case`
--

DROP TABLE IF EXISTS `biz_test_case`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biz_test_case` (
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='测试用例表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `biz_test_case`
--

LOCK TABLES `biz_test_case` WRITE;
/*!40000 ALTER TABLE `biz_test_case` DISABLE KEYS */;
INSERT INTO `biz_test_case` (`id`, `project_id`, `requirement_id`, `module_name`, `case_name`, `precondition`, `steps`, `expected_result`, `priority`, `ac_ref`, `status`, `execution_status`, `actual_result`, `evidence_url`, `executed_by`, `executed_at`, `created_by`, `locked_at`, `created_at`, `updated_at`, `deleted`) VALUES (1,1,1,'商品管理','批量上架-正常表格','运营已登录且有上架权限','1.进入商品管理 2.上传合法商品表格 3.点击批量上架','商品全部成功上架并提示成功条数','P1',NULL,'DRAFT',NULL,NULL,NULL,NULL,NULL,1,NULL,'2026-07-03 09:43:50','2026-07-03 09:43:50',0),(2,1,1,'商品管理','批量上架-正常表格','运营已登录且有上架权限','1.进入商品管理 2.上传合法商品表格 3.点击批量上架','商品全部成功上架并提示成功条数','P1',NULL,'DRAFT',NULL,NULL,NULL,NULL,NULL,1,NULL,'2026-07-03 09:47:15','2026-07-03 09:47:15',0),(3,1,4,'核心模块','E2E功能验证用例','用户已登录','1.打开页面 2.点击按钮','数据保存成功','HIGH','Given 用户已登录 When 点击提交按钮 Then 数据保存成功','LOCKED',NULL,NULL,NULL,NULL,NULL,5,'2026-07-17 07:47:08','2026-07-17 07:46:41','2026-07-17 07:48:12',0),(4,1,4,'核心模块','异常-未登录时提交','用户未登录','1.直接访问提交页面 2.点击提交','提示请先登录','HIGH','Given 用户已登录 When 点击提交按钮 Then 数据保存成功','LOCKED',NULL,NULL,NULL,NULL,NULL,5,'2026-07-17 07:48:13','2026-07-17 07:48:12','2026-07-17 07:48:38',0);
/*!40000 ALTER TABLE `biz_test_case` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `biz_warning_rule`
--

DROP TABLE IF EXISTS `biz_warning_rule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `biz_warning_rule` (
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='预警规则配置表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `biz_warning_rule`
--

LOCK TABLES `biz_warning_rule` WRITE;
/*!40000 ALTER TABLE `biz_warning_rule` DISABLE KEYS */;
INSERT INTO `biz_warning_rule` (`id`, `project_id`, `rule_name`, `rule_type`, `threshold_value`, `threshold_unit`, `is_enabled`, `notify_roles`, `created_at`, `updated_at`) VALUES (1,NULL,'任务延期预警','TASK_OVERDUE',1,'DAY',1,'[\"tech_leader\",\"pm\"]','2026-07-03 09:16:20','2026-07-03 09:16:20'),(2,NULL,'迭代进度偏离预警','SPRINT_DEVIATION',30,'PERCENT',1,'[\"tech_leader\",\"pm\"]','2026-07-03 09:16:20','2026-07-03 09:16:20'),(3,NULL,'P0 Bug超时未处理','BUG_TIMEOUT',24,'HOUR',1,'[\"tech_leader\"]','2026-07-03 09:16:20','2026-07-03 09:16:20'),(4,NULL,'资源过载预警','RESOURCE_OVERLOAD',120,'PERCENT',1,'[\"tech_leader\",\"sys_admin\"]','2026-07-03 09:16:20','2026-07-03 09:16:20');
/*!40000 ALTER TABLE `biz_warning_rule` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_audit_log`
--

DROP TABLE IF EXISTS `sys_audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_audit_log` (
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
) ENGINE=InnoDB AUTO_INCREMENT=149 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='审计日志表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_audit_log`
--

LOCK TABLES `sys_audit_log` WRITE;
/*!40000 ALTER TABLE `sys_audit_log` DISABLE KEYS */;
INSERT INTO `sys_audit_log` (`id`, `user_id`, `username`, `operation`, `module`, `method`, `request_url`, `request_params`, `ip_address`, `before_data`, `after_data`, `status`, `error_msg`, `execution_time`, `created_at`) VALUES (1,1,'admin','批量导入需求','需求管理','com.rd.platform.service.controller.RequirementController.importRequirements','/api/v1/requirements/import',NULL,'0:0:0:0:0:0:0:1',NULL,NULL,1,NULL,9,'2026-07-03 09:38:13'),(2,1,'admin','创建项目','项目管理','com.rd.platform.service.controller.ProjectController.create','/api/v1/projects',NULL,'0:0:0:0:0:0:0:1',NULL,NULL,0,'\n### Error updating database.  Cause: java.sql.SQLIntegrityConstraintViolationException: Column \'joined_at\' cannot be null\n### The error may exist in com/rd/platform/model/mapper/BizProjectMemberMapper.java (best guess)\n### The error may involve com.rd.platform.model.mapper.BizProjectMemberMapper.insert-Inline\n### The error occurred while setting parameters\n### SQL: INSERT INTO biz_project_member  ( project_id, user_id, role_in_project, joined_at )  VALUES (  ?, ?, ?, ?  )\n### Cause: java.sql.SQLIntegrityConstraintViolationException: Column \'joined_at\' cannot be null\n; Column \'joined_at\' cannot be null; nested exception is java.sql.SQLIntegrityConstraintViolationException: Column \'joined_at\' cannot be null',87,'2026-07-03 09:39:39'),(3,1,'admin','批量导入需求','需求管理','com.rd.platform.service.controller.RequirementController.importRequirements','/api/v1/requirements/import',NULL,'0:0:0:0:0:0:0:1',NULL,NULL,1,NULL,27,'2026-07-03 09:40:15'),(4,1,'admin','批量导入测试用例','测试管理','com.rd.platform.service.controller.TestCaseController.importTestCases','/api/v1/test-cases/import',NULL,'0:0:0:0:0:0:0:1',NULL,NULL,1,NULL,20,'2026-07-03 09:40:49'),(5,1,'admin','批量导入测试用例','测试管理','com.rd.platform.service.controller.TestCaseController.importTestCases','/api/v1/test-cases/import',NULL,'0:0:0:0:0:0:0:1',NULL,NULL,1,NULL,47,'2026-07-03 09:43:50'),(6,1,'admin','批量导入需求','需求管理','com.rd.platform.service.controller.RequirementController.importRequirements','/api/v1/requirements/import',NULL,'18.142.140.16, 172.16.1.62, 10.195.107.1',NULL,NULL,1,NULL,31,'2026-07-03 09:46:04'),(7,1,'admin','批量导入测试用例','测试管理','com.rd.platform.service.controller.TestCaseController.importTestCases','/api/v1/test-cases/import',NULL,'18.142.140.16, 172.16.1.62, 10.195.107.1',NULL,NULL,1,NULL,19,'2026-07-03 09:47:15'),(8,1,'admin','新增角色','角色管理','com.rd.platform.service.controller.RoleController.create','/api/v1/roles',NULL,'54.169.177.212, 172.16.0.188, 10.229.48.1',NULL,NULL,1,NULL,15,'2026-07-16 06:00:39'),(9,1,'admin','分配权限','角色管理','com.rd.platform.service.controller.RoleController.assignPermissions','/api/v1/roles/6/permissions',NULL,'54.169.177.212, 172.16.0.188, 10.229.48.1',NULL,NULL,1,NULL,13,'2026-07-16 06:01:15'),(10,1,'admin','删除用户','用户管理','com.rd.platform.service.controller.UserController.deleteUser','/api/v1/users/1',NULL,'0:0:0:0:0:0:0:1',NULL,NULL,0,'不能删除当前登录用户',14,'2026-07-16 06:12:02'),(11,1,'admin','创建需求','需求管理','com.rd.platform.service.controller.RequirementController.create','/api/v1/requirements','{\"request\":{\"projectId\":1,\"title\":\"测试审计日志详情记录\",\"type\":\"feature\",\"priority\":\"P1\",\"acceptanceCriteria\":\"审计日志能记录详情\",\"ownerId\":1,\"expectedCompletionDate\":[2026,8,1]}}','0:0:0:0:0:0:0:1',NULL,NULL,0,'验收标准(AC)必须采用 Given-When-Then 三段式结构描述',23,'2026-07-16 07:18:32'),(12,1,'admin','创建需求','需求管理','com.rd.platform.service.controller.RequirementController.create','/api/v1/requirements','{\"request\":{\"projectId\":1,\"title\":\"测试审计日志详情记录\",\"type\":\"feature\",\"priority\":\"P1\",\"acceptanceCriteria\":\"Given 用户执行操作\\nWhen 审计日志记录\\nThen 能看到详细操作内容\",\"ownerId\":1,\"expectedCompletionDate\":[2026,8,1]}}','0:0:0:0:0:0:0:1',NULL,NULL,0,'业务价值为必填项(标准档)',10,'2026-07-16 07:18:42'),(13,1,'admin','修改角色','角色管理','com.rd.platform.service.controller.RoleController.update','/api/v1/roles/2','{\"id\":2,\"request\":{\"roleCode\":\"pm\",\"roleName\":\"产品经理(高级)\",\"description\":\"负责产品规划和需求管理\",\"sortOrder\":2}}','0:0:0:0:0:0:0:1','{\"id\":2,\"roleCode\":\"pm\",\"roleName\":\"产品经理\",\"description\":\"需求管理、变更管理\",\"sortOrder\":2,\"status\":1,\"createdAt\":[2026,7,3,9,16,20],\"updatedAt\":[2026,7,3,9,16,20]}','{\"id\":2,\"roleCode\":\"pm\",\"roleName\":\"产品经理(高级)\",\"description\":\"负责产品规划和需求管理\",\"sortOrder\":2,\"status\":1,\"createdAt\":[2026,7,3,9,16,20],\"updatedAt\":[2026,7,3,9,16,20]}',1,NULL,21,'2026-07-16 07:19:25'),(14,1,'admin','修改角色','角色管理','com.rd.platform.service.controller.RoleController.update','/api/v1/roles/2','{\"id\":2,\"request\":{\"roleCode\":\"pm\",\"roleName\":\"产品经理\",\"description\":\"需求管理、变更管理\",\"sortOrder\":2}}','0:0:0:0:0:0:0:1','{\"id\":2,\"roleCode\":\"pm\",\"roleName\":\"产品经理(高级)\",\"description\":\"负责产品规划和需求管理\",\"sortOrder\":2,\"status\":1,\"createdAt\":[2026,7,3,9,16,20],\"updatedAt\":[2026,7,3,9,16,20]}','{\"id\":2,\"roleCode\":\"pm\",\"roleName\":\"产品经理\",\"description\":\"需求管理、变更管理\",\"sortOrder\":2,\"status\":1,\"createdAt\":[2026,7,3,9,16,20],\"updatedAt\":[2026,7,3,9,16,20]}',1,NULL,10,'2026-07-16 07:19:39'),(15,1,'admin','创建迭代','项目管理','com.rd.platform.service.controller.ProjectController.createSprint','/api/v1/projects/1/sprints','{\"projectId\":1,\"request\":{\"sprintName\":\"Sprint 2026-W29\",\"goal\":\"完成审计日志增强\",\"startDate\":[2026,7,14],\"endDate\":[2026,7,28]}}','0:0:0:0:0:0:0:1',NULL,'{\"id\":1,\"projectId\":1,\"sprintName\":\"Sprint 2026-W29\",\"goal\":\"完成审计日志增强\",\"status\":\"NOT_STARTED\",\"type\":\"NORMAL\",\"startDate\":[2026,7,14],\"endDate\":[2026,7,28],\"createdBy\":1}',1,NULL,10,'2026-07-16 07:24:25'),(16,1,'admin','创建迭代','迭代管理','com.rd.platform.service.controller.SprintController.create','/api/v1/sprints','{\"request\":{\"projectId\":1,\"sprintName\":\"Sprint 2026-W30\",\"goal\":\"完成知识库公共私人区域功能\",\"startDate\":[2026,7,21],\"endDate\":[2026,8,4]}}','18.142.183.54',NULL,'{\"id\":2,\"projectId\":1,\"sprintName\":\"Sprint 2026-W30\",\"goal\":\"完成知识库公共私人区域功能\",\"status\":\"PLANNING\",\"type\":\"NORMAL\",\"startDate\":[2026,7,21],\"endDate\":[2026,8,4],\"createdBy\":1}',1,NULL,4,'2026-07-16 07:25:07'),(17,3,'lisi','创建迭代','项目管理','com.rd.platform.service.controller.ProjectController.createSprint','/api/v1/projects/1/sprints','{\"projectId\":1,\"request\":{\"sprintName\":\"Sprint Test PM\",\"goal\":\"测试产品经理创建迭代\",\"startDate\":[2026,7,21],\"endDate\":[2026,8,4]}}','0:0:0:0:0:0:0:1',NULL,'{\"id\":3,\"projectId\":1,\"sprintName\":\"Sprint Test PM\",\"goal\":\"测试产品经理创建迭代\",\"status\":\"NOT_STARTED\",\"type\":\"NORMAL\",\"startDate\":[2026,7,21],\"endDate\":[2026,8,4],\"createdBy\":3}',1,NULL,8,'2026-07-16 08:06:00'),(18,3,'lisi','创建迭代','迭代管理','com.rd.platform.service.controller.SprintController.create','/api/v1/sprints','{\"request\":{\"projectId\":1,\"sprintName\":\"Sprint PM Test\",\"goal\":\"\",\"startDate\":[2026,8,1],\"endDate\":[2026,8,15]}}','54.169.177.212',NULL,'{\"id\":4,\"projectId\":1,\"sprintName\":\"Sprint PM Test\",\"goal\":\"\",\"status\":\"PLANNING\",\"type\":\"NORMAL\",\"startDate\":[2026,8,1],\"endDate\":[2026,8,15],\"createdBy\":3}',1,NULL,4,'2026-07-16 08:07:06'),(19,1,'admin','删除用户','用户管理','com.rd.platform.service.controller.UserController.deleteUser','/api/v1/users/3','{\"id\":3}','114.255.155.226','{\"id\":3,\"username\":\"lisi\",\"password\":\"$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi\",\"nickname\":\"李四(技术负责人)\",\"email\":\"lisi@taiyi.com\",\"status\":1,\"isFirstLogin\":0,\"lastLoginTime\":[2026,7,16,8,6,53],\"createdAt\":[2026,7,3,9,16,20],\"updatedAt\":[2026,7,3,9,16,20],\"deleted\":0}',NULL,1,NULL,13,'2026-07-16 08:07:10'),(20,2,'zhangsan','创建迭代','迭代管理','com.rd.platform.service.controller.SprintController.create','/api/v1/sprints','{\"request\":{\"projectId\":1,\"sprintName\":\"123\",\"goal\":\"123\",\"startDate\":[2026,7,30],\"endDate\":[2026,7,31]}}','114.255.155.226',NULL,'{\"id\":5,\"projectId\":1,\"sprintName\":\"123\",\"goal\":\"123\",\"status\":\"PLANNING\",\"type\":\"NORMAL\",\"startDate\":[2026,7,30],\"endDate\":[2026,7,31],\"createdBy\":2}',1,NULL,4,'2026-07-16 08:07:41'),(21,1,'admin','删除用户','用户管理','com.rd.platform.service.controller.UserController.deleteUser','/api/v1/users/3','{\"id\":3}','0:0:0:0:0:0:0:1','{\"id\":3,\"username\":\"lisi\",\"password\":\"$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi\",\"nickname\":\"李四(技术负责人)\",\"email\":\"lisi@taiyi.com\",\"status\":0,\"isFirstLogin\":0,\"lastLoginTime\":[2026,7,16,8,6,53],\"createdAt\":[2026,7,3,9,16,20],\"updatedAt\":[2026,7,3,9,16,20],\"deleted\":0}',NULL,1,NULL,18,'2026-07-16 08:10:17'),(22,1,'admin','删除用户','用户管理','com.rd.platform.service.controller.UserController.deleteUser','/api/v1/users/3','{\"id\":3}','0:0:0:0:0:0:0:1','{\"id\":3,\"username\":\"lisi\",\"password\":\"$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi\",\"nickname\":\"李四(技术负责人)\",\"email\":\"lisi@taiyi.com\",\"status\":1,\"isFirstLogin\":0,\"lastLoginTime\":[2026,7,16,8,6,53],\"createdAt\":[2026,7,3,9,16,20],\"updatedAt\":[2026,7,16,8,10,54],\"deleted\":0}',NULL,1,NULL,22,'2026-07-16 08:12:12'),(23,1,'admin','分配权限','角色管理','com.rd.platform.service.controller.RoleController.assignPermissions','/api/v1/roles/4/permissions','{\"id\":4,\"request\":{\"permissionIds\":[1,29,22,30,24,4,6,8,21,9,11]}}','0:0:0:0:0:0:0:1','{\"id\":4,\"roleCode\":\"dev\",\"roleName\":\"开发人员\",\"description\":\"任务执行、代码开发\",\"sortOrder\":3,\"status\":1,\"createdAt\":[2026,7,3,9,16,20],\"updatedAt\":[2026,7,16,5,49,35]}','{\"id\":4,\"roleCode\":\"dev\",\"roleName\":\"开发人员\",\"description\":\"任务执行、代码开发\",\"sortOrder\":3,\"status\":1,\"createdAt\":[2026,7,3,9,16,20],\"updatedAt\":[2026,7,16,5,49,35]}',1,NULL,43,'2026-07-16 09:03:35'),(24,1,'admin','分配权限','角色管理','com.rd.platform.service.controller.RoleController.assignPermissions','/api/v1/roles/4/permissions','{\"id\":4,\"request\":{\"permissionIds\":[1,29,30,24,4,6,8,21,9,11]}}','0:0:0:0:0:0:0:1','{\"id\":4,\"roleCode\":\"dev\",\"roleName\":\"开发人员\",\"description\":\"任务执行、代码开发\",\"sortOrder\":3,\"status\":1,\"createdAt\":[2026,7,3,9,16,20],\"updatedAt\":[2026,7,16,5,49,35]}','{\"id\":4,\"roleCode\":\"dev\",\"roleName\":\"开发人员\",\"description\":\"任务执行、代码开发\",\"sortOrder\":3,\"status\":1,\"createdAt\":[2026,7,3,9,16,20],\"updatedAt\":[2026,7,16,5,49,35]}',1,NULL,26,'2026-07-16 09:03:48'),(25,5,'zhaoliu','提交缺陷','缺陷管理','com.rd.platform.service.controller.BugController.create','/api/v1/bugs','{\"request\":{\"projectId\":1,\"title\":\"验证流转-测试Bug\",\"description\":\"复现步骤\",\"expectedResult\":\"正确\",\"actualResult\":\"错误\",\"severity\":\"MAJOR\",\"priority\":\"MEDIUM\",\"moduleName\":\"测试模块\",\"assigneeId\":4}}','0:0:0:0:0:0:0:1',NULL,'{\"id\":1,\"projectId\":1,\"title\":\"验证流转-测试Bug\",\"description\":\"复现步骤\",\"expectedResult\":\"正确\",\"actualResult\":\"错误\",\"severity\":\"MAJOR\",\"priority\":\"MEDIUM\",\"moduleName\":\"测试模块\",\"status\":\"OPEN\",\"reporterId\":5,\"assigneeId\":4}',1,NULL,252,'2026-07-17 06:56:49'),(26,5,'zhaoliu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/1/status','{\"id\":1,\"request\":{\"status\":\"CONFIRMED\"}}','0:0:0:0:0:0:0:1','{\"id\":1,\"projectId\":1,\"title\":\"验证流转-测试Bug\",\"description\":\"复现步骤\",\"expectedResult\":\"正确\",\"actualResult\":\"错误\",\"severity\":\"MAJOR\",\"priority\":\"MEDIUM\",\"moduleName\":\"测试模块\",\"status\":\"OPEN\",\"reporterId\":5,\"assigneeId\":4,\"createdAt\":[2026,7,17,6,56,48],\"updatedAt\":[2026,7,17,6,56,48],\"deleted\":0}','{\"id\":1,\"projectId\":1,\"title\":\"验证流转-测试Bug\",\"description\":\"复现步骤\",\"expectedResult\":\"正确\",\"actualResult\":\"错误\",\"severity\":\"MAJOR\",\"priority\":\"MEDIUM\",\"moduleName\":\"测试模块\",\"status\":\"CONFIRMED\",\"reporterId\":5,\"assigneeId\":4,\"confirmedAt\":[2026,7,17,6,56,49],\"createdAt\":[2026,7,17,6,56,48],\"updatedAt\":[2026,7,17,6,56,48],\"deleted\":0}',1,NULL,49,'2026-07-17 06:56:49'),(27,4,'wangwu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/1/status','{\"id\":1,\"request\":{\"status\":\"FIXING\"}}','0:0:0:0:0:0:0:1','{\"id\":1,\"projectId\":1,\"title\":\"验证流转-测试Bug\",\"description\":\"复现步骤\",\"expectedResult\":\"正确\",\"actualResult\":\"错误\",\"severity\":\"MAJOR\",\"priority\":\"MEDIUM\",\"moduleName\":\"测试模块\",\"status\":\"CONFIRMED\",\"reporterId\":5,\"assigneeId\":4,\"confirmedAt\":[2026,7,17,6,56,49],\"createdAt\":[2026,7,17,6,56,48],\"updatedAt\":[2026,7,17,6,56,48],\"deleted\":0}','{\"id\":1,\"projectId\":1,\"title\":\"验证流转-测试Bug\",\"description\":\"复现步骤\",\"expectedResult\":\"正确\",\"actualResult\":\"错误\",\"severity\":\"MAJOR\",\"priority\":\"MEDIUM\",\"moduleName\":\"测试模块\",\"status\":\"FIXING\",\"reporterId\":5,\"assigneeId\":4,\"confirmedAt\":[2026,7,17,6,56,49],\"createdAt\":[2026,7,17,6,56,48],\"updatedAt\":[2026,7,17,6,56,48],\"deleted\":0}',1,NULL,27,'2026-07-17 06:56:49'),(28,4,'wangwu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/1/status','{\"id\":1,\"request\":{\"status\":\"FIXED\",\"rootCause\":\"代码逻辑错误\",\"introducePhase\":\"开发\"}}','0:0:0:0:0:0:0:1','{\"id\":1,\"projectId\":1,\"title\":\"验证流转-测试Bug\",\"description\":\"复现步骤\",\"expectedResult\":\"正确\",\"actualResult\":\"错误\",\"severity\":\"MAJOR\",\"priority\":\"MEDIUM\",\"moduleName\":\"测试模块\",\"status\":\"FIXING\",\"reporterId\":5,\"assigneeId\":4,\"confirmedAt\":[2026,7,17,6,56,49],\"createdAt\":[2026,7,17,6,56,48],\"updatedAt\":[2026,7,17,6,56,48],\"deleted\":0}','{\"id\":1,\"projectId\":1,\"title\":\"验证流转-测试Bug\",\"description\":\"复现步骤\",\"expectedResult\":\"正确\",\"actualResult\":\"错误\",\"severity\":\"MAJOR\",\"priority\":\"MEDIUM\",\"moduleName\":\"测试模块\",\"status\":\"FIXED\",\"reporterId\":5,\"assigneeId\":4,\"fixerId\":4,\"rootCause\":\"代码逻辑错误\",\"introducePhase\":\"开发\",\"confirmedAt\":[2026,7,17,6,56,49],\"fixedAt\":[2026,7,17,6,56,49],\"createdAt\":[2026,7,17,6,56,48],\"updatedAt\":[2026,7,17,6,56,48],\"deleted\":0}',1,NULL,32,'2026-07-17 06:56:49'),(29,5,'zhaoliu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/1/status','{\"id\":1,\"request\":{\"status\":\"VERIFIED\"}}','0:0:0:0:0:0:0:1','{\"id\":1,\"projectId\":1,\"title\":\"验证流转-测试Bug\",\"description\":\"复现步骤\",\"expectedResult\":\"正确\",\"actualResult\":\"错误\",\"severity\":\"MAJOR\",\"priority\":\"MEDIUM\",\"moduleName\":\"测试模块\",\"status\":\"FIXED\",\"reporterId\":5,\"assigneeId\":4,\"fixerId\":4,\"rootCause\":\"代码逻辑错误\",\"introducePhase\":\"开发\",\"confirmedAt\":[2026,7,17,6,56,49],\"fixedAt\":[2026,7,17,6,56,49],\"createdAt\":[2026,7,17,6,56,48],\"updatedAt\":[2026,7,17,6,56,48],\"deleted\":0}','{\"id\":1,\"projectId\":1,\"title\":\"验证流转-测试Bug\",\"description\":\"复现步骤\",\"expectedResult\":\"正确\",\"actualResult\":\"错误\",\"severity\":\"MAJOR\",\"priority\":\"MEDIUM\",\"moduleName\":\"测试模块\",\"status\":\"VERIFIED\",\"reporterId\":5,\"assigneeId\":4,\"fixerId\":4,\"rootCause\":\"代码逻辑错误\",\"introducePhase\":\"开发\",\"confirmedAt\":[2026,7,17,6,56,49],\"fixedAt\":[2026,7,17,6,56,49],\"createdAt\":[2026,7,17,6,56,48],\"updatedAt\":[2026,7,17,6,56,48],\"deleted\":0}',1,NULL,31,'2026-07-17 06:56:49'),(30,5,'zhaoliu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/1/status','{\"id\":1,\"request\":{\"status\":\"CLOSED\"}}','0:0:0:0:0:0:0:1','{\"id\":1,\"projectId\":1,\"title\":\"验证流转-测试Bug\",\"description\":\"复现步骤\",\"expectedResult\":\"正确\",\"actualResult\":\"错误\",\"severity\":\"MAJOR\",\"priority\":\"MEDIUM\",\"moduleName\":\"测试模块\",\"status\":\"VERIFIED\",\"reporterId\":5,\"assigneeId\":4,\"fixerId\":4,\"rootCause\":\"代码逻辑错误\",\"introducePhase\":\"开发\",\"confirmedAt\":[2026,7,17,6,56,49],\"fixedAt\":[2026,7,17,6,56,49],\"createdAt\":[2026,7,17,6,56,48],\"updatedAt\":[2026,7,17,6,56,48],\"deleted\":0}','{\"id\":1,\"projectId\":1,\"title\":\"验证流转-测试Bug\",\"description\":\"复现步骤\",\"expectedResult\":\"正确\",\"actualResult\":\"错误\",\"severity\":\"MAJOR\",\"priority\":\"MEDIUM\",\"moduleName\":\"测试模块\",\"status\":\"CLOSED\",\"reporterId\":5,\"assigneeId\":4,\"fixerId\":4,\"rootCause\":\"代码逻辑错误\",\"introducePhase\":\"开发\",\"confirmedAt\":[2026,7,17,6,56,49],\"fixedAt\":[2026,7,17,6,56,49],\"closedAt\":[2026,7,17,6,56,50],\"createdAt\":[2026,7,17,6,56,48],\"updatedAt\":[2026,7,17,6,56,48],\"deleted\":0}',1,NULL,30,'2026-07-17 06:56:49'),(31,4,'wangwu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/1/status','{\"id\":1,\"request\":{\"status\":\"CONFIRMED\"}}','0:0:0:0:0:0:0:1','{\"id\":1,\"projectId\":1,\"title\":\"验证流转-测试Bug\",\"description\":\"复现步骤\",\"expectedResult\":\"正确\",\"actualResult\":\"错误\",\"severity\":\"MAJOR\",\"priority\":\"MEDIUM\",\"moduleName\":\"测试模块\",\"status\":\"CLOSED\",\"reporterId\":5,\"assigneeId\":4,\"fixerId\":4,\"rootCause\":\"代码逻辑错误\",\"introducePhase\":\"开发\",\"confirmedAt\":[2026,7,17,6,56,49],\"fixedAt\":[2026,7,17,6,56,49],\"closedAt\":[2026,7,17,6,56,50],\"createdAt\":[2026,7,17,6,56,48],\"updatedAt\":[2026,7,17,6,56,48],\"deleted\":0}',NULL,0,'不允许的状态转换: CLOSED -> CONFIRMED',5,'2026-07-17 06:56:49'),(32,2,'zhangsan','审批提测','提测管理','com.rd.platform.service.controller.SubmitTestController.approve','/api/v1/submit-tests/1/approve','{\"id\":1}','0:0:0:0:0:0:0:1',NULL,NULL,1,NULL,7,'2026-07-17 06:56:49'),(33,2,'zhangsan','提交变更申请','变更管理','com.rd.platform.service.controller.ChangeRequestController.create','/api/v1/change-requests','{\"request\":{\"requirementId\":1,\"projectId\":1,\"changeContent\":\"验证双重审批\",\"changeReason\":\"测试需要\",\"impactScope\":\"无影响\"}}','0:0:0:0:0:0:0:1',NULL,'{\"id\":1,\"requirementId\":1,\"projectId\":1,\"changeContent\":\"验证双重审批\",\"changeReason\":\"测试需要\",\"impactScope\":\"无影响\",\"status\":\"PENDING\",\"applicantId\":2}',1,NULL,34,'2026-07-17 06:56:49'),(34,3,'lisi','审批变更','变更管理','com.rd.platform.service.controller.ChangeRequestController.approve','/api/v1/change-requests/1/approve','{\"id\":1}','0:0:0:0:0:0:0:1','{\"id\":1,\"requirementId\":1,\"projectId\":1,\"changeContent\":\"验证双重审批\",\"changeReason\":\"测试需要\",\"impactScope\":\"无影响\",\"status\":\"PENDING\",\"applicantId\":2,\"createdAt\":[2026,7,17,6,56,49],\"updatedAt\":[2026,7,17,6,56,49]}','{\"id\":1,\"requirementId\":1,\"projectId\":1,\"changeContent\":\"验证双重审批\",\"changeReason\":\"测试需要\",\"impactScope\":\"无影响\",\"status\":\"TL_APPROVED\",\"applicantId\":2,\"approverId\":3,\"createdAt\":[2026,7,17,6,56,49],\"updatedAt\":[2026,7,17,6,56,49]}',1,NULL,21,'2026-07-17 06:56:49'),(35,1,'admin','审批变更','变更管理','com.rd.platform.service.controller.ChangeRequestController.approve','/api/v1/change-requests/1/approve','{\"id\":1}','0:0:0:0:0:0:0:1','{\"id\":1,\"requirementId\":1,\"projectId\":1,\"changeContent\":\"验证双重审批\",\"changeReason\":\"测试需要\",\"impactScope\":\"无影响\",\"status\":\"TL_APPROVED\",\"applicantId\":2,\"approverId\":3,\"createdAt\":[2026,7,17,6,56,49],\"updatedAt\":[2026,7,17,6,56,49]}','{\"id\":1,\"requirementId\":1,\"projectId\":1,\"changeContent\":\"验证双重审批\",\"changeReason\":\"测试需要\",\"impactScope\":\"无影响\",\"status\":\"APPROVED\",\"applicantId\":2,\"approverId\":3,\"approvedAt\":[2026,7,17,6,56,50],\"createdAt\":[2026,7,17,6,56,49],\"updatedAt\":[2026,7,17,6,56,49]}',1,NULL,14,'2026-07-17 06:56:49'),(36,2,'zhangsan','创建需求','需求管理','com.rd.platform.service.controller.RequirementController.create','/api/v1/requirements','{\"request\":{\"projectId\":1,\"title\":\"验证流转-测试需求\",\"type\":\"FUNCTIONAL\",\"priority\":\"HIGH\",\"description\":\"全链路测试\",\"acceptanceCriteria\":\"Given 用户登录\\nWhen 点击按钮\\nThen 显示结果\",\"ownerId\":2,\"expectedCompletionDate\":[2026,8,1]}}','0:0:0:0:0:0:0:1',NULL,NULL,0,'业务价值为必填项(标准档)',36,'2026-07-17 06:58:19'),(37,2,'zhangsan','创建需求','需求管理','com.rd.platform.service.controller.RequirementController.create','/api/v1/requirements','{\"request\":{\"projectId\":1,\"title\":\"验证流转-测试需求\",\"type\":\"FUNCTIONAL\",\"priority\":\"HIGH\",\"description\":\"全链路测试\",\"acceptanceCriteria\":\"Given 用户登录\\nWhen 点击按钮\\nThen 显示结果\",\"businessValue\":\"提升用户体验\",\"ownerId\":2,\"expectedCompletionDate\":[2026,8,1]}}','0:0:0:0:0:0:0:1',NULL,'{\"id\":3,\"projectId\":1,\"title\":\"验证流转-测试需求\",\"type\":\"FUNCTIONAL\",\"priority\":\"HIGH\",\"status\":\"DRAFT\",\"description\":\"全链路测试\",\"acceptanceCriteria\":\"Given 用户登录\\nWhen 点击按钮\\nThen 显示结果\",\"businessValue\":\"提升用户体验\",\"ownerId\":2,\"createdBy\":2,\"expectedCompletionDate\":[2026,8,1],\"isFastTrack\":0,\"fastTrackViolated\":0,\"version\":1}',1,NULL,33,'2026-07-17 06:58:27'),(38,2,'zhangsan','提交评审','需求管理','com.rd.platform.service.controller.RequirementController.submitReview','/api/v1/requirements/3/submit-review','{\"id\":3,\"request\":{\"reviewerIds\":[3]}}','0:0:0:0:0:0:0:1',NULL,NULL,1,NULL,15,'2026-07-17 06:59:03'),(39,3,'lisi','评审需求','需求管理','com.rd.platform.service.controller.RequirementController.review','/api/v1/requirements/3/review','{\"id\":3,\"request\":{\"comment\":\"评审通过\"}}','0:0:0:0:0:0:0:1',NULL,NULL,1,NULL,13,'2026-07-17 06:59:03'),(40,4,'wangwu','变更需求状态','需求管理','com.rd.platform.service.controller.RequirementController.changeStatus','/api/v1/requirements/3/status','{\"id\":3,\"request\":{\"status\":\"DEVELOPING\"}}','0:0:0:0:0:0:0:1','{\"id\":3,\"projectId\":1,\"title\":\"验证流转-测试需求\",\"type\":\"FUNCTIONAL\",\"priority\":\"HIGH\",\"status\":\"APPROVED\",\"description\":\"全链路测试\",\"acceptanceCriteria\":\"Given 用户登录\\nWhen 点击按钮\\nThen 显示结果\",\"businessValue\":\"提升用户体验\",\"ownerId\":2,\"createdBy\":2,\"expectedCompletionDate\":[2026,8,1],\"isFastTrack\":0,\"fastTrackViolated\":0,\"version\":1,\"createdAt\":[2026,7,17,6,58,27],\"updatedAt\":[2026,7,17,6,59,14],\"deleted\":0}',NULL,0,'非法的状态流转：APPROVED → DEVELOPING，禁止越级跳转',5,'2026-07-17 06:59:14'),(41,4,'wangwu','变更需求状态','需求管理','com.rd.platform.service.controller.RequirementController.changeStatus','/api/v1/requirements/3/status','{\"id\":3,\"request\":{\"status\":\"DEVELOPED\"}}','0:0:0:0:0:0:0:1','{\"id\":3,\"projectId\":1,\"title\":\"验证流转-测试需求\",\"type\":\"FUNCTIONAL\",\"priority\":\"HIGH\",\"status\":\"APPROVED\",\"description\":\"全链路测试\",\"acceptanceCriteria\":\"Given 用户登录\\nWhen 点击按钮\\nThen 显示结果\",\"businessValue\":\"提升用户体验\",\"ownerId\":2,\"createdBy\":2,\"expectedCompletionDate\":[2026,8,1],\"isFastTrack\":0,\"fastTrackViolated\":0,\"version\":1,\"createdAt\":[2026,7,17,6,58,27],\"updatedAt\":[2026,7,17,6,59,14],\"deleted\":0}',NULL,0,'非法的状态流转：APPROVED → DEVELOPED，禁止越级跳转',5,'2026-07-17 06:59:14'),(42,3,'lisi','评审需求','需求管理','com.rd.platform.service.controller.RequirementController.review','/api/v1/requirements/3/review','{\"id\":3,\"request\":{\"result\":\"APPROVED\",\"comment\":\"评审通过\"}}','0:0:0:0:0:0:0:1',NULL,NULL,1,NULL,18,'2026-07-17 07:00:13'),(43,4,'wangwu','标记开发完成','需求管理','com.rd.platform.service.controller.RequirementController.markDeveloped','/api/v1/requirements/3/mark-developed','{\"id\":3}','0:0:0:0:0:0:0:1',NULL,NULL,1,NULL,11,'2026-07-17 07:00:25'),(44,2,'zhangsan','变更需求状态','需求管理','com.rd.platform.service.controller.RequirementController.changeStatus','/api/v1/requirements/3/status','{\"id\":3,\"request\":{\"status\":\"RELEASING\"}}','0:0:0:0:0:0:0:1','{\"id\":3,\"projectId\":1,\"title\":\"验证流转-测试需求\",\"type\":\"FUNCTIONAL\",\"priority\":\"HIGH\",\"status\":\"TESTED\",\"description\":\"全链路测试\",\"acceptanceCriteria\":\"Given 用户登录\\nWhen 点击按钮\\nThen 显示结果\",\"businessValue\":\"提升用户体验\",\"ownerId\":2,\"createdBy\":2,\"expectedCompletionDate\":[2026,8,1],\"isFastTrack\":0,\"fastTrackViolated\":0,\"version\":1,\"createdAt\":[2026,7,17,6,58,27],\"updatedAt\":[2026,7,17,7,0,25],\"deleted\":0}','{\"id\":3,\"projectId\":1,\"title\":\"验证流转-测试需求\",\"type\":\"FUNCTIONAL\",\"priority\":\"HIGH\",\"status\":\"RELEASING\",\"description\":\"全链路测试\",\"acceptanceCriteria\":\"Given 用户登录\\nWhen 点击按钮\\nThen 显示结果\",\"businessValue\":\"提升用户体验\",\"ownerId\":2,\"createdBy\":2,\"expectedCompletionDate\":[2026,8,1],\"isFastTrack\":0,\"fastTrackViolated\":0,\"version\":1,\"createdAt\":[2026,7,17,6,58,27],\"updatedAt\":[2026,7,17,7,0,25],\"deleted\":0}',1,NULL,26,'2026-07-17 07:00:25'),(45,2,'zhangsan','变更需求状态','需求管理','com.rd.platform.service.controller.RequirementController.changeStatus','/api/v1/requirements/3/status','{\"id\":3,\"request\":{\"status\":\"CLOSED\"}}','0:0:0:0:0:0:0:1','{\"id\":3,\"projectId\":1,\"title\":\"验证流转-测试需求\",\"type\":\"FUNCTIONAL\",\"priority\":\"HIGH\",\"status\":\"RELEASING\",\"description\":\"全链路测试\",\"acceptanceCriteria\":\"Given 用户登录\\nWhen 点击按钮\\nThen 显示结果\",\"businessValue\":\"提升用户体验\",\"ownerId\":2,\"createdBy\":2,\"expectedCompletionDate\":[2026,8,1],\"isFastTrack\":0,\"fastTrackViolated\":0,\"version\":1,\"createdAt\":[2026,7,17,6,58,27],\"updatedAt\":[2026,7,17,7,0,25],\"deleted\":0}','{\"id\":3,\"projectId\":1,\"title\":\"验证流转-测试需求\",\"type\":\"FUNCTIONAL\",\"priority\":\"HIGH\",\"status\":\"CLOSED\",\"description\":\"全链路测试\",\"acceptanceCriteria\":\"Given 用户登录\\nWhen 点击按钮\\nThen 显示结果\",\"businessValue\":\"提升用户体验\",\"ownerId\":2,\"createdBy\":2,\"expectedCompletionDate\":[2026,8,1],\"isFastTrack\":0,\"fastTrackViolated\":0,\"version\":1,\"createdAt\":[2026,7,17,6,58,27],\"updatedAt\":[2026,7,17,7,0,25],\"deleted\":0}',1,NULL,27,'2026-07-17 07:00:26'),(46,4,'wangwu','创建任务','任务管理','com.rd.platform.service.controller.TaskController.create','/api/v1/tasks','{\"request\":{\"requirementId\":3,\"projectId\":1,\"taskName\":\"验证流转-开发任务\",\"description\":\"全链路测试\",\"priority\":\"HIGH\",\"assigneeId\":4,\"dueDate\":[2026,8,1]}}','0:0:0:0:0:0:0:1',NULL,NULL,0,'只有产品经理可以拆解任务',16,'2026-07-17 07:00:38'),(47,2,'zhangsan','创建任务','任务管理','com.rd.platform.service.controller.TaskController.create','/api/v1/tasks','{\"request\":{\"requirementId\":3,\"projectId\":1,\"taskName\":\"验证流转-开发任务\",\"description\":\"全链路测试\",\"priority\":\"HIGH\",\"assigneeId\":4,\"dueDate\":[2026,8,1]}}','0:0:0:0:0:0:0:1',NULL,'{\"id\":1,\"requirementId\":3,\"projectId\":1,\"taskName\":\"验证流转-开发任务\",\"description\":\"全链路测试\",\"status\":\"TODO\",\"priority\":\"HIGH\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0,\"dueDate\":[2026,8,1]}',1,NULL,36,'2026-07-17 07:00:47'),(48,4,'wangwu','变更任务状态','任务管理','com.rd.platform.service.controller.TaskController.changeStatus','/api/v1/tasks/1/status','{\"id\":1,\"request\":{\"status\":\"IN_PROGRESS\"}}','0:0:0:0:0:0:0:1','{\"id\":1,\"requirementId\":3,\"projectId\":1,\"taskName\":\"验证流转-开发任务\",\"description\":\"全链路测试\",\"status\":\"TODO\",\"priority\":\"HIGH\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,0,47],\"updatedAt\":[2026,7,17,7,0,47],\"deleted\":0}','{\"id\":1,\"requirementId\":3,\"projectId\":1,\"taskName\":\"验证流转-开发任务\",\"description\":\"全链路测试\",\"status\":\"IN_PROGRESS\",\"priority\":\"HIGH\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,0,47],\"updatedAt\":[2026,7,17,7,0,47],\"deleted\":0}',1,NULL,9,'2026-07-17 07:00:47'),(49,4,'wangwu','变更任务状态','任务管理','com.rd.platform.service.controller.TaskController.changeStatus','/api/v1/tasks/1/status','{\"id\":1,\"request\":{\"status\":\"SELF_TESTING\"}}','0:0:0:0:0:0:0:1','{\"id\":1,\"requirementId\":3,\"projectId\":1,\"taskName\":\"验证流转-开发任务\",\"description\":\"全链路测试\",\"status\":\"IN_PROGRESS\",\"priority\":\"HIGH\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,0,47],\"updatedAt\":[2026,7,17,7,0,47],\"deleted\":0}','{\"id\":1,\"requirementId\":3,\"projectId\":1,\"taskName\":\"验证流转-开发任务\",\"description\":\"全链路测试\",\"status\":\"SELF_TESTING\",\"priority\":\"HIGH\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,0,47],\"updatedAt\":[2026,7,17,7,0,47],\"deleted\":0}',1,NULL,4,'2026-07-17 07:00:47'),(50,4,'wangwu','变更任务状态','任务管理','com.rd.platform.service.controller.TaskController.changeStatus','/api/v1/tasks/1/status','{\"id\":1,\"request\":{\"status\":\"DONE\"}}','0:0:0:0:0:0:0:1','{\"id\":1,\"requirementId\":3,\"projectId\":1,\"taskName\":\"验证流转-开发任务\",\"description\":\"全链路测试\",\"status\":\"SELF_TESTING\",\"priority\":\"HIGH\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,0,47],\"updatedAt\":[2026,7,17,7,0,47],\"deleted\":0}',NULL,0,'不允许的状态转换: SELF_TESTING -> DONE',4,'2026-07-17 07:00:47'),(51,4,'wangwu','变更任务状态','任务管理','com.rd.platform.service.controller.TaskController.changeStatus','/api/v1/tasks/1/status','{\"id\":1,\"request\":{\"status\":\"TESTING\"}}','0:0:0:0:0:0:0:1','{\"id\":1,\"requirementId\":3,\"projectId\":1,\"taskName\":\"验证流转-开发任务\",\"description\":\"全链路测试\",\"status\":\"SELF_TESTING\",\"priority\":\"HIGH\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,0,47],\"updatedAt\":[2026,7,17,7,0,47],\"deleted\":0}','{\"id\":1,\"requirementId\":3,\"projectId\":1,\"taskName\":\"验证流转-开发任务\",\"description\":\"全链路测试\",\"status\":\"TESTING\",\"priority\":\"HIGH\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,0,47],\"updatedAt\":[2026,7,17,7,0,47],\"deleted\":0}',1,NULL,6,'2026-07-17 07:01:03'),(52,5,'zhaoliu','变更任务状态','任务管理','com.rd.platform.service.controller.TaskController.changeStatus','/api/v1/tasks/1/status','{\"id\":1,\"request\":{\"status\":\"DONE\"}}','0:0:0:0:0:0:0:1','{\"id\":1,\"requirementId\":3,\"projectId\":1,\"taskName\":\"验证流转-开发任务\",\"description\":\"全链路测试\",\"status\":\"TESTING\",\"priority\":\"HIGH\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,0,47],\"updatedAt\":[2026,7,17,7,0,47],\"deleted\":0}','{\"id\":1,\"requirementId\":3,\"projectId\":1,\"taskName\":\"验证流转-开发任务\",\"description\":\"全链路测试\",\"status\":\"DONE\",\"priority\":\"HIGH\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"completedAt\":[2026,7,17,7,1,4],\"createdAt\":[2026,7,17,7,0,47],\"updatedAt\":[2026,7,17,7,0,47],\"deleted\":0}',1,NULL,13,'2026-07-17 07:01:03'),(53,2,'zhangsan','创建任务','任务管理','com.rd.platform.service.controller.TaskController.create','/api/v1/tasks','{\"request\":{\"requirementId\":3,\"projectId\":1,\"taskName\":\"测试打回\",\"description\":\"测试\",\"priority\":\"MEDIUM\",\"assigneeId\":4,\"dueDate\":[2026,8,1]}}','0:0:0:0:0:0:0:1',NULL,'{\"id\":2,\"requirementId\":3,\"projectId\":1,\"taskName\":\"测试打回\",\"description\":\"测试\",\"status\":\"TODO\",\"priority\":\"MEDIUM\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0,\"dueDate\":[2026,8,1]}',1,NULL,27,'2026-07-17 07:01:16'),(54,4,'wangwu','变更任务状态','任务管理','com.rd.platform.service.controller.TaskController.changeStatus','/api/v1/tasks/2/status','{\"id\":2,\"request\":{\"status\":\"IN_PROGRESS\"}}','0:0:0:0:0:0:0:1','{\"id\":2,\"requirementId\":3,\"projectId\":1,\"taskName\":\"测试打回\",\"description\":\"测试\",\"status\":\"TODO\",\"priority\":\"MEDIUM\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,1,16],\"updatedAt\":[2026,7,17,7,1,16],\"deleted\":0}','{\"id\":2,\"requirementId\":3,\"projectId\":1,\"taskName\":\"测试打回\",\"description\":\"测试\",\"status\":\"IN_PROGRESS\",\"priority\":\"MEDIUM\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,1,16],\"updatedAt\":[2026,7,17,7,1,16],\"deleted\":0}',1,NULL,6,'2026-07-17 07:01:16'),(55,4,'wangwu','变更任务状态','任务管理','com.rd.platform.service.controller.TaskController.changeStatus','/api/v1/tasks/2/status','{\"id\":2,\"request\":{\"status\":\"SELF_TESTING\"}}','0:0:0:0:0:0:0:1','{\"id\":2,\"requirementId\":3,\"projectId\":1,\"taskName\":\"测试打回\",\"description\":\"测试\",\"status\":\"IN_PROGRESS\",\"priority\":\"MEDIUM\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,1,16],\"updatedAt\":[2026,7,17,7,1,16],\"deleted\":0}','{\"id\":2,\"requirementId\":3,\"projectId\":1,\"taskName\":\"测试打回\",\"description\":\"测试\",\"status\":\"SELF_TESTING\",\"priority\":\"MEDIUM\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,1,16],\"updatedAt\":[2026,7,17,7,1,16],\"deleted\":0}',1,NULL,7,'2026-07-17 07:01:16'),(56,4,'wangwu','变更任务状态','任务管理','com.rd.platform.service.controller.TaskController.changeStatus','/api/v1/tasks/2/status','{\"id\":2,\"request\":{\"status\":\"TESTING\"}}','0:0:0:0:0:0:0:1','{\"id\":2,\"requirementId\":3,\"projectId\":1,\"taskName\":\"测试打回\",\"description\":\"测试\",\"status\":\"SELF_TESTING\",\"priority\":\"MEDIUM\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,1,16],\"updatedAt\":[2026,7,17,7,1,16],\"deleted\":0}','{\"id\":2,\"requirementId\":3,\"projectId\":1,\"taskName\":\"测试打回\",\"description\":\"测试\",\"status\":\"TESTING\",\"priority\":\"MEDIUM\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,1,16],\"updatedAt\":[2026,7,17,7,1,16],\"deleted\":0}',1,NULL,6,'2026-07-17 07:01:16'),(57,4,'wangwu','变更任务状态','任务管理','com.rd.platform.service.controller.TaskController.changeStatus','/api/v1/tasks/2/status','{\"id\":2,\"request\":{\"status\":\"DONE\"}}','0:0:0:0:0:0:0:1','{\"id\":2,\"requirementId\":3,\"projectId\":1,\"taskName\":\"测试打回\",\"description\":\"测试\",\"status\":\"TESTING\",\"priority\":\"MEDIUM\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,1,16],\"updatedAt\":[2026,7,17,7,1,16],\"deleted\":0}',NULL,0,'只有测试人员才能验证任务测试结果',11,'2026-07-17 07:01:16'),(58,5,'zhaoliu','变更任务状态','任务管理','com.rd.platform.service.controller.TaskController.changeStatus','/api/v1/tasks/2/status','{\"id\":2,\"request\":{\"status\":\"IN_PROGRESS\"}}','0:0:0:0:0:0:0:1','{\"id\":2,\"requirementId\":3,\"projectId\":1,\"taskName\":\"测试打回\",\"description\":\"测试\",\"status\":\"TESTING\",\"priority\":\"MEDIUM\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,1,16],\"updatedAt\":[2026,7,17,7,1,16],\"deleted\":0}','{\"id\":2,\"requirementId\":3,\"projectId\":1,\"taskName\":\"测试打回\",\"description\":\"测试\",\"status\":\"IN_PROGRESS\",\"priority\":\"MEDIUM\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,1,16],\"updatedAt\":[2026,7,17,7,1,16],\"deleted\":0}',1,NULL,12,'2026-07-17 07:01:16'),(59,2,'zhangsan','提交变更申请','变更管理','com.rd.platform.service.controller.ChangeRequestController.create','/api/v1/change-requests','{\"request\":{\"requirementId\":3,\"projectId\":1,\"changeContent\":\"测试驳回流程\",\"changeReason\":\"验证驳回\",\"impactScope\":\"无影响\"}}','0:0:0:0:0:0:0:1',NULL,'{\"id\":2,\"requirementId\":3,\"projectId\":1,\"changeContent\":\"测试驳回流程\",\"changeReason\":\"验证驳回\",\"impactScope\":\"无影响\",\"status\":\"PENDING\",\"applicantId\":2}',1,NULL,16,'2026-07-17 07:01:27'),(60,3,'lisi','驳回变更','变更管理','com.rd.platform.service.controller.ChangeRequestController.reject','/api/v1/change-requests/2/reject','{\"id\":2,\"request\":{\"reason\":\"测试驳回原因说明\"}}','0:0:0:0:0:0:0:1','{\"id\":2,\"requirementId\":3,\"projectId\":1,\"changeContent\":\"测试驳回流程\",\"changeReason\":\"验证驳回\",\"impactScope\":\"无影响\",\"status\":\"PENDING\",\"applicantId\":2,\"createdAt\":[2026,7,17,7,1,27],\"updatedAt\":[2026,7,17,7,1,27]}','{\"id\":2,\"requirementId\":3,\"projectId\":1,\"changeContent\":\"测试驳回流程\",\"changeReason\":\"验证驳回\",\"impactScope\":\"无影响\",\"status\":\"REJECTED\",\"applicantId\":2,\"approverId\":3,\"rejectReason\":\"测试驳回原因说明\",\"createdAt\":[2026,7,17,7,1,27],\"updatedAt\":[2026,7,17,7,1,27]}',1,NULL,9,'2026-07-17 07:01:28'),(61,4,'wangwu','变更任务状态','任务管理','com.rd.platform.service.controller.TaskController.changeStatus','/api/v1/tasks/2/status','{\"id\":2,\"request\":{\"status\":\"SELF_TESTING\"}}','0:0:0:0:0:0:0:1','{\"id\":2,\"requirementId\":3,\"projectId\":1,\"taskName\":\"测试打回\",\"description\":\"测试\",\"status\":\"IN_PROGRESS\",\"priority\":\"MEDIUM\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,1,16],\"updatedAt\":[2026,7,17,7,1,16],\"deleted\":0}','{\"id\":2,\"requirementId\":3,\"projectId\":1,\"taskName\":\"测试打回\",\"description\":\"测试\",\"status\":\"SELF_TESTING\",\"priority\":\"MEDIUM\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,1,16],\"updatedAt\":[2026,7,17,7,1,16],\"deleted\":0}',1,NULL,19,'2026-07-17 07:32:43'),(62,4,'wangwu','变更任务状态','任务管理','com.rd.platform.service.controller.TaskController.changeStatus','/api/v1/tasks/2/status','{\"id\":2,\"request\":{\"status\":\"TESTING\"}}','0:0:0:0:0:0:0:1','{\"id\":2,\"requirementId\":3,\"projectId\":1,\"taskName\":\"测试打回\",\"description\":\"测试\",\"status\":\"SELF_TESTING\",\"priority\":\"MEDIUM\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,1,16],\"updatedAt\":[2026,7,17,7,1,16],\"deleted\":0}','{\"id\":2,\"requirementId\":3,\"projectId\":1,\"taskName\":\"测试打回\",\"description\":\"测试\",\"status\":\"TESTING\",\"priority\":\"MEDIUM\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,1,16],\"updatedAt\":[2026,7,17,7,1,16],\"deleted\":0}',1,NULL,7,'2026-07-17 07:32:43'),(63,5,'zhaoliu','变更任务状态','任务管理','com.rd.platform.service.controller.TaskController.changeStatus','/api/v1/tasks/2/status','{\"id\":2,\"request\":{\"status\":\"DONE\"}}','0:0:0:0:0:0:0:1','{\"id\":2,\"requirementId\":3,\"projectId\":1,\"taskName\":\"测试打回\",\"description\":\"测试\",\"status\":\"TESTING\",\"priority\":\"MEDIUM\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,1,16],\"updatedAt\":[2026,7,17,7,1,16],\"deleted\":0}','{\"id\":2,\"requirementId\":3,\"projectId\":1,\"taskName\":\"测试打回\",\"description\":\"测试\",\"status\":\"DONE\",\"priority\":\"MEDIUM\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"completedAt\":[2026,7,17,7,32,43],\"createdAt\":[2026,7,17,7,1,16],\"updatedAt\":[2026,7,17,7,1,16],\"deleted\":0}',1,NULL,27,'2026-07-17 07:32:43'),(64,4,'wangwu','变更任务状态','任务管理','com.rd.platform.service.controller.TaskController.changeStatus','/api/v1/tasks/2/status','{\"id\":2,\"request\":{\"status\":\"DONE\"}}','0:0:0:0:0:0:0:1','{\"id\":2,\"requirementId\":3,\"projectId\":1,\"taskName\":\"测试打回\",\"description\":\"测试\",\"status\":\"TESTING\",\"priority\":\"MEDIUM\",\"assigneeId\":4,\"createdBy\":2,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"completedAt\":[2026,7,17,7,32,43],\"createdAt\":[2026,7,17,7,1,16],\"updatedAt\":[2026,7,17,7,32,43],\"deleted\":0}',NULL,0,'只有测试人员才能验证任务测试结果',17,'2026-07-17 07:32:43'),(65,5,'zhaoliu','提交缺陷','缺陷管理','com.rd.platform.service.controller.BugController.create','/api/v1/bugs','{\"request\":{\"projectId\":1,\"title\":\"验证Bug流转\",\"description\":\"测试Bug状态机\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"assigneeId\":4}}','0:0:0:0:0:0:0:1',NULL,'{\"id\":2,\"projectId\":1,\"title\":\"验证Bug流转\",\"description\":\"测试Bug状态机\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"OPEN\",\"reporterId\":5,\"assigneeId\":4}',1,NULL,54,'2026-07-17 07:34:00'),(66,5,'zhaoliu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/2/status','{\"id\":2,\"request\":{\"status\":\"CONFIRMED\"}}','0:0:0:0:0:0:0:1','{\"id\":2,\"projectId\":1,\"title\":\"验证Bug流转\",\"description\":\"测试Bug状态机\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"OPEN\",\"reporterId\":5,\"assigneeId\":4,\"createdAt\":[2026,7,17,7,34],\"updatedAt\":[2026,7,17,7,34],\"deleted\":0}','{\"id\":2,\"projectId\":1,\"title\":\"验证Bug流转\",\"description\":\"测试Bug状态机\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"CONFIRMED\",\"reporterId\":5,\"assigneeId\":4,\"confirmedAt\":[2026,7,17,7,34,1],\"createdAt\":[2026,7,17,7,34],\"updatedAt\":[2026,7,17,7,34],\"deleted\":0}',1,NULL,38,'2026-07-17 07:34:00'),(67,4,'wangwu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/2/status','{\"id\":2,\"request\":{\"status\":\"FIXED\"}}','0:0:0:0:0:0:0:1','{\"id\":2,\"projectId\":1,\"title\":\"验证Bug流转\",\"description\":\"测试Bug状态机\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"CONFIRMED\",\"reporterId\":5,\"assigneeId\":4,\"confirmedAt\":[2026,7,17,7,34,1],\"createdAt\":[2026,7,17,7,34],\"updatedAt\":[2026,7,17,7,34],\"deleted\":0}',NULL,0,'不允许的状态转换: CONFIRMED -> FIXED',3,'2026-07-17 07:34:00'),(68,5,'zhaoliu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/2/status','{\"id\":2,\"request\":{\"status\":\"CLOSED\"}}','0:0:0:0:0:0:0:1','{\"id\":2,\"projectId\":1,\"title\":\"验证Bug流转\",\"description\":\"测试Bug状态机\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"CONFIRMED\",\"reporterId\":5,\"assigneeId\":4,\"confirmedAt\":[2026,7,17,7,34,1],\"createdAt\":[2026,7,17,7,34],\"updatedAt\":[2026,7,17,7,34],\"deleted\":0}',NULL,0,'不允许的状态转换: CONFIRMED -> CLOSED',4,'2026-07-17 07:34:00'),(69,5,'zhaoliu','提交缺陷','缺陷管理','com.rd.platform.service.controller.BugController.create','/api/v1/bugs','{\"request\":{\"projectId\":1,\"title\":\"负面用例\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MINOR\",\"priority\":\"LOW\",\"moduleName\":\"测试模块\",\"assigneeId\":4}}','0:0:0:0:0:0:0:1',NULL,'{\"id\":3,\"projectId\":1,\"title\":\"负面用例\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MINOR\",\"priority\":\"LOW\",\"moduleName\":\"测试模块\",\"status\":\"OPEN\",\"reporterId\":5,\"assigneeId\":4}',1,NULL,28,'2026-07-17 07:34:00'),(70,4,'wangwu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/3/status','{\"id\":3,\"request\":{\"status\":\"CONFIRMED\"}}','0:0:0:0:0:0:0:1','{\"id\":3,\"projectId\":1,\"title\":\"负面用例\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MINOR\",\"priority\":\"LOW\",\"moduleName\":\"测试模块\",\"status\":\"OPEN\",\"reporterId\":5,\"assigneeId\":4,\"createdAt\":[2026,7,17,7,34],\"updatedAt\":[2026,7,17,7,34],\"deleted\":0}','{\"id\":3,\"projectId\":1,\"title\":\"负面用例\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MINOR\",\"priority\":\"LOW\",\"moduleName\":\"测试模块\",\"status\":\"CONFIRMED\",\"reporterId\":5,\"assigneeId\":4,\"confirmedAt\":[2026,7,17,7,34,1],\"createdAt\":[2026,7,17,7,34],\"updatedAt\":[2026,7,17,7,34],\"deleted\":0}',1,NULL,25,'2026-07-17 07:34:00'),(71,4,'wangwu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/2/status','{\"id\":2,\"request\":{\"status\":\"FIXING\"}}','0:0:0:0:0:0:0:1','{\"id\":2,\"projectId\":1,\"title\":\"验证Bug流转\",\"description\":\"测试Bug状态机\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"CONFIRMED\",\"reporterId\":5,\"assigneeId\":4,\"confirmedAt\":[2026,7,17,7,34,1],\"createdAt\":[2026,7,17,7,34],\"updatedAt\":[2026,7,17,7,34],\"deleted\":0}','{\"id\":2,\"projectId\":1,\"title\":\"验证Bug流转\",\"description\":\"测试Bug状态机\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"FIXING\",\"reporterId\":5,\"assigneeId\":4,\"confirmedAt\":[2026,7,17,7,34,1],\"createdAt\":[2026,7,17,7,34],\"updatedAt\":[2026,7,17,7,34],\"deleted\":0}',1,NULL,15,'2026-07-17 07:34:37'),(72,4,'wangwu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/2/status','{\"id\":2,\"request\":{\"status\":\"FIXED\"}}','0:0:0:0:0:0:0:1','{\"id\":2,\"projectId\":1,\"title\":\"验证Bug流转\",\"description\":\"测试Bug状态机\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"FIXING\",\"reporterId\":5,\"assigneeId\":4,\"confirmedAt\":[2026,7,17,7,34,1],\"createdAt\":[2026,7,17,7,34],\"updatedAt\":[2026,7,17,7,34],\"deleted\":0}','{\"id\":2,\"projectId\":1,\"title\":\"验证Bug流转\",\"description\":\"测试Bug状态机\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"FIXED\",\"reporterId\":5,\"assigneeId\":4,\"fixerId\":4,\"confirmedAt\":[2026,7,17,7,34,1],\"fixedAt\":[2026,7,17,7,34,38],\"createdAt\":[2026,7,17,7,34],\"updatedAt\":[2026,7,17,7,34],\"deleted\":0}',1,NULL,18,'2026-07-17 07:34:37'),(73,5,'zhaoliu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/2/status','{\"id\":2,\"request\":{\"status\":\"VERIFIED\"}}','0:0:0:0:0:0:0:1','{\"id\":2,\"projectId\":1,\"title\":\"验证Bug流转\",\"description\":\"测试Bug状态机\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"FIXED\",\"reporterId\":5,\"assigneeId\":4,\"fixerId\":4,\"confirmedAt\":[2026,7,17,7,34,1],\"fixedAt\":[2026,7,17,7,34,38],\"createdAt\":[2026,7,17,7,34],\"updatedAt\":[2026,7,17,7,34],\"deleted\":0}','{\"id\":2,\"projectId\":1,\"title\":\"验证Bug流转\",\"description\":\"测试Bug状态机\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"VERIFIED\",\"reporterId\":5,\"assigneeId\":4,\"fixerId\":4,\"confirmedAt\":[2026,7,17,7,34,1],\"fixedAt\":[2026,7,17,7,34,38],\"createdAt\":[2026,7,17,7,34],\"updatedAt\":[2026,7,17,7,34],\"deleted\":0}',1,NULL,23,'2026-07-17 07:34:37'),(74,5,'zhaoliu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/2/status','{\"id\":2,\"request\":{\"status\":\"CLOSED\"}}','0:0:0:0:0:0:0:1','{\"id\":2,\"projectId\":1,\"title\":\"验证Bug流转\",\"description\":\"测试Bug状态机\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"VERIFIED\",\"reporterId\":5,\"assigneeId\":4,\"fixerId\":4,\"confirmedAt\":[2026,7,17,7,34,1],\"fixedAt\":[2026,7,17,7,34,38],\"createdAt\":[2026,7,17,7,34],\"updatedAt\":[2026,7,17,7,34],\"deleted\":0}','{\"id\":2,\"projectId\":1,\"title\":\"验证Bug流转\",\"description\":\"测试Bug状态机\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"CLOSED\",\"reporterId\":5,\"assigneeId\":4,\"fixerId\":4,\"confirmedAt\":[2026,7,17,7,34,1],\"fixedAt\":[2026,7,17,7,34,38],\"closedAt\":[2026,7,17,7,34,38],\"createdAt\":[2026,7,17,7,34],\"updatedAt\":[2026,7,17,7,34],\"deleted\":0}',1,NULL,25,'2026-07-17 07:34:37'),(75,4,'wangwu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/3/status','{\"id\":3,\"request\":{\"status\":\"CONFIRMED\"}}','0:0:0:0:0:0:0:1','{\"id\":3,\"projectId\":1,\"title\":\"负面用例\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MINOR\",\"priority\":\"LOW\",\"moduleName\":\"测试模块\",\"status\":\"CONFIRMED\",\"reporterId\":5,\"assigneeId\":4,\"confirmedAt\":[2026,7,17,7,34,1],\"createdAt\":[2026,7,17,7,34],\"updatedAt\":[2026,7,17,7,34],\"deleted\":0}',NULL,0,'不允许的状态转换: CONFIRMED -> CONFIRMED',4,'2026-07-17 07:34:37'),(76,4,'wangwu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/3/status','{\"id\":3,\"request\":{\"status\":\"CONFIRMED\"}}','0:0:0:0:0:0:0:1','{\"id\":3,\"projectId\":1,\"title\":\"负面用例\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MINOR\",\"priority\":\"LOW\",\"moduleName\":\"测试模块\",\"status\":\"CONFIRMED\",\"reporterId\":5,\"assigneeId\":4,\"confirmedAt\":[2026,7,17,7,34,1],\"createdAt\":[2026,7,17,7,34],\"updatedAt\":[2026,7,17,7,34],\"deleted\":0}',NULL,0,'不允许的状态转换: CONFIRMED -> CONFIRMED',5,'2026-07-17 07:34:46'),(77,5,'zhaoliu','提交缺陷','缺陷管理','com.rd.platform.service.controller.BugController.create','/api/v1/bugs','{\"request\":{\"projectId\":1,\"title\":\"负面测试Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MINOR\",\"priority\":\"LOW\",\"moduleName\":\"测试模块\",\"assigneeId\":4}}','0:0:0:0:0:0:0:1',NULL,'{\"id\":4,\"projectId\":1,\"title\":\"负面测试Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MINOR\",\"priority\":\"LOW\",\"moduleName\":\"测试模块\",\"status\":\"OPEN\",\"reporterId\":5,\"assigneeId\":4}',1,NULL,24,'2026-07-17 07:34:59'),(78,4,'wangwu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/4/status','{\"id\":4,\"request\":{\"status\":\"CONFIRMED\"}}','0:0:0:0:0:0:0:1','{\"id\":4,\"projectId\":1,\"title\":\"负面测试Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MINOR\",\"priority\":\"LOW\",\"moduleName\":\"测试模块\",\"status\":\"OPEN\",\"reporterId\":5,\"assigneeId\":4,\"createdAt\":[2026,7,17,7,34,59],\"updatedAt\":[2026,7,17,7,34,59],\"deleted\":0}','{\"id\":4,\"projectId\":1,\"title\":\"负面测试Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MINOR\",\"priority\":\"LOW\",\"moduleName\":\"测试模块\",\"status\":\"CONFIRMED\",\"reporterId\":5,\"assigneeId\":4,\"confirmedAt\":[2026,7,17,7,35],\"createdAt\":[2026,7,17,7,34,59],\"updatedAt\":[2026,7,17,7,34,59],\"deleted\":0}',1,NULL,22,'2026-07-17 07:34:59'),(79,2,'zhangsan','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/4/status','{\"id\":4,\"request\":{\"status\":\"CONFIRMED\"}}','0:0:0:0:0:0:0:1','{\"id\":4,\"projectId\":1,\"title\":\"负面测试Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MINOR\",\"priority\":\"LOW\",\"moduleName\":\"测试模块\",\"status\":\"CONFIRMED\",\"reporterId\":5,\"assigneeId\":4,\"confirmedAt\":[2026,7,17,7,35],\"createdAt\":[2026,7,17,7,34,59],\"updatedAt\":[2026,7,17,7,34,59],\"deleted\":0}',NULL,0,'不允许的状态转换: CONFIRMED -> CONFIRMED',3,'2026-07-17 07:35:00'),(80,5,'zhaoliu','提交缺陷','缺陷管理','com.rd.platform.service.controller.BugController.create','/api/v1/bugs','{\"request\":{\"projectId\":1,\"title\":\"权限验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MINOR\",\"priority\":\"LOW\",\"moduleName\":\"测试\",\"assigneeId\":4}}','0:0:0:0:0:0:0:1',NULL,'{\"id\":5,\"projectId\":1,\"title\":\"权限验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MINOR\",\"priority\":\"LOW\",\"moduleName\":\"测试\",\"status\":\"OPEN\",\"reporterId\":5,\"assigneeId\":4}',1,NULL,87,'2026-07-17 07:38:18'),(81,4,'wangwu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/5/status','{\"id\":5,\"request\":{\"status\":\"CONFIRMED\"}}','0:0:0:0:0:0:0:1','{\"id\":5,\"projectId\":1,\"title\":\"权限验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MINOR\",\"priority\":\"LOW\",\"moduleName\":\"测试\",\"status\":\"OPEN\",\"reporterId\":5,\"assigneeId\":4,\"createdAt\":[2026,7,17,7,38,18],\"updatedAt\":[2026,7,17,7,38,18],\"deleted\":0}',NULL,0,'只有测试人员或产品经理可以确认/拒绝Bug',39,'2026-07-17 07:38:18'),(82,5,'zhaoliu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/5/status','{\"id\":5,\"request\":{\"status\":\"CONFIRMED\"}}','0:0:0:0:0:0:0:1','{\"id\":5,\"projectId\":1,\"title\":\"权限验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MINOR\",\"priority\":\"LOW\",\"moduleName\":\"测试\",\"status\":\"OPEN\",\"reporterId\":5,\"assigneeId\":4,\"createdAt\":[2026,7,17,7,38,18],\"updatedAt\":[2026,7,17,7,38,18],\"deleted\":0}','{\"id\":5,\"projectId\":1,\"title\":\"权限验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MINOR\",\"priority\":\"LOW\",\"moduleName\":\"测试\",\"status\":\"CONFIRMED\",\"reporterId\":5,\"assigneeId\":4,\"confirmedAt\":[2026,7,17,7,38,19],\"createdAt\":[2026,7,17,7,38,18],\"updatedAt\":[2026,7,17,7,38,18],\"deleted\":0}',1,NULL,40,'2026-07-17 07:38:18'),(83,5,'zhaoliu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/5/status','{\"id\":5,\"request\":{\"status\":\"CONFIRMED\"}}','0:0:0:0:0:0:0:1','{\"id\":5,\"projectId\":1,\"title\":\"权限验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MINOR\",\"priority\":\"LOW\",\"moduleName\":\"测试\",\"status\":\"CONFIRMED\",\"reporterId\":5,\"assigneeId\":4,\"confirmedAt\":[2026,7,17,7,38,19],\"createdAt\":[2026,7,17,7,38,18],\"updatedAt\":[2026,7,17,7,38,18],\"deleted\":0}',NULL,0,'不允许的状态转换: CONFIRMED -> CONFIRMED',6,'2026-07-17 07:38:25'),(84,5,'zhaoliu','提交缺陷','缺陷管理','com.rd.platform.service.controller.BugController.create','/api/v1/bugs','{\"request\":{\"projectId\":1,\"title\":\"最终验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MINOR\",\"priority\":\"LOW\",\"moduleName\":\"验证模块\",\"assigneeId\":4}}','0:0:0:0:0:0:0:1',NULL,'{\"id\":6,\"projectId\":1,\"title\":\"最终验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MINOR\",\"priority\":\"LOW\",\"moduleName\":\"验证模块\",\"status\":\"OPEN\",\"reporterId\":5,\"assigneeId\":4}',1,NULL,33,'2026-07-17 07:38:44'),(85,4,'wangwu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/6/status','{\"id\":6,\"request\":{\"status\":\"CONFIRMED\"}}','0:0:0:0:0:0:0:1','{\"id\":6,\"projectId\":1,\"title\":\"最终验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MINOR\",\"priority\":\"LOW\",\"moduleName\":\"验证模块\",\"status\":\"OPEN\",\"reporterId\":5,\"assigneeId\":4,\"createdAt\":[2026,7,17,7,38,44],\"updatedAt\":[2026,7,17,7,38,44],\"deleted\":0}',NULL,0,'只有测试人员或产品经理可以确认/拒绝Bug',27,'2026-07-17 07:38:44'),(86,5,'zhaoliu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/6/status','{\"id\":6,\"request\":{\"status\":\"CONFIRMED\"}}','0:0:0:0:0:0:0:1','{\"id\":6,\"projectId\":1,\"title\":\"最终验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MINOR\",\"priority\":\"LOW\",\"moduleName\":\"验证模块\",\"status\":\"OPEN\",\"reporterId\":5,\"assigneeId\":4,\"createdAt\":[2026,7,17,7,38,44],\"updatedAt\":[2026,7,17,7,38,44],\"deleted\":0}','{\"id\":6,\"projectId\":1,\"title\":\"最终验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MINOR\",\"priority\":\"LOW\",\"moduleName\":\"验证模块\",\"status\":\"CONFIRMED\",\"reporterId\":5,\"assigneeId\":4,\"confirmedAt\":[2026,7,17,7,38,45],\"createdAt\":[2026,7,17,7,38,44],\"updatedAt\":[2026,7,17,7,38,44],\"deleted\":0}',1,NULL,33,'2026-07-17 07:38:44'),(87,5,'zhaoliu','提交缺陷','缺陷管理','com.rd.platform.service.controller.BugController.create','/api/v1/bugs','{\"request\":{\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"assigneeId\":4}}','0:0:0:0:0:0:0:1',NULL,'{\"id\":7,\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"OPEN\",\"reporterId\":5,\"assigneeId\":4}',1,NULL,34,'2026-07-17 07:43:16'),(88,4,'wangwu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/7/status','{\"id\":7,\"request\":{\"status\":\"CONFIRMED\"}}','0:0:0:0:0:0:0:1','{\"id\":7,\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"OPEN\",\"reporterId\":5,\"assigneeId\":4,\"createdAt\":[2026,7,17,7,43,16],\"updatedAt\":[2026,7,17,7,43,16],\"deleted\":0}',NULL,0,'只有测试人员或产品经理可以确认/拒绝Bug',20,'2026-07-17 07:43:16'),(89,5,'zhaoliu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/7/status','{\"id\":7,\"request\":{\"status\":\"CONFIRMED\"}}','0:0:0:0:0:0:0:1','{\"id\":7,\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"OPEN\",\"reporterId\":5,\"assigneeId\":4,\"createdAt\":[2026,7,17,7,43,16],\"updatedAt\":[2026,7,17,7,43,16],\"deleted\":0}','{\"id\":7,\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"CONFIRMED\",\"reporterId\":5,\"assigneeId\":4,\"confirmedAt\":[2026,7,17,7,43,16],\"createdAt\":[2026,7,17,7,43,16],\"updatedAt\":[2026,7,17,7,43,16],\"deleted\":0}',1,NULL,32,'2026-07-17 07:43:16'),(90,4,'wangwu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/7/status','{\"id\":7,\"request\":{\"status\":\"FIXING\"}}','0:0:0:0:0:0:0:1','{\"id\":7,\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"CONFIRMED\",\"reporterId\":5,\"assigneeId\":4,\"confirmedAt\":[2026,7,17,7,43,16],\"createdAt\":[2026,7,17,7,43,16],\"updatedAt\":[2026,7,17,7,43,16],\"deleted\":0}','{\"id\":7,\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"FIXING\",\"reporterId\":5,\"assigneeId\":4,\"confirmedAt\":[2026,7,17,7,43,16],\"createdAt\":[2026,7,17,7,43,16],\"updatedAt\":[2026,7,17,7,43,16],\"deleted\":0}',1,NULL,15,'2026-07-17 07:43:16'),(91,4,'wangwu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/7/status','{\"id\":7,\"request\":{\"status\":\"FIXED\"}}','0:0:0:0:0:0:0:1','{\"id\":7,\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"FIXING\",\"reporterId\":5,\"assigneeId\":4,\"confirmedAt\":[2026,7,17,7,43,16],\"createdAt\":[2026,7,17,7,43,16],\"updatedAt\":[2026,7,17,7,43,16],\"deleted\":0}','{\"id\":7,\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"FIXED\",\"reporterId\":5,\"assigneeId\":4,\"fixerId\":4,\"confirmedAt\":[2026,7,17,7,43,16],\"fixedAt\":[2026,7,17,7,43,16],\"createdAt\":[2026,7,17,7,43,16],\"updatedAt\":[2026,7,17,7,43,16],\"deleted\":0}',1,NULL,16,'2026-07-17 07:43:16'),(92,4,'wangwu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/7/status','{\"id\":7,\"request\":{\"status\":\"VERIFIED\"}}','0:0:0:0:0:0:0:1','{\"id\":7,\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"FIXED\",\"reporterId\":5,\"assigneeId\":4,\"fixerId\":4,\"confirmedAt\":[2026,7,17,7,43,16],\"fixedAt\":[2026,7,17,7,43,16],\"createdAt\":[2026,7,17,7,43,16],\"updatedAt\":[2026,7,17,7,43,16],\"deleted\":0}',NULL,0,'只有测试人员可以验证/关闭/重开Bug',19,'2026-07-17 07:43:16'),(93,5,'zhaoliu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/7/status','{\"id\":7,\"request\":{\"status\":\"VERIFIED\"}}','0:0:0:0:0:0:0:1','{\"id\":7,\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"FIXED\",\"reporterId\":5,\"assigneeId\":4,\"fixerId\":4,\"confirmedAt\":[2026,7,17,7,43,16],\"fixedAt\":[2026,7,17,7,43,16],\"createdAt\":[2026,7,17,7,43,16],\"updatedAt\":[2026,7,17,7,43,16],\"deleted\":0}','{\"id\":7,\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"VERIFIED\",\"reporterId\":5,\"assigneeId\":4,\"fixerId\":4,\"confirmedAt\":[2026,7,17,7,43,16],\"fixedAt\":[2026,7,17,7,43,16],\"createdAt\":[2026,7,17,7,43,16],\"updatedAt\":[2026,7,17,7,43,16],\"deleted\":0}',1,NULL,23,'2026-07-17 07:43:16'),(94,5,'zhaoliu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/7/status','{\"id\":7,\"request\":{\"status\":\"CLOSED\"}}','0:0:0:0:0:0:0:1','{\"id\":7,\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"VERIFIED\",\"reporterId\":5,\"assigneeId\":4,\"fixerId\":4,\"confirmedAt\":[2026,7,17,7,43,16],\"fixedAt\":[2026,7,17,7,43,16],\"createdAt\":[2026,7,17,7,43,16],\"updatedAt\":[2026,7,17,7,43,16],\"deleted\":0}','{\"id\":7,\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"CLOSED\",\"reporterId\":5,\"assigneeId\":4,\"fixerId\":4,\"confirmedAt\":[2026,7,17,7,43,16],\"fixedAt\":[2026,7,17,7,43,16],\"closedAt\":[2026,7,17,7,43,16],\"createdAt\":[2026,7,17,7,43,16],\"updatedAt\":[2026,7,17,7,43,16],\"deleted\":0}',1,NULL,23,'2026-07-17 07:43:16'),(95,2,'zhangsan','创建需求','需求管理','com.rd.platform.service.controller.RequirementController.create','/api/v1/requirements','{\"request\":{\"projectId\":1,\"title\":\"E2E测试需求\",\"type\":\"FEATURE\",\"priority\":\"HIGH\",\"description\":\"端到端验证\",\"acceptanceCriteria\":\"功能正常\",\"businessValue\":\"HIGH\",\"ownerId\":2,\"expectedCompletionDate\":[2026,8,1]}}','0:0:0:0:0:0:0:1',NULL,NULL,0,'验收标准(AC)必须采用 Given-When-Then 三段式结构描述',21,'2026-07-17 07:44:08'),(96,5,'zhaoliu','提交缺陷','缺陷管理','com.rd.platform.service.controller.BugController.create','/api/v1/bugs','{\"request\":{\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"assigneeId\":4}}','0:0:0:0:0:0:0:1',NULL,'{\"id\":8,\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"OPEN\",\"reporterId\":5,\"assigneeId\":4}',1,NULL,21,'2026-07-17 07:44:08'),(97,4,'wangwu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/8/status','{\"id\":8,\"request\":{\"status\":\"CONFIRMED\"}}','0:0:0:0:0:0:0:1','{\"id\":8,\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"OPEN\",\"reporterId\":5,\"assigneeId\":4,\"createdAt\":[2026,7,17,7,44,8],\"updatedAt\":[2026,7,17,7,44,8],\"deleted\":0}',NULL,0,'只有测试人员或产品经理可以确认/拒绝Bug',16,'2026-07-17 07:44:08'),(98,5,'zhaoliu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/8/status','{\"id\":8,\"request\":{\"status\":\"CONFIRMED\"}}','0:0:0:0:0:0:0:1','{\"id\":8,\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"OPEN\",\"reporterId\":5,\"assigneeId\":4,\"createdAt\":[2026,7,17,7,44,8],\"updatedAt\":[2026,7,17,7,44,8],\"deleted\":0}','{\"id\":8,\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"CONFIRMED\",\"reporterId\":5,\"assigneeId\":4,\"confirmedAt\":[2026,7,17,7,44,9],\"createdAt\":[2026,7,17,7,44,8],\"updatedAt\":[2026,7,17,7,44,8],\"deleted\":0}',1,NULL,19,'2026-07-17 07:44:08'),(99,4,'wangwu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/8/status','{\"id\":8,\"request\":{\"status\":\"FIXING\"}}','0:0:0:0:0:0:0:1','{\"id\":8,\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"CONFIRMED\",\"reporterId\":5,\"assigneeId\":4,\"confirmedAt\":[2026,7,17,7,44,9],\"createdAt\":[2026,7,17,7,44,8],\"updatedAt\":[2026,7,17,7,44,8],\"deleted\":0}','{\"id\":8,\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"FIXING\",\"reporterId\":5,\"assigneeId\":4,\"confirmedAt\":[2026,7,17,7,44,9],\"createdAt\":[2026,7,17,7,44,8],\"updatedAt\":[2026,7,17,7,44,8],\"deleted\":0}',1,NULL,11,'2026-07-17 07:44:08'),(100,4,'wangwu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/8/status','{\"id\":8,\"request\":{\"status\":\"FIXED\"}}','0:0:0:0:0:0:0:1','{\"id\":8,\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"FIXING\",\"reporterId\":5,\"assigneeId\":4,\"confirmedAt\":[2026,7,17,7,44,9],\"createdAt\":[2026,7,17,7,44,8],\"updatedAt\":[2026,7,17,7,44,8],\"deleted\":0}','{\"id\":8,\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"FIXED\",\"reporterId\":5,\"assigneeId\":4,\"fixerId\":4,\"confirmedAt\":[2026,7,17,7,44,9],\"fixedAt\":[2026,7,17,7,44,9],\"createdAt\":[2026,7,17,7,44,8],\"updatedAt\":[2026,7,17,7,44,8],\"deleted\":0}',1,NULL,12,'2026-07-17 07:44:08'),(101,4,'wangwu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/8/status','{\"id\":8,\"request\":{\"status\":\"VERIFIED\"}}','0:0:0:0:0:0:0:1','{\"id\":8,\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"FIXED\",\"reporterId\":5,\"assigneeId\":4,\"fixerId\":4,\"confirmedAt\":[2026,7,17,7,44,9],\"fixedAt\":[2026,7,17,7,44,9],\"createdAt\":[2026,7,17,7,44,8],\"updatedAt\":[2026,7,17,7,44,8],\"deleted\":0}',NULL,0,'只有测试人员可以验证/关闭/重开Bug',17,'2026-07-17 07:44:08'),(102,5,'zhaoliu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/8/status','{\"id\":8,\"request\":{\"status\":\"VERIFIED\"}}','0:0:0:0:0:0:0:1','{\"id\":8,\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"FIXED\",\"reporterId\":5,\"assigneeId\":4,\"fixerId\":4,\"confirmedAt\":[2026,7,17,7,44,9],\"fixedAt\":[2026,7,17,7,44,9],\"createdAt\":[2026,7,17,7,44,8],\"updatedAt\":[2026,7,17,7,44,8],\"deleted\":0}','{\"id\":8,\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"VERIFIED\",\"reporterId\":5,\"assigneeId\":4,\"fixerId\":4,\"confirmedAt\":[2026,7,17,7,44,9],\"fixedAt\":[2026,7,17,7,44,9],\"createdAt\":[2026,7,17,7,44,8],\"updatedAt\":[2026,7,17,7,44,8],\"deleted\":0}',1,NULL,19,'2026-07-17 07:44:08'),(103,5,'zhaoliu','变更缺陷状态','缺陷管理','com.rd.platform.service.controller.BugController.changeStatus','/api/v1/bugs/8/status','{\"id\":8,\"request\":{\"status\":\"CLOSED\"}}','0:0:0:0:0:0:0:1','{\"id\":8,\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"VERIFIED\",\"reporterId\":5,\"assigneeId\":4,\"fixerId\":4,\"confirmedAt\":[2026,7,17,7,44,9],\"fixedAt\":[2026,7,17,7,44,9],\"createdAt\":[2026,7,17,7,44,8],\"updatedAt\":[2026,7,17,7,44,8],\"deleted\":0}','{\"id\":8,\"projectId\":1,\"title\":\"E2E验证Bug\",\"description\":\"test\",\"expectedResult\":\"ok\",\"actualResult\":\"fail\",\"severity\":\"MAJOR\",\"priority\":\"HIGH\",\"moduleName\":\"核心模块\",\"status\":\"CLOSED\",\"reporterId\":5,\"assigneeId\":4,\"fixerId\":4,\"confirmedAt\":[2026,7,17,7,44,9],\"fixedAt\":[2026,7,17,7,44,9],\"closedAt\":[2026,7,17,7,44,9],\"createdAt\":[2026,7,17,7,44,8],\"updatedAt\":[2026,7,17,7,44,8],\"deleted\":0}',1,NULL,24,'2026-07-17 07:44:08'),(104,2,'zhangsan','创建需求','需求管理','com.rd.platform.service.controller.RequirementController.create','/api/v1/requirements','{\"request\":{\"projectId\":1,\"title\":\"E2E测试需求\",\"type\":\"FEATURE\",\"priority\":\"HIGH\",\"description\":\"端到端验证\",\"acceptanceCriteria\":\"Given 用户已登录\\nWhen 点击提交按钮\\nThen 数据保存成功\",\"businessValue\":\"HIGH\",\"ownerId\":2,\"expectedCompletionDate\":[2026,8,1]}}','0:0:0:0:0:0:0:1',NULL,'{\"id\":4,\"projectId\":1,\"title\":\"E2E测试需求\",\"type\":\"FEATURE\",\"priority\":\"HIGH\",\"status\":\"DRAFT\",\"description\":\"端到端验证\",\"acceptanceCriteria\":\"Given 用户已登录\\nWhen 点击提交按钮\\nThen 数据保存成功\",\"businessValue\":\"HIGH\",\"ownerId\":2,\"createdBy\":2,\"expectedCompletionDate\":[2026,8,1],\"isFastTrack\":0,\"fastTrackViolated\":0,\"version\":1}',1,NULL,24,'2026-07-17 07:44:27'),(105,2,'zhangsan','提交评审','需求管理','com.rd.platform.service.controller.RequirementController.submitReview','/api/v1/requirements/4/submit-review','{\"id\":4,\"request\":{\"reviewerIds\":[2,3]}}','0:0:0:0:0:0:0:1',NULL,NULL,1,NULL,17,'2026-07-17 07:44:38'),(106,2,'zhangsan','评审需求','需求管理','com.rd.platform.service.controller.RequirementController.review','/api/v1/requirements/4/review','{\"id\":4,\"request\":{\"result\":\"APPROVED\",\"comment\":\"同意\"}}','0:0:0:0:0:0:0:1',NULL,NULL,1,NULL,10,'2026-07-17 07:44:38'),(107,3,'lisi','评审需求','需求管理','com.rd.platform.service.controller.RequirementController.review','/api/v1/requirements/4/review','{\"id\":4,\"request\":{\"result\":\"APPROVED\",\"comment\":\"同意\"}}','0:0:0:0:0:0:0:1',NULL,NULL,1,NULL,10,'2026-07-17 07:44:38'),(108,2,'zhangsan','创建任务','任务管理','com.rd.platform.service.controller.TaskController.create','/api/v1/tasks','{\"request\":{\"requirementId\":4,\"projectId\":1,\"taskName\":\"E2E测试任务\",\"description\":\"验证任务流转\",\"priority\":\"HIGH\",\"assigneeId\":4,\"estimatedHours\":8,\"dueDate\":[2026,8,1]}}','0:0:0:0:0:0:0:1',NULL,'{\"id\":3,\"requirementId\":4,\"projectId\":1,\"taskName\":\"E2E测试任务\",\"description\":\"验证任务流转\",\"status\":\"TODO\",\"priority\":\"HIGH\",\"assigneeId\":4,\"createdBy\":2,\"estimatedHours\":8,\"actualHours\":0,\"dueDate\":[2026,8,1]}',1,NULL,35,'2026-07-17 07:44:54'),(109,4,'wangwu','变更任务状态','任务管理','com.rd.platform.service.controller.TaskController.changeStatus','/api/v1/tasks/3/status','{\"id\":3,\"request\":{\"status\":\"IN_PROGRESS\"}}','0:0:0:0:0:0:0:1','{\"id\":3,\"requirementId\":4,\"projectId\":1,\"taskName\":\"E2E测试任务\",\"description\":\"验证任务流转\",\"status\":\"TODO\",\"priority\":\"HIGH\",\"assigneeId\":4,\"createdBy\":2,\"estimatedHours\":8.0,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,44,54],\"updatedAt\":[2026,7,17,7,44,54],\"deleted\":0}','{\"id\":3,\"requirementId\":4,\"projectId\":1,\"taskName\":\"E2E测试任务\",\"description\":\"验证任务流转\",\"status\":\"IN_PROGRESS\",\"priority\":\"HIGH\",\"assigneeId\":4,\"createdBy\":2,\"estimatedHours\":8.0,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,44,54],\"updatedAt\":[2026,7,17,7,44,54],\"deleted\":0}',1,NULL,10,'2026-07-17 07:44:54'),(110,4,'wangwu','变更任务状态','任务管理','com.rd.platform.service.controller.TaskController.changeStatus','/api/v1/tasks/3/status','{\"id\":3,\"request\":{\"status\":\"SELF_TESTING\"}}','0:0:0:0:0:0:0:1','{\"id\":3,\"requirementId\":4,\"projectId\":1,\"taskName\":\"E2E测试任务\",\"description\":\"验证任务流转\",\"status\":\"IN_PROGRESS\",\"priority\":\"HIGH\",\"assigneeId\":4,\"createdBy\":2,\"estimatedHours\":8.0,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,44,54],\"updatedAt\":[2026,7,17,7,44,54],\"deleted\":0}','{\"id\":3,\"requirementId\":4,\"projectId\":1,\"taskName\":\"E2E测试任务\",\"description\":\"验证任务流转\",\"status\":\"SELF_TESTING\",\"priority\":\"HIGH\",\"assigneeId\":4,\"createdBy\":2,\"estimatedHours\":8.0,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,44,54],\"updatedAt\":[2026,7,17,7,44,54],\"deleted\":0}',1,NULL,6,'2026-07-17 07:44:54'),(111,4,'wangwu','变更任务状态','任务管理','com.rd.platform.service.controller.TaskController.changeStatus','/api/v1/tasks/3/status','{\"id\":3,\"request\":{\"status\":\"TESTING\"}}','0:0:0:0:0:0:0:1','{\"id\":3,\"requirementId\":4,\"projectId\":1,\"taskName\":\"E2E测试任务\",\"description\":\"验证任务流转\",\"status\":\"SELF_TESTING\",\"priority\":\"HIGH\",\"assigneeId\":4,\"createdBy\":2,\"estimatedHours\":8.0,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,44,54],\"updatedAt\":[2026,7,17,7,44,54],\"deleted\":0}','{\"id\":3,\"requirementId\":4,\"projectId\":1,\"taskName\":\"E2E测试任务\",\"description\":\"验证任务流转\",\"status\":\"TESTING\",\"priority\":\"HIGH\",\"assigneeId\":4,\"createdBy\":2,\"estimatedHours\":8.0,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,44,54],\"updatedAt\":[2026,7,17,7,44,54],\"deleted\":0}',1,NULL,7,'2026-07-17 07:44:54'),(112,5,'zhaoliu','变更任务状态','任务管理','com.rd.platform.service.controller.TaskController.changeStatus','/api/v1/tasks/3/status','{\"id\":3,\"request\":{\"status\":\"DONE\"}}','0:0:0:0:0:0:0:1','{\"id\":3,\"requirementId\":4,\"projectId\":1,\"taskName\":\"E2E测试任务\",\"description\":\"验证任务流转\",\"status\":\"TESTING\",\"priority\":\"HIGH\",\"assigneeId\":4,\"createdBy\":2,\"estimatedHours\":8.0,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,44,54],\"updatedAt\":[2026,7,17,7,44,54],\"deleted\":0}','{\"id\":3,\"requirementId\":4,\"projectId\":1,\"taskName\":\"E2E测试任务\",\"description\":\"验证任务流转\",\"status\":\"DONE\",\"priority\":\"HIGH\",\"assigneeId\":4,\"createdBy\":2,\"estimatedHours\":8.0,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"completedAt\":[2026,7,17,7,44,54],\"createdAt\":[2026,7,17,7,44,54],\"updatedAt\":[2026,7,17,7,44,54],\"deleted\":0}',1,NULL,12,'2026-07-17 07:44:54'),(113,2,'zhangsan','创建任务','任务管理','com.rd.platform.service.controller.TaskController.create','/api/v1/tasks','{\"request\":{\"requirementId\":4,\"projectId\":1,\"taskName\":\"负面测试任务\",\"description\":\"test\",\"priority\":\"LOW\",\"assigneeId\":4,\"estimatedHours\":4,\"dueDate\":[2026,8,1]}}','0:0:0:0:0:0:0:1',NULL,'{\"id\":4,\"requirementId\":4,\"projectId\":1,\"taskName\":\"负面测试任务\",\"description\":\"test\",\"status\":\"TODO\",\"priority\":\"LOW\",\"assigneeId\":4,\"createdBy\":2,\"estimatedHours\":4,\"actualHours\":0,\"dueDate\":[2026,8,1]}',1,NULL,19,'2026-07-17 07:44:54'),(114,4,'wangwu','变更任务状态','任务管理','com.rd.platform.service.controller.TaskController.changeStatus','/api/v1/tasks/4/status','{\"id\":4,\"request\":{\"status\":\"IN_PROGRESS\"}}','0:0:0:0:0:0:0:1','{\"id\":4,\"requirementId\":4,\"projectId\":1,\"taskName\":\"负面测试任务\",\"description\":\"test\",\"status\":\"TODO\",\"priority\":\"LOW\",\"assigneeId\":4,\"createdBy\":2,\"estimatedHours\":4.0,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,44,54],\"updatedAt\":[2026,7,17,7,44,54],\"deleted\":0}','{\"id\":4,\"requirementId\":4,\"projectId\":1,\"taskName\":\"负面测试任务\",\"description\":\"test\",\"status\":\"IN_PROGRESS\",\"priority\":\"LOW\",\"assigneeId\":4,\"createdBy\":2,\"estimatedHours\":4.0,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,44,54],\"updatedAt\":[2026,7,17,7,44,54],\"deleted\":0}',1,NULL,5,'2026-07-17 07:44:54'),(115,4,'wangwu','变更任务状态','任务管理','com.rd.platform.service.controller.TaskController.changeStatus','/api/v1/tasks/4/status','{\"id\":4,\"request\":{\"status\":\"SELF_TESTING\"}}','0:0:0:0:0:0:0:1','{\"id\":4,\"requirementId\":4,\"projectId\":1,\"taskName\":\"负面测试任务\",\"description\":\"test\",\"status\":\"IN_PROGRESS\",\"priority\":\"LOW\",\"assigneeId\":4,\"createdBy\":2,\"estimatedHours\":4.0,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,44,54],\"updatedAt\":[2026,7,17,7,44,54],\"deleted\":0}','{\"id\":4,\"requirementId\":4,\"projectId\":1,\"taskName\":\"负面测试任务\",\"description\":\"test\",\"status\":\"SELF_TESTING\",\"priority\":\"LOW\",\"assigneeId\":4,\"createdBy\":2,\"estimatedHours\":4.0,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,44,54],\"updatedAt\":[2026,7,17,7,44,54],\"deleted\":0}',1,NULL,5,'2026-07-17 07:44:54'),(116,4,'wangwu','变更任务状态','任务管理','com.rd.platform.service.controller.TaskController.changeStatus','/api/v1/tasks/4/status','{\"id\":4,\"request\":{\"status\":\"TESTING\"}}','0:0:0:0:0:0:0:1','{\"id\":4,\"requirementId\":4,\"projectId\":1,\"taskName\":\"负面测试任务\",\"description\":\"test\",\"status\":\"SELF_TESTING\",\"priority\":\"LOW\",\"assigneeId\":4,\"createdBy\":2,\"estimatedHours\":4.0,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,44,54],\"updatedAt\":[2026,7,17,7,44,54],\"deleted\":0}','{\"id\":4,\"requirementId\":4,\"projectId\":1,\"taskName\":\"负面测试任务\",\"description\":\"test\",\"status\":\"TESTING\",\"priority\":\"LOW\",\"assigneeId\":4,\"createdBy\":2,\"estimatedHours\":4.0,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,44,54],\"updatedAt\":[2026,7,17,7,44,54],\"deleted\":0}',1,NULL,5,'2026-07-17 07:44:54'),(117,4,'wangwu','变更任务状态','任务管理','com.rd.platform.service.controller.TaskController.changeStatus','/api/v1/tasks/4/status','{\"id\":4,\"request\":{\"status\":\"DONE\"}}','0:0:0:0:0:0:0:1','{\"id\":4,\"requirementId\":4,\"projectId\":1,\"taskName\":\"负面测试任务\",\"description\":\"test\",\"status\":\"TESTING\",\"priority\":\"LOW\",\"assigneeId\":4,\"createdBy\":2,\"estimatedHours\":4.0,\"actualHours\":0.0,\"dueDate\":[2026,8,1],\"createdAt\":[2026,7,17,7,44,54],\"updatedAt\":[2026,7,17,7,44,54],\"deleted\":0}',NULL,0,'只有测试人员才能验证任务测试结果',9,'2026-07-17 07:44:54'),(118,2,'zhangsan','提交变更申请','变更管理','com.rd.platform.service.controller.ChangeRequestController.create','/api/v1/change-requests','{\"request\":{\"requirementId\":4,\"projectId\":1,\"changeContent\":\"E2E变更内容\",\"changeReason\":\"验证流转\",\"impactScope\":\"低影响\"}}','0:0:0:0:0:0:0:1',NULL,'{\"id\":3,\"requirementId\":4,\"projectId\":1,\"changeContent\":\"E2E变更内容\",\"changeReason\":\"验证流转\",\"impactScope\":\"低影响\",\"status\":\"PENDING\",\"applicantId\":2}',1,NULL,18,'2026-07-17 07:45:06'),(119,4,'wangwu','审批变更','变更管理','com.rd.platform.service.controller.ChangeRequestController.approve','/api/v1/change-requests/3/approve','{\"id\":3}','0:0:0:0:0:0:0:1','{\"id\":3,\"requirementId\":4,\"projectId\":1,\"changeContent\":\"E2E变更内容\",\"changeReason\":\"验证流转\",\"impactScope\":\"低影响\",\"status\":\"PENDING\",\"applicantId\":2,\"createdAt\":[2026,7,17,7,45,6],\"updatedAt\":[2026,7,17,7,45,6]}',NULL,0,'第一重审批须由产品经理完成',10,'2026-07-17 07:45:06'),(120,2,'zhangsan','审批变更','变更管理','com.rd.platform.service.controller.ChangeRequestController.approve','/api/v1/change-requests/3/approve','{\"id\":3}','0:0:0:0:0:0:0:1','{\"id\":3,\"requirementId\":4,\"projectId\":1,\"changeContent\":\"E2E变更内容\",\"changeReason\":\"验证流转\",\"impactScope\":\"低影响\",\"status\":\"PENDING\",\"applicantId\":2,\"createdAt\":[2026,7,17,7,45,6],\"updatedAt\":[2026,7,17,7,45,6]}',NULL,0,'变更申请人不能审批自己提交的变更（R4防自审）',3,'2026-07-17 07:45:06'),(121,1,'admin','审批变更','变更管理','com.rd.platform.service.controller.ChangeRequestController.approve','/api/v1/change-requests/3/approve','{\"id\":3}','0:0:0:0:0:0:0:1','{\"id\":3,\"requirementId\":4,\"projectId\":1,\"changeContent\":\"E2E变更内容\",\"changeReason\":\"验证流转\",\"impactScope\":\"低影响\",\"status\":\"PENDING\",\"applicantId\":2,\"createdAt\":[2026,7,17,7,45,6],\"updatedAt\":[2026,7,17,7,45,6]}','{\"id\":3,\"requirementId\":4,\"projectId\":1,\"changeContent\":\"E2E变更内容\",\"changeReason\":\"验证流转\",\"impactScope\":\"低影响\",\"status\":\"TL_APPROVED\",\"applicantId\":2,\"approverId\":1,\"createdAt\":[2026,7,17,7,45,6],\"updatedAt\":[2026,7,17,7,45,6]}',1,NULL,13,'2026-07-17 07:45:06'),(122,4,'wangwu','标记开发完成','需求管理','com.rd.platform.service.controller.RequirementController.markDeveloped','/api/v1/requirements/4/mark-developed','{\"id\":4}','0:0:0:0:0:0:0:1',NULL,NULL,1,NULL,7,'2026-07-17 07:45:37'),(123,3,'lisi','审批变更','变更管理','com.rd.platform.service.controller.ChangeRequestController.approve','/api/v1/change-requests/3/approve','{\"id\":3}','0:0:0:0:0:0:0:1','{\"id\":3,\"requirementId\":4,\"projectId\":1,\"changeContent\":\"E2E变更内容\",\"changeReason\":\"验证流转\",\"impactScope\":\"低影响\",\"status\":\"TL_APPROVED\",\"applicantId\":2,\"approverId\":1,\"createdAt\":[2026,7,17,7,45,6],\"updatedAt\":[2026,7,17,7,45,6]}','{\"id\":3,\"requirementId\":4,\"projectId\":1,\"changeContent\":\"E2E变更内容\",\"changeReason\":\"验证流转\",\"impactScope\":\"低影响\",\"status\":\"APPROVED\",\"applicantId\":2,\"approverId\":1,\"approvedAt\":[2026,7,17,7,45,46],\"createdAt\":[2026,7,17,7,45,6],\"updatedAt\":[2026,7,17,7,45,6]}',1,NULL,16,'2026-07-17 07:45:46'),(124,2,'zhangsan','提交提测申请','提测管理','com.rd.platform.service.controller.SubmitTestController.submit','/api/v1/submit-tests','{\"request\":{\"requirementId\":4,\"projectId\":1}}','0:0:0:0:0:0:0:1',NULL,NULL,0,'提测前必须为该需求编写至少一条测试用例',14,'2026-07-17 07:45:58'),(125,5,'zhaoliu','变更需求状态','需求管理','com.rd.platform.service.controller.RequirementController.changeStatus','/api/v1/requirements/4/status','{\"id\":4,\"request\":{\"status\":\"RELEASED\"}}','0:0:0:0:0:0:0:1','{\"id\":4,\"projectId\":1,\"title\":\"E2E测试需求\",\"type\":\"FEATURE\",\"priority\":\"HIGH\",\"status\":\"DEVELOPED\",\"description\":\"端到端验证\",\"acceptanceCriteria\":\"Given 用户已登录\\nWhen 点击提交按钮\\nThen 数据保存成功\",\"businessValue\":\"HIGH\",\"ownerId\":2,\"createdBy\":2,\"expectedCompletionDate\":[2026,8,1],\"isFastTrack\":0,\"fastTrackViolated\":0,\"version\":1,\"createdAt\":[2026,7,17,7,44,27],\"updatedAt\":[2026,7,17,7,44,27],\"deleted\":0}',NULL,0,'非法的状态流转：DEVELOPED → RELEASED，禁止越级跳转',3,'2026-07-17 07:45:58'),(126,2,'zhangsan','提交提测申请','提测管理','com.rd.platform.service.controller.SubmitTestController.submit','/api/v1/submit-tests','{\"request\":{\"requirementId\":4,\"projectId\":1}}','0:0:0:0:0:0:0:1',NULL,NULL,0,'提测前必须为该需求编写至少一条测试用例',2,'2026-07-17 07:46:10'),(127,5,'zhaoliu','创建测试用例','测试管理','com.rd.platform.service.controller.TestCaseController.create','/api/v1/test-cases','{\"request\":{\"projectId\":1,\"requirementId\":4,\"moduleName\":\"核心模块\",\"caseName\":\"E2E功能验证用例\",\"precondition\":\"用户已登录\",\"steps\":\"1.打开页面 2.点击按钮\",\"expectedResult\":\"数据保存成功\",\"priority\":\"HIGH\"}}','0:0:0:0:0:0:0:1',NULL,NULL,0,'测试用例必须关联到需求的某条验收标准(AC)',8,'2026-07-17 07:46:29'),(128,2,'zhangsan','提交提测申请','提测管理','com.rd.platform.service.controller.SubmitTestController.submit','/api/v1/submit-tests','{\"request\":{\"requirementId\":4,\"projectId\":1}}','0:0:0:0:0:0:0:1',NULL,NULL,0,'提测前必须为该需求编写至少一条测试用例',3,'2026-07-17 07:46:29'),(129,5,'zhaoliu','变更需求状态','需求管理','com.rd.platform.service.controller.RequirementController.changeStatus','/api/v1/requirements/4/status','{\"id\":4,\"request\":{\"status\":\"RELEASED\"}}','0:0:0:0:0:0:0:1','{\"id\":4,\"projectId\":1,\"title\":\"E2E测试需求\",\"type\":\"FEATURE\",\"priority\":\"HIGH\",\"status\":\"DEVELOPED\",\"description\":\"端到端验证\",\"acceptanceCriteria\":\"Given 用户已登录\\nWhen 点击提交按钮\\nThen 数据保存成功\",\"businessValue\":\"HIGH\",\"ownerId\":2,\"createdBy\":2,\"expectedCompletionDate\":[2026,8,1],\"isFastTrack\":0,\"fastTrackViolated\":0,\"version\":1,\"createdAt\":[2026,7,17,7,44,27],\"updatedAt\":[2026,7,17,7,44,27],\"deleted\":0}',NULL,0,'非法的状态流转：DEVELOPED → RELEASED，禁止越级跳转',3,'2026-07-17 07:46:29'),(130,5,'zhaoliu','创建测试用例','测试管理','com.rd.platform.service.controller.TestCaseController.create','/api/v1/test-cases','{\"request\":{\"projectId\":1,\"requirementId\":4,\"moduleName\":\"核心模块\",\"caseName\":\"E2E功能验证用例\",\"precondition\":\"用户已登录\",\"steps\":\"1.打开页面 2.点击按钮\",\"expectedResult\":\"数据保存成功\",\"priority\":\"HIGH\",\"acRef\":\"Given 用户已登录 When 点击提交按钮 Then 数据保存成功\"}}','0:0:0:0:0:0:0:1',NULL,'{\"id\":3,\"projectId\":1,\"requirementId\":4,\"moduleName\":\"核心模块\",\"caseName\":\"E2E功能验证用例\",\"precondition\":\"用户已登录\",\"steps\":\"1.打开页面 2.点击按钮\",\"expectedResult\":\"数据保存成功\",\"priority\":\"HIGH\",\"status\":\"DRAFT\",\"acRef\":\"Given 用户已登录 When 点击提交按钮 Then 数据保存成功\",\"createdBy\":5}',1,NULL,5,'2026-07-17 07:46:41'),(131,2,'zhangsan','提交提测申请','提测管理','com.rd.platform.service.controller.SubmitTestController.submit','/api/v1/submit-tests','{\"request\":{\"requirementId\":4,\"projectId\":1}}','0:0:0:0:0:0:0:1',NULL,NULL,0,'提测前必须锁定所有关联的测试用例，当前还有 1 条未锁定',5,'2026-07-17 07:46:52'),(132,2,'zhangsan','变更需求状态','需求管理','com.rd.platform.service.controller.RequirementController.changeStatus','/api/v1/requirements/4/status','{\"id\":4,\"request\":{\"status\":\"CLOSED\"}}','0:0:0:0:0:0:0:1','{\"id\":4,\"projectId\":1,\"title\":\"E2E测试需求\",\"type\":\"FEATURE\",\"priority\":\"HIGH\",\"status\":\"DEVELOPED\",\"description\":\"端到端验证\",\"acceptanceCriteria\":\"Given 用户已登录\\nWhen 点击提交按钮\\nThen 数据保存成功\",\"businessValue\":\"HIGH\",\"ownerId\":2,\"createdBy\":2,\"expectedCompletionDate\":[2026,8,1],\"isFastTrack\":0,\"fastTrackViolated\":0,\"version\":1,\"createdAt\":[2026,7,17,7,44,27],\"updatedAt\":[2026,7,17,7,44,27],\"deleted\":0}',NULL,0,'非法的状态流转：DEVELOPED → CLOSED，禁止越级跳转',3,'2026-07-17 07:46:52'),(133,5,'zhaoliu','锁定测试用例','测试管理','com.rd.platform.service.controller.TestCaseController.lock','/api/v1/test-cases/3/lock','{\"id\":3}','0:0:0:0:0:0:0:1','{\"id\":3,\"projectId\":1,\"requirementId\":4,\"moduleName\":\"核心模块\",\"caseName\":\"E2E功能验证用例\",\"precondition\":\"用户已登录\",\"steps\":\"1.打开页面 2.点击按钮\",\"expectedResult\":\"数据保存成功\",\"priority\":\"HIGH\",\"status\":\"DRAFT\",\"createdBy\":5,\"createdAt\":[2026,7,17,7,46,41],\"updatedAt\":[2026,7,17,7,46,41],\"deleted\":0}','{\"id\":3,\"projectId\":1,\"requirementId\":4,\"moduleName\":\"核心模块\",\"caseName\":\"E2E功能验证用例\",\"precondition\":\"用户已登录\",\"steps\":\"1.打开页面 2.点击按钮\",\"expectedResult\":\"数据保存成功\",\"priority\":\"HIGH\",\"status\":\"LOCKED\",\"createdBy\":5,\"lockedAt\":[2026,7,17,7,47,8],\"createdAt\":[2026,7,17,7,46,41],\"updatedAt\":[2026,7,17,7,46,41],\"deleted\":0}',1,NULL,7,'2026-07-17 07:47:08'),(134,2,'zhangsan','提交提测申请','提测管理','com.rd.platform.service.controller.SubmitTestController.submit','/api/v1/submit-tests','{\"request\":{\"requirementId\":4,\"projectId\":1}}','0:0:0:0:0:0:0:1',NULL,NULL,0,'提测前AC覆盖率必须达100%：共 1 条AC，已覆盖 0 条',9,'2026-07-17 07:47:08'),(135,5,'zhaoliu','创建测试用例','测试管理','com.rd.platform.service.controller.TestCaseController.create','/api/v1/test-cases','{\"request\":{\"projectId\":1,\"requirementId\":4,\"moduleName\":\"核心模块\",\"caseName\":\"异常-未登录时提交\",\"precondition\":\"用户未登录\",\"steps\":\"1.直接访问提交页面 2.点击提交\",\"expectedResult\":\"提示请先登录\",\"priority\":\"HIGH\",\"acRef\":\"Given 用户已登录 When 点击提交按钮 Then 数据保存成功\"}}','0:0:0:0:0:0:0:1',NULL,'{\"id\":4,\"projectId\":1,\"requirementId\":4,\"moduleName\":\"核心模块\",\"caseName\":\"异常-未登录时提交\",\"precondition\":\"用户未登录\",\"steps\":\"1.直接访问提交页面 2.点击提交\",\"expectedResult\":\"提示请先登录\",\"priority\":\"HIGH\",\"status\":\"DRAFT\",\"acRef\":\"Given 用户已登录 When 点击提交按钮 Then 数据保存成功\",\"createdBy\":5}',1,NULL,6,'2026-07-17 07:48:12'),(136,5,'zhaoliu','锁定测试用例','测试管理','com.rd.platform.service.controller.TestCaseController.lock','/api/v1/test-cases/4/lock','{\"id\":4}','0:0:0:0:0:0:0:1','{\"id\":4,\"projectId\":1,\"requirementId\":4,\"moduleName\":\"核心模块\",\"caseName\":\"异常-未登录时提交\",\"precondition\":\"用户未登录\",\"steps\":\"1.直接访问提交页面 2.点击提交\",\"expectedResult\":\"提示请先登录\",\"priority\":\"HIGH\",\"status\":\"DRAFT\",\"createdBy\":5,\"createdAt\":[2026,7,17,7,48,12],\"updatedAt\":[2026,7,17,7,48,12],\"deleted\":0}','{\"id\":4,\"projectId\":1,\"requirementId\":4,\"moduleName\":\"核心模块\",\"caseName\":\"异常-未登录时提交\",\"precondition\":\"用户未登录\",\"steps\":\"1.直接访问提交页面 2.点击提交\",\"expectedResult\":\"提示请先登录\",\"priority\":\"HIGH\",\"status\":\"LOCKED\",\"createdBy\":5,\"lockedAt\":[2026,7,17,7,48,13],\"createdAt\":[2026,7,17,7,48,12],\"updatedAt\":[2026,7,17,7,48,12],\"deleted\":0}',1,NULL,6,'2026-07-17 07:48:12'),(137,2,'zhangsan','提交提测申请','提测管理','com.rd.platform.service.controller.SubmitTestController.submit','/api/v1/submit-tests','{\"request\":{\"requirementId\":4,\"projectId\":1}}','0:0:0:0:0:0:0:1',NULL,NULL,0,'提测前AC覆盖率必须达100%：共 1 条AC，已覆盖 0 条',8,'2026-07-17 07:48:12'),(138,2,'zhangsan','提交提测申请','提测管理','com.rd.platform.service.controller.SubmitTestController.submit','/api/v1/submit-tests','{\"request\":{\"requirementId\":4,\"projectId\":1}}','0:0:0:0:0:0:0:1',NULL,NULL,0,'提测前AC覆盖率必须达100%：共 1 条AC，已覆盖 0 条',35,'2026-07-17 07:49:20'),(139,2,'zhangsan','提交提测申请','提测管理','com.rd.platform.service.controller.SubmitTestController.submit','/api/v1/submit-tests','{\"request\":{\"requirementId\":4,\"projectId\":1}}','0:0:0:0:0:0:0:1',NULL,NULL,0,'提测前AC覆盖率必须达100%：共 1 条AC，已覆盖 0 条',34,'2026-07-17 07:51:01'),(140,2,'zhangsan','提交提测申请','提测管理','com.rd.platform.service.controller.SubmitTestController.submit','/api/v1/submit-tests','{\"request\":{\"requirementId\":4,\"projectId\":1}}','0:0:0:0:0:0:0:1',NULL,'{\"id\":1,\"requirementId\":4,\"projectId\":1,\"submitterId\":2,\"status\":\"PENDING\"}',1,NULL,54,'2026-07-17 07:52:18'),(141,5,'zhaoliu','审批提测','提测管理','com.rd.platform.service.controller.SubmitTestController.approve','/api/v1/submit-tests/1/approve','{\"id\":1}','0:0:0:0:0:0:0:1',NULL,NULL,0,'只有测试人员可以审批提测单',33,'2026-07-17 07:52:31'),(142,5,'zhaoliu','变更需求状态','需求管理','com.rd.platform.service.controller.RequirementController.changeStatus','/api/v1/requirements/4/status','{\"id\":4,\"request\":{\"status\":\"RELEASED\"}}','0:0:0:0:0:0:0:1','{\"id\":4,\"projectId\":1,\"title\":\"E2E测试需求\",\"type\":\"FEATURE\",\"priority\":\"HIGH\",\"status\":\"DEVELOPED\",\"description\":\"端到端验证\",\"acceptanceCriteria\":\"Given 用户已登录\\nWhen 点击提交按钮\\nThen 数据保存成功\",\"businessValue\":\"HIGH\",\"ownerId\":2,\"createdBy\":2,\"expectedCompletionDate\":[2026,8,1],\"isFastTrack\":0,\"fastTrackViolated\":0,\"version\":1,\"createdAt\":[2026,7,17,7,44,27],\"updatedAt\":[2026,7,17,7,44,27],\"deleted\":0}',NULL,0,'非法的状态流转：DEVELOPED → RELEASED，禁止越级跳转',11,'2026-07-17 07:52:31'),(143,2,'zhangsan','变更需求状态','需求管理','com.rd.platform.service.controller.RequirementController.changeStatus','/api/v1/requirements/4/status','{\"id\":4,\"request\":{\"status\":\"CLOSED\"}}','0:0:0:0:0:0:0:1','{\"id\":4,\"projectId\":1,\"title\":\"E2E测试需求\",\"type\":\"FEATURE\",\"priority\":\"HIGH\",\"status\":\"DEVELOPED\",\"description\":\"端到端验证\",\"acceptanceCriteria\":\"Given 用户已登录\\nWhen 点击提交按钮\\nThen 数据保存成功\",\"businessValue\":\"HIGH\",\"ownerId\":2,\"createdBy\":2,\"expectedCompletionDate\":[2026,8,1],\"isFastTrack\":0,\"fastTrackViolated\":0,\"version\":1,\"createdAt\":[2026,7,17,7,44,27],\"updatedAt\":[2026,7,17,7,44,27],\"deleted\":0}',NULL,0,'非法的状态流转：DEVELOPED → CLOSED，禁止越级跳转',8,'2026-07-17 07:52:31'),(144,5,'zhaoliu','审批提测','提测管理','com.rd.platform.service.controller.SubmitTestController.approve','/api/v1/submit-tests/1/approve','{\"id\":1}','0:0:0:0:0:0:0:1',NULL,NULL,1,NULL,31,'2026-07-17 07:53:33'),(145,5,'zhaoliu','变更需求状态','需求管理','com.rd.platform.service.controller.RequirementController.changeStatus','/api/v1/requirements/4/status','{\"id\":4,\"request\":{\"status\":\"RELEASED\"}}','0:0:0:0:0:0:0:1','{\"id\":4,\"projectId\":1,\"title\":\"E2E测试需求\",\"type\":\"FEATURE\",\"priority\":\"HIGH\",\"status\":\"TESTING\",\"description\":\"端到端验证\",\"acceptanceCriteria\":\"Given 用户已登录\\nWhen 点击提交按钮\\nThen 数据保存成功\",\"businessValue\":\"HIGH\",\"ownerId\":2,\"createdBy\":2,\"expectedCompletionDate\":[2026,8,1],\"isFastTrack\":0,\"fastTrackViolated\":0,\"version\":1,\"createdAt\":[2026,7,17,7,44,27],\"updatedAt\":[2026,7,17,7,44,27],\"deleted\":0}',NULL,0,'非法的状态流转：TESTING → RELEASED，禁止越级跳转',6,'2026-07-17 07:53:33'),(146,5,'zhaoliu','变更需求状态','需求管理','com.rd.platform.service.controller.RequirementController.changeStatus','/api/v1/requirements/4/status','{\"id\":4,\"request\":{\"status\":\"TESTED\"}}','0:0:0:0:0:0:0:1','{\"id\":4,\"projectId\":1,\"title\":\"E2E测试需求\",\"type\":\"FEATURE\",\"priority\":\"HIGH\",\"status\":\"TESTING\",\"description\":\"端到端验证\",\"acceptanceCriteria\":\"Given 用户已登录\\nWhen 点击提交按钮\\nThen 数据保存成功\",\"businessValue\":\"HIGH\",\"ownerId\":2,\"createdBy\":2,\"expectedCompletionDate\":[2026,8,1],\"isFastTrack\":0,\"fastTrackViolated\":0,\"version\":1,\"createdAt\":[2026,7,17,7,44,27],\"updatedAt\":[2026,7,17,7,44,27],\"deleted\":0}','{\"id\":4,\"projectId\":1,\"title\":\"E2E测试需求\",\"type\":\"FEATURE\",\"priority\":\"HIGH\",\"status\":\"TESTED\",\"description\":\"端到端验证\",\"acceptanceCriteria\":\"Given 用户已登录\\nWhen 点击提交按钮\\nThen 数据保存成功\",\"businessValue\":\"HIGH\",\"ownerId\":2,\"createdBy\":2,\"expectedCompletionDate\":[2026,8,1],\"isFastTrack\":0,\"fastTrackViolated\":0,\"version\":1,\"createdAt\":[2026,7,17,7,44,27],\"updatedAt\":[2026,7,17,7,44,27],\"deleted\":0}',1,NULL,63,'2026-07-17 07:54:03'),(147,2,'zhangsan','变更需求状态','需求管理','com.rd.platform.service.controller.RequirementController.changeStatus','/api/v1/requirements/4/status','{\"id\":4,\"request\":{\"status\":\"RELEASING\"}}','0:0:0:0:0:0:0:1','{\"id\":4,\"projectId\":1,\"title\":\"E2E测试需求\",\"type\":\"FEATURE\",\"priority\":\"HIGH\",\"status\":\"TESTED\",\"description\":\"端到端验证\",\"acceptanceCriteria\":\"Given 用户已登录\\nWhen 点击提交按钮\\nThen 数据保存成功\",\"businessValue\":\"HIGH\",\"ownerId\":2,\"createdBy\":2,\"expectedCompletionDate\":[2026,8,1],\"isFastTrack\":0,\"fastTrackViolated\":0,\"version\":1,\"createdAt\":[2026,7,17,7,44,27],\"updatedAt\":[2026,7,17,7,44,27],\"deleted\":0}','{\"id\":4,\"projectId\":1,\"title\":\"E2E测试需求\",\"type\":\"FEATURE\",\"priority\":\"HIGH\",\"status\":\"RELEASING\",\"description\":\"端到端验证\",\"acceptanceCriteria\":\"Given 用户已登录\\nWhen 点击提交按钮\\nThen 数据保存成功\",\"businessValue\":\"HIGH\",\"ownerId\":2,\"createdBy\":2,\"expectedCompletionDate\":[2026,8,1],\"isFastTrack\":0,\"fastTrackViolated\":0,\"version\":1,\"createdAt\":[2026,7,17,7,44,27],\"updatedAt\":[2026,7,17,7,44,27],\"deleted\":0}',1,NULL,42,'2026-07-17 07:54:03'),(148,2,'zhangsan','变更需求状态','需求管理','com.rd.platform.service.controller.RequirementController.changeStatus','/api/v1/requirements/4/status','{\"id\":4,\"request\":{\"status\":\"CLOSED\"}}','0:0:0:0:0:0:0:1','{\"id\":4,\"projectId\":1,\"title\":\"E2E测试需求\",\"type\":\"FEATURE\",\"priority\":\"HIGH\",\"status\":\"RELEASING\",\"description\":\"端到端验证\",\"acceptanceCriteria\":\"Given 用户已登录\\nWhen 点击提交按钮\\nThen 数据保存成功\",\"businessValue\":\"HIGH\",\"ownerId\":2,\"createdBy\":2,\"expectedCompletionDate\":[2026,8,1],\"isFastTrack\":0,\"fastTrackViolated\":0,\"version\":1,\"createdAt\":[2026,7,17,7,44,27],\"updatedAt\":[2026,7,17,7,44,27],\"deleted\":0}','{\"id\":4,\"projectId\":1,\"title\":\"E2E测试需求\",\"type\":\"FEATURE\",\"priority\":\"HIGH\",\"status\":\"CLOSED\",\"description\":\"端到端验证\",\"acceptanceCriteria\":\"Given 用户已登录\\nWhen 点击提交按钮\\nThen 数据保存成功\",\"businessValue\":\"HIGH\",\"ownerId\":2,\"createdBy\":2,\"expectedCompletionDate\":[2026,8,1],\"isFastTrack\":0,\"fastTrackViolated\":0,\"version\":1,\"createdAt\":[2026,7,17,7,44,27],\"updatedAt\":[2026,7,17,7,44,27],\"deleted\":0}',1,NULL,40,'2026-07-17 07:54:03');
/*!40000 ALTER TABLE `sys_audit_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_config`
--

DROP TABLE IF EXISTS `sys_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_config` (
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
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='系统配置表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_config`
--

LOCK TABLES `sys_config` WRITE;
/*!40000 ALTER TABLE `sys_config` DISABLE KEYS */;
INSERT INTO `sys_config` (`id`, `config_key`, `config_value`, `config_name`, `config_group`, `description`, `created_at`, `updated_at`) VALUES (1,'token.expiration.hours','2','会话保持时长（小时）','security','JWT Token有效期，单位为小时，修改后新登录生效','2026-07-17 07:08:45','2026-07-17 07:08:45'),(2,'token.max.expiration.hours','168','最大会话时长（小时）','security','允许设置的最大Token有效期，168小时=7天','2026-07-17 07:08:45','2026-07-17 07:08:45');
/*!40000 ALTER TABLE `sys_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_permission`
--

DROP TABLE IF EXISTS `sys_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_permission` (
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
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='系统权限表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_permission`
--

LOCK TABLES `sys_permission` WRITE;
/*!40000 ALTER TABLE `sys_permission` DISABLE KEYS */;
INSERT INTO `sys_permission` (`id`, `parent_id`, `permission_code`, `permission_name`, `type`, `path`, `icon`, `sort_order`, `status`, `created_at`) VALUES (1,0,'dashboard','工作台',1,'/dashboard','DashboardOutlined',1,1,'2026-07-03 09:16:20'),(2,0,'project','项目管理',1,'/project','ProjectOutlined',2,1,'2026-07-03 09:16:20'),(3,0,'requirement','需求管理',1,'/requirement','FileTextOutlined',3,1,'2026-07-03 09:16:20'),(4,0,'task','任务管理',1,'/task','CheckSquareOutlined',4,1,'2026-07-03 09:16:20'),(5,0,'test','测试管理',1,'/test','ExperimentOutlined',5,1,'2026-07-03 09:16:20'),(6,0,'bug','缺陷管理',1,'/bug','BugOutlined',6,1,'2026-07-03 09:16:20'),(7,0,'change','变更管理',1,'/change','SwapOutlined',7,1,'2026-07-03 09:16:20'),(8,0,'debt','技术债务',1,'/debt','WarningOutlined',8,1,'2026-07-03 09:16:20'),(9,0,'knowledge','知识库',1,'/knowledge','BookOutlined',9,1,'2026-07-03 09:16:20'),(10,0,'metric','效能度量',1,'/metric','BarChartOutlined',10,1,'2026-07-03 09:16:20'),(11,0,'notification','通知中心',1,'/notification','BellOutlined',11,1,'2026-07-03 09:16:20'),(12,0,'system','系统设置',1,'/system','SettingOutlined',12,1,'2026-07-03 09:16:20'),(13,0,'audit','审计日志',1,'/audit','AuditOutlined',13,1,'2026-07-03 09:16:20'),(14,3,'requirement:create','创建需求',2,'','',1,1,'2026-07-16 08:51:54'),(15,3,'requirement:edit','编辑需求',2,'','',2,1,'2026-07-16 08:51:54'),(16,3,'requirement:delete','删除需求',2,'','',3,1,'2026-07-16 08:51:54'),(17,3,'requirement:cancel','取消需求',2,'','',4,1,'2026-07-16 08:51:54'),(18,3,'requirement:test_pass','标记测试通过',2,'','',5,1,'2026-07-16 08:51:54'),(19,3,'requirement:test_reject','测试退回开发',2,'','',6,1,'2026-07-16 08:51:54'),(20,3,'requirement:release','推进发布/关闭',2,'','',7,1,'2026-07-16 08:51:54'),(21,3,'requirement:dev_progress','变更开发阶段状态',2,'','',8,1,'2026-07-16 08:51:54'),(22,4,'task:create','创建/拆解任务',2,'','',1,1,'2026-07-16 08:51:54'),(23,4,'task:edit','编辑/分派任务',2,'','',2,1,'2026-07-16 08:51:54'),(24,4,'task:dev_progress','推进开发流转',2,'','',3,1,'2026-07-16 08:51:54'),(25,4,'task:test_verify','验证测试结果',2,'','',4,1,'2026-07-16 08:51:54'),(26,5,'testcase:create','创建用例',2,'','',1,1,'2026-07-16 08:51:54'),(27,5,'testcase:approve','审批用例变更',2,'','',2,1,'2026-07-16 08:51:54'),(28,5,'testcase:manage_locked','管理锁定用例',2,'','',3,1,'2026-07-16 08:51:54'),(29,6,'bug:create','提交缺陷',2,'','',1,1,'2026-07-16 08:51:54'),(30,6,'bug:edit','编辑缺陷',2,'','',2,1,'2026-07-16 08:51:54'),(31,6,'bug:close','关闭缺陷',2,'','',3,1,'2026-07-16 08:51:54'),(32,7,'change:create','发起变更',2,'','',1,1,'2026-07-16 08:51:54'),(33,7,'change:approve','审批变更',2,'','',2,1,'2026-07-16 08:51:54'),(34,2,'project:create','创建项目',2,'','',1,1,'2026-07-16 08:51:54'),(35,2,'project:edit','编辑项目',2,'','',2,1,'2026-07-16 08:51:54'),(36,2,'project:delete','删除项目',2,'','',3,1,'2026-07-16 08:51:54'),(37,2,'project:manage_member','管理项目成员',2,NULL,NULL,4,1,'2026-07-16 08:56:20'),(38,2,'sprint:create','创建迭代',2,NULL,NULL,5,1,'2026-07-16 08:56:20'),(39,2,'sprint:edit','编辑迭代',2,NULL,NULL,6,1,'2026-07-16 08:56:20'),(40,12,'system:manage','系统管理操作',2,NULL,NULL,1,1,'2026-07-16 08:56:20'),(41,0,'bug:confirm','确认/拒绝缺陷',2,NULL,NULL,45,1,'2026-07-17 07:36:00'),(42,0,'submit:approve','审批提测单',2,NULL,NULL,0,1,'2026-07-17 07:53:04');
/*!40000 ALTER TABLE `sys_permission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_role`
--

DROP TABLE IF EXISTS `sys_role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_role` (
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='系统角色表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_role`
--

LOCK TABLES `sys_role` WRITE;
/*!40000 ALTER TABLE `sys_role` DISABLE KEYS */;
INSERT INTO `sys_role` (`id`, `role_code`, `role_name`, `description`, `sort_order`, `status`, `created_at`, `updated_at`) VALUES (1,'sys_admin','系统管理员','拥有所有权限',1,1,'2026-07-03 09:16:20','2026-07-03 09:16:20'),(2,'pm','产品经理','需求管理、变更管理',2,1,'2026-07-03 09:16:20','2026-07-03 09:16:20'),(4,'dev','开发人员','任务执行、代码开发',3,1,'2026-07-03 09:16:20','2026-07-16 05:49:35'),(5,'qa','测试人员','测试执行、缺陷管理',4,1,'2026-07-03 09:16:20','2026-07-16 05:49:35'),(6,'project_manager','项目经理','负责项目进度管理和协调',99,1,'2026-07-16 06:00:39','2026-07-16 06:00:39');
/*!40000 ALTER TABLE `sys_role` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_role_permission`
--

DROP TABLE IF EXISTS `sys_role_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_role_permission` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `role_id` bigint NOT NULL COMMENT '角色ID',
  `permission_id` bigint NOT NULL COMMENT '权限ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_permission` (`role_id`,`permission_id`)
) ENGINE=InnoDB AUTO_INCREMENT=156 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='角色权限关联表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_role_permission`
--

LOCK TABLES `sys_role_permission` WRITE;
/*!40000 ALTER TABLE `sys_role_permission` DISABLE KEYS */;
INSERT INTO `sys_role_permission` (`id`, `role_id`, `permission_id`, `created_at`) VALUES (1,1,13,'2026-07-03 09:16:20'),(2,1,6,'2026-07-03 09:16:20'),(3,1,7,'2026-07-03 09:16:20'),(4,1,1,'2026-07-03 09:16:20'),(5,1,8,'2026-07-03 09:16:20'),(6,1,9,'2026-07-03 09:16:20'),(7,1,10,'2026-07-03 09:16:20'),(8,1,11,'2026-07-03 09:16:20'),(9,1,2,'2026-07-03 09:16:20'),(10,1,3,'2026-07-03 09:16:20'),(11,1,12,'2026-07-03 09:16:20'),(12,1,4,'2026-07-03 09:16:20'),(13,1,5,'2026-07-03 09:16:20'),(16,2,6,'2026-07-03 09:16:20'),(17,2,7,'2026-07-03 09:16:20'),(18,2,1,'2026-07-03 09:16:20'),(19,2,9,'2026-07-03 09:16:20'),(20,2,10,'2026-07-03 09:16:20'),(21,2,11,'2026-07-03 09:16:20'),(22,2,2,'2026-07-03 09:16:20'),(23,2,3,'2026-07-03 09:16:20'),(24,2,4,'2026-07-03 09:16:20'),(25,2,5,'2026-07-03 09:16:20'),(53,5,6,'2026-07-03 09:16:20'),(54,5,1,'2026-07-03 09:16:20'),(55,5,9,'2026-07-03 09:16:20'),(56,5,11,'2026-07-03 09:16:20'),(57,5,5,'2026-07-03 09:16:20'),(60,6,1,'2026-07-16 06:01:15'),(61,6,2,'2026-07-16 06:01:15'),(62,2,14,'2026-07-16 08:52:12'),(63,2,15,'2026-07-16 08:52:12'),(64,2,17,'2026-07-16 08:52:12'),(65,2,20,'2026-07-16 08:52:12'),(66,2,21,'2026-07-16 08:52:12'),(67,2,22,'2026-07-16 08:52:12'),(68,2,23,'2026-07-16 08:52:12'),(69,2,32,'2026-07-16 08:52:12'),(70,2,33,'2026-07-16 08:52:12'),(71,2,27,'2026-07-16 08:52:12'),(72,2,34,'2026-07-16 08:52:12'),(73,2,35,'2026-07-16 08:52:12'),(74,2,29,'2026-07-16 08:52:12'),(75,2,30,'2026-07-16 08:52:12'),(80,5,18,'2026-07-16 08:52:12'),(81,5,19,'2026-07-16 08:52:12'),(82,5,25,'2026-07-16 08:52:12'),(83,5,26,'2026-07-16 08:52:12'),(84,5,27,'2026-07-16 08:52:12'),(85,5,29,'2026-07-16 08:52:12'),(86,5,30,'2026-07-16 08:52:12'),(87,5,31,'2026-07-16 08:52:12'),(88,1,37,'2026-07-16 08:56:20'),(89,1,38,'2026-07-16 08:56:20'),(90,1,39,'2026-07-16 08:56:20'),(91,1,40,'2026-07-16 08:56:20'),(95,2,37,'2026-07-16 08:56:20'),(96,2,38,'2026-07-16 08:56:20'),(97,2,39,'2026-07-16 08:56:20'),(98,1,14,'2026-07-16 08:56:35'),(99,1,15,'2026-07-16 08:56:35'),(100,1,16,'2026-07-16 08:56:35'),(101,1,17,'2026-07-16 08:56:35'),(102,1,18,'2026-07-16 08:56:35'),(103,1,19,'2026-07-16 08:56:35'),(104,1,20,'2026-07-16 08:56:35'),(105,1,21,'2026-07-16 08:56:35'),(106,1,22,'2026-07-16 08:56:35'),(107,1,23,'2026-07-16 08:56:35'),(108,1,24,'2026-07-16 08:56:35'),(109,1,25,'2026-07-16 08:56:35'),(110,1,26,'2026-07-16 08:56:35'),(111,1,27,'2026-07-16 08:56:35'),(112,1,28,'2026-07-16 08:56:35'),(113,1,29,'2026-07-16 08:56:35'),(114,1,30,'2026-07-16 08:56:35'),(115,1,31,'2026-07-16 08:56:35'),(116,1,32,'2026-07-16 08:56:35'),(117,1,33,'2026-07-16 08:56:35'),(118,1,34,'2026-07-16 08:56:35'),(119,1,35,'2026-07-16 08:56:35'),(120,1,36,'2026-07-16 08:56:35'),(140,4,1,'2026-07-16 09:03:48'),(141,4,29,'2026-07-16 09:03:48'),(142,4,30,'2026-07-16 09:03:48'),(143,4,24,'2026-07-16 09:03:48'),(144,4,4,'2026-07-16 09:03:48'),(145,4,6,'2026-07-16 09:03:48'),(146,4,8,'2026-07-16 09:03:48'),(147,4,21,'2026-07-16 09:03:48'),(148,4,9,'2026-07-16 09:03:48'),(149,4,11,'2026-07-16 09:03:48'),(150,2,41,'2026-07-17 07:36:00'),(151,5,41,'2026-07-17 07:36:00'),(152,1,41,'2026-07-17 07:36:00'),(154,1,42,'2026-07-17 07:53:04'),(155,5,42,'2026-07-17 07:53:18');
/*!40000 ALTER TABLE `sys_role_permission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_user`
--

DROP TABLE IF EXISTS `sys_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_user` (
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='系统用户表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_user`
--

LOCK TABLES `sys_user` WRITE;
/*!40000 ALTER TABLE `sys_user` DISABLE KEYS */;
INSERT INTO `sys_user` (`id`, `username`, `password`, `nickname`, `email`, `phone`, `avatar`, `status`, `is_first_login`, `last_login_time`, `last_login_ip`, `created_at`, `updated_at`, `deleted`) VALUES (1,'admin','$2b$10$8FAR1cNokZhkWQsRaJXTGe5bfPKJG5pY9fnGFP57qXMqtF5zE9Tmu','系统管理员','admin@taiyi.com',NULL,NULL,1,0,'2026-07-17 08:03:33',NULL,'2026-07-03 09:16:20','2026-07-16 09:03:05',0),(2,'zhangsan','$2b$10$ltN0gIOiTNPjf8dKoODp7O2NNFjv0T4cCTZgUgYSMbZMA0E9RfuVK','张三(产品经理)','zhangsan@taiyi.com',NULL,NULL,1,0,'2026-07-17 07:52:18',NULL,'2026-07-03 09:16:20','2026-07-17 06:55:43',0),(3,'lisi','$2b$10$ltN0gIOiTNPjf8dKoODp7O2NNFjv0T4cCTZgUgYSMbZMA0E9RfuVK','李四(产品经理)','lisi@taiyi.com',NULL,NULL,1,0,'2026-07-17 08:06:30',NULL,'2026-07-03 09:16:20','2026-07-17 06:55:43',0),(4,'wangwu','$2b$10$ltN0gIOiTNPjf8dKoODp7O2NNFjv0T4cCTZgUgYSMbZMA0E9RfuVK','王五(开发)','wangwu@taiyi.com',NULL,NULL,1,0,'2026-07-17 08:08:31',NULL,'2026-07-03 09:16:20','2026-07-17 06:55:43',0),(5,'zhaoliu','$2b$10$ltN0gIOiTNPjf8dKoODp7O2NNFjv0T4cCTZgUgYSMbZMA0E9RfuVK','赵六(测试)','zhaoliu@taiyi.com',NULL,NULL,1,0,'2026-07-17 08:05:14',NULL,'2026-07-03 09:16:20','2026-07-17 06:55:43',0);
/*!40000 ALTER TABLE `sys_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_user_notification_setting`
--

DROP TABLE IF EXISTS `sys_user_notification_setting`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_user_notification_setting` (
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
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户通知偏好设置表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_user_notification_setting`
--

LOCK TABLES `sys_user_notification_setting` WRITE;
/*!40000 ALTER TABLE `sys_user_notification_setting` DISABLE KEYS */;
INSERT INTO `sys_user_notification_setting` (`id`, `user_id`, `channel`, `enabled`, `webhook_url`, `notify_level`, `quiet_start`, `quiet_end`, `created_at`, `updated_at`) VALUES (1,1,'SITE',1,NULL,'ALL',NULL,NULL,'2026-07-16 09:31:44','2026-07-16 09:31:44'),(2,2,'SITE',1,NULL,'ALL',NULL,NULL,'2026-07-16 09:31:44','2026-07-16 09:31:44'),(3,3,'SITE',1,NULL,'ALL',NULL,NULL,'2026-07-16 09:31:44','2026-07-16 09:31:44'),(4,4,'SITE',1,NULL,'ALL',NULL,NULL,'2026-07-16 09:31:44','2026-07-16 09:31:44'),(5,5,'SITE',1,NULL,'ALL',NULL,NULL,'2026-07-16 09:31:44','2026-07-16 09:31:44'),(8,1,'FEISHU',1,'https://open.feishu.cn/open-apis/bot/v2/hook/test123','ALL',NULL,NULL,'2026-07-16 09:42:16','2026-07-16 09:42:16');
/*!40000 ALTER TABLE `sys_user_notification_setting` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sys_user_role`
--

DROP TABLE IF EXISTS `sys_user_role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sys_user_role` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `role_id` bigint NOT NULL COMMENT '角色ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_role` (`user_id`,`role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户角色关联表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sys_user_role`
--

LOCK TABLES `sys_user_role` WRITE;
/*!40000 ALTER TABLE `sys_user_role` DISABLE KEYS */;
INSERT INTO `sys_user_role` (`id`, `user_id`, `role_id`, `created_at`) VALUES (1,1,1,'2026-07-03 09:16:20'),(2,2,2,'2026-07-03 09:16:20'),(4,4,4,'2026-07-03 09:16:20'),(5,5,5,'2026-07-03 09:16:20'),(6,3,2,'2026-07-16 08:47:50');
/*!40000 ALTER TABLE `sys_user_role` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-17  8:15:25
