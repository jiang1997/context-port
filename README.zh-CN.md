# ContextPort

[English](README.md)

人类与 Agent 共同维护 Context，并在其下使用 Thread 整理具体话题。
当前 MVP 支持创建和读取；Thread 是文档，不是聊天消息。

## 免登录临时 Context

打开 Web 首页 `/`（或兼容路径 `/clipboard`）：输入至少 8 个字符的口令，或点击 **Generate random passphrase**。
首次使用口令会创建临时 Context；再次输入相同口令会进入同一份内容。任何知道口令的人或 Agent
都可以读取和追加。内容在创建 7 天后过期；再次使用相同口令会创建空白 Context。
请优先使用随机生成的口令，避免用容易猜到的词。网页不会把口令写入 URL；离开后需重新输入。

Agent 可调用以下免登录 REST 接口（请求和响应均为 JSON，同时向下兼容 `/api/v1/clipboard/*`）：

| 方法 | 路径 | 请求正文 | 功能 |
| --- | --- | --- | --- |
| POST | `/api/v1/temporary-contexts/generate` | 无 | 生成口令并创建 Context |
| POST | `/api/v1/temporary-contexts/open` | `{"passphrase":"..."}` | 创建或进入 |
| POST | `/api/v1/temporary-contexts/read` | `{"passphrase":"..."}` | 读取已有 Context |
| POST | `/api/v1/temporary-contexts/append` | `{"passphrase":"...","content":"..."}` | 追加内容 |

单次追加最多 20,000 字符，整体最多 100,000 字符。口令拥有完整读写权限，服务端仅保存带密钥的摘要。
网络部署必须设置稳定的 `CLIPBOARD_SECRET`（至少 32 字符），并在部署新服务前运行 `0005` 迁移。

## 已实现

- Web：Context 列表、创建、详情；Thread 创建、详情，读取结果每 5 秒刷新。
- REST 与 Streamable HTTP MCP 共用业务服务，数据保存到 PostgreSQL。
- 创建时原子保存 v1 和不可变 Revision（标题、正文、作者、时间及入口）。
- Context 详情返回 Thread 索引，Thread 正文按需读取。

尚未提供编辑、删除、排序、归档、历史查看/恢复。版本更新未来必须使用
`expectedVersion`。Markdown 目前按原文显示。

## 本地启动

要求 Node.js 24 LTS、pnpm 12.4.2、Docker。

```bash
# 首次运行复制配置；已有 .env 时保留现有配置
cp .env.example .env
pnpm install
docker compose up -d postgres
pnpm db:migrate
pnpm build
pnpm dev
```

Web：`http://localhost:5173`；REST：`http://127.0.0.1:3000/api/v1`；
MCP：`http://127.0.0.1:3000/mcp`（Streamable HTTP，无状态）。
使用 localhost 打开 Web，与默认 WEB_ORIGIN 保持一致。

Agent 无需安装或配置 MCP 客户端，也可以使用在 Web 的 API Keys 页面创建的个人 Key，
通过 curl 调用 REST 接口读取 JSON。下面是本地示例；部署后将地址换成 API 服务地址：

```bash
curl -fsS -H 'Authorization: Bearer <api-key>' 'http://127.0.0.1:3000/api/v1/contexts?limit=50&offset=0'
curl -fsS -H 'Authorization: Bearer <api-key>' 'http://127.0.0.1:3000/api/v1/contexts/<context-id>'
curl -fsS -H 'Authorization: Bearer <api-key>' 'http://127.0.0.1:3000/api/v1/contexts/<context-id>/threads/<thread-id>'
```

Context 详情包含 Thread 索引，Thread 正文需单独读取。Key 具有当前账户 Context 的读写权限；
只交给可信任的 Agent，不再需要时可在 API Keys 页面撤销。

REST 接口：

| 方法 | 路径 | 功能 |
| --- | --- | --- |
| GET | `/contexts?limit=50&offset=0` | Context 摘要列表 |
| POST | `/contexts` | 创建 Context |
| GET | `/contexts/:contextId` | 正文与 Thread 索引 |
| POST | `/contexts/:contextId/threads` | 创建 Thread |
| GET | `/contexts/:contextId/threads/:threadId` | 读取 Thread |

创建请求示例（Context、Thread 共用）：

```json
{"title":"部署方案","content":"# 背景\n项目约束…","createdByType":"human","createdBy":"用户"}
```

MCP 工具：`list_contexts`、`get_context`、`create_context`、`create_thread`、`get_thread`。
Agent 创建时传 `createdByType: "agent"`，可用 `createdBy` 标记名称。
读取或创建 Thread 时提供 `contextId`，读取 Thread 额外提供 `threadId`。
创建没有幂等键；调用超时后先检查列表，避免盲目重试造成重复。

本地和网络模式下，REST/MCP 均要求经过验证的 Google 浏览器会话或个人 API Key。
本地 Web 登录需在 `.env` 设置 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET` 和
`PUBLIC_BASE_URL=http://localhost:5173`，并在 Google 登记
`http://localhost:5173/api/v1/auth/google/callback`。创建者名称仍由调用方填写，
不作为权限身份。`0004` 迁移面向空数据库，不回填旧 Context。

## 验证

```bash
pnpm typecheck
pnpm build
pnpm test
```

真实数据库集成测试需单独提供可丢弃的 `TEST_DATABASE_URL`，默认跳过。
测试会运行 migration、写入数据并临时创建触发器，不要指向业务数据库。

```bash
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/contextport_test pnpm test
```

`0001_context_thread.sql` 是新增表的迁移，保留旧 Task 等实验数据，不自动转换。
现有迁移手工维护；修改 Schema 后需同时维护 SQL migration 和 journal，
不要直接依赖 `db:generate`（仓库尚未建立完整 Drizzle snapshot 基线）。

后续设计和范围见 [note.md](note.md)。

## 开源协议 (License)

本项目采用 [MIT](LICENSE) 协议开源。
