# ContextPort

[简体中文](README.zh-CN.md)

ContextPort v0 is a shared context platform where humans and agents can continuously read, add, and hand off structured knowledge around the same task.

The `experience/context-crud-mvp` branch provides a deliberately small, usable vertical slice:

- A pnpm monorepo with shared TypeScript configuration
- A React and Vite web app for creating, editing, and deleting contexts
- A NestJS REST API backed by PostgreSQL
- A Streamable HTTP MCP server for listing, reading, creating, and updating contexts
- Shared Zod contracts and Drizzle ORM migrations
- Local Docker Compose setup and health checks

### Requirements

- Node.js 24 LTS
- pnpm 12.4.2
- Docker / Docker Compose

### Local development

```bash
cp .env.example .env
pnpm install
docker compose up -d --wait postgres
pnpm db:migrate
pnpm dev
```

The web app runs at `http://localhost:5173` and the server runs at `http://127.0.0.1:3000` by default.

### Experience the MVP

Open `http://localhost:5173` to manage contexts in the web app. Connect an MCP client to:

```text
http://127.0.0.1:3000/mcp
```

The MCP server exposes four tools:

- `list_contexts`
- `get_context`
- `create_context`
- `update_context`

The REST API is available at `http://127.0.0.1:3000/api/v1/contexts`.

### Commands

```bash
pnpm build
pnpm typecheck
pnpm test
pnpm db:generate
pnpm db:migrate
```

### Workspace

```text
apps/web          React Web
apps/server       NestJS REST and MCP entry points
packages/contracts Shared Zod contracts
packages/db       Drizzle schema, client, and migrations
```

This branch intentionally omits tasks, stages, tags, authentication, and immutable context history so the core interaction can be evaluated first.
