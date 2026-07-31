# 太一（TaiYi）研发管理平台

> 基于 Spring Boot 2.7.18 + MyBatis-Plus + MySQL 8.0 + React 18 + Ant Design 的全栈研发管理平台

## 项目概述

太一研发管理平台是一套面向中大型研发团队的全流程项目管理系统，覆盖从需求采集到交付验收的完整研发生命周期。平台支持三档位弹性管理框架（轻量档L1/标准档L2/完整档L3），可根据项目规模动态调整管控力度。

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 后端框架 | Spring Boot | 2.7.18 |
| ORM | MyBatis-Plus | 3.5.5 |
| 数据库 | MySQL | 8.0 |
| 安全框架 | Spring Security + JWT | - |
| 前端框架 | React | 18.x |
| UI组件库 | Ant Design | 5.x |
| 构建工具 | Vite | 8.x |
| 包管理 | pnpm | 11.x |

## 功能模块（22个）

1. **认证登录** - JWT Token认证、首次登录强制改密
2. **角色权限（RBAC）** - 5种角色、细粒度权限控制
3. **弹性框架（档位管理）** - L1/L2/L3三档位动态字段校验
4. **项目管理** - 项目CRUD、状态管理、档位配置
5. **迭代管理** - Sprint规划、启动、完成
6. **需求管理** - 9状态8转换状态机、快速通道、评审会签
7. **开发任务** - 任务拆解、分派、状态流转
8. **测试管理** - 测试用例库、执行记录
9. **提测管理** - 提测申请、审批流程
10. **缺陷管理** - Bug全生命周期、交叉确认规则
11. **变更管理** - 变更申请、影响分析、审批
12. **技术债务** - 债务识别、排期、跟踪
13. **通知中心** - 多类型通知、已读管理
14. **审计日志** - 操作审计、AOP自动记录
15. **知识库** - 文档管理、分类标签
16. **跨团队依赖** - 依赖跟踪、状态管理
17. **效能度量** - 项目指标、团队工作量
18. **预警引擎** - 定时扫描、自动预警
19. **资源排期** - 工作量统计
20. **新人Onboarding** - 知识库集成
21. **Bug复盘** - 根因分析
22. **国际化** - 中英文支持

## 项目结构

> 数据库脚本已统一至仓库根 `database/` 目录（唯一来源），见 `database/README.md`。
> 前后端不分离：`mvn package` 会把前端产物打进 `rd-platform-service` 的 jar，单产物启动。

```
rd-platform-parent/                      # Maven 多模块项目（单产物：前端内嵌进后端 jar）
├── pom.xml                              # 父 POM
├── rd-platform-common/                  # 公共模块（工具类、异常、常量）
├── rd-platform-model/                   # 数据模型（实体类、Mapper）
├── rd-platform-security/                # 安全模块（JWT、Filter、Config）
└── rd-platform-service/                 # 服务模块（Controller、Service、启动类）
    └── src/main/
        ├── java/                        # 后端代码
        ├── resources/                   # application.yml、system-data 等
        └── frontend/                    # 前端 React 项目（本模块构建时产出 dist/ 内嵌进 jar 的 static/）
            ├── package.json
            ├── vite.config.ts
            └── src/
                ├── App.tsx              # 路由配置（wouter）
                ├── main.tsx            # 入口
                ├── contexts/            # 全局状态（Auth）
                ├── services/            # API 服务层
                ├── components/          # 布局与 UI 组件（Radix + Tailwind）
                └── pages/               # 各功能页面（需求/迭代/任务/缺陷/变更/技术债/度量…）
```

## 快速启动

### 环境要求

- JDK 1.8+
- Maven 3.6+
- MySQL 8.0+
- Node.js 18+
- pnpm 8+

### 1. 数据库初始化

脚本与执行顺序见 `database/README.md`：

```bash
mysql -u root -p rd_platform < ../database/init_full.sql
mysql -u root -p rd_platform < ../database/rbac_data.sql
```

