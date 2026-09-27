# 生产环境配置清单（空数据库上线）

域名基线：Web = `https://context-port.vercel.app`；API = Render 服务 `contextport-server-sg`。
更新日期：2026-09-27。配合 `docs/google-login-plan.md` 使用。

现有 Context 不保留。已在 Neon 项目 `contextport` 的 `production` 分支新建空数据库 `contextport_auth`，未复制旧记录，也未做所有者回填。旧数据库 `neondb` 暂时保留供核对；新库已运行全部 SQL migration。

## 0. 上线代码门槛（已完成）

仓库已移除共享 Token 认证和必填配置，新增 `0004_require_context_owner.sql`，在空库中将 `owner_user_id` 收紧为 `NOT NULL`。PR #1 已通过 CI 并部署；CI 现会运行 PostgreSQL 集成测试。Render 上的旧共享 Token 配置已移除。

## 1. Google Cloud Console（OAuth 客户端）

当前 Testing 阶段可先共用一个 Google Cloud 项目和一个 Web OAuth 客户端，登记以下两条 Authorized redirect URI：

```
https://context-port.vercel.app/api/v1/auth/google/callback
http://localhost:5173/api/v1/auth/google/callback
```

本地回调必须与本地 `PUBLIC_BASE_URL` 一致。当前应用只请求 `openid email profile`：按 Google 的基础身份范围例外，即使项目保持 Testing，**任何 Google 账号仍可能完成授权**，Test users 名单不能作为注册门禁。可自愿把两个验收账号加入名单，但这不是必需步骤，也不会限制其他人。Client ID/Secret 只放本地 `.env` 或 Render 环境变量，不写入仓库。正式对外发布前，再建立独立的生产 OAuth 项目/客户端，仅保留正式域名回调，更新 Render 的 Client ID/Secret 并完成真实回调验证，然后将生产项目切为 In production；本地测试继续使用原项目。Google 的生产准备指南要求生产客户端不包含开发环境回调。

Preview 域名登录目前不可直接验收：Render 的 `PUBLIC_BASE_URL` 固定为正式域名，从 Preview 发起登录时，OAuth 状态 Cookie 留在 Preview 域名，回调却抵达正式域名。若需要 Preview 登录，须另设对应的 OAuth 回调和后端环境。

## 2. Neon：新建空库并初始化 Schema

已完成（2026-09-27）：`contextport_auth` 使用 direct 连接串运行全部 migration；迁移后核对 `users`、`sessions`、`contexts`、`threads`、`revisions`、`api_keys` 表存在、记录数均为 0，且 `contexts.owner_user_id` 为 `NOT NULL`。Render 已切换到新库；正式域名首次登录现已创建用户记录，Context 仍为空。

1. 在现有 Neon 项目中新建**空数据库**；不要将旧主分支复制成新分支当作空库，Neon 分支会复制现有数据。
2. 取得新库的 **direct（unpooled）** 连接串，使用待上线代码执行 `DATABASE_URL=<新库 direct URL> pnpm db:migrate`。确认最新迁移已把 `owner_user_id` 设为 `NOT NULL`。这是建表步骤，不迁移旧记录。
3. 确认新库中 `users`、`sessions`、`contexts`、`threads`、`revisions`、`api_keys` 表存在且业务记录数为 0。Render 使用同一新库的 **pooled** 连接串。

旧数据库暂时保持原样。不要把连接串写入文档或提交到 Git。

## 3. Render（服务 contextport-server-sg → Environment）

已由 render.yaml 固定的不用动：`HOST`、`DEPLOYMENT_MODE=network`、
`COOKIE_SECURE=auto`、`LOG_LEVEL`。新版服务对业务接口始终要求浏览器会话或个人 API Key。

已设置并核对的（`sync: false` 项）：

