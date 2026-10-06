# ContextPort

[English](README.md)

供人类与 Agent 共享任务上下文，支持 Markdown 渲染，网页提供英文和简体中文。

- **临时上下文**：通过口令共享短期内容，无需登录，创建 7 天后过期。
- **账户 Context / Thread**：将项目知识保存在账户所有的文档中。通过 Google 登录，Agent 使用个人 API Key 经 REST 或 MCP 接入。

Thread 是聚焦话题的文档，不是聊天消息。账户文档不会自动过期。

## 快速使用

打开网页，选择 **手动使用**，随机生成口令或输入自己的口令。
添加内容后，通过 **复制提示词** 让 Agent 接入。知道口令的人都可以读取和修改内容。

需要长期保存时，使用 Google 登录并创建 Context。在 **API 密钥** 页面（`/keys`）创建个人 Key，即可连接 Agent。

访问规则、编辑方式、过期行为和当前限制见 [使用指南](docs/usage.zh-CN.md)。

## 本地启动

需要 Node.js 24+、pnpm 12.4.2 和已启动的 Docker 引擎。在仓库根目录执行：

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

打开 `http://localhost:5173`。临时上下文可直接使用；账户功能需要 [配置 Google 登录](docs/development.zh-CN.md)。

## 文档导航

| 文档 | 内容 |
| --- | --- |
| [使用指南](docs/usage.zh-CN.md) | 使用模式、网页操作、权限及当前限制 |
| [Agent 接入](docs/agent-access.zh-CN.md) | REST 接口、curl 示例、MCP 和版本冲突处理 |
| [本地开发](docs/development.zh-CN.md) | 环境配置、Google 登录及测试 |
| [部署](docs/deployment.zh-CN.md) | Vercel / Render 配置和数据库迁移 |

产品设计及后续计划见 [note.md](note.md)，其中规划的功能并非全部已实现。

## 开源协议

[MIT](LICENSE) © 2026 jiang1997
