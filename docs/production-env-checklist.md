# 生产环境配置清单（阶段 3→5 上线用）

域名基线：Web = `https://context-port.vercel.app`；API = Render 服务 `contextport-server-sg`。
更新日期：2026-09-27。配合 `docs/google-login-plan.md` 使用。

## 1. Google Cloud Console（OAuth 客户端）

Authorized redirect URIs（三条都要，一字不差）：

```
http://localhost:3000/api/v1/auth/google/callback
http://localhost:5173/api/v1/auth/google/callback
https://context-port.vercel.app/api/v1/auth/google/callback
```

同意屏幕：开放注册前保持 Testing（加入所有者账号为 Test user）；阶段 5 切 In production。
记录 `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`，下面两处要用。

## 2. Render（服务 contextport-server-sg → Environment）

已由 render.yaml 固定的不用动：`HOST`、`DEPLOYMENT_MODE=network`、
`API_AUTH_ENABLED=true`、`COOKIE_SECURE=auto`、`LOG_LEVEL`。

需要在 dashboard 设置/确认的（`sync: false` 项）：

| Key | Value | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | Neon **pooled** 连接串 | 已有，不动 |
| `WEB_ORIGIN` | `https://context-port.vercel.app` | 已有，确认值正确 |
| `API_AUTH_TOKEN` | ≥24 字符 | 过渡期保留；**阶段 5 前撤销** |
| `API_AUTH_LEGACY_USER_ID` | （先留空） | 阶段 4：所有者登录后填内部 user id |
| `GOOGLE_CLIENT_ID` | xxx.apps.googleusercontent.com | 新增 |
| `GOOGLE_CLIENT_SECRET` | GOCSPX-… | 新增 |
| `PUBLIC_BASE_URL` | `https://context-port.vercel.app` | 新增；回调地址由它拼接 |

⚠️ 迁移（0002/0003）必须用 Neon **direct（unpooled）** 连接串手动执行：
`DATABASE_URL=<direct> pnpm db:migrate`（免费套餐没有 preDeployCommand）。

## 3. Vercel（项目 context-port）

环境变量：

```
VITE_API_BASE_URL=/api/v1     # 覆盖现有值；Production 和 Preview 都要
```

CLI 方式（逐个环境执行，回车后输入值）：

```bash
vercel env rm VITE_API_BASE_URL production --project context-port --yes
vercel env add VITE_API_BASE_URL production --project context-port   # 输入: /api/v1
vercel env rm VITE_API_BASE_URL preview --project context-port --yes
vercel env add VITE_API_BASE_URL preview --project context-port      # 输入: /api/v1
```

`vercel.json`（仓库根，随代码部署）：`/api/:path*` → Render 同路径，
置于 SPA 回退之前。**确认 destination 与 Render 实际域名一致**（当前写的是
`https://contextport-server-sg.onrender.com`，以 dashboard 显示为准）。

## 4. 部署顺序与验证

1. git push → CI 通过 → Render 自动部署（新代码 + 兼容旧 Schema）。
2. 手动对 Neon direct 地址跑 `pnpm db:migrate`（应用 0002/0003）。
3. 生产冒烟：`https://context-port.vercel.app/api/v1/health/live` 应返回
   JSON（而不是 index.html）→ 这证明转发生效。
4. `GET /api/v1/auth/me` 无 Cookie 应返回 `{"user":null,…}`。
5. 浏览器完整登录 → 刷新保持 → 退出失效；Chrome/Safari/Firefox 各一遍。
6. 阶段 4：所有者用生产域名登录 → 拿内部 user id → 填
   `API_AUTH_LEGACY_USER_ID` → 回填 `contexts.owner_user_id` →
   收紧 NOT NULL → 撤销共享 Token → 删除 `API_AUTH_TOKEN`/`API_AUTH_LEGACY_USER_ID`。
7. 阶段 5：同意屏幕切 In production，开放注册；`API_AUTH_ENABLED` 沿用 true
   （旧 Token 已撤销即只剩个人 Key 与会话两种入口）。

## 5. 本地 `.env`（已完成项对照）

```
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / PUBLIC_BASE_URL=http://localhost:5173
VITE_API_BASE_URL=/api/v1
```
