## Why

Nexus 已经能在手机上接入 tmux/Claude Code,但移动端高频操作、输入草稿、历史恢复和跨设备状态仍分散在 `localStorage`、JSON 文件、进程内存与 tmux 实时状态中。用户在多项目多频道场景下需要更低摩擦的个性化操作、更可靠的本地记忆,以及一个明确的待处理/已完成入口,而不是靠逐个频道查看。

## What Changes

- 引入 SQLite 作为单用户本地持久化层,用于保存用户偏好、快捷键布局、快捷键使用统计、输入历史、注意力事件和任务索引;tmux 仍是真实 session 与 scrollback 的权威来源。
- 将现有工具栏配置升级为个性化快捷键系统:
  - 支持移动端/桌面端独立布局。
  - 支持出厂预设、用户默认预设、高频推荐和一键应用。
  - 记录快捷键使用频率并推荐置顶/重排。
- 增加移动端命令 Composer:
  - 提供可见输入草稿、光标位置、历史召回、编辑后确认发送。
  - 保留直接终端输入模式,用于 vim/TUI/实时交互。
  - 将用户明确提交的命令/提示词保存到本地输入历史。
- 将频道状态点升级为 Attention Center:
  - 持久化 `needs-confirm`、`done`、失败、任务完成等注意力事件。
  - 在移动端和桌面端提供显著入口、未处理计数、摘要列表和跳转到对应项目/频道的动作。
  - 区分 `seen` 与 `resolved`,避免“进入频道即完全消失”导致漏处理。
- 迁移现有 `toolbar-config.json` 与 `tasks.json` 数据到 SQLite,并保留兼容读取/回退策略。

## Capabilities

### New Capabilities

- `local-user-persistence`: 单用户本地 SQLite 持久化层,覆盖设置、快捷键、输入历史、注意力事件和任务索引,并定义迁移/备份/回退规则。
- `personalized-shortcuts`: 个性化快捷键与工具栏布局,覆盖预设、一键应用、使用频率推荐、移动端/桌面端独立布局和服务端持久化。
- `mobile-command-composer`: 移动端命令 Composer,覆盖可见草稿、光标编辑、历史召回、提交发送与直接终端输入模式切换。
- `attention-center`: 待处理中心,覆盖注意力事件持久化、未处理计数、显著提醒、列表摘要、跳转处理和确认语义。

### Modified Capabilities

- `channel-attention`: 将现有内存态频道注意力检测扩展为可产生持久化注意力事件,同时保留实时状态报告和 tmux 采样边界。
- `channel-status-indicators`: 在现有项目/频道状态点基础上增加全局未处理入口与 Attention Center 联动,并避免状态点与事件确认语义冲突。

## Impact

- **后端 `server.js`**:新增 SQLite 初始化、迁移、数据访问层;扩展 toolbar/task/channel-attention 相关接口;新增输入历史与 attention events API。
- **依赖**:新增 Node SQLite 依赖(优先选择同步、嵌入式、部署简单的 SQLite driver);数据库文件位于 `data/nexus.sqlite`。
- **前端**:
  - `Toolbar.tsx` / `toolbarDefaults.ts`:布局 profile、推荐、一键预设和使用统计。
  - `Terminal.tsx` / `mobileInput.ts`:移动端 Composer、历史召回、提交发送和光标可见性。
  - `SessionManagerV2.tsx` / `TabBar.tsx`:Attention Center 入口、未处理计数、状态跳转。
  - `GeneralSettings.tsx`:隐私/历史保留/清空历史设置。
  - i18n 文案补充 zh-CN/en。
- **数据迁移**:`data/toolbar-config.json` 与 `data/tasks.json` 在首次启动或首次访问时迁移到 SQLite;迁移失败时不删除原文件。
- **约束对照(NORTH-STAR)**:不替换 tmux、不做多用户系统、不做通用 Web SSH;SQLite 只保存用户状态、索引和事件,不保存完整终端 scrollback。
- **部署**:涉及后端依赖与数据文件,部署后需要重启 `nexus` 服务并验证可访问;如不可访问,按项目约束回滚。
