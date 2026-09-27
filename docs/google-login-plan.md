# ContextPort Google 登录与开放注册计划

状态：实施中。阶段 0/1/2/3 代码已落地：数据隔离与会话（阶段 2）、Web 登录状态/退出/登录按钮（替换手输 Token）、`VITE_API_BASE_URL` 同源 `/api/v1`（Vite 开发代理 + 根 `vercel.json` 将 `/api/*` 转发到 Render，置于 SPA 回退之前）。生产浏览器矩阵验证（真实 Vercel/Render 上确认 Cookie 转发）仍属上线步骤。阶段 4/5 未开始。更新日期：2026-09-27。

## 目标与默认决定

- 用户用 Google 账号首次登录时自动创建 ContextPort 账号，之后可再次登录。
- 每位用户默认只能列出、读取、创建自己的 Context 和其下的 Thread。
- 现有生产数据归到项目所有者账号；归属由明确的 Google 账号确认，不能按“第一个登录的人”自动认领。
- Web 登录与 MCP 客户端鉴权分开处理。任何旧的共享 Token 都不能获得跨用户读写权限。
- Google 登录仅请求 `openid email profile`；不申请 Google Drive 等业务数据权限。

若产品目标是多人共享同一 Context，需要另设计成员、邀请和权限表，不能把“所有登录用户可读写”当作默认开放注册方式。

## 当前状态与缺口

| 位置 | 当前行为 | 必须改变的点 |
| --- | --- | --- |
| `apps/server/src/common/business.guard.ts` | 一枚 `API_AUTH_TOKEN` 保护 REST 与 MCP | 按用户识别请求；停用共享 Token 的全局访问能力 |
| `packages/db/src/schema/contexts.ts` | `contexts`、`threads` 无用户归属 | 增加账号表及 Context 所有者外键；访问时检查归属 |
| `apps/server/src/context/context.service.ts` | 列表和详情按 ID 查询，未按用户过滤 | 每个查询和写入都传入当前用户，并检查所有者 |
| `apps/server/src/mcp/mcp.server.ts` | MCP 工具调用同一无用户参数服务 | 为每个 MCP 请求解析用户身份；工具沿用同一权限检查 |
| `apps/web/src/api/auth-token.ts`、`components/app-shell.tsx` | 手输共享 Token，保存在 `localStorage` | 改为登录状态、用户菜单及退出；清理旧 Token |
| `vercel.json` | 仅将页面路径回退到 `index.html` | API 与登录回调优先转发到 Render，再保留页面回退 |
| `render.yaml` | Render 新加坡区，CI 通过后部署；数据库迁移仍手动执行 | 增加登录配置；按安全迁移顺序部署 |

`createdBy` 和 `createdByType` 目前是调用方填写的展示/审计字段，不是用户身份，也不能作为权限依据。`revisions` 通过 Context 或 Thread 继承归属，不需要把这些展示字段改成登录邮箱。

## 技术方案

### 1. 登录和会话

1. 在 Google Cloud 创建 Web OAuth 客户端，登记正式站点和本地开发回调地址，设置 OAuth 品牌信息。生产环境配置允许真实用户登录，而非只允许测试账号。
2. NestJS 提供 `GET /api/v1/auth/google/start`、`GET /api/v1/auth/google/callback`、`GET /api/v1/auth/me`、`POST /api/v1/auth/logout`。用授权码流程；回调验证一次性 `state`，服务端交换授权码并验证 ID Token 的签名、`aud`、`iss`、`exp`。使用 Google `sub` 作为外部账号唯一键，邮箱仅用于展示和联系。
3. Neon 新增 `users` 与 `sessions`。`users` 保存内部 UUID、Google `sub`、邮箱、名称、头像、创建时间；`sessions` 保存随机会话凭证的哈希、用户 ID、过期与撤销时间。首次登录按 `sub` 幂等创建账号；后续登录更新可变的展示信息。
4. 登录成功后只向浏览器下发应用会话 Cookie：`HttpOnly; Secure; SameSite=Lax; Path=/`，不把 Google ID Token、Google access token 或应用会话存入 `localStorage`。会话到期或退出后须重新登录；退出撤销服务端会话。
5. Cookie 鉴权的写操作校验 `Origin` 和 CSRF 凭证；OAuth 回调使用一次性 `state` 防伪。限制回调后跳转到站内安全路径，避免开放跳转。认证端点加基本速率限制和审计日志，日志不记录授权码或 Token。

### 2. 同站点 API 入口

现有 Vercel 站点和 Render API 是不同站点，直接从浏览器访问 Render 并依赖跨站 Cookie 会受到浏览器策略影响。计划在 Vercel 配置转发：`/api/:path*` → 新加坡 Render 的同路径，并置于 SPA 回退规则之前。Web 将 `VITE_API_BASE_URL` 改为同源 `/api/v1`；Google 回调的公开地址也使用 Vercel 站点的 `/api/v1/auth/google/callback`，由转发交给 Render 处理。

上线前必须在实际 Vercel 部署上确认授权回调、`Set-Cookie`、后续请求携带 Cookie、退出清除 Cookie、Safari/Firefox 登录均正常。若代理链路不能稳定满足这些条件，改用自有域名下的同站点 Web/API 子域名，再开放注册。Render 的直连域名继续可用于健康检查和持有个人凭证的 MCP 客户端；不作为浏览器会话入口。

