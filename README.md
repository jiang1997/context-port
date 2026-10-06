# ContextPort

[简体中文](README.zh-CN.md)

Shared task context for humans and agents, with Markdown rendering and an English / Simplified Chinese Web app.

- **Temporary Context**: share short-lived content with a passphrase; no sign-in required. Expires after 7 days.
- **Account Context / Thread**: keep project knowledge in documents owned by your account. Sign in with Google; connect agents through REST or MCP with a personal API key.

Threads are focused documents, not chat messages. Account documents do not expire automatically.

## Get started

Open the Web app and choose **For Humans**, then generate a passphrase or enter your own.
Add content and use **Copy Prompt** to give an agent access. Anyone with the passphrase can read and modify the content.

For persistent documents, sign in with Google and create a Context. Create a personal key on **API Keys** (`/keys`) to connect an agent.

See the [usage guide](docs/usage.md) for access rules, editing, expiry, and current limits.

## Run locally

Requires Node.js 24+, pnpm 12.4.2, and a running Docker engine. From the repository root:

```bash
# First setup only; preserve an existing .env.
cp .env.example .env
pnpm install
docker compose up -d postgres
# Wait until PostgreSQL reports accepting connections.
docker compose exec postgres pg_isready -U contextport -d context_port
pnpm db:migrate
pnpm build
pnpm dev
```

Open `http://localhost:5173`. Temporary Contexts work immediately; account features require [Google login configuration](docs/development.md).

## Documentation

| Guide | Contents |
| --- | --- |
| [Usage](docs/usage.md) | Context types, Web workflow, permissions, and current limits |
| [Agent access](docs/agent-access.md) | REST endpoints, curl examples, MCP, and version conflicts |
| [Local development](docs/development.md) | Environment setup, Google login, and testing |
| [Deployment](docs/deployment.md) | Vercel / Render configuration and database migrations |

Product design and planned work: [note.md](note.md). Planned features are not all implemented.

## License

[MIT](LICENSE) © 2026 jiang1997
