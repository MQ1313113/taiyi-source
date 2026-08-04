# 数据库脚本（唯一权威来源）

太一平台的建库脚本统一放在本目录。库名 `rd_platform`，字符集 `utf8mb4`。

## 文件说明

| 文件 | 作用 |
| --- | --- |
| `init_full.sql` | 全量结构 + 基础数据（mysqldump 导出，含全部 24 张表 `biz_*` / `sys_*`，含 `sys_config`） |
| `rbac_data.sql` | 角色 / 权限 / 角色-权限映射等 RBAC 基础数据 |
| `migration_v2_form_standardize.sql` | 增量迁移：为 `biz_task` / `biz_bug` 增加表单标准化字段（幂等，`ADD COLUMN IF NOT EXISTS`） |
| `migration_v8_optimistic_lock_ext.sql` | 增量迁移：为 `biz_task` / `biz_bug` / `biz_submit_test` 增加乐观锁 `version` 列（幂等）。全新库 `init_full.sql` 已含，可跳过 |

## 执行顺序

全新初始化：

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS rd_platform DEFAULT CHARACTER SET utf8mb4;"
mysql -u root -p rd_platform < init_full.sql
mysql -u root -p rd_platform < rbac_data.sql
# 如需 v2 表单标准化字段（老库升级或 init_full 未含时执行；幂等，可安全重复）
mysql -u root -p rd_platform < migration_v2_form_standardize.sql
# v8 乐观锁 version 列（老库升级执行；init_full.sql 已含，全新库可跳过。幂等）
mysql -u root -p rd_platform < migration_v8_optimistic_lock_ext.sql
```

> 后端连接配置见 `backend/rd-platform-service/src/main/resources/application.yml`
> （默认 `jdbc:mysql://localhost:3306/rd_platform`，用户 `rdplatform`）。
