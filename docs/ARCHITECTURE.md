# ARCHITECTURE — Nexus 架构现状

**Last Updated**: 2026-07-15  **版本**: v4.x  **锚点**: `docs/NORTH-STAR.md`

---

## 系统概览

```
Browser (任意设备)
    ↕  WSS /ws?token=<jwt>          ← WebSocket（原始 VT100 流）
    ↕  HTTPS /api/*                ← REST（认证后端 JSON API）
Nexus Server（Node.js，server.js）
    ↕  node-pty (ptyMap)           ← PTY 桥（每个 session:window 独立实例）
tmux attach-session -t <session>:<window>
    ├── window 0: vault
    ├── window 1: projects-blog
    └── window N: ...
```

---

## 后端（server.js ~1573 行，单文件 ESM）

### 启动流程

1. 加载 `.env`（手动解析，无 dotenv 依赖）
2. 验证 `JWT_SECRET` 和 `ACC_PASSWORD_HASH`（缺失则 exit(1)）
3. 确保 `data/` 和 `data/configs/` 存在
4. 注册 Express 路由 + multipart 上传 + 静态文件
5. 创建 HTTP server + WebSocketServer（共享端口）

### API Endpoints

| Method | Path | Auth | 描述 |
|---|---|---|---|
| POST | `/api/auth/login` | 无 | 密码 bcrypt 比对，返回 JWT |
| **窗口 / 会话** | | | |
| GET | `/api/sessions` | Bearer | tmux list-windows（指定 session） |
| POST | `/api/sessions` | Bearer | tmux new-window（claude/bash/profile） |
| POST | `/api/windows` | Bearer | 新建窗口（附 profile/cwd） |
| DELETE | `/api/sessions/:id` | Bearer | tmux kill-window |
| POST | `/api/sessions/:id/attach` | Bearer | tmux select-window |
| POST | `/api/sessions/:id/rename` | Bearer | tmux rename-window |
| GET | `/api/sessions/:id/output` | Bearer | 获取窗口最新输出 + 状态 |
| GET | `/api/sessions/:id/scrollback` | Bearer | 获取完整滚动缓冲区 |
| GET | `/api/session-cwd` | Bearer | 获取当前 pane 工作目录 |
| GET | `/api/tmux-sessions` | Bearer | 列出全部 tmux session 名 |
| **项目 / Channel** | | | |
| GET | `/api/projects` | Bearer | 列出 project-channel 树 |
| POST | `/api/projects` | Bearer | 创建 project |
| GET | `/api/projects/:name/channels` | Bearer | 列出 project 下的 channel |
| POST | `/api/projects/:name/channels` | Bearer | 创建 channel（新窗口） |
| POST | `/api/projects/:name/activate` | Bearer | 激活 project（并清除目标频道粘性提醒） |
| GET | `/api/channel-status` | Bearer | 全部项目所有频道的注意力状态(F-21) |
| POST | `/api/channel-status/seen` | Bearer | 进入频道即清除粘性提醒(F-21) |
| POST | `/api/projects/:name/rename` | Bearer | 重命名 project |
| DELETE | `/api/projects/:name` | Bearer | 删除 project |
| **工作区文件** | | | |
| GET | `/api/browse` | Bearer | 列出 WORKSPACE_ROOT 子目录 |
| GET | `/api/workspaces` | Bearer | 扫描 WORKSPACE_ROOT 子目录 |
| GET | `/api/workspace/files` | Bearer | 列出目录内容（带 stat 信息） |
| POST | `/api/workspace/mkdir` | Bearer | 创建目录 |
| POST | `/api/workspace/files` | Bearer | 创建文件 |
| GET | `/api/workspace/file` | Bearer | 读取文件内容 |
| PUT | `/api/workspace/file` | Bearer | 写入文件内容 |
| DELETE | `/api/workspace/entry` | Bearer | 删除文件或目录 |
| POST | `/api/workspace/rename` | Bearer | 重命名条目 |
| POST | `/api/workspace/copy` | Bearer | 复制条目 |
| POST | `/api/workspace/move` | Bearer | 移动条目 |
| **文件上传** | | | |
| POST | `/api/upload` | Bearer | 图片/文档上传（终端粘贴用） |
| POST | `/api/files/upload` | Bearer | 文件上传到工作区 |
| GET | `/api/files` | Bearer | 列出已上传文件 |
| DELETE | `/api/files/content` | Bearer | 删除单个上传文件（`?path=`） |
| DELETE | `/api/files/all` | Bearer | 清空所有上传文件 |
| **配置** | | | |
| GET | `/api/config` | Bearer | 返回 WORKSPACE_ROOT 等配置 |
| GET | `/api/configs` | Bearer | 列出 claude profile |
| POST | `/api/configs/:id` | Bearer | 创建/更新 profile |
| DELETE | `/api/configs/:id` | Bearer | 删除 profile |
| GET | `/api/toolbar-config` | Bearer | 读取工具栏配置 |
| POST | `/api/toolbar-config` | Bearer | 保存工具栏配置 |
| **版本** | | | |
| GET | `/api/version` | Bearer | 返回当前 git tag 版本 |
| GET | `/api/version/latest` | Bearer | 检查 GitHub 最新 release |
| GET/PATCH | `/api/settings` | Bearer | 单用户本地设置（Composer、输入历史隐私等） |
| GET/POST | `/api/toolbar-layouts` | Bearer | 按设备类型保存/读取快捷键布局 |
| POST | `/api/shortcut-usage` | Bearer | 记录快捷键使用频率（只记录 key id/count） |
| GET/POST/DELETE | `/api/input-history` | Bearer | Composer 明确提交文本历史 |
| GET/PUT/DELETE | `/api/composer-drafts` | Bearer | 按 project/channel 保存移动端 Composer 草稿 |
| GET/PATCH | `/api/attention-events` | Bearer | 注意力事件列表与状态更新 |
| GET | `/api/attention-events/count` | Bearer | 未处理注意力事件计数 |
| POST | `/api/attention-events/:id/resolve` | Bearer | 标记事件已处理 |
| POST | `/api/attention-events/:id/dismiss` | Bearer | 忽略事件 |
| **任务** | | | |
| GET | `/api/tasks` | Bearer | 列出任务历史（data/tasks.json） |
| POST | `/api/tasks` | Bearer | 提交任务（SSE 流式输出） |
| DELETE | `/api/tasks/:id` | Bearer | 删除任务记录 |
| **Telegram** | | | |
| POST | `/api/webhooks/telegram` | 无（secret check） | Telegram Bot webhook |
| GET | `/api/telegram/setup` | Bearer | Telegram Bot 状态信息 |
| GET | `*` | 无 | SPA fallback → index.html |

