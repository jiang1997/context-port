/**
 * Application translation catalogs for the two supported locales.
 *
 * This uses the Astryx catalog shape (`{ defaultMessage, description? }`) so the
 * same files could be handed to Crowdin or any FormatJS-compatible pipeline.
 * `enCatalog` is the source of truth: its keys define `AppMessageKey`, and the
 * Chinese catalog is typed against it, so a missing translation fails the build.
 *
 * Interpolation is deliberately simple (`{name}` placeholders, see `translate`)
 * rather than full ICU, because the app strings only ever need named values.
 * Astryx's own component strings are localised separately by
 * `InternationalizationProvider` via `providerMessages`.
 */
import astryxZhCN from '@astryxdesign/core/locales/zh-CN.json';
import type { Catalog, MessageEntry, MessagesByLocale } from '@astryxdesign/core/i18n';
import type { AppLocale } from './locales';

export const enCatalog = {
  // Shared.
  '@app.common.copy': { defaultMessage: 'Copy' },
  '@app.common.copied': { defaultMessage: 'Copied' },
  '@app.common.copyFailed': { defaultMessage: 'Copy failed' },
  '@app.common.copyId': { defaultMessage: 'Copy ID' },
  '@app.common.copyIdTooltip': { defaultMessage: 'Copy the full Context ID' },
  '@app.common.copyIdManual': { defaultMessage: 'Copy failed. Select the full ID and copy it manually.' },
  '@app.common.noContent': { defaultMessage: 'No content yet' },
  '@app.common.previous': { defaultMessage: 'Previous' },
  '@app.common.next': { defaultMessage: 'Next' },
  '@app.common.somethingWentWrong': { defaultMessage: 'Something went wrong' },
  '@app.common.anonymous': { defaultMessage: 'Anonymous' },
  '@app.common.human': { defaultMessage: 'Human' },
  '@app.common.agent': { defaultMessage: 'Agent' },
  '@app.common.metaVersion': { defaultMessage: '{author} · v{version}' },

  // Navigation.
  '@app.nav.label': { defaultMessage: 'Main navigation' },
  '@app.nav.temporaryContext': { defaultMessage: 'Temporary Context' },
  '@app.nav.contexts': { defaultMessage: 'My Contexts' },
  '@app.nav.keys': { defaultMessage: 'API Keys' },
  '@app.nav.github': { defaultMessage: 'GitHub repository' },
  '@app.nav.githubTooltip': { defaultMessage: 'View on GitHub' },
  '@app.language.label': { defaultMessage: 'Language' },

  // Footer.
  '@app.footer.navLabel': { defaultMessage: 'Footer navigation' },

  // Document metadata (kept in sync with index.html's static default).
  '@app.meta.description': { defaultMessage: 'Shared task context for humans and agents' },

  // Authentication.
  '@app.auth.signIn': { defaultMessage: 'Sign in' },
  '@app.auth.signOut': { defaultMessage: 'Sign out' },
  '@app.auth.signingOut': { defaultMessage: 'Signing out…' },
  '@app.auth.signedOutTitle': { defaultMessage: 'Not signed in' },
  '@app.auth.signedOutDescription': {
    defaultMessage: 'Sign in to create Contexts and to connect your agents to this workspace over MCP.',
  },
  '@app.auth.signInWithGoogle': { defaultMessage: 'Sign in with Google' },

  // Contexts.
  '@app.contexts.title': { defaultMessage: 'My Contexts' },
  '@app.contexts.new': { defaultMessage: 'New Context' },
  '@app.contexts.intro': {
    defaultMessage:
      'Contexts store shared project background. Use Threads inside them to collaborate on specific tasks or discussions with your agents.',
  },
  '@app.contexts.emptyTitle': { defaultMessage: 'No Contexts yet' },
  '@app.contexts.emptyDescription': {
    defaultMessage: 'Create a background document that people and agents can keep building on together.',
  },
  '@app.contexts.emptyAction': { defaultMessage: 'Create your first Context' },
  '@app.contexts.updatedPrefix': { defaultMessage: 'updated' },
  '@app.contexts.backToList': { defaultMessage: '← My Contexts' },
  '@app.contexts.create': { defaultMessage: 'Create Context' },
  '@app.contexts.createIntro': {
    defaultMessage: 'Record the goal, the background, and the current shared understanding.',
  },

  // Shared document form.
  '@app.form.title': { defaultMessage: 'Title' },
  '@app.form.titlePlaceholder': { defaultMessage: 'e.g. Launch plan' },
  '@app.form.titleInvalid': {
    defaultMessage: 'Please enter a valid title (cannot be empty or whitespace only).',
  },
  '@app.form.body': { defaultMessage: 'Body (Markdown)' },
  '@app.form.creating': { defaultMessage: 'Creating…' },

  // Threads.
  '@app.threads.heading': { defaultMessage: 'Threads' },
  '@app.threads.empty': { defaultMessage: 'No threads yet. Start the first one on the right.' },
  '@app.threads.new': { defaultMessage: 'New Thread' },
  '@app.threads.newIntro': { defaultMessage: 'Open a specific topic within this Context.' },
  '@app.threads.create': { defaultMessage: 'Create Thread' },
  '@app.threads.backToContext': { defaultMessage: '← Back to Context' },

  // API keys.
  '@app.keys.title': { defaultMessage: 'API Keys' },
  '@app.keys.intro': {
    defaultMessage:
      'Use a key with an MCP client or let an Agent call the REST API with curl. Each key can read and write only your own Contexts.',
  },
  '@app.keys.createdBanner': { defaultMessage: 'Key "{name}" created.' },
  '@app.keys.createdOnce': { defaultMessage: 'For security it is shown only this once.' },
  '@app.keys.quickCurl': { defaultMessage: 'Quick access with curl' },
  '@app.keys.quickCurlIntro': { defaultMessage: 'Give these commands to an Agent that can run curl.' },
  '@app.keys.cmdListContexts': { defaultMessage: 'List your Contexts' },
  '@app.keys.cmdReadContext': { defaultMessage: 'Read a Context and its Thread index' },
  '@app.keys.cmdReadThread': { defaultMessage: 'Read a Thread' },
  '@app.keys.cmdMcp': { defaultMessage: 'Or configure an MCP client' },
  '@app.keys.nameLabel': { defaultMessage: 'Key name' },
  '@app.keys.namePlaceholder': { defaultMessage: 'e.g. Claude Desktop, Cursor, CLI' },
  '@app.keys.nameRequired': { defaultMessage: 'Please enter a key name before creating.' },
  '@app.keys.create': { defaultMessage: 'Create Key' },
  '@app.keys.emptyTitle': { defaultMessage: 'No keys yet' },
  '@app.keys.emptyDescription': {
    defaultMessage: 'Create an API key to let an Agent access your Contexts through curl or MCP.',
  },
  '@app.keys.created': { defaultMessage: 'Created {date}' },
  '@app.keys.lastUsed': { defaultMessage: 'Last used {date}' },
  '@app.keys.never': { defaultMessage: 'never' },
  '@app.keys.revoke': { defaultMessage: 'Revoke' },
  '@app.keys.revokedAt': {
    defaultMessage: 'Revoked on {date} · future API requests will be rejected',
  },

  // Temporary Context.
  '@app.temp.title': { defaultMessage: 'Temporary Context' },
  '@app.temp.intro': {
    defaultMessage:
      'A temporary, login-free workspace to share task context with people or AI agents. Automatically expires in 7 days.',
  },
  '@app.temp.tabAgents': { defaultMessage: 'For Agents' },
  '@app.temp.tabHumans': { defaultMessage: 'For Humans' },
  '@app.temp.openHeading': { defaultMessage: 'Open or Create a Context' },
  '@app.temp.passphrase': { defaultMessage: 'Passphrase' },
  '@app.temp.passphrasePlaceholder': { defaultMessage: 'At least 8 characters' },
  '@app.temp.passphraseMin': { defaultMessage: 'Passphrase must be at least 8 characters.' },
  '@app.temp.passphraseMax': { defaultMessage: 'Passphrase must be at most 128 characters.' },
  '@app.temp.enter': { defaultMessage: 'Enter with passphrase' },
  '@app.temp.generate': { defaultMessage: 'Generate random passphrase' },
  '@app.temp.privacyNote': {
    defaultMessage:
      'Anyone with this passphrase can read and edit. For sensitive content, use "Generate random passphrase" to ensure privacy.',
  },
  '@app.temp.shareHeading': { defaultMessage: 'Share this passphrase' },
  '@app.temp.copyForAgent': { defaultMessage: 'Copy for agent' },
  '@app.temp.copiedForAgent': { defaultMessage: 'Copied for agent' },
  '@app.temp.copyForAgentTooltip': { defaultMessage: 'Copy curl instructions for read + append' },
  '@app.temp.keepSafe': {
    defaultMessage: 'The passphrase is your only way back. Keep it somewhere safe until this Context expires.',
  },
  '@app.temp.leave': { defaultMessage: 'Leave Context' },
  '@app.temp.expires': { defaultMessage: 'Expires {date} · version {version}' },
  '@app.temp.sharedContent': { defaultMessage: 'Shared content' },
  '@app.temp.noContent': {
    defaultMessage: 'No content yet. Add the first update below or let your agent append to it.',
  },
  '@app.temp.addToContext': { defaultMessage: 'Add to Context' },
  '@app.temp.addEmpty': { defaultMessage: 'Add some text before submitting.' },
  '@app.temp.addContent': { defaultMessage: 'Add content' },
  '@app.temp.adding': { defaultMessage: 'Adding…' },
  '@app.temp.instructionsHeading': { defaultMessage: 'Instructions for this Context' },
  '@app.temp.activePassphraseLead': { defaultMessage: 'Your active passphrase is ' },
  '@app.temp.activePassphraseTail': {
    defaultMessage: '. Give these instructions to your agent so it can read and update this specific Context.',
  },
  '@app.temp.copyInstructions': { defaultMessage: 'Copy agent instructions' },
  '@app.temp.copiedInstructions': { defaultMessage: 'Copied instructions' },
  '@app.temp.copyPassphrase': { defaultMessage: 'Copy passphrase' },
  '@app.temp.copiedPassphrase': { defaultMessage: 'Copied passphrase' },
  '@app.temp.guideHeading': { defaultMessage: 'Agent API Guide' },
  '@app.temp.guideIntro': {
    defaultMessage:
      'No login needed — copy the guide and paste it to your agent so it can create or join temporary workspaces via curl.',
  },
  '@app.temp.guideGenerate': { defaultMessage: 'Generate:' },
  '@app.temp.guideOpen': { defaultMessage: 'Open:' },
  '@app.temp.guideRead': { defaultMessage: 'Read:' },
  '@app.temp.guideAppend': { defaultMessage: 'Append:' },
  '@app.temp.copyGuide': { defaultMessage: 'Copy agent guide' },
  '@app.temp.copiedGuide': { defaultMessage: 'Copied' },

  // Text copied for an agent (Temporary Context instructions + guide).
  '@app.agent.instructions.intro': { defaultMessage: 'You have access to a shared Temporary Context.' },
  '@app.agent.instructions.passphrase': { defaultMessage: 'Passphrase: {passphrase}' },
  '@app.agent.instructions.apiBase': { defaultMessage: 'API base: {apiBase}' },
  '@app.agent.instructions.expires': { defaultMessage: 'Expires: {expires}' },
  '@app.agent.instructions.readHeading': { defaultMessage: 'Read the current content:' },
  '@app.agent.instructions.appendHeading': {
    defaultMessage: 'Append / modify (appends Markdown, 1-20000 chars per call, 100000 chars max total):',
  },
  '@app.agent.instructions.notesHeading': { defaultMessage: 'Notes for agent:' },
  '@app.agent.instructions.note1': {
    defaultMessage: '- No login needed, the passphrase is the credential. Keep it secret.',
  },
  '@app.agent.instructions.note2': {
    defaultMessage: '- `read` returns JSON { content, version, expiresAt }.',
  },
  '@app.agent.instructions.note3': {
    defaultMessage:
      '- `append` concatenates with a blank-line separator. There is no delete/edit API; to "modify", read first then append the correction.',
  },
  '@app.agent.guide.intro': {
    defaultMessage: 'Temporary Context lets any person or agent share short-lived text without login. It expires 7 days after creation.',
  },
  '@app.agent.guide.apiBase': { defaultMessage: 'API base: {apiBase}' },
  '@app.agent.guide.step1': {
    defaultMessage: '1. Create a new Context (server generates a random passphrase):',
  },
  '@app.agent.guide.step1Result': {
    defaultMessage: '→ returns JSON { passphrase, content, version, expiresAt }. Save the passphrase — it is the only credential.',
  },
  '@app.agent.guide.orOpen': {
    defaultMessage: 'Or create / enter with your own passphrase (8-128 characters):',
  },
  '@app.agent.guide.step2': { defaultMessage: '2. Read the current content:' },
  '@app.agent.guide.step3': {
    defaultMessage: '3. Append / modify (appends Markdown, 1-20000 chars per call, 100000 chars max total):',
  },
  '@app.agent.guide.rulesHeading': { defaultMessage: 'Rules for agent:' },
  '@app.agent.guide.rule1': {
    defaultMessage: '- No login needed; the passphrase is the credential. Keep it secret.',
  },
  '@app.agent.guide.rule2': {
    defaultMessage: '- `read` returns JSON { content, version, expiresAt }.',
  },
  '@app.agent.guide.rule3': {
    defaultMessage:
      '- `append` concatenates with a blank-line separator. There is no delete/edit API; to "modify", read first then append the correction.',
  },
  '@app.agent.guide.rule4': { defaultMessage: '- Rate limit is 60 requests/min per IP.' },
} as const satisfies Catalog;

