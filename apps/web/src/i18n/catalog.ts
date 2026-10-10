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
  '@app.common.copyIdManual': { defaultMessage: 'Copy failed. Select the ID and copy it manually.' },
  '@app.common.noContent': { defaultMessage: 'No content yet' },
  '@app.common.previous': { defaultMessage: 'Previous' },
  '@app.common.next': { defaultMessage: 'Next' },
  '@app.common.somethingWentWrong': { defaultMessage: 'Something went wrong' },
  '@app.common.anonymous': { defaultMessage: 'Anonymous' },
  '@app.common.human': { defaultMessage: 'Human' },
  '@app.common.agent': { defaultMessage: 'Agent' },
  '@app.common.metaVersion': { defaultMessage: '{author} · version {version}' },

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
  '@app.meta.description': { defaultMessage: 'Task context shared between humans and agents' },

  // Authentication.
  '@app.auth.signIn': { defaultMessage: 'Sign in' },
  '@app.auth.loginFailed': { defaultMessage: 'Sign-in failed. Please try again.' },
  '@app.auth.sessionUnavailable': { defaultMessage: 'Unable to load sign-in status. Please retry.' },
  '@app.auth.retrySession': { defaultMessage: 'Retry' },
  '@app.auth.loginDenied': { defaultMessage: 'Google sign-in was cancelled. You can try again.' },
  '@app.auth.signOut': { defaultMessage: 'Sign out' },
  '@app.auth.signingOut': { defaultMessage: 'Signing out…' },
  '@app.auth.signedOutTitle': { defaultMessage: 'Not signed in' },
  '@app.auth.signedOutDescription': {
    defaultMessage: 'Sign in to save your Contexts and let your agents access them through MCP.',
  },
  '@app.auth.signInWithGoogle': { defaultMessage: 'Sign in with Google' },

  // Contexts.
  '@app.contexts.title': { defaultMessage: 'My Contexts' },
  '@app.contexts.new': { defaultMessage: 'New Context' },
  '@app.contexts.intro': {
    defaultMessage:
      'Keep project background in a Context, and use Threads for individual tasks and discussions.',
  },
  '@app.contexts.emptyTitle': { defaultMessage: 'No Contexts yet' },
  '@app.contexts.emptyDescription': {
    defaultMessage: 'Create a Context and add your project background or current task.',
  },
  '@app.contexts.emptyAction': { defaultMessage: 'Create your first Context' },
  '@app.contexts.updatedPrefix': { defaultMessage: 'updated' },
  '@app.contexts.backToList': { defaultMessage: '← My Contexts' },
  '@app.contexts.create': { defaultMessage: 'Create Context' },
  '@app.contexts.createIntro': {
    defaultMessage: 'Write down the goal, relevant background, and progress so far.',
  },

  // Shared document form.
  '@app.form.title': { defaultMessage: 'Title' },
  '@app.form.titlePlaceholder': { defaultMessage: 'e.g. Launch plan' },
  '@app.form.titleInvalid': {
    defaultMessage: 'Please enter a title.',
  },
  '@app.form.body': { defaultMessage: 'Body (Markdown)' },
  '@app.form.creating': { defaultMessage: 'Creating…' },

  // Threads.
  '@app.threads.heading': { defaultMessage: 'Threads' },
  '@app.threads.empty': { defaultMessage: 'No Threads yet. Create one to add a task or discussion.' },
  '@app.threads.new': { defaultMessage: 'New Thread' },
  '@app.threads.newIntro': { defaultMessage: 'Write down task progress, decisions, or what your agent should do next.' },
  '@app.threads.create': { defaultMessage: 'Create Thread' },
  '@app.threads.backToContext': { defaultMessage: '← Back to Context' },

  // API keys.
  '@app.keys.title': { defaultMessage: 'API Keys' },
  '@app.keys.intro': {
    defaultMessage:
      'Create a key to let your agent read and update your Contexts through MCP or the REST API. Each key only has access to your own content.',
  },
  '@app.keys.createdBanner': { defaultMessage: 'Key "{name}" created.' },
  '@app.keys.createdOnce': { defaultMessage: 'This key is only shown once. Copy it and keep it safe.' },
  '@app.keys.quickCurl': { defaultMessage: 'Access with curl' },
  '@app.keys.quickCurlIntro': { defaultMessage: 'If your agent can run curl, give it the commands below to read your content.' },
  '@app.keys.cmdListContexts': { defaultMessage: 'List your Contexts' },
  '@app.keys.cmdReadContext': { defaultMessage: 'Read a Context and its list of Threads' },
  '@app.keys.cmdReadThread': { defaultMessage: 'Read a Thread' },
  '@app.keys.cmdMcp': { defaultMessage: 'Configure an MCP client' },
  '@app.keys.nameLabel': { defaultMessage: 'Key name' },
  '@app.keys.namePlaceholder': { defaultMessage: 'e.g. Claude Desktop, Cursor, CLI' },
  '@app.keys.nameRequired': { defaultMessage: 'Please enter a key name.' },
  '@app.keys.create': { defaultMessage: 'Create Key' },
  '@app.keys.emptyTitle': { defaultMessage: 'No keys yet' },
  '@app.keys.emptyDescription': {
    defaultMessage: 'Create a key to connect your agent through MCP or the REST API.',
  },
  '@app.keys.created': { defaultMessage: 'Created {date}' },
  '@app.keys.lastUsed': { defaultMessage: 'Last used {date}' },
  '@app.keys.never': { defaultMessage: 'Never used' },
  '@app.keys.revoke': { defaultMessage: 'Revoke' },
  '@app.keys.revokedAt': {
    defaultMessage: 'Revoked {date} · this key no longer works',
  },

  // Temporary Context.
  '@app.temp.title': { defaultMessage: 'Temporary Context' },
  '@app.temp.intro': {
    defaultMessage:
      'Share content with people or agents using a passphrase. No sign-in needed.',
  },
  '@app.temp.retention': { defaultMessage: 'Deleted after 7 days without access. Each successful access keeps it for another 7 days.' },
  '@app.temp.tabAgents': { defaultMessage: 'Connect an agent' },
  '@app.temp.tabHumans': { defaultMessage: 'Use manually' },
  '@app.temp.openHeading': { defaultMessage: 'Open or Create a Context' },
  '@app.temp.passphrase': { defaultMessage: 'Passphrase' },
  '@app.temp.passphrasePlaceholder': { defaultMessage: 'At least 8 characters' },
  '@app.temp.passphraseMin': { defaultMessage: 'Passphrase must be at least 8 characters.' },
  '@app.temp.passphraseMax': { defaultMessage: 'Passphrase must be at most 128 characters.' },
  '@app.temp.enter': { defaultMessage: 'Open with passphrase' },
  '@app.temp.generate': { defaultMessage: 'Create with a random passphrase' },
  '@app.temp.privacyNote': {
    defaultMessage:
      'Anyone with the passphrase can read, add, and edit content. For sensitive content, generate a random passphrase and only share it with people or agents you trust.',
  },
  '@app.temp.shareHeading': { defaultMessage: 'Share this context' },
  '@app.temp.shareLink': { defaultMessage: 'Access link' },
  '@app.temp.copyLink': { defaultMessage: 'Copy link' },
  '@app.temp.copiedLink': { defaultMessage: 'Link copied' },
  '@app.temp.copyLinkFailed': { defaultMessage: 'Could not copy the link. Select and copy the access link above.' },
  '@app.temp.linkUnavailable': { defaultMessage: 'Context not found or expired' },
  '@app.temp.linkUnavailableHint': { defaultMessage: 'Check the link with its sender, or change the passphrase above and open another context.' },
  '@app.temp.currentPassphrase': { defaultMessage: 'Current passphrase' },
  '@app.temp.switchHint': { defaultMessage: 'Change the passphrase and open it to switch contexts. Sharing always uses the current context.' },
  '@app.temp.confirmSwitch': { defaultMessage: 'You have unsaved content. Switch contexts and discard it?' },
  '@app.temp.retryRead': { defaultMessage: 'Retry loading' },
  '@app.temp.copyForAgent': { defaultMessage: 'Copy Prompt' },
  '@app.temp.copiedForAgent': { defaultMessage: 'Prompt copied' },
  '@app.temp.copyForAgentTooltip': { defaultMessage: 'Copy a prompt with curl commands for your agent to read and append content' },
  '@app.temp.copyPassphraseTooltip': { defaultMessage: 'Copy only the access passphrase' },
  '@app.temp.keepSafe': {
    defaultMessage: 'Save the link or passphrase to return. Anyone with the link can read, add, and edit content. Only share it with people or agents you trust.',
  },
  '@app.temp.expires': { defaultMessage: 'Expires {date} · version {version}' },
  '@app.temp.sharedContent': { defaultMessage: 'Shared content' },
  '@app.temp.editContent': { defaultMessage: 'Edit content' },
  '@app.temp.saveChanges': { defaultMessage: 'Save changes' },
  '@app.temp.cancelEdit': { defaultMessage: 'Cancel editing' },
  '@app.temp.latestContent': { defaultMessage: 'Latest shared content' },
  '@app.temp.editConflict': {
    defaultMessage:
      'This content has changed. Copy your changes, cancel editing, then reopen the editor and merge them into the latest content.',
  },
  '@app.temp.noContent': {
    defaultMessage: 'No content yet. Add something below, or ask your agent to add it.',
  },
  '@app.temp.addToContext': { defaultMessage: 'Content to add' },
  '@app.temp.addEmpty': { defaultMessage: 'Add some text before submitting.' },
  '@app.temp.addContent': { defaultMessage: 'Add content' },
  '@app.temp.adding': { defaultMessage: 'Adding…' },
  '@app.temp.copyPassphrase': { defaultMessage: 'Copy passphrase' },
  '@app.temp.copiedPassphrase': { defaultMessage: 'Copied passphrase' },
  '@app.temp.guideHeading': { defaultMessage: 'Agent Prompt' },
  '@app.temp.guideIntro': {
    defaultMessage:
      'Paste this prompt into your agent to create or open a Temporary Context. No sign-in needed.',
  },
  '@app.temp.guideGenerate': { defaultMessage: 'Generate:' },
  '@app.temp.guideOpen': { defaultMessage: 'Open:' },
  '@app.temp.guideRead': { defaultMessage: 'Read:' },
  '@app.temp.guideAppend': { defaultMessage: 'Append:' },
  '@app.temp.guidePassphrasePlaceholder': { defaultMessage: 'Enter a passphrase' },
  '@app.temp.guidePassphraseLengthHint': { defaultMessage: 'Enter an existing passphrase (8–128 characters), or leave this blank and ask your agent to create a Context and send you the passphrase.' },
  '@app.temp.guideCopiedHint': { defaultMessage: 'Paste it to your agent to get started.' },
  '@app.temp.guideCopyFailed': { defaultMessage: 'Could not copy the prompt. Please try again.' },
  '@app.temp.copyGuide': { defaultMessage: 'Copy Prompt' },
  '@app.temp.copiedGuide': { defaultMessage: 'Prompt copied' },

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
    defaultMessage: '- No login needed; the passphrase is the credential. Keep it secret.',
  },
  '@app.agent.instructions.note2': {
    defaultMessage: '- `read` returns JSON { content, version, expiresAt }.',
  },
  '@app.agent.instructions.note3': {
    defaultMessage:
      '- `append` concatenates with a blank-line separator. There is no delete/edit API; to "modify", read first then append the correction.',
  },
  '@app.agent.guide.intro': {
    defaultMessage: 'Temporary Context lets any person or agent share short-lived text without login. It expires after 7 days without access; each successful access renews it for another week.',
  },
  '@app.agent.guide.apiBase': { defaultMessage: 'API base: {apiBase}' },
  '@app.agent.guide.step1': {
    defaultMessage: '1. Create a new Context (server generates a random passphrase):',
  },
  '@app.agent.guide.step1Result': {
    defaultMessage: '→ returns JSON { passphrase, content, version, expiresAt }. Save the passphrase — it is the only credential.',
  },
  '@app.agent.guide.generatedNext': { defaultMessage: 'Return the generated passphrase to the user, and replace YOUR PASSPHRASE in the commands below with that exact value.' },
  '@app.agent.guide.openStep': { defaultMessage: '1. Open or create the Context with the supplied passphrase:' },
  '@app.agent.guide.openResult': { defaultMessage: 'Use this exact passphrase for all calls. Do not generate a different one. The first use creates a Context; later uses open it until it expires.' },
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
  '@app.common.copyIdTooltip': { defaultMessage: '复制完整的上下文 ID' },
  '@app.common.copyIdManual': { defaultMessage: '复制失败，请手动选中文档 ID 并复制。' },
  '@app.common.noContent': { defaultMessage: '暂无内容' },
  '@app.common.previous': { defaultMessage: '上一页' },
  '@app.common.next': { defaultMessage: '下一页' },
  '@app.common.somethingWentWrong': { defaultMessage: '出错了' },
  '@app.common.anonymous': { defaultMessage: '匿名' },
  '@app.common.human': { defaultMessage: '人工创建' },
  '@app.common.agent': { defaultMessage: '智能体' },
  '@app.common.metaVersion': { defaultMessage: '{author} · 版本 {version}' },

  '@app.nav.label': { defaultMessage: '主导航' },
  '@app.nav.temporaryContext': { defaultMessage: '临时上下文' },
  '@app.nav.contexts': { defaultMessage: '我的上下文' },
  '@app.nav.keys': { defaultMessage: 'API 密钥' },
  '@app.nav.github': { defaultMessage: 'GitHub 仓库' },
  '@app.nav.githubTooltip': { defaultMessage: '在 GitHub 上查看' },
  '@app.language.label': { defaultMessage: '语言' },

  '@app.footer.navLabel': { defaultMessage: '页脚导航' },

  '@app.meta.description': { defaultMessage: '供人和智能体共享的任务上下文' },

  '@app.auth.signIn': { defaultMessage: '登录' },
  '@app.auth.loginFailed': { defaultMessage: '登录失败，请重试。' },
  '@app.auth.sessionUnavailable': { defaultMessage: '暂时无法获取登录状态，请重试。' },
  '@app.auth.retrySession': { defaultMessage: '重试' },
  '@app.auth.loginDenied': { defaultMessage: 'Google 登录已取消，可以重新登录。' },
  '@app.auth.signOut': { defaultMessage: '退出登录' },
  '@app.auth.signingOut': { defaultMessage: '正在退出…' },
  '@app.auth.signedOutTitle': { defaultMessage: '尚未登录' },
  '@app.auth.signedOutDescription': {
    defaultMessage: '登录后可以保存自己的上下文，也可以通过 MCP 让智能体读写内容。',
  },
  '@app.auth.signInWithGoogle': { defaultMessage: '使用 Google 登录' },

  '@app.contexts.title': { defaultMessage: '我的上下文' },
  '@app.contexts.new': { defaultMessage: '新建上下文' },
  '@app.contexts.intro': {
    defaultMessage:
      '把项目背景放在这里，具体任务和讨论分别记在主题文档里。',
  },
  '@app.contexts.emptyTitle': { defaultMessage: '还没有上下文' },
  '@app.contexts.emptyDescription': {
    defaultMessage: '新建一份上下文，写下项目背景或当前任务。',
  },
  '@app.contexts.emptyAction': { defaultMessage: '创建第一个上下文' },
  '@app.contexts.updatedPrefix': { defaultMessage: '更新于' },
  '@app.contexts.backToList': { defaultMessage: '← 我的上下文' },
  '@app.contexts.create': { defaultMessage: '创建上下文' },
  '@app.contexts.createIntro': {
    defaultMessage: '写下任务目标、相关背景和目前的进展。',
  },

  '@app.form.title': { defaultMessage: '标题' },
  '@app.form.titlePlaceholder': { defaultMessage: '例如：上线计划' },
  '@app.form.titleInvalid': {
    defaultMessage: '请填写标题。',
  },
  '@app.form.body': { defaultMessage: '正文（Markdown）' },
  '@app.form.creating': { defaultMessage: '正在创建…' },

  '@app.threads.heading': { defaultMessage: '主题文档' },
  '@app.threads.empty': { defaultMessage: '还没有主题文档，可以先创建一份。' },
  '@app.threads.new': { defaultMessage: '新建主题文档' },
  '@app.threads.newIntro': { defaultMessage: '写下任务进展、讨论结果，或需要智能体接着做的事。' },
  '@app.threads.create': { defaultMessage: '创建主题文档' },
  '@app.threads.backToContext': { defaultMessage: '← 返回上下文' },

  '@app.keys.title': { defaultMessage: 'API 密钥' },
  '@app.keys.intro': {
    defaultMessage:
      '创建密钥，让智能体通过 MCP 或 REST API 读写你的上下文。密钥只能访问你自己的内容。',
  },
  '@app.keys.createdBanner': { defaultMessage: '密钥“{name}”已创建。' },
  '@app.keys.createdOnce': { defaultMessage: '密钥只显示这一次，请复制保存。' },
  '@app.keys.quickCurl': { defaultMessage: '通过 curl 访问' },
  '@app.keys.quickCurlIntro': { defaultMessage: '如果智能体能运行 curl，把下面的命令发给它，就能读取你的内容。' },
  '@app.keys.cmdListContexts': { defaultMessage: '列出你的上下文' },
  '@app.keys.cmdReadContext': { defaultMessage: '读取上下文及其主题文档列表' },
  '@app.keys.cmdReadThread': { defaultMessage: '读取某个主题文档' },
  '@app.keys.cmdMcp': { defaultMessage: '配置 MCP 客户端' },
  '@app.keys.nameLabel': { defaultMessage: '密钥名称' },
  '@app.keys.namePlaceholder': { defaultMessage: '例如：Claude Desktop、Cursor、CLI' },
  '@app.keys.nameRequired': { defaultMessage: '请填写密钥名称。' },
  '@app.keys.create': { defaultMessage: '创建密钥' },
  '@app.keys.emptyTitle': { defaultMessage: '还没有密钥' },
  '@app.keys.emptyDescription': {
    defaultMessage: '创建一个密钥，就能通过 MCP 或 REST API 连接智能体。',
  },
  '@app.keys.created': { defaultMessage: '创建于 {date}' },
  '@app.keys.lastUsed': { defaultMessage: '最近使用：{date}' },
  '@app.keys.never': { defaultMessage: '从未使用' },
  '@app.keys.revoke': { defaultMessage: '撤销' },
  '@app.keys.revokedAt': {
    defaultMessage: '已于 {date} 撤销，此密钥已失效',
  },

  '@app.temp.title': { defaultMessage: '临时上下文' },
  '@app.temp.intro': {
    defaultMessage: '不用登录，凭口令就能和他人或智能体共用一份内容。',
  },
  '@app.temp.retention': { defaultMessage: '连续 7 天未访问会自动删除；每次成功访问后，再保留 7 天。' },
  '@app.temp.tabAgents': { defaultMessage: '智能体接入' },
  '@app.temp.tabHumans': { defaultMessage: '手动使用' },
  '@app.temp.openHeading': { defaultMessage: '打开或创建临时上下文' },
  '@app.temp.passphrase': { defaultMessage: '访问口令' },
  '@app.temp.passphrasePlaceholder': { defaultMessage: '至少 8 个字符' },
  '@app.temp.passphraseMin': { defaultMessage: '访问口令不能少于 8 个字符。' },
  '@app.temp.passphraseMax': { defaultMessage: '访问口令不能超过 128 个字符。' },
  '@app.temp.enter': { defaultMessage: '使用口令打开' },
  '@app.temp.generate': { defaultMessage: '随机生成口令并创建' },
  '@app.temp.privacyNote': {
    defaultMessage: '知道口令的人都可以查看、添加和修改内容。内容敏感的话，建议随机生成口令，只分享给可信的人或智能体。',
  },
  '@app.temp.shareHeading': { defaultMessage: '分享此上下文' },
  '@app.temp.shareLink': { defaultMessage: '访问链接' },
  '@app.temp.copyLink': { defaultMessage: '复制链接' },
  '@app.temp.copiedLink': { defaultMessage: '链接已复制' },
  '@app.temp.copyLinkFailed': { defaultMessage: '无法复制链接，请手动选中并复制上方的访问链接。' },
  '@app.temp.linkUnavailable': { defaultMessage: '上下文不存在或已过期' },
  '@app.temp.linkUnavailableHint': { defaultMessage: '请向分享者确认链接，或修改上方口令后打开其他上下文。' },
  '@app.temp.currentPassphrase': { defaultMessage: '当前口令' },
  '@app.temp.switchHint': { defaultMessage: '修改口令后点击打开即可切换，分享信息始终对应当前已打开的上下文。' },
  '@app.temp.confirmSwitch': { defaultMessage: '有尚未保存的内容，是否放弃这些内容并切换上下文？' },
  '@app.temp.retryRead': { defaultMessage: '重新加载' },
  '@app.temp.copyForAgent': { defaultMessage: '复制提示词' },
  '@app.temp.copiedForAgent': { defaultMessage: '提示词已复制' },
  '@app.temp.copyForAgentTooltip': { defaultMessage: '复制包含 curl 命令的提示词，让智能体读取和追加内容' },
  '@app.temp.copyPassphraseTooltip': { defaultMessage: '仅复制访问口令' },
  '@app.temp.keepSafe': {
    defaultMessage: '保存链接或口令，方便下次访问。持有链接的人可查看、添加和修改内容，请只分享给可信的人或智能体。',
  },
  '@app.temp.expires': { defaultMessage: '有效期至 {date} · 版本 {version}' },
  '@app.temp.sharedContent': { defaultMessage: '共享内容' },
  '@app.temp.editContent': { defaultMessage: '编辑内容' },
  '@app.temp.saveChanges': { defaultMessage: '保存修改' },
  '@app.temp.cancelEdit': { defaultMessage: '取消编辑' },
  '@app.temp.latestContent': { defaultMessage: '最新共享内容' },
  '@app.temp.editConflict': { defaultMessage: '内容已被更新。复制你的修改，取消编辑后重新进入编辑框，再合并到最新内容上。' },
  '@app.temp.noContent': {
    defaultMessage: '这里还没有内容。你可以在下方添加，也可以让智能体来写。',
  },
  '@app.temp.addToContext': { defaultMessage: '要添加的内容' },
  '@app.temp.addEmpty': { defaultMessage: '请先输入要添加的内容。' },
  '@app.temp.addContent': { defaultMessage: '添加内容' },
  '@app.temp.adding': { defaultMessage: '正在添加…' },
  '@app.temp.copyPassphrase': { defaultMessage: '复制口令' },
  '@app.temp.copiedPassphrase': { defaultMessage: '口令已复制' },
  '@app.temp.guideHeading': { defaultMessage: '智能体提示词' },
  '@app.temp.guideIntro': {
    defaultMessage: '把提示词复制给智能体，它就能创建或打开临时上下文，无需登录。',
  },
  '@app.temp.guideGenerate': { defaultMessage: '生成：' },
  '@app.temp.guideOpen': { defaultMessage: '打开：' },
  '@app.temp.guideRead': { defaultMessage: '读取：' },
  '@app.temp.guideAppend': { defaultMessage: '追加：' },
  '@app.temp.guidePassphrasePlaceholder': { defaultMessage: '输入口令' },
  '@app.temp.guidePassphraseLengthHint': { defaultMessage: '已有口令就填在这里（8–128 个字符）。没有的话可以留空，让智能体创建后把口令发给你。' },
  '@app.temp.guideCopiedHint': { defaultMessage: '粘贴给智能体即可开始使用。' },
  '@app.temp.guideCopyFailed': { defaultMessage: '未能复制提示词，请重试。' },
  '@app.temp.copyGuide': { defaultMessage: '复制提示词' },
  '@app.temp.copiedGuide': { defaultMessage: '提示词已复制' },

  '@app.agent.instructions.intro': { defaultMessage: '你可以通过口令访问这份临时上下文。' },
  '@app.agent.instructions.passphrase': { defaultMessage: '访问口令：{passphrase}' },
  '@app.agent.instructions.apiBase': { defaultMessage: 'API 地址：{apiBase}' },
  '@app.agent.instructions.expires': { defaultMessage: '过期时间：{expires}' },
  '@app.agent.instructions.readHeading': { defaultMessage: '读取当前内容：' },
  '@app.agent.instructions.appendHeading': {
    defaultMessage: '追加内容（Markdown 格式，每次 1–20,000 个字符，总计不超过 100,000 个字符）：',
  },
  '@app.agent.instructions.notesHeading': { defaultMessage: '使用说明：' },
  '@app.agent.instructions.note1': {
    defaultMessage: '- 无需登录，访问口令是唯一的访问凭证，请勿泄露。',
  },
  '@app.agent.instructions.note2': {
    defaultMessage: '- `read` 返回 JSON { content, version, expiresAt }。',
  },
  '@app.agent.instructions.note3': {
    defaultMessage:
      '- `append` 会将新内容添加到末尾，与已有内容之间以空行分隔。不支持删除或直接编辑；需要更正时，请先读取已有内容，再追加更正说明。',
  },
  '@app.agent.guide.intro': {
    defaultMessage: '临时上下文用于与用户或其他智能体共享任务信息，无需登录，连续 7 天未访问后过期并自动删除，每次成功访问续期一周。',
  },
  '@app.agent.guide.apiBase': { defaultMessage: 'API 地址：{apiBase}' },
  '@app.agent.guide.step1': { defaultMessage: '1. 创建临时上下文（由服务器生成随机访问口令）：' },
  '@app.agent.guide.step1Result': {
    defaultMessage: '→ 返回 JSON { passphrase, content, version, expiresAt }。请保存访问口令，它是唯一的访问凭证。',
  },
  '@app.agent.guide.generatedNext': { defaultMessage: '请将生成的访问口令返回给用户，并用该口令替换下方命令中的 YOUR PASSPHRASE。' },
  '@app.agent.guide.openStep': { defaultMessage: '1. 使用指定口令打开或创建上下文：' },
  '@app.agent.guide.openResult': { defaultMessage: '所有请求都使用这个口令，请勿另行生成口令。首次使用会创建上下文，在过期前再次使用会打开同一份内容。' },
  '@app.agent.guide.orOpen': {
    defaultMessage: '也可以使用自定义访问口令打开或创建上下文（8–128 个字符）：',
  },
  '@app.agent.guide.step2': { defaultMessage: '2. 读取当前内容：' },
  '@app.agent.guide.step3': {
    defaultMessage: '3. 追加内容（Markdown 格式，每次 1–20,000 个字符，总计不超过 100,000 个字符）：',
  },
  '@app.agent.guide.rulesHeading': { defaultMessage: '使用说明：' },
  '@app.agent.guide.rule1': { defaultMessage: '- 无需登录，访问口令是唯一的访问凭证，请勿泄露。' },
  '@app.agent.guide.rule2': {
    defaultMessage: '- `read` 返回 JSON { content, version, expiresAt }。',
  },
  '@app.agent.guide.rule3': {
    defaultMessage:
      '- `append` 会将新内容添加到末尾，与已有内容之间以空行分隔。不支持删除或直接编辑；需要更正时，请先读取已有内容，再追加更正说明。',
  },
  '@app.agent.guide.rule4': { defaultMessage: '- 每个 IP 每分钟最多可发送 60 次请求。' },
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
