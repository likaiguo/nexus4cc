## Context

Nexus 当前是单用户 WebSocket ↔ tmux 桥接面板,项目使用 **tmux session** 表示,频道使用 **tmux window** 表示。真实会话、进程生命周期和 scrollback 均由 tmux 负责;前端状态分散在 `localStorage`,后端少量状态分散在 `data/*.json` 与进程内 Map。

已有基础:
- 工具栏已支持自定义按键、排序和 `/api/toolbar-config` 服务端保存。
- 移动端输入已有隐藏 input + IME 保护逻辑,但没有可见草稿/光标/历史召回。
- 后端已有 `channelAttention` 内存态轮询,可识别 `needs-confirm` / `done`,但重启后丢失,且进入频道即清除。
- `tasks.json` 与 `toolbar-config.json` 是 JSON 文件,缺少统一查询、迁移、隐私控制和事件模型。

本设计引入 SQLite,但仅作为用户状态、事件和索引的本地持久化层。tmux 仍是 session 和 scrollback 的权威来源,避免违反 NORTH-STAR 中“不替换 tmux”的边界。

## Goals / Non-Goals

**Goals:**
- 提供单用户本地 SQLite 存储,统一保存设置、快捷键布局、使用统计、输入历史、Composer 草稿、任务索引和注意力事件。
- 将工具栏升级为移动端/桌面端可分离的个性化快捷键系统,支持预设和高频推荐。
- 在移动端提供 Composer 模式,让用户能看见待发送命令、编辑光标、召回历史并确认发送。
- 将 `needs-confirm` / `done` 从临时状态点升级为 Attention Center 中的持久事件,支持 `new` / `seen` / `resolved` / `dismissed` 状态。
- 保持既有 raw terminal 输入和 tmux 行为可用,不牺牲 vim/TUI/实时交互能力。
- 支持从现有 JSON 文件平滑迁移,失败时保留旧文件并可回退。

**Non-Goals:**
- 不保存完整终端 scrollback 到 SQLite。
- 不替代 tmux 的 session 持久化、进程管理或历史缓冲。
- 不引入多用户、团队、权限模型或用户表。
- 不把所有终端按键流解析为命令历史;只记录用户在 Composer 或明确提交入口中发送的文本。
- 不追求本期实现云同步或跨设备冲突协作,仅做单服务器本地持久化。

## Decisions

### D1. SQLite 作为本地用户状态存储

**选择**:新增 `data/nexus.sqlite`,后端启动时初始化 schema,开启 WAL 与 `busy_timeout`,提供一个薄数据访问层给 routes、attention poller 和任务系统使用。

**理由**:当前 JSON 文件适合少量配置,但不适合事件、历史、查询、保留策略和迁移。SQLite 是单文件、嵌入式、可备份,符合单用户个人服务器场景。

**Alternatives:**
- 继续使用多个 JSON 文件:实现简单,但事件去重、分页、历史搜索、迁移和并发写入都会变脆。
- Postgres/MySQL:能力过剩,部署复杂度与项目定位不匹配。
- 浏览器 IndexedDB:只能覆盖单设备,无法支撑服务端任务、Telegram、跨设备进入同一 Nexus 后的恢复。

### D2. 数据边界:索引和事件入库,tmux 内容不入库

SQLite 保存:
- `settings`:主题、保留策略、Composer 默认模式等用户偏好。
- `toolbar_layouts`:设备类型、固定区、展开区、自定义按键。
- `shortcut_usage`:快捷键使用次数、最近使用时间。
- `input_history`:用户明确提交的 Composer 文本/命令。
- `composer_drafts`:按项目/频道保存未发送草稿与光标位置。
- `attention_events`:确认、完成、失败、任务完成等待处理事件。
- `tasks`:从 `tasks.json` 迁移来的任务索引与输出尾部。

SQLite 不保存:
- 完整 tmux scrollback。
- 原始 PTY 字节流。
- 浏览器密码、JWT、密钥或环境变量。

**理由**:这是隐私和数据量的关键边界。输入历史是用户明确提交的高价值数据;scrollback 可能巨大且包含敏感输出,继续由 tmux 管理。

### D3. 分阶段迁移 JSON 文件

**选择**:首次启动或首次访问相关 API 时迁移 `data/toolbar-config.json` 与 `data/tasks.json`。迁移成功后写入迁移标记,保留原文件作为回退备份,不立即删除。

**理由**:减少一次性上线风险。若 SQLite 初始化或迁移失败,旧 JSON 路径仍可读取,服务不应因为历史数据迁移失败而不可用。

