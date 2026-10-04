# ContextPort

[English](README.md)

供人类与 Agent 共享任务上下文。短期协作可以使用临时上下文，项目知识可以保存在账户
Context 中，并通过 Thread 文档整理聚焦话题。Thread 是文档，不是聊天消息。
网页支持 Markdown 渲染，以及英文和简体中文。

## 选择使用模式

| | 临时上下文 | 账户 Context / Thread |
| --- | --- | --- |
| 访问方式 | 访问口令，无需登录或 API Key | Google 浏览器会话或个人 API Key |
| 有效期 | 创建 7 天后过期 | 不自动过期 |
| 网页能力 | 读取、追加、编辑、清空内容 | 列表、创建、读取文档 |
| Agent 接入 | REST | REST 和 MCP |
| 编辑能力 | 网页和 REST，校验版本 | REST 和 MCP，校验版本 |
| 历史记录 | 仅保存当前内容和版本号 | 创建和修改均保存不可变 Revision，尚无查看/恢复入口 |

账户文档属于其所有者，知道 Context ID 不会获得访问权限。临时上下文与账户文档独立，
不包含 Thread。

## 网页快速使用

打开首页 `/`（兼容路径 `/clipboard` 也可使用），选择 **手动使用**。
输入 8–128 个字符的口令，或点击 **随机生成口令并创建**。
首次使用口令会创建临时上下文，再次输入同一个口令会打开已有内容。

- **复制口令**：仅复制访问口令。
- **复制提示词**：复制包含口令和 REST 命令的说明，让 Agent 读取和追加内容。
  **智能体接入** 页签也提供用于开始任务的提示词。
- **添加内容**：追加文字。**编辑内容**：修改已有全文，通过 **保存修改** 或
  **取消编辑** 完成操作；保存空白文档会清空内容。

知道口令的人都可以读取和修改内容。建议随机生成口令并妥善保存：退出后需重新输入，
网页不会把口令写入 URL。内容在创建 7 天后过期，追加或编辑不会延长有效期。
过期后使用口令打开会创建新的空白上下文；读取或修改已过期的上下文会返回 `404`。

## Agent 接入

### 临时上下文 REST

除生成接口外，以下 JSON 接口使用口令访问，无需 Google 登录或 API Key。
API 前缀为 `/api/v1`，兼容旧路径 `/api/v1/clipboard/*`。
临时上下文目前不提供 MCP 工具。

| 方法 | 路径 | JSON 请求正文 | 功能 |
| --- | --- | --- | --- |
| POST | `/temporary-contexts/generate` | 无 | 生成口令并创建上下文 |
| POST | `/temporary-contexts/open` | `{"passphrase":"..."}` | 创建或进入 |
| POST | `/temporary-contexts/read` | `{"passphrase":"..."}` | 读取已有内容 |
| POST | `/temporary-contexts/append` | `{"passphrase":"...","content":"..."}` | 追加文字 |
| POST | `/temporary-contexts/update` | `{"passphrase":"...","content":"...","expectedVersion":2}` | 替换全部内容，允许清空 |

本地 API 示例（部署后将地址换成自己的 API 服务地址）：

```bash
curl -fsS -X POST 'http://127.0.0.1:3000/api/v1/temporary-contexts/generate'
curl -fsS -X POST 'http://127.0.0.1:3000/api/v1/temporary-contexts/open' \
  -H 'Content-Type: application/json' -d '{"passphrase":"example-passphrase"}'
curl -fsS -X POST 'http://127.0.0.1:3000/api/v1/temporary-contexts/append' \
  -H 'Content-Type: application/json' -d '{"passphrase":"example-passphrase","content":"Task background"}'
curl -fsS -X POST 'http://127.0.0.1:3000/api/v1/temporary-contexts/read' \
  -H 'Content-Type: application/json' -d '{"passphrase":"example-passphrase"}'
```

生成接口返回口令 `passphrase` 和上下文。其余操作返回 `content`、`version`、
`createdAt`、`updatedAt`、`expiresAt`；打开接口还返回 `created`。
新上下文从版本 1 开始，每次追加或修改都会递增版本。

修改前先读取内容，将响应中的版本号作为 `expectedVersion`。例如读取结果为版本 2：

```bash
curl -fsS -X POST 'http://127.0.0.1:3000/api/v1/temporary-contexts/update' \
  -H 'Content-Type: application/json' \
  -d '{"passphrase":"example-passphrase","content":"Revised task background","expectedVersion":2}'
```

版本过旧会返回 `409 VERSION_CONFLICT`：重新读取、合并修改，再使用最新版本重试。
不要仅替换版本号就覆盖其他人追加的内容。单次追加为 1–20,000 字符，整体内容及替换
内容最多 100,000 字符。服务端保存带密钥的口令摘要和共享内容；口令摘要不代表内容加密。

### 账户 Context / Thread REST

使用 Google 登录后，在 **API 密钥** 页面（`/keys`）创建个人 Key。
Agent 通过 `Authorization: Bearer <api-key>` 访问。Key 具有其所有者文档的读写权限，
只交给可信任的 Agent，不再需要时撤销。浏览器会话的写请求还需 CSRF 请求头，网页会处理。