### 3. 数据归属和接口权限

- `contexts.owner_user_id` 引用 `users.id`，最终为 `NOT NULL`，建立 `(owner_user_id, created_at, id)` 索引。Thread 和 Revision 通过父 Context 判断归属；写入 Thread 时在同一个事务里锁定并检查父 Context。
- REST 的列表、详情、Thread 详情、创建 Context、创建 Thread 都以服务端认证出的用户 ID 为参数。按 ID 访问他人记录返回 `404`，避免泄露记录是否存在。
- `ContextService` 的公共方法必须要求用户 ID，REST 和 MCP 共用这套校验。不能只在 Controller 或前端做过滤。
- 逐步移除 `API_AUTH_TOKEN` 的业务入口。过渡期如必须保留旧 Token，仅将其绑定到已确认的所有者账号并设定短期撤销期限；不能让它代表“管理员可读所有用户数据”。

### 4. MCP 接入

浏览器 Cookie 不用于远程 MCP。为每个用户提供单独创建、查看名称/创建时间、撤销 API Key 的功能；只存 Key 哈希，仅在创建时显示原文。`Authorization: Bearer <个人 Key>` 解析到该用户，MCP 工具调用带用户 ID 的 `ContextService`。旧共享 Token 撤销后，现有 MCP 客户端需要换 Key。第一版可先只开放 Web 注册，等个人 Key 和隔离测试完成后再开放 MCP 给新用户；不能让 MCP 继续绕过隔离。

## 实施顺序与交付门槛

| 阶段 | 工作 | 完成判据 |
| --- | --- | --- |
| 0. 准备 | 确认项目所有者的 Google 账号；创建 OAuth 客户端；在本地/预览配置密钥与回调；备份 Neon | 凭证只在部署平台的环境变量中，备份可恢复 |
| 1. 数据与会话 | 增加 `users`、`sessions`、Context 归属字段和索引；实现 Google 回调、会话及退出 | 首次/再次登录、过期、撤销、错误回调测试通过 |
| 2. 权限 | REST 和 MCP 服务改为按用户访问；加入个人 MCP Key；移除全局共享权限 | 两个测试账号互相无法列出、读取或写入对方数据；旧 Token 不可跨用户访问 |
| 3. Web 与入口 | Vercel API 转发、登录页/按钮、登录状态和退出，替换手输 Token | 正式域名完整登录；刷新后保持会话；退出后失去访问权；主流浏览器验证通过 |
| 4. 生产迁移 | 先部署兼容新旧 Schema 的代码；所有者完成 Google 登录并取得内部用户 ID；将旧 Context 明确归给该 ID；检查无空归属后设置 `NOT NULL`，再撤销共享 Token | 旧数据仅所有者可见，新账号初始为空，历史 Thread/Revision 仍可读 |
| 5. 开放注册 | 在生产环境启用所有 Google 账号登录，监测认证错误、权限拒绝和数据库负载 | 新用户可独立创建/读取 Context；匿名请求为 `401`；跨用户请求为 `404` |

当前 Render 免费套餐没有 `preDeployCommand`，迁移不能假设会随部署自动执行。阶段 4 应使用 Neon 直连地址运行经 CI 验证的迁移，并采用“先增字段、回填、再收紧约束”的顺序；每步记录执行结果。任何会使旧服务无法启动的约束变化，都应安排在兼容版本已经上线后。

## 验证与回退

- CI：类型检查、构建、单元测试、一次性 PostgreSQL 集成测试；覆盖 Google 身份校验失败、会话撤销、CSRF、所有 REST/MCP 路由的跨用户访问，以及迁移后旧数据归属。
- 预览环境：使用独立 Google OAuth 回调配置和可丢弃数据库；验证 Vercel 转发与 Cookie。不要将生产 Neon 数据复制到公开预览环境。
- 生产冒烟测试：匿名、所有者、新用户三种身份；登录、刷新、退出、重新登录、Context/Thread/MCP 访问；检查现有数据数量和归属。
- 回退：保留 Neon 迁移前备份；应用部署可回退到兼容新 Schema 的版本。开放注册后不得回退到只有共享 Token 且无用户过滤的旧版本，否则会重新暴露所有用户数据。

## 需要确定的事项

1. **项目所有者的 Google 账号**：用于将现有 Context 指定给正确的人；迁移脚本应按经验证的 Google `sub` 或内部用户 ID 操作，不能仅凭可变化的邮箱自动匹配。
2. **注册范围**：本计划默认所有 Google 账号均可注册、每人数据私有。如先试运行，可加邮箱邀请名单开关；不改变底层数据隔离设计。
3. **域名**：默认先用现有 Vercel 域名和 API 转发。若已有自有域名，可以直接规划同站点 Web/API 子域名。

## 参考文档

- [Google OpenID Connect 授权码流程](https://developers.google.com/identity/openid-connect/openid-connect)
- [Google 服务端验证 ID Token](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)
- [Google Web OAuth 客户端配置](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)
- [Vercel 外部地址转发](https://vercel.com/docs/routing/rewrites)
- [MDN：浏览器跨站 Cookie 行为](https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/Third-party_cookies)
