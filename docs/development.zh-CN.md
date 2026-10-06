# 本地开发

[返回首页](../README.zh-CN.md) · [English](development.md)

## 本地开发

要求 Node.js 24+、pnpm 12.4.2，以及已启动的 Docker 引擎。在仓库根目录执行：

```bash
# 首次运行复制配置；已有 .env 时保留现有配置。
cp .env.example .env
pnpm install
docker compose up -d postgres
# PostgreSQL 显示 accepting connections 后再执行迁移。
docker compose exec postgres pg_isready -U contextport -d context_port
pnpm db:migrate
pnpm build
pnpm dev
```

Web：`http://localhost:5173`；REST：`http://127.0.0.1:3000/api/v1`；
MCP：`http://127.0.0.1:3000/mcp`。使用 `localhost` 打开网页，与默认 `WEB_ORIGIN`
一致。网页请求 `/api/v1`，Vite 将 API 请求转发到本地服务端。

仅使用临时上下文无需配置 Google。使用账户 Context、Google 登录或创建 API Key 时，
在启动服务端之前，在 `.env` 中同时设置以下三个变量：

```dotenv
GOOGLE_CLIENT_ID=<your OAuth Web client ID>
GOOGLE_CLIENT_SECRET=<your OAuth Web client secret>
PUBLIC_BASE_URL=http://localhost:5173
```

在 OAuth 客户端登记回调地址 `http://localhost:5173/api/v1/auth/google/callback`。
其余配置见 `.env.example`。本地和网络模式下，访问账户文档的 REST/MCP 均需认证。

## 验证

```bash
pnpm typecheck
pnpm build
pnpm test
```

未设置 `TEST_DATABASE_URL` 时，数据库集成测试会跳过。完整测试需先启动上述 Compose
PostgreSQL 服务，再创建独立测试库（仅首次创建；以下命令使用默认本地 Compose 凭证）：

```bash
docker compose exec postgres createdb -U contextport contextport_test
TEST_DATABASE_URL=postgresql://contextport:contextport@localhost:5432/contextport_test pnpm test
```

后续复用测试库，执行第二条命令即可。测试会运行迁移、清理测试数据并临时创建触发器，
务必使用可丢弃的测试库，不要指向开发业务库或生产库。
GitHub CI 会启动 PostgreSQL 并设置 `TEST_DATABASE_URL`，因此会运行数据库集成测试。

继续阅读：[部署](deployment.zh-CN.md) · [Agent 接入](agent-access.zh-CN.md)