以下路径均以 `/api/v1` 为前缀：

| 方法 | 路径 | 功能 |
| --- | --- | --- |
| GET | `/contexts?limit=50&offset=0` | Context 摘要列表，不含正文 |
| POST | `/contexts` | 创建 Context |
| GET | `/contexts/:contextId` | Context 正文与 Thread 索引 |
| PATCH | `/contexts/:contextId` | 修改 Context |
| POST | `/contexts/:contextId/threads` | 创建 Thread |
| GET | `/contexts/:contextId/threads/:threadId` | 读取 Thread |
| PATCH | `/contexts/:contextId/threads/:threadId` | 修改 Thread |

```bash
curl -fsS -H 'Authorization: Bearer <api-key>' \
  'http://127.0.0.1:3000/api/v1/contexts?limit=50&offset=0'
curl -fsS -X POST 'http://127.0.0.1:3000/api/v1/contexts' \
  -H 'Authorization: Bearer <api-key>' -H 'Content-Type: application/json' \
  -d '{"title":"Project background","content":"# Goals\nShared instructions","createdByType":"agent","createdBy":"My agent"}'
curl -fsS -X PATCH 'http://127.0.0.1:3000/api/v1/contexts/<context-id>' \
  -H 'Authorization: Bearer <api-key>' -H 'Content-Type: application/json' \
  -d '{"content":"Updated instructions","updatedByType":"agent","updatedBy":"My agent","expectedVersion":1}'
```

Context 和 Thread 的创建请求正文相同：必填 `title`（1–300 字符）和
`createdByType`（`human` 或 `agent`），选填 `content`（最多 100,000 字符）及
`createdBy`。修改请求必须包含 `expectedVersion`、`updatedByType`，以及 `title` 或
`content` 中至少一项；`updatedBy` 可选。版本号应使用前一次读取的结果，不能固定使用
示例值。过旧版本返回 `409 VERSION_CONFLICT`，需重新读取、合并后重试。
创建和每次成功修改都在同一事务中保存不可变 Revision。

Context 详情包含不带正文的 Thread 摘要，Thread 正文需单独读取。
调用方填写的作者名称只是标签，不作为权限身份。创建没有幂等键，超时后先检查列表，
避免盲目重试造成重复。

### 账户 MCP

服务端在 `http://127.0.0.1:3000/mcp` 提供无状态 Streamable HTTP MCP。
在支持 HTTP 的 MCP 客户端中配置该地址和同一个 Bearer API Key 请求头。
部署后使用 API 服务地址下的 `/mcp`；Vercel 网页转发仅覆盖 `/api/*`，不包含 `/mcp`。

工具：`list_contexts`、`get_context`、`create_context`、`update_context`、
`create_thread`、`get_thread`、`update_thread`。

创建和修改参数遵循上面的 REST 契约。读取/修改 Context 时提供 `contextId`；创建
Thread 时提供 `contextId`，读取/修改 Thread 时同时提供 `contextId` 和 `threadId`。
工具失败时返回 `isError: true` 和错误信息，版本冲突错误码为 `VERSION_CONFLICT`。

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

## 部署

仓库提供网页的 [Vercel 配置](vercel.json) 和服务端的 [Render Blueprint](render.yaml)。
在平台配置 Git 连接与正式分支，本仓库使用 `main`。开启 Git 部署后，Vercel 部署正式
分支；Render 配置为等待 CI 检查通过后部署。测试新功能前，确认前后端部署均已完成。

Vercel 的 `VITE_API_BASE_URL` 保持 `/api/v1`，`/api/*` 转发目标是 Render 服务端；
使用其他服务端时需修改目标地址。Render 配置 `DATABASE_URL`、`WEB_ORIGIN`，并为网络
模式设置稳定的 `CLIPBOARD_SECRET`（至少 32 字符）。账户登录还需配置上述 Google 变量，
其中 `PUBLIC_BASE_URL` 应与公开网页地址一致，并登记对应的 OAuth 回调。

新数据库需执行全部迁移。现有部署在数据库结构变化时执行尚未应用的迁移；仅前端或
不涉及结构变化的 API 更新无需迁移数据库。当前 Render 免费套餐配置没有自动迁移步骤，
需要使用目标数据库的 direct/unpooled `DATABASE_URL` 执行 `pnpm db:migrate`，再发布
依赖新结构的代码。

`0004` 迁移将 Context 所有者设为必填，是为使用空数据库上线设计的，不会回填无所有者
的旧记录。SQL 迁移和 journal 手工维护，保留旧实验表，不会自动转换为 Context。
仓库尚未建立完整 Drizzle snapshot 基线，不能直接依赖 `db:generate`。
配置细节及此前上线记录见 [部署检查说明](docs/production-env-checklist.md)。

## 当前限制

账户 Context/Thread 可通过 REST/MCP 编辑，网页目前仅提供创建和读取。
尚未提供删除、归档、自定义排序、Revision 查看及恢复入口。
临时上下文不保存 Revision 历史，也不绑定账户所有者。
产品设计及后续计划见 [note.md](note.md)，其中规划的功能并非全部已实现。

## 开源协议

[MIT](LICENSE) © 2026 jiang1997
