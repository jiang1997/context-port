# 部署

[返回首页](../README.zh-CN.md) · [English](deployment.md)

## Cloudflare Workers

服务端可以部署到 Workers，前端继续使用 Vercel，数据库沿用现有 PostgreSQL。
需要 Node.js 24+ 和已授权的 Wrangler（`pnpm exec wrangler login`）。

1. 将根目录 `.env.cloudflare.example` 复制为 `.env.cloudflare.local`，填写 Render
   生产环境中的四项密钥。保留原 `CLIPBOARD_SECRET`，否则已有临时上下文口令将无法
   查找原记录。此文件已被 Git 忽略。
2. 执行 `pnpm check:cloudflare` 检查打包，再执行 `pnpm deploy:cloudflare`。
   部署脚本验证生产配置，并将密钥与代码在同一版本上传，不会修改数据库结构。
3. 检查 Workers 地址的 `/health/live` 和 `/health/ready`，验证临时上下文和 MCP。
4. 根目录 `vercel.json` 已将 `/api/:path*` 和 `/mcp` 转发至
   `https://contextport-server.jieke.workers.dev`。部署 Vercel 后，网页和新复制的
   Agent 命令均通过公开网页域名访问后端。

Workers 配置位于根目录 `wrangler.jsonc`，入口为 `apps/server/worker.mjs`。
构建先运行 TypeScript 编译以保留 Nest 的装饰器元数据，再由 Wrangler 打包。
数据库连接按请求创建和关闭；每日 03:00 UTC 的 Cron Trigger 清理过期临时上下文，
不依赖常驻进程中的计时器。Nest 在 Worker 启动阶段初始化，避免把完整框架初始化
计入首个请求的 CPU 时间。配置中的账户和 Hyperdrive ID 属于当前部署，换账户时需更新。

`PUBLIC_BASE_URL` 保持公开前端地址 `https://context-port.vercel.app`，配合 Vercel
同源转发可以保留 Google OAuth 回调和现有会话。切换前应在 Workers 线上指标中
检查 CPU 用量；免费版每次调用的 CPU 限制为 10 毫秒。迁移时的线上样本中，常规
文本请求约为 4–8 毫秒，部分大文本请求超过 10 毫秒；成功的测试不保证持续负载
始终满足免费版限制。本次迁移没有启用付费套餐。

当前已为 PostgreSQL 配置 Hyperdrive，`wrangler.jsonc` 中的 `HYPERDRIVE` 绑定指向
现有连接池，查询缓存已禁用以保证读写一致性。数据库仍使用原有 Neon PostgreSQL。

本地运行 `pnpm dev:cloudflare`，设置环境变量
`CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` 指向本地 PostgreSQL，
用未提交的 `.dev.vars` 提供独立测试数据库和密钥；
该文件应包含 `SERVER_RUNTIME=workers`、`DEPLOYMENT_MODE=network` 和匹配本地地址的
`WEB_ORIGIN`、`PUBLIC_BASE_URL`，避免加载根目录 `.env` 的开发配置。

Render 保留作为备用及旧 Agent 地址的兼容入口；已复制的 Render MCP 地址需改为
`https://context-port.vercel.app/mcp`。

### 自动部署

`.github/workflows/ci.yml` 在推送 `main` 且 `verify`、`e2e` 均成功后自动部署 Workers。
PR 和其他分支只执行检查，不发布生产环境。部署任务串行运行，并在发布前检查该提交
仍为 `main` 的最新提交，避免重跑旧任务覆盖新版本。发布后检查存活和数据库连接。

GitHub 仓库的 Actions Secret `CLOUDFLARE_API_TOKEN` 保存部署令牌，账户 ID 和
Hyperdrive 绑定来自 `wrangler.jsonc`。CI 直接执行 `pnpm exec wrangler deploy`，
沿用 Workers 中已有的业务密钥，不读取本机 `.env.cloudflare.local`。本机手动发布或
更新业务密钥时，继续使用 `pnpm deploy:cloudflare`。部署令牌失效时，更新同名 GitHub
Secret，并在 Actions 页面重跑失败的部署任务。

数据库结构变更仍需使用生产数据库 direct/unpooled 连接手动执行迁移，自动部署不会
运行生产数据库迁移。运行结果和日志位于 GitHub 的 CI workflow 下。

## Render

仓库提供网页的 [Vercel 配置](../vercel.json) 和服务端的 [Render Blueprint](../render.yaml)。
在平台配置 Git 连接与正式分支，本仓库使用 `main`。开启 Git 部署后，Vercel 部署正式
分支；Render 配置为等待 CI 检查通过后部署。要限制 Vercel 正式发布，在项目的
Settings → Deployment Checks → Add Checks 中选择 GitHub，添加
`Vercel - context-port: verify` 和 `Vercel - context-port: e2e` 两项必需检查，
并保持 Production 的 Automatic aliasing 开启。CI 会在 push 时分别上报两个 job
的 pending 和最终 success/failure 状态；先运行一次更新后的 workflow，再搜索这些
名称。Vercel 可以并行构建，但只有两项状态都成功后才更新正式域名，无需新增 Vercel
部署令牌。测试新功能前，确认前后端部署均已完成。

Vercel 的 `VITE_API_BASE_URL` 保持 `/api/v1`；若切回 Render，需将 `/api/*` 和 `/mcp`
转发目标改为 Render 服务端。Render 配置 `DATABASE_URL`、`WEB_ORIGIN`，并为网络
模式设置稳定的 `CLIPBOARD_SECRET`（至少 32 字符）。账户登录还需配置[本地开发指南](development.zh-CN.md)中的 Google 变量，
其中 `PUBLIC_BASE_URL` 应与公开网页地址一致，并登记对应的 OAuth 回调。

`WEB_EXTRA_ORIGINS` 允许明确受信任的浏览器来源发送带凭据的请求。浏览器能发送
API Cookie 时，跨源直连可使用已有会话。账户登录及网页与 API 跨站的部署请使用同源
转发。网页构建如需直连其他 API 来源，请将该来源加入网页 CSP 的 `connect-src`。

新数据库需执行全部迁移。现有部署在数据库结构变化时执行尚未应用的迁移；仅前端或
不涉及结构变化的 API 更新无需迁移数据库。当前 Render 免费套餐配置没有自动迁移步骤，
需要使用目标数据库的 direct/unpooled `DATABASE_URL` 执行 `pnpm db:migrate`，再发布
依赖新结构的代码。

`0004` 迁移将 Context 所有者设为必填，是为使用空数据库上线设计的，不会回填无所有者
的旧记录。SQL 迁移和 journal 手工维护，保留旧实验表，不会自动转换为 Context。
仓库尚未建立完整 Drizzle snapshot 基线，不能直接依赖 `db:generate`。
配置细节及此前上线记录见 [部署检查说明](production-env-checklist.md)。

继续阅读：[本地开发](development.zh-CN.md) · [Agent 接入](agent-access.zh-CN.md)
