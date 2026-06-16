## Context

Nexus 是 WebSocket↔tmux 桥接面板:**项目 = tmux session,频道 = tmux window**,无数据库,会话状态从 tmux 实时读取(NORTH-STAR / CLAUDE.md 约束)。

当前状态检测的现状:
- 后端 `GET /api/sessions/:id/output`(server.js:883)只对 **已有 PTY 连接(attached)** 的 window 返回 `lastOutput` / `idleMs`,数据来自 `ptyMap`(server.js:1859)。未被任何客户端打开的频道没有 PTY,也就没有输出可读。
- 状态判定在前端 `windowStatus.ts`:`getWindowStatus()` 用 `idleMs < 4000` 判 running,否则正则匹配最后一行判 shell/waiting。枚举仅 `running | waiting | shell | unknown`。
- `Terminal.tsx` 每 3s 轮询当前 session 的各 window 输出(`fetchOutputs`,Terminal.tsx:447-465),`TabBar` 据此渲染状态点。`SessionManagerV2` 的频道点目前只按 `active`/`name` 粗判(`getChannelStatus`,SessionManagerV2.tsx:84)。
- 频道列表来自 `GET /api/projects/:name/channels`(server.js:1094),用 `tmux list-windows` 取 index/name/active/cwd,**不含状态**。
- 频道切换/激活走 `POST /api/projects/:name/activate`(server.js:1286)与前端切换路径。

要满足需求(跨全部项目所有频道、需确认/已完成的粘性提醒、进入即清除),必须把状态检测从「前端、仅活跃 session」上移到「后端、全部频道」,并引入服务端的粘性状态记忆。

## Goals / Non-Goals

**Goals:**
- 后端定时对**所有** tmux session 的所有 window 采样,产出每频道状态,覆盖未连接频道。
- 引入 `needs-confirm` / `done` 两个**粘性提醒态**,持续到用户进入该频道即清除(已读语义)。
- 提供单一聚合接口供前端在项目列表与频道标签统一渲染;项目级标记按优先级聚合。
- 复用既有频道切换路径触发清除,不新增「已读」按钮。
- 不引入数据库或新持久化文件(状态为进程内内存)。

**Non-Goals:**
- 不修改 Claude / 不接入 Claude Code hooks 或外部信号(本期用纯启发式)。
- 不做历史状态留存、跨重启持久化(进程重启后提醒态重建,可接受)。
- 不做推送/通知(Telegram 等)联动,只做面板内可视标记。
- 不追求 100% 精确的「确认/完成」识别,允许启发式偶发误判。

## Decisions

### D1. 后端集中检测 + 内存状态机(取代纯前端判定)
**选择**:在 server.js 新增一个轮询器(`setInterval`),每个周期对所有 session×window 执行 `tmux capture-pane -p -t session:index -S -<N>`(N 行上限,例如 50),解析最后若干行计算**实时态**,再叠加**粘性态**记忆,写入内存表 `channelAttention`(key = `session:index`)。
**理由**:未连接频道没有 PTY/`lastOutput`,只能靠 `capture-pane` 主动采样;粘性语义需要服务端记忆,前端无状态无法跨轮询保持。
**Alternatives**:
- 纯前端轮询所有频道 `capture-pane` — 否决:前端无法管理粘性态、且会让每个客户端各自打满 tmux。
- 给每个频道常驻 PTY — 否决:违背「仅按需连接」,资源开销大。

### D2. 状态机:实时态 + 粘性态分层
**实时态**(每轮覆盖):`active` / `idle` / `shell`,由 `capture-pane` 输出 + 上一轮输出 diff 推出(有新内容→active;无新内容超阈值→idle;末行 shell 提示符→shell)。
**粘性态**(置位后保持):
- 进入 `needs-confirm`:实时解析命中确认特征(选项块 + `❯`/`>` 光标,或 "Do you want to proceed"/"(y/n)" 类)。
- 进入 `done`:检测到「上一轮 active → 本轮 idle」的下降沿,且末行非 shell 提示符。
- 清除:仅当用户进入该频道(D4)。
**对外报告状态优先级**:`needs-confirm` > `done` > 实时态(`active`/`shell`/`idle`)。
**理由**:把「会变的实时态」和「看过才消的提醒态」分开,避免实时态刷新把提醒冲掉;契合 spec 的粘性要求。

