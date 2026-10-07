# Agent 接入

[返回首页](../README.zh-CN.md) · [English](agent-access.md)

## 临时上下文 REST

除生成接口外，以下 JSON 接口使用口令访问，无需 Google 登录或 API Key。
API 前缀为 `/api/v1`，兼容旧路径 `/api/v1/clipboard/*`。
临时上下文目前不提供 MCP 工具。

临时上下文接口（含兼容路径）允许任意来源跨域访问，无需携带登录 Cookie。
口令访问和每个 IP 每分钟 60 次的限流仍然生效；其他接口继续使用来源白名单。

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

## 账户 Context / Thread REST

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

## 账户 MCP

服务端在 `http://127.0.0.1:3000/mcp` 提供无状态 Streamable HTTP MCP。
在支持 HTTP 的 MCP 客户端中配置该地址和同一个 Bearer API Key 请求头。
部署后使用 API 服务地址下的 `/mcp`；Vercel 网页转发仅覆盖 `/api/*`，不包含 `/mcp`。

工具：`list_contexts`、`get_context`、`create_context`、`update_context`、
`create_thread`、`get_thread`、`update_thread`。

创建和修改参数遵循上面的 REST 契约。读取/修改 Context 时提供 `contextId`；创建
Thread 时提供 `contextId`，读取/修改 Thread 时同时提供 `contextId` 和 `threadId`。
工具失败时返回 `isError: true` 和错误信息，版本冲突错误码为 `VERSION_CONFLICT`。

继续阅读：[使用指南](usage.zh-CN.md) · [本地开发](development.zh-CN.md)