### PTY 层（ptyMap 多实例）

```javascript
// 每个 "session:windowIndex" 独立 PTY 实例
const ptyMap = new Map()
// entry: { pty, clients: Set<ws>, clientSizes: Map<ws, {cols,rows}>, lastOutput, lastActivity }

function getOrCreatePty(session, windowIndex) {
  // key = "session:windowIndex"
  // 按需 spawn tmux attach-session -t session:window
  // 不存在时自动 fallback 到可用窗口
}
```

### 频道状态轮询（channelAttention，F-21）

```javascript
// 全部 session × window 的注意力状态(内存实时态 + SQLite 事件索引)
const channelAttention = new Map()
// key = "session:windowIndex"
// entry: { realtime, sticky: 'needs-confirm'|'done'|null, lastSampleHash, lastActiveAt, wasActive }

// 定时器(默认 3s)枚举全部 session×window,tmux capture-pane 采样,
// 启发式判定状态;needs-confirm/done 为粘性提醒态,进入频道(attach/activate/seen)时清除 sticky。
// 同时写入/更新 attention_events,进入频道只把事件标记为 seen,不会自动 resolved。
// 启发式正则镜像自 frontend/src/windowStatus.ts(单一来源)。
```

- 与 `ptyMap` 区别:`ptyMap` 仅覆盖已连接频道;`channelAttention` 主动轮询**全部**频道,使切换项目前即可看到其它项目状态。
- 报告优先级:`needs-confirm` > `done` > 实时态(`active`/`shell`/`idle`)。
- `attention_events` 只保存事件类型、定位信息和短摘要,不保存完整 tmux scrollback 或原始 PTY 流。
- 可配:`ATTENTION_POLL_MS` / `ATTENTION_CAPTURE_LINES` / `ATTENTION_IDLE_MS` / `ATTENTION_MAX_CHANNELS`。

