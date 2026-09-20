# ContextPort

[简体中文](README.zh-CN.md)

ContextPort v0 is a shared context platform where humans and agents can continuously read, add, and hand off structured knowledge around the same task.

The repository is currently at the project scaffold stage and includes:

- A pnpm monorepo with shared TypeScript configuration
- A React and Vite web application
- A NestJS server with domain module boundaries
- Shared Zod contracts
- A Drizzle ORM schema and initial PostgreSQL migration
- Local Docker Compose setup and health checks

### Requirements

- Node.js 24 LTS
- pnpm 12.4.2
- Docker / Docker Compose

### Local development

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres
pnpm db:migrate
pnpm dev
```

The web app runs at `http://localhost:5173` and the server runs at `http://127.0.0.1:3000` by default.

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

The next milestone is to connect the minimum Task, Context, REST, and MCP workflow.
