## Why

用户在移动端面板管理多个项目(tmux session)和频道(tmux window)时,无法一眼看出哪个频道正在活跃对话、哪个正在等待自己确认、哪个已经完成。当前状态点仅在「已连接的活跃 session」内轮询、由前端启发式实时计算,切换项目前看不到其它项目的状态,也没有「需要确认」「已完成」这类需要用户注意、看过即消除的提醒态。结果是用户必须逐个点开频道才能知道哪里需要操作,容易错过 Claude 的确认提示或漏看已完成的任务。

## What Changes

- 后端新增「频道注意力状态(channel attention)」检测:定时对全部项目的全部频道执行 `tmux capture-pane` 轮询,启发式解析终端输出,判定每个频道的状态。
- 定义四类可视状态:
  - **active(活跃对话中)** — 绿色标记,实时反映该频道正在运行/有对话。
  - **needs-confirm(等待用户确认)** — 醒目标记(脉冲),当检测到 Claude 权限/确认提示(如 `Do you want to proceed`、`❯ 1. Yes`)。
  - **done(会话完成)** — 蓝色标记,当频道从 running 转为 idle 且最后一行非 shell 提示符。
  - **idle/shell** — 沿用现有的中性/灰色态。
- needs-confirm 与 done 为**粘性提醒态**:一旦置位,持续显示直到用户切换/进入该频道,进入即自动清除(已读语义)。active 为**实时态**,不需清除。
- 新增后端接口暴露全部项目所有频道的聚合状态,并提供「进入频道即清除提醒」的状态确认入口(通过现有切换频道路径触发,无需额外按钮)。
- 前端在 `SessionManagerV2`(项目/频道列表)与 `TabBar`(频道标签)统一消费新状态:绿色=active、脉冲醒目=needs-confirm、蓝色=done;项目级标记聚合其下频道(任一频道 needs-confirm 则项目显示醒目,任一 active 则显示绿色)。
- 新增对应 i18n 文案(zh-CN / en)。

## Capabilities

### New Capabilities

- `channel-attention`: 后端对全部项目所有频道做启发式状态检测与聚合,定义 active / needs-confirm / done / idle 状态机、粘性提醒语义、进入即清除的已读规则,以及对外暴露的聚合状态接口。
- `channel-status-indicators`: 前端在项目列表与频道标签上呈现状态标记(颜色/脉冲)、项目级聚合规则,以及切换频道触发清除的交互。

### Modified Capabilities

<!-- 无既有 spec,全部为新增 -->

## Impact

- **后端 `server.js`**:新增定时 `tmux capture-pane` 轮询与状态缓存;新增聚合状态接口(如 `GET /api/channel-status`);扩展现有频道切换/激活路径以清除粘性提醒。
- **前端**:
  - `windowStatus.ts` — 扩展状态枚举与启发式(新增 needs-confirm / done 检测)。
  - `SessionManagerV2.tsx` — 项目/频道列表消费聚合状态、项目级聚合、切换即清除。
  - `TabBar.tsx` — 频道标签状态点扩展。
  - `Terminal.tsx` — 频道切换路径触发清除调用。
  - locales `zh-CN` / `en` — 新增状态文案。
- **约束对照(NORTH-STAR)**:不引入数据库,状态为内存缓存 + tmux 实时读取;无新增持久化文件。
- **性能**:全频道轮询需控制频率与 `capture-pane` 行数上限,避免对 tmux/CPU 造成压力。
