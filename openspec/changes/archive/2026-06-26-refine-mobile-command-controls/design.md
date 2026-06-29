## Context

`improve-mobile-personalization-persistence` 已经为移动端引入 Direct Terminal 与 Composer 双模式、输入历史、草稿持久化、Attention Center 和移动/桌面独立快捷键布局。当前实现把 Composer 相关控制集中放在移动端终端底部,包括 `直连 / 草稿` 分段切换、追加 Enter、光标、历史、Attention、清空和发送。这个布局功能完整,但在手机上占用明显的垂直空间,且把低频配置操作和高频执行操作混在同一视觉层级。

本变更只调整移动端可见控件策略。Direct Terminal、Composer、SQLite 持久化、历史和 Attention 事件语义继续沿用已完成变更,不引入新的后端数据模型。

## Goals / Non-Goals

**Goals:**
- 减少移动端终端底部常驻控件占用,提升终端主体可见高度。
- 移除常驻 `直连 / 草稿` 分段控件,但保留 Direct Terminal 默认输入路径和 Composer 可用性。
- 将追加 Enter、历史、清空、模式选择等低频操作收纳到移动端设置/更多菜单。
- 在设置按钮前保留高频快捷键和少量紧急系统入口,尤其是未处理 Attention badge。
- 保持 390px 宽度手机上按钮不溢出、不换行撑高、不遮挡 Composer 输入。

**Non-Goals:**
- 不删除 Composer 模式或 Direct Terminal 模式。
- 不改变输入历史、草稿持久化、Attention 事件的后端 API 或数据库 schema。
- 不重做快捷键编辑器、预设推荐或设置页结构。
- 不保存完整终端 scrollback。

## Decisions

### D1. Direct Terminal 作为默认状态,不常驻显示模式分段

**选择**:移动端底部不再常驻 `直连 / 草稿` 分段按钮。Direct Terminal 是默认输入路径;Composer 通过紧凑入口或设置菜单打开。

**理由**:在手机上,用户大多数时间需要看终端输出。常驻模式分段虽然清晰,但给一个默认状态占用过高视觉权重。

**Alternatives:**
- 保留分段但缩小:仍会持续占空间,也继续强化“模式控件”而非“终端主体”。
- 完全删除 Composer 入口:会破坏移动端可编辑草稿能力。

### D2. Composer 只在需要时占用输入空间

**选择**:Composer 输入区只在 `composerMode === 'composer'` 或存在未发送草稿时显示。Direct 且无草稿时,底部 Composer 面板不占用高度。

**理由**:草稿是显式编辑场景,应在编辑时提供完整控件;非编辑场景应把空间还给终端。

**Alternatives:**
- 始终显示一行 Composer 控件:实现简单但不解决占空间问题。
- 仅用弹窗编辑 Composer:会增加输入摩擦,并更容易和移动键盘/终端焦点冲突。

### D3. 低频操作进入移动端设置/更多菜单

**选择**:追加 Enter、历史输入、清空草稿、输入模式切换放进现有移动端设置/更多菜单。菜单项由 `Terminal` 通过 props 注入 `Toolbar`,或用同等低耦合方式提供。

**理由**:这些操作不是每次输入都要点击,放在常驻区域会挤压高频快捷键和终端空间。设置菜单已经是移动端低频系统操作的自然入口。

**Alternatives:**
- 新建独立 Composer 菜单按钮:会增加一个系统按钮,和用户要求“其他操作按钮并入设置”相冲突。
- 放到全局设置页:层级太深,历史和清空这类即时操作会变慢。

### D4. 高频系统入口使用紧凑图标并排在设置前

**选择**:未处理 Attention 事件有计数时,以紧凑 badge 按钮显示在设置按钮前。Composer 打开入口可作为紧凑按钮显示在设置按钮前,但应让用户自定义快捷键保持主导顺序。

**理由**:用户明确要求高频操作放到设置按钮前。Attention 是需要用户确认/处理的状态,应比普通设置更显著;Composer 是输入路径入口,可作为轻量系统操作而非大块面板。

**Alternatives:**
- Attention 只放设置内:可能漏掉“需要用户确认”的事件。
- 所有系统按钮都固定在设置前:会再次挤占用户自定义快捷键空间。

## Risks / Trade-offs

- **发现成本上升**:移除常驻 `直连 / 草稿` 后,新用户可能较难发现 Composer。→ 使用紧凑 Composer 图标、菜单项 title 和有草稿时自动显示草稿条降低风险。
- **Toolbar 与 Terminal 耦合增加**:设置菜单需要操作 Composer 状态。→ 通过小型 props/callback 或菜单项数组传递,避免 Toolbar 直接理解终端内部状态。
- **草稿状态误隐藏**:如果 Direct 模式下存在未发送草稿却不显示,用户可能忘记草稿。→ 有草稿时必须显示紧凑草稿条或 Composer 入口状态。
- **移动宽度溢出**:新增系统入口可能和快捷键竞争空间。→ 系统入口使用固定 32px 图标按钮,并保持 Toolbar 现有横向滚动/折叠策略。

## Migration Plan

1. 创建新的 OpenSpec 变更和验收规格。
2. 更新 `Terminal.tsx` 的移动端 Composer 面板渲染条件与控件分层。
3. 更新 `Toolbar.tsx` 的移动端设置/更多菜单,接收并展示 Composer 低频操作。
4. 补充 zh-CN/en 文案。
5. 运行前端测试/build。
6. 按项目约束重启 `nexus` 服务并验证可访问。

Rollback:
- 代码层面可回退本变更涉及的 `Terminal.tsx`、`Toolbar.tsx` 和 i18n 文案。
- 本变更不修改数据库 schema,回滚不需要数据迁移。

## Open Questions

- Composer 紧凑入口是否应一直显示在设置前,还是只在存在草稿/用户开启 Composer 后显示。首版建议一直显示一个 32px 图标入口,保证能力可发现。
