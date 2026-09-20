# ContextPort

[English](README.md)

ContextPort v0 是一个共享上下文平台，让人类与 Agent 能够围绕同一个 Task 持续读取、补充和交接结构化知识。

当前仓库处于项目骨架阶段，已经包含：

- pnpm monorepo 与共享 TypeScript 配置
- React + Vite Web 应用
- NestJS Server 及领域模块边界
- 共享 Zod 契约
- Drizzle ORM Schema 与首个 PostgreSQL Migration
- 本地 Docker Compose 配置与健康检查

## 环境要求

- Node.js 24 LTS
- pnpm 12.4.2
- Docker / Docker Compose

## 本地开发

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres
pnpm db:migrate
pnpm dev
```

Web 默认运行于 `http://localhost:5173`，Server 默认运行于 `http://127.0.0.1:3000`。

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

下一阶段将接通 Task、Context、REST 与 MCP 的最小闭环。