**Resize 策略**: 多客户端时直接使用当前客户端尺寸（而非所有客户端的最小值），避免多设备切换时尺寸混乱。

### 任务系统（runTask 统一抽象）

```javascript
function runTask(prompt, cwd, opts) {
  // opts: { sessionName, source, tmuxSession, profile, onChunk, onDone }
  // 1. 创建任务记录（立即写入 data/tasks.json）
  // 2. spawn claude -p <prompt> --dangerously-skip-permissions [--profile <p>]
  // 3. stdout/stderr → onChunk() 回调
  // 4. close → updateTask() + onDone() 回调
  // 返回 { taskId, kill }
}
```

- Web 端（`POST /api/tasks`）通过 `onChunk` 推 SSE 帧
- Telegram 端通过 `onChunk` 定时 editMessageText（每 5 秒）
- `tasks.json` 上限 200 条（`saveTasks` 强制执行）

### Telegram Bot

- 支持命令：`/list`（列窗口）、`/switch <name>`（切换目标窗口）
- 接收消息 → `runTask()` 在目标窗口 cwd 执行
- 接收文件/图片 → 下载到 WORKSPACE_ROOT → `runTask()` 附路径执行
- 目标窗口状态：持久化在内存 `telegramTargetWindow`（服务重启后重置）

---

## 前端（frontend/src/）

### 组件树

```
App.tsx（路由）
├── LoginPage（内联于 App.tsx）
│    └── POST /api/auth/login
└── Terminal.tsx（主终端页）
     ├── TabBar.tsx              ← 窗口标签（< 768px 顶部导航）
     │    └── windowStatus.ts   ← 共享状态逻辑
     ├── xterm.js（Terminal 核心）
     │    ├── FitAddon
     │    ├── WebLinksAddon
     │    └── mobile touch handlers（单指滚动、双指缩放、水平滑动切换窗口）
     ├── Toolbar.tsx             ← 个性化快捷键栏（设备布局 + 预设 + 高频推荐）
     │    └── toolbarDefaults.ts
     ├── AttentionCenter.tsx     ← 未处理事件列表、跳转、resolve/dismiss（lazy）
     ├── GhostShield.tsx         ← 覆盖层守卫（防止意外 keyboard 弹出）
     ├── SessionFAB.tsx          ← 移动端浮动操作按钮
     ├── NewWindowDialog.tsx     ← 新建窗口对话框
     ├── SessionManagerV2.tsx    ← project-channel 双层会话管理（lazy）
     ├── SessionManager.tsx      ← 旧版 session 面板（legacy，lazy）
     ├── WorkspaceSelector.tsx   ← 路径选择器（lazy）
     ├── WorkspaceBrowser.tsx    ← 文件浏览器（嵌入式侧栏 + 全屏 overlay，lazy）
     │    └── FilePanel.tsx      ← 文件查看/编辑/Markdown 预览（lazy）
     └── GeneralSettings.tsx     ← 通用设置面板（lazy）
```

### 布局断点

| 条件 | 布局 |
|---|---|
| `>= 1024px` (isWidePC) | 嵌入式文件浏览器侧栏（可拖拽调整宽度）+ Terminal + Toolbar |
| `>= 700px` (canEmbedBrowser) | 嵌入式文件浏览器侧栏 + Terminal + Toolbar（折叠式） |
| `< 700px` | TabBar (top) + Terminal + Toolbar (bottom)；文件浏览器全屏 overlay |

### 状态管理

- 无全局状态库（React useState/useEffect）
- `token` 存 localStorage
- `toolbar config` 缓存 localStorage，权威源为服务端 `/api/toolbar-config`
- `toolbar layouts`、`shortcut usage`、`input history`、`composer drafts`、`attention events` 权威源为 `data/nexus.sqlite`
- `font size`、`theme`、`active window` 持久化 localStorage

### 双 Effect 模式（Terminal.tsx）

```
Effect A [token]                 — 创建 XTerm + DOM + 触摸/resize 事件（只运行一次）
Effect B [token, activeWindowIndex] — 管理 WebSocket（窗口切换时重建）
```

