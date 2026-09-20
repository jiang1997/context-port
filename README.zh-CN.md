# ContextPort

[English](README.md)

ContextPort v0 是一个共享上下文平台，让人类与 Agent 能够围绕同一个 Task 持续读取、补充和交接结构化知识。

`experience/context-crud-mvp` 分支提供了一个刻意保持精简、但可以实际使用的垂直切片：

- pnpm monorepo 与共享 TypeScript 配置
- 使用 React + Vite 构建的 Context 创建、编辑和删除页面
- 使用 PostgreSQL 持久化的 NestJS REST API
- 用于列出、读取、创建和更新 Context 的 Streamable HTTP MCP Server
- 共享 Zod 契约与 Drizzle ORM Migrations
- 本地 Docker Compose 配置与健康检查

## 环境要求

- Node.js 24 LTS
- pnpm 12.4.2
- Docker / Docker Compose

## 本地开发

```bash
cp .env.example .env
pnpm install
docker compose up -d --wait postgres
pnpm db:migrate
pnpm dev
```

Web 默认运行于 `http://localhost:5173`，Server 默认运行于 `http://127.0.0.1:3000`。

### 体验 MVP

打开 `http://localhost:5173`，即可通过 Web 管理 Context。MCP Client 使用以下地址连接：

```text
http://127.0.0.1:3000/mcp
```

MCP Server 提供四个 Tools：

- `list_contexts`
- `get_context`
- `create_context`
- `update_context`

REST API 地址为 `http://127.0.0.1:3000/api/v1/contexts`。

## 常用命令

```bash
pnpm build
pnpm typecheck
pnpm test
pnpm db:generate
pnpm db:migrate
```

## Workspace

```text
apps/web          React Web
apps/server       NestJS REST 与 MCP 入口
packages/contracts 共享 Zod 契约
packages/db       Drizzle Schema、Client 与 Migrations
```

该分支暂不实现 Task、Stage、Tag、鉴权和不可变 Context 历史，优先用于体验最核心的交互闭环。