### D4. 快捷键布局从“一个全局配置”升级为“设备 profile”

**选择**:布局按 `device_type = mobile | desktop` 保存,每个设备类型有 active layout。出厂预设由前端静态定义,用户布局和自定义按键由后端保存。快捷键点击时上报 usage,推荐逻辑基于本地频率计算。

**理由**:移动端和桌面端的高频操作不同。继续共享一个布局会让移动端被桌面快捷键污染,或让桌面被移动端极简布局限制。

### D5. Composer 与 Direct Terminal 双模式

**选择**:
- Direct Terminal 保持当前行为:键盘/隐藏 input/xterm 原生输入直接发 WS。
- Composer 模式显示可编辑草稿、光标、历史上下翻、发送按钮;提交后一次性向 WS 写入文本,可按设置追加 Enter。

**理由**:移动端需要可见编辑体验,但不能破坏 vim、TUI、shell 补全、实时交互等 raw terminal 场景。双模式比试图“修补所有移动端 DOM key 事件”更稳。

### D6. Attention 事件与状态点分离

**选择**:
- `channelAttention` 继续提供实时/粘性状态点,用于频道列表快速感知。
- 当检测到 `needs-confirm` / `done` 或任务完成/失败时,后端写入/更新 `attention_events`。
- 用户进入频道时可以清除频道状态点,但事件只标记为 `seen`;用户明确处理后才变为 `resolved` 或 `dismissed`。

**理由**:状态点适合降低导航噪声,事件中心适合不漏处理。把两者混为一个“进入即删除”的状态会复现用户担心的漏确认问题。

### D7. API 以增量方式扩展

新增或扩展以下接口族:
- `GET/PATCH /api/settings`
- `GET/POST /api/toolbar-layouts`, `POST /api/shortcut-usage`
- `GET/POST/DELETE /api/input-history`
- `GET/PUT /api/composer-drafts/:scope`
- `GET/PATCH /api/attention-events`, `POST /api/attention-events/:id/resolve`
- 现有 `/api/tasks` 改为 SQLite backed,保持响应结构兼容。
- 现有 `/api/toolbar-config` 保持兼容,内部读写 active toolbar layout。

**理由**:旧前端或中间部署状态仍能运行;新 UI 可以逐步切换到新 API。

## Risks / Trade-offs

- **SQLite 依赖安装失败** → 选择项目环境可编译/可安装的主流 driver;实现前先验证 `npm install` 与服务启动。迁移失败时保留 JSON fallback。
- **同步 DB 操作阻塞 WS** → DB 中只保存小记录,不在热路径保存 PTY 字节;批量/清理操作限制分页和数量。
- **输入历史泄露敏感信息** → 默认只记录 Composer/明确提交文本,提供关闭记录、清空历史、保留天数和私密模式。
- **Attention 误判产生噪声** → 使用 dedupe key 合并同一项目/频道/类型事件;进入频道标记 seen,用户可 dismiss。
- **旧 JSON 与 SQLite 双写复杂** → 迁移期保持旧 API 兼容但以 SQLite 为权威;旧文件只作为初次导入和回退来源。
- **Composer 与终端焦点冲突** → Composer 使用独立 UI 和模式切换;Direct Terminal 保留现有 xterm/hidden input 逻辑。

## Migration Plan

1. 新增 SQLite 依赖、数据库初始化和 schema migrations,创建 `data/nexus.sqlite`。
2. 迁移 `toolbar-config.json` 与 `tasks.json`,保留原文件并记录迁移状态。
3. 将 `/api/toolbar-config` 与 `/api/tasks` 切到 SQLite backed,保持返回结构兼容。
4. 新增 settings、shortcut usage、input history、composer drafts、attention events API。
5. 前端逐步接入:先快捷键布局,再 Composer,最后 Attention Center。
6. 部署后按 AGENTS.md 重启 `nexus` 服务并验证可访问;若服务不可达,立即回滚代码并保留 `data/nexus.sqlite` 供排查。

**Rollback**:
- 回滚代码后旧 JSON 文件仍在,旧版本可继续读取。
- SQLite 文件不影响旧版本启动;需要时可重命名为 `data/nexus.sqlite.disabled`。
- 若迁移期间发生错误,不得删除或覆盖原 JSON 文件。

## Open Questions

- SQLite driver 选择在目标部署环境中需要先验证原生依赖安装成本。
- Composer 默认提交是否追加 Enter 应做成全局设置还是按钮级选择。
- Attention Center 的首版事件类型是否只覆盖 `needs-confirm` / `done` / task completion,还是同时覆盖上传失败等系统事件。
