# 太一 (TaiYi) 研发管理平台

太一研发管理平台是一套面向研发团队的全流程协同与治理系统，贯彻“渐进式弹性框架”与“职责分离（Segregation of Duties）”理念，覆盖需求、迭代、任务、缺陷、变更、技术债务、效能度量等核心研发活动。

## 架构：前后端不分离，单产物部署

前端仍用 React 开发，但**构建时打包进后端 jar**——`mvn package` 产出一个可执行 jar，`java -jar` 一处启动，`:8080` 同时提供 API 与页面，无需 nginx 托管前端、无需单独部署前端。

| 目录 | 说明 | 技术栈 |
| --- | --- | --- |
| `backend/` | 后端服务（Maven 多模块，含 Spring Boot 启动模块）；前端源码已并入 `rd-platform-service/src/main/frontend`，构建产物内嵌进 jar | Java 8 + Spring Boot + MySQL；前端 React + TypeScript + Vite + Wouter + Radix UI + Tailwind CSS |
| `database/` | 数据库脚本唯一来源（建库 / RBAC / 迁移） | MySQL 8.0 |
| `docs/` | 走查报告与设计笔记 | - |

## 角色体系

平台内置五种系统角色，权限严格分离：

- `sys_admin`：系统管理员（全局兜底管理权，框架档位调整唯一入口）
- `pm`：产品经理
- `dev`：开发人员
- `qa`：测试人员

## 生产构建与运行（单产物）

一键脚本（推荐，根目录）：

```bash
./deploy.sh deploy      # Linux / Git Bash：构建（含前端）+ 后台启动
./deploy.sh status      # 查看状态
./deploy.sh stop        # 停止
# Windows：deploy.bat deploy   （构建 + 前台运行）
```

> 端口/JVM 参数可用环境变量覆盖：`SERVER_PORT=9090 JAVA_OPTS="-Xmx2g" ./deploy.sh start`

手动等价命令：

```bash
cd backend
mvn -DskipTests package          # 自动执行前端 pnpm build 并打进 jar
java -jar rd-platform-service/target/rd-platform-service-1.0.0.jar
# 访问 http://localhost:8080 —— API 与前端页面同一端口
```

> 仅调后端、想跳过前端构建时：`mvn -DskipTests package -Dskip.frontend=true`

## 本地开发（保留前端 HMR）

前后端分端口跑，Vite 开发服务器代理 `/api` 到后端，享受热更新：

```bash
# 终端 1：后端（:8080）
cd backend && mvn spring-boot:run -pl rd-platform-service

# 终端 2：前端（:3000，代理 /api -> :8080）
cd backend/rd-platform-service/src/main/frontend && pnpm install && pnpm dev
```

## 数据库

MySQL，库名 `rd_platform`，脚本与执行顺序见 `database/README.md`。

## 走查与修复

本仓库已经过全角色（PM / 开发 / 测试 / 系统管理员）系统性走查，详见 `docs/`。