- `intentionalClose` flag：避免 React cleanup 时触发重连
- `wsRef.current`：闭包中始终引用最新 WS
- `windowsRef + attachWindowFnRef`：Ref 确保 Effect A 的触摸 handler 可切换窗口无 stale 闭包

### 轮询架构

| 来源 | 端点 | 间隔 | 用途 |
|---|---|---|---|
| Terminal.tsx | `/api/sessions/:id/output?session=` | 3s | windowOutputs → TabBar + Sidebar |
| TabBar.tsx（fallback） | `/api/sessions/:id/output` | 5s | 仅当 Terminal 未传入 windowOutputs 时 |

### 国际化（i18n）

- 使用 `i18next` + `react-i18next` + `i18next-browser-languagedetector`
- 支持语言：中文（zh-CN）、英文（en）
- 翻译文件：`frontend/src/locales/<lang>/translation.json`
- 入口：`frontend/src/i18n/index.ts`

---

## 数据层

```
data/
├── nexus.sqlite           # 单用户本地状态库（设置、快捷键、输入历史、草稿、任务索引、注意力事件）
├── toolbar-config.json    # legacy 工具栏布局；首次迁移到 SQLite 后保留作回退
├── tasks.json             # legacy 任务历史；首次迁移到 SQLite 后保留作回退
└── configs/
    ├── profile-a.json     # claude 启动配置 profile
    └── profile-b.json
```

**SQLite 边界**:
- SQLite 是单用户本地“用户状态/索引/事件”存储,不是 tmux session 存储。
- SQLite 保存:settings、toolbar_layouts、shortcut_usage、input_history、composer_drafts、tasks 索引、attention_events。
- SQLite 不保存:完整 tmux scrollback、原始 PTY 字节流、浏览器密码/JWT、API key 或环境变量。
- 项目/频道存在性仍由 `tmux list-sessions` / `tmux list-windows` 查询;scrollback 仍由 `tmux capture-pane` 返回。
- `data/toolbar-config.json` 与 `data/tasks.json` 首次启动迁移到 SQLite,原文件保留;SQLite 初始化失败时继续使用 legacy JSON 回退。

**Polling**:
- Terminal: `/api/sessions/:id/output?session=` (3s) → windowOutputs (shared to TabBar/Sidebar)

---

## 部署结构

```
nexus/
├── server.js              # 唯一后端（ESM，Node 20）
├── package.json           # 依赖：express ws node-pty bcrypt
├── ecosystem.config.cjs   # PM2 配置（当前部署方式）
├── start.sh               # 手动启动脚本
├── nexus-run-claude.sh    # claude 会话启动脚本（server.js 调用）
├── frontend/
│   ├── src/               # React + TypeScript 源码
│   └── dist/              # Vite 构建产物（server.js 静态伺服）
├── public/
│   ├── icon.svg           # PWA 图标
│   ├── manifest.json      # PWA manifest
│   └── sw.js              # Service Worker（cache-first 静态资源，跳过导航请求）
└── data/                  # 持久化数据目录
```

### 环境变量

| 变量 | 必须 | 默认 | 说明 |
|---|---|---|---|
| `JWT_SECRET` | ✓ | — | JWT 签名密钥（openssl rand -hex 32） |
| `ACC_PASSWORD_HASH` | ✓ | — | bcrypt hash 的登录密码 |
| `TMUX_SESSION` | | `main` | 要 attach 的 tmux session 名 |
| `WORKSPACE_ROOT` | | `/workspace` | 工作区根目录 |
| `PORT` | | `59000` | 监听端口 |
| `CLAUDE_PROXY` | | — | HTTP/HTTPS/ALL proxy for claude CLI（可选） |
| `GITHUB_REPO` | | — | GitHub 仓库（`owner/repo`），用于版本检查 |

---

## 已知技术债

| 位置 | 问题 | 优先级 |
|---|---|---|
| `server.js` | tmux 命令 cwd/name 特殊字符转义不完整 | 中 |
| `Terminal.tsx` | window 切换通过 `\x02{index}` 键序列，依赖 tmux 快捷键 | 低 |
| `toolbarDefaults.ts` | 按键序列硬编码，无运行时验证 | 低 |