export type AppMessageKey = keyof typeof enCatalog;

/** Every key of `enCatalog` must be present; missing entries fail typecheck. */
export const zhCNCatalog: Record<AppMessageKey, MessageEntry> = {
  '@app.common.copy': { defaultMessage: '复制' },
  '@app.common.copied': { defaultMessage: '已复制' },
  '@app.common.copyFailed': { defaultMessage: '复制失败' },
  '@app.common.copyId': { defaultMessage: '复制 ID' },
  '@app.common.copyIdTooltip': { defaultMessage: '复制完整的 Context ID' },
  '@app.common.copyIdManual': { defaultMessage: '复制失败。请手动选中完整 ID 后复制。' },
  '@app.common.noContent': { defaultMessage: '暂无内容' },
  '@app.common.previous': { defaultMessage: '上一页' },
  '@app.common.next': { defaultMessage: '下一页' },
  '@app.common.somethingWentWrong': { defaultMessage: '出错了' },
  '@app.common.anonymous': { defaultMessage: '匿名' },
  '@app.common.human': { defaultMessage: '人类' },
  '@app.common.agent': { defaultMessage: '智能体' },
  '@app.common.metaVersion': { defaultMessage: '{author} · v{version}' },

  '@app.nav.label': { defaultMessage: '主导航' },
  '@app.nav.temporaryContext': { defaultMessage: '临时 Context' },
  '@app.nav.contexts': { defaultMessage: '我的 Context' },
  '@app.nav.keys': { defaultMessage: 'API 密钥' },
  '@app.nav.github': { defaultMessage: 'GitHub 仓库' },
  '@app.nav.githubTooltip': { defaultMessage: '在 GitHub 上查看' },
  '@app.language.label': { defaultMessage: '语言' },

  '@app.footer.navLabel': { defaultMessage: '页脚导航' },

  '@app.meta.description': { defaultMessage: '为人与智能体共享任务上下文' },

  '@app.auth.signIn': { defaultMessage: '登录' },
  '@app.auth.signOut': { defaultMessage: '退出登录' },
  '@app.auth.signingOut': { defaultMessage: '正在退出…' },
  '@app.auth.signedOutTitle': { defaultMessage: '未登录' },
  '@app.auth.signedOutDescription': {
    defaultMessage: '登录后即可创建 Context，并通过 MCP 将你的智能体接入此工作区。',
  },
  '@app.auth.signInWithGoogle': { defaultMessage: '使用 Google 登录' },

  '@app.contexts.title': { defaultMessage: '我的 Context' },
  '@app.contexts.new': { defaultMessage: '新建 Context' },
  '@app.contexts.intro': {
    defaultMessage:
      'Context 用于存放共享的项目背景。你可以在其中创建 Thread，与智能体围绕具体任务或讨论协作。',
  },
  '@app.contexts.emptyTitle': { defaultMessage: '还没有 Context' },
  '@app.contexts.emptyDescription': {
    defaultMessage: '创建一份背景文档，让人和智能体可以一起持续完善。',
  },
  '@app.contexts.emptyAction': { defaultMessage: '创建第一个 Context' },
  '@app.contexts.updatedPrefix': { defaultMessage: '更新于' },
  '@app.contexts.backToList': { defaultMessage: '← 我的 Context' },
  '@app.contexts.create': { defaultMessage: '创建 Context' },
  '@app.contexts.createIntro': {
    defaultMessage: '记录目标、背景以及当前已达成的共识。',
  },

  '@app.form.title': { defaultMessage: '标题' },
  '@app.form.titlePlaceholder': { defaultMessage: '例如：上线计划' },
  '@app.form.titleInvalid': {
    defaultMessage: '请输入有效的标题（不能为空或仅包含空格）。',
  },
  '@app.form.body': { defaultMessage: '正文（Markdown）' },
  '@app.form.creating': { defaultMessage: '正在创建…' },

  '@app.threads.heading': { defaultMessage: 'Thread' },
  '@app.threads.empty': { defaultMessage: '还没有 Thread。在右侧创建第一个。' },
  '@app.threads.new': { defaultMessage: '新建 Thread' },
  '@app.threads.newIntro': { defaultMessage: '在此 Context 中开启一个具体话题。' },
  '@app.threads.create': { defaultMessage: '创建 Thread' },
  '@app.threads.backToContext': { defaultMessage: '← 返回 Context' },

  '@app.keys.title': { defaultMessage: 'API 密钥' },
  '@app.keys.intro': {
    defaultMessage:
      '可将密钥用于 MCP 客户端，或让智能体通过 curl 调用 REST API。每个密钥只能读写你自己的 Context。',
  },
  '@app.keys.createdBanner': { defaultMessage: '密钥“{name}”已创建。' },
  '@app.keys.createdOnce': { defaultMessage: '出于安全考虑，它只显示这一次。' },
  '@app.keys.quickCurl': { defaultMessage: '使用 curl 快速访问' },
  '@app.keys.quickCurlIntro': { defaultMessage: '将这些命令交给可以运行 curl 的智能体。' },
  '@app.keys.cmdListContexts': { defaultMessage: '列出你的 Context' },
  '@app.keys.cmdReadContext': { defaultMessage: '读取某个 Context 及其 Thread 索引' },
  '@app.keys.cmdReadThread': { defaultMessage: '读取某个 Thread' },
  '@app.keys.cmdMcp': { defaultMessage: '或配置 MCP 客户端' },
  '@app.keys.nameLabel': { defaultMessage: '密钥名称' },
  '@app.keys.namePlaceholder': { defaultMessage: '例如：Claude Desktop、Cursor、CLI' },
  '@app.keys.nameRequired': { defaultMessage: '创建前请输入密钥名称。' },
  '@app.keys.create': { defaultMessage: '创建密钥' },
  '@app.keys.emptyTitle': { defaultMessage: '还没有密钥' },
  '@app.keys.emptyDescription': {
    defaultMessage: '创建 API 密钥，让智能体可以通过 curl 或 MCP 访问你的 Context。',
  },
  '@app.keys.created': { defaultMessage: '创建于 {date}' },
  '@app.keys.lastUsed': { defaultMessage: '最近使用 {date}' },
  '@app.keys.never': { defaultMessage: '从未' },
  '@app.keys.revoke': { defaultMessage: '撤销' },
  '@app.keys.revokedAt': {
    defaultMessage: '已于 {date} 撤销 · 后续 API 请求将被拒绝',
  },

  '@app.temp.title': { defaultMessage: '临时 Context' },
  '@app.temp.intro': {
    defaultMessage: '一个无需登录的临时工作区，用于与人或 AI 智能体共享任务上下文。创建 7 天后自动过期。',
  },
  '@app.temp.tabAgents': { defaultMessage: '给智能体' },
  '@app.temp.tabHumans': { defaultMessage: '给人使用' },
  '@app.temp.openHeading': { defaultMessage: '打开或创建 Context' },
  '@app.temp.passphrase': { defaultMessage: 'Passphrase' },
  '@app.temp.passphrasePlaceholder': { defaultMessage: '至少 8 个字符' },
  '@app.temp.passphraseMin': { defaultMessage: 'Passphrase 至少需要 8 个字符。' },
  '@app.temp.passphraseMax': { defaultMessage: 'Passphrase 最多 128 个字符。' },
  '@app.temp.enter': { defaultMessage: '使用 passphrase 进入' },
  '@app.temp.generate': { defaultMessage: '生成随机 passphrase' },
  '@app.temp.privacyNote': {
    defaultMessage: '任何知道该 passphrase 的人都能读取和编辑。若内容敏感，请使用“生成随机 passphrase”以确保隐私。',
  },
  '@app.temp.shareHeading': { defaultMessage: '分享此 passphrase' },
  '@app.temp.copyForAgent': { defaultMessage: '复制给智能体' },
  '@app.temp.copiedForAgent': { defaultMessage: '已复制给智能体' },
  '@app.temp.copyForAgentTooltip': { defaultMessage: '复制读取 + 追加的 curl 说明' },
  '@app.temp.keepSafe': {
    defaultMessage: '这个 passphrase 是你唯一的入口，请在此 Context 过期前妥善保存。',
  },
  '@app.temp.leave': { defaultMessage: '离开 Context' },
  '@app.temp.expires': { defaultMessage: '有效期至 {date} · 版本 {version}' },
  '@app.temp.sharedContent': { defaultMessage: '共享内容' },
  '@app.temp.noContent': {
    defaultMessage: '暂无内容。在下方添加第一条更新，或让你的智能体追加内容。',
  },
  '@app.temp.addToContext': { defaultMessage: '添加到 Context' },
  '@app.temp.addEmpty': { defaultMessage: '提交前请先输入一些文字。' },
  '@app.temp.addContent': { defaultMessage: '添加内容' },
  '@app.temp.adding': { defaultMessage: '正在添加…' },
  '@app.temp.instructionsHeading': { defaultMessage: '此 Context 的说明' },
  '@app.temp.activePassphraseLead': { defaultMessage: '你当前使用的 passphrase 是 ' },
  '@app.temp.activePassphraseTail': {
    defaultMessage: '。把这些说明交给你的智能体，它就能读取并更新这个 Context。',
  },
  '@app.temp.copyInstructions': { defaultMessage: '复制智能体说明' },
  '@app.temp.copiedInstructions': { defaultMessage: '已复制说明' },
  '@app.temp.copyPassphrase': { defaultMessage: '复制 passphrase' },
  '@app.temp.copiedPassphrase': { defaultMessage: '已复制 passphrase' },
  '@app.temp.guideHeading': { defaultMessage: '智能体 API 指南' },
  '@app.temp.guideIntro': {
    defaultMessage: '无需登录——复制这份指南并粘贴给你的智能体，它就能通过 curl 创建或加入临时工作区。',
  },
  '@app.temp.guideGenerate': { defaultMessage: '生成：' },
  '@app.temp.guideOpen': { defaultMessage: '打开：' },
  '@app.temp.guideRead': { defaultMessage: '读取：' },
  '@app.temp.guideAppend': { defaultMessage: '追加：' },
  '@app.temp.copyGuide': { defaultMessage: '复制智能体指南' },
  '@app.temp.copiedGuide': { defaultMessage: '已复制' },

  '@app.agent.instructions.intro': { defaultMessage: '你可以访问一个共享的临时 Context。' },
  '@app.agent.instructions.passphrase': { defaultMessage: 'Passphrase：{passphrase}' },
  '@app.agent.instructions.apiBase': { defaultMessage: 'API 地址：{apiBase}' },
  '@app.agent.instructions.expires': { defaultMessage: '过期时间：{expires}' },
  '@app.agent.instructions.readHeading': { defaultMessage: '读取当前内容：' },
  '@app.agent.instructions.appendHeading': {
    defaultMessage: '追加 / 修改（以 Markdown 追加，每次 1-20000 个字符，总计最多 100000 个字符）：',
  },
  '@app.agent.instructions.notesHeading': { defaultMessage: '给智能体的说明：' },
  '@app.agent.instructions.note1': {
    defaultMessage: '- 无需登录，passphrase 就是凭证。请妥善保密。',
  },
  '@app.agent.instructions.note2': {
    defaultMessage: '- `read` 返回 JSON { content, version, expiresAt }。',
  },
  '@app.agent.instructions.note3': {
    defaultMessage:
      '- `append` 以空行分隔进行拼接。没有删除/编辑 API；若要“修改”，请先读取再追加更正内容。',
  },
  '@app.agent.guide.intro': {
    defaultMessage: '临时 Context 让任何人或智能体无需登录即可共享短期文本。创建 7 天后过期。',
  },
  '@app.agent.guide.apiBase': { defaultMessage: 'API 地址：{apiBase}' },
  '@app.agent.guide.step1': { defaultMessage: '1. 创建新的 Context（服务器会随机生成 passphrase）：' },
  '@app.agent.guide.step1Result': {
    defaultMessage: '→ 返回 JSON { passphrase, content, version, expiresAt }。请保存 passphrase——它是唯一的凭证。',
  },
  '@app.agent.guide.orOpen': {
    defaultMessage: '或使用你自己的 passphrase 创建 / 进入（8-128 个字符）：',
  },
  '@app.agent.guide.step2': { defaultMessage: '2. 读取当前内容：' },
  '@app.agent.guide.step3': {
    defaultMessage: '3. 追加 / 修改（以 Markdown 追加，每次 1-20000 个字符，总计最多 100000 个字符）：',
  },
  '@app.agent.guide.rulesHeading': { defaultMessage: '给智能体的规则：' },
  '@app.agent.guide.rule1': { defaultMessage: '- 无需登录；passphrase 就是凭证。请妥善保密。' },
  '@app.agent.guide.rule2': {
    defaultMessage: '- `read` 返回 JSON { content, version, expiresAt }。',
  },
  '@app.agent.guide.rule3': {
    defaultMessage:
      '- `append` 以空行分隔进行拼接。没有删除/编辑 API；若要“修改”，请先读取再追加更正内容。',
  },
  '@app.agent.guide.rule4': { defaultMessage: '- 速率限制为每个 IP 每分钟 60 次请求。' },
};

export const catalogs: Record<AppLocale, Catalog> = {
  en: enCatalog,
  'zh-CN': zhCNCatalog,
};

/**
 * Catalogs handed to Astryx so its own component strings (Selector placeholder,
 * pagination labels, copy buttons, …) follow the app locale. Astryx bundles `en`
 * as the permanent fallback, so only the Chinese catalog needs importing.
 */
export const providerMessages: MessagesByLocale = {
  'zh-CN': astryxZhCN as Catalog,
};

/**
 * Resolve a key for a locale and substitute `{name}` placeholders. Unknown
 * placeholders (e.g. the literal `{ content, version }` in agent docs) are left
 * untouched. Missing keys fall back to English and then to the key itself.
 */
export function translate(
  locale: AppLocale,
  key: AppMessageKey,
  values?: Record<string, string | number>,
): string {
  const message = catalogs[locale][key]?.defaultMessage ?? enCatalog[key].defaultMessage;
  if (!values) return message;
  return message.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}