### D3. 检测启发式(扩展 windowStatus.ts 并在后端复用)
将判定逻辑抽成纯函数,前后端共享同一套特征定义,避免双份漂移:
- needs-confirm 特征:`/❯\s*\d+\.|\bDo you want to proceed\b|\(y\/n\)|\b1\.\s*Yes\b/i` 之类(实现时按 Claude 实际提示精修)。
- done 下降沿:维护每频道 `lastSampleHash` + `lastActiveAt`;本轮 hash 与上轮相同且距上次活跃 > idle 阈值 → idle;若该频道此前在 active 且这是首次进入 idle → 置 done。
**理由**:启发式集中、可测;前端 `getWindowStatus` 可继续用于活跃 session 的实时点,后端用于全量+粘性。
**Trade-off**:特征字符串会随 Claude UI 变化,需可维护地集中存放。

### D4. 清除复用频道切换路径
在频道激活/切换处(后端 `POST /api/projects/:name/activate` 及/或新增轻量 `POST /api/channel-status/seen`)删除该 `session:index` 的粘性态。前端在 `onSwitchChannel`/`Terminal` 切换频道时调用。
**理由**:满足「进入即清除、无额外按钮」。优先扩展 activate;若切换不总走 activate,则补一个 idempotent 的 seen 接口由前端在切换时调用。
**Alternatives**:显式「已读」按钮 — 用户已明确否决。

### D5. 单一聚合接口
新增 `GET /api/channel-status`(authMiddleware),返回 `{ "<session>": { "<index>": "active|needs-confirm|done|idle|shell", ... }, ... }`。前端 `SessionManagerV2` 拉取全量用于项目+频道渲染;`TabBar`/`Terminal` 可复用同一数据或沿用现有 per-window 输出做实时绿点。
**理由**:一次请求覆盖全部项目频道,前端按 session+index 索引即可;避免 N 个项目 N 次请求。

### D6. 轮询频率与开销上限
全频道轮询周期取 ≥ 3s(与现有前端轮询同量级,可配),`capture-pane` 行数上限(如 50),对窗口数设软上限并串行/小并发执行,避免 tmux 压力。前端拉 `/api/channel-status` 用独立较缓周期(如 3–5s)。
**理由**:满足 spec 的开销约束,防止项目/频道很多时打爆 CPU。

## Risks / Trade-offs

- **启发式误判 needs-confirm/done** → 集中特征定义、可调阈值;done 用「下降沿首次进入 idle」而非「任意 idle」减少噪声;允许用户进入即清除纠偏。
- **全频道 `capture-pane` 开销随频道数增长** → 行数与周期上限(D6),必要时只对「近期有 PTY 活动或 list-windows 显示非 active」的频道采样。
- **进程重启丢失粘性态** → 接受(Non-Goal);重启后由实时态重建,done 历史不可恢复,影响轻微。
- **前后端启发式重复/漂移** → 抽共享纯函数(D3),后端从 windowStatus 逻辑派生,减少双份维护。
- **alternate-screen(全屏 TUI)下 capture-pane 内容** → 复用现有 scrollback 处理经验(server.js dedup/`-e`),必要时对全屏应用降级为 active,不强判 done。
- **activate 不一定覆盖所有切换路径** → 用 idempotent `seen` 接口兜底(D4)。

## Migration Plan

1. 后端先加 `channelAttention` 内存表 + 轮询器 + `GET /api/channel-status` + 清除入口,不改动既有接口(向后兼容)。
2. 前端扩展 `windowStatus.ts` 枚举与颜色/title,新增对 `/api/channel-status` 的拉取 hook。
3. `SessionManagerV2` / `TabBar` 接入新状态与项目级聚合;`Terminal`/切换路径接清除调用。
4. 补 i18n(zh-CN/en)。
5. 按 AGENTS.md:`nexus-redeploy` 重建前端并重启 nexus;浏览器手动验证四态与「进入即清除」;若服务不可达立即回滚。
**Rollback**:新接口与字段均为增量,回滚到上一版本即可,无数据迁移。

## Open Questions

- needs-confirm 的确认特征正则需对照 Claude 当前实际 TUI 输出精修(实现阶段用真实输出样本校准)。
- 频道切换是否 100% 经过 `activate`?若否,确认以 `seen` 接口兜底的前端触发点(`onSwitchChannel` / WS attach)。
- `done` 是否需要在频道再次产生新输出(重新 active)时自动失效?当前设计为「仅进入清除」,保持简单;若体验不佳可加「重新 active 即清除 done」。