| Key | Value | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | **新库 pooled** 连接串 | 已切换至 `contextport_auth` |
| `WEB_ORIGIN` | `https://context-port.vercel.app` | 已有，确认值正确 |
| `API_AUTH_TOKEN` | 已删除 | 新版代码不读取它；`API_AUTH_ENABLED` 也已删除 |
| `GOOGLE_CLIENT_ID` | xxx.apps.googleusercontent.com | 已设置；Testing 阶段与本地共用 |
| `GOOGLE_CLIENT_SECRET` | GOCSPX-… | 已设置，与上述 Client ID 配对 |
| `PUBLIC_BASE_URL` | `https://context-port.vercel.app` | 已设置；回调地址由它拼接 |

Render 免费 Web 服务没有可用的 `preDeployCommand`。这次先完成新库 Schema，再保存 Render 环境变量并部署。旧 `API_AUTH_TOKEN` 与 `API_AUTH_ENABLED` 已从 Render 删除，随后重新部署，使运行中的服务也不再加载它们。

## 4. Vercel（项目 context-port）

环境变量：

```
VITE_API_BASE_URL=/api/v1     # Production 与 Preview 已更新；目前不验收 Preview 登录
```

CLI 方式（已用于 Production；该变量同时属于 Preview）：

```bash
vercel env update VITE_API_BASE_URL production --project context-port --value /api/v1 --yes
```

`vercel.json`（仓库根，随代码部署）：`/api/:path*` → Render 同路径，
置于 SPA 回退之前。**确认 destination 与 Render 实际域名一致**（当前写的是
`https://contextport-server-sg.onrender.com`，以 dashboard 显示为准）。
Vercel 已在环境变量更新后重新部署正式站点。

## 5. 部署顺序与验证

当前已完成：PR #1 合并、GitHub CI、Neon 空库迁移、Render/Vercel 部署；正式域名匿名 `/auth/me` 返回空用户、未登录 `/contexts` 返回 `401`、Google 授权跳转使用正式回调；所有者在 Chrome 中登录、刷新、退出、重新登录均成功。第二个 Google 账号已注册，访问第一个账号的 Context 链接返回 `404`；数据库中有 2 个用户、1 个 Context，且无缺少所有者的 Context。尚需 Safari/Firefox 验收。正式发布事项按用户要求暂缓。

1. 在不触发 Render 正式服务部署的分支上提交第 0 节改动并通过 CI；Google OAuth 暂用同一 Testing 项目/客户端验证本地和正式域名。不要先推送到 Render 监听的正式分支；Testing 状态本身不限制本应用的注册者。
2. 新建 Neon 空库，用 direct 连接串执行全部 migration 并核对表和约束。
3. 设置 Render 的**新库** pooled `DATABASE_URL` 与 Testing Google 配置，设置 Vercel Production 的 `/api/v1`，然后将通过 CI 的代码合入正式分支。留意 Render 自动部署与环境变量修改触发的部署。
4. Render `https://contextport-server-sg.onrender.com/health/live` 应返回 `{"status":"ok"}`；Vercel `https://context-port.vercel.app/api/v1/auth/me` 无 Cookie 时应返回 `{"user":null,…}`，以确认 API 转发生效。
5. 所有者从正式域名登录，验证刷新、退出、重新登录；用第二个 Google 测试账号验证独立创建/读取和跨用户 `404`。Chrome、Safari、Firefox 各走一遍。
6. 确认共享 Token 已失效，Render 不再要求 `API_AUTH_TOKEN`；个人 MCP Key 只能访问其所有者数据。
7. 建立仅含正式域名回调的生产 OAuth 项目/客户端，更新 Render 配置并验证登录；随后将生产项目切为 In production，正式对外发布并监测认证和数据库负载。若希望上线前仅限受邀账号，须另加应用层邮箱/Google `sub` 允许名单。

## 6. 本地 `.env`（已完成项对照）

```
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / PUBLIC_BASE_URL=http://localhost:5173
VITE_API_BASE_URL=/api/v1
```

## 参考

- [Neon：创建数据库](https://neon.com/docs/manage/databases)
- [Google：生产与测试项目分离](https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance)
- [Google：Testing / In production](https://support.google.com/cloud/answer/15549945)
- [Google：基础身份范围的 Testing 例外](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview)
- [Render：部署前命令](https://render.com/docs/deploys)
- [Vercel：环境变量](https://vercel.com/docs/environment-variables)
