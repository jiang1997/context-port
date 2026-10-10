# 部署

[返回首页](../README.zh-CN.md) · [English](deployment.md)

仓库提供网页的 [Vercel 配置](../vercel.json) 和服务端的 [Render Blueprint](../render.yaml)。
在平台配置 Git 连接与正式分支，本仓库使用 `main`。开启 Git 部署后，Vercel 部署正式
分支；Render 配置为等待 CI 检查通过后部署。要限制 Vercel 正式发布，在项目的
Settings → Deployment Checks → Add Checks 中选择 GitHub，添加
`Vercel - context-port: verify` 和 `Vercel - context-port: e2e` 两项必需检查，
并保持 Production 的 Automatic aliasing 开启。CI 会在 push 时分别上报两个 job
的 pending 和最终 success/failure 状态；先运行一次更新后的 workflow，再搜索这些
名称。Vercel 可以并行构建，但只有两项状态都成功后才更新正式域名，无需新增 Vercel
部署令牌。测试新功能前，确认前后端部署均已完成。

Vercel 的 `VITE_API_BASE_URL` 保持 `/api/v1`，`/api/*` 转发目标是 Render 服务端；
使用其他服务端时需修改目标地址。Render 配置 `DATABASE_URL`、`WEB_ORIGIN`，并为网络
模式设置稳定的 `CLIPBOARD_SECRET`（至少 32 字符）。账户登录还需配置[本地开发指南](development.zh-CN.md)中的 Google 变量，
其中 `PUBLIC_BASE_URL` 应与公开网页地址一致，并登记对应的 OAuth 回调。

新数据库需执行全部迁移。现有部署在数据库结构变化时执行尚未应用的迁移；仅前端或
不涉及结构变化的 API 更新无需迁移数据库。当前 Render 免费套餐配置没有自动迁移步骤，
需要使用目标数据库的 direct/unpooled `DATABASE_URL` 执行 `pnpm db:migrate`，再发布
依赖新结构的代码。

`0004` 迁移将 Context 所有者设为必填，是为使用空数据库上线设计的，不会回填无所有者
的旧记录。SQL 迁移和 journal 手工维护，保留旧实验表，不会自动转换为 Context。
仓库尚未建立完整 Drizzle snapshot 基线，不能直接依赖 `db:generate`。
配置细节及此前上线记录见 [部署检查说明](production-env-checklist.md)。

继续阅读：[本地开发](development.zh-CN.md) · [Agent 接入](agent-access.zh-CN.md)