### 2. 构建并启动（单产物，含前端）

```bash
cd backend
mvn clean package -DskipTests            # 自动构建前端并打进 jar
java -jar rd-platform-service/target/rd-platform-service-1.0.0.jar
```

访问 `http://localhost:8080` —— API 与前端页面同一端口。仅调后端可加 `-Dskip.frontend=true` 跳过前端构建。

### 3. 前端本地开发（可选，HMR）

```bash
cd backend/rd-platform-service/src/main/frontend
pnpm install
pnpm dev
```

前端启动在 `http://localhost:3000`，自动代理 `/api` 到后端 `:8080`。

### 4. 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 系统管理员 | admin | admin123 |
| 项目经理 | pm_wang | admin123 |
| 开发工程师 | dev_zhang | admin123 |
| 测试工程师 | test_li | admin123 |
| 产品经理 | po_chen | admin123 |

## 生产部署

### Docker 部署（推荐，单产物）

前端已内嵌进后端 jar，只需一个应用容器 + MySQL：

```yaml
# docker-compose.yml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root123
      MYSQL_DATABASE: rd_platform
    ports:
      - "3306:3306"
    volumes:
      - ../database/init_full.sql:/docker-entrypoint-initdb.d/01_init.sql
      - ../database/rbac_data.sql:/docker-entrypoint-initdb.d/02_rbac.sql

  app:                                   # 同时提供 API 与前端页面
    build: .
    ports:
      - "8080:8080"
    depends_on:
      - mysql
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/rd_platform
      SPRING_DATASOURCE_USERNAME: root
      SPRING_DATASOURCE_PASSWORD: root123
```

### 离线部署

1. 提前下载所有依赖包（Maven 离线仓库 + pnpm 离线包）
2. 将单个 `rd-platform-service-1.0.0.jar`（已含前端）拷贝至目标服务器
3. 使用 systemd 管理该服务，监听 `:8080` 即对外提供全部功能（API 与前端页面同端口，无需 nginx）

## API 文档

后端提供 168+ 个 RESTful API 接口，主要包括：

- `POST /api/v1/auth/login` - 用户登录
- `GET/POST /api/v1/projects` - 项目管理
- `GET/POST /api/v1/sprints` - 迭代管理
- `GET/POST /api/v1/requirements` - 需求管理
- `PUT /api/v1/requirements/{id}/status` - 需求状态流转
- `GET/POST /api/v1/tasks` - 任务管理
- `GET/POST /api/v1/test-cases` - 测试用例
- `GET/POST /api/v1/submit-tests` - 提测管理
- `GET/POST /api/v1/bugs` - 缺陷管理
- `GET/POST /api/v1/change-requests` - 变更管理
- `GET/POST /api/v1/tech-debts` - 技术债务
- `GET /api/v1/notifications` - 通知中心
- `GET /api/v1/audit-logs` - 审计日志
- `GET/POST /api/v1/knowledge` - 知识库
- `GET/POST /api/v1/dependencies` - 跨团队依赖
- `GET /api/v1/metrics/project/{id}` - 效能度量
- `GET /api/v1/users` - 用户管理

## 核心业务规则

### 需求状态机（9状态8转换）

```
DRAFT → SUBMITTED → REVIEWING → APPROVED → DEVELOPING → TESTING → ACCEPTED → CLOSED
                  ↘ REJECTED → DRAFT (回退)
```

### 快速通道约束

- 同时进行的快速通道需求不超过总需求的 20%
- 48小时内必须补齐评审材料
- 超时未补齐自动标记违规

### 三档位字段校验

- **L1（轻量档）**：最少必填字段，适合快速迭代
- **L2（标准档）**：增加业务价值、验收标准等字段
- **L3（完整档）**：全字段必填，含风险评估、依赖分析

### 交叉确认规则

- R1：需求评审需要至少2人确认
- R2：代码审查需要非作者确认
- R3：Bug修复需要提交者验证
- R4：变更需要影响方确认

## 许可证

MIT License
