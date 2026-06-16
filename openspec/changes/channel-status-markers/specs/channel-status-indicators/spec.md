## ADDED Requirements

### Requirement: 频道状态可视标记

前端 SHALL 在频道列表(`SessionManagerV2`)与频道标签(`TabBar`)上为每个频道渲染与其状态对应的可视标记:`active` 为绿色,`needs-confirm` 为醒目脉冲标记,`done` 为蓝色,`idle`/`shell` 为中性/灰色。标记 SHALL 带可访问的提示文案(title / i18n)。

#### Scenario: 活跃频道显示绿色
- **WHEN** 某频道状态为 `active`
- **THEN** 其在频道列表与频道标签上的标记 SHALL 显示为绿色

#### Scenario: 等待确认频道显示醒目脉冲
- **WHEN** 某频道状态为 `needs-confirm`
- **THEN** 其标记 SHALL 显示为醒目的脉冲样式,与其它态在视觉上可区分

#### Scenario: 完成频道显示蓝色
- **WHEN** 某频道状态为 `done`
- **THEN** 其标记 SHALL 显示为蓝色

### Requirement: 项目级状态聚合

前端在项目列表中 SHALL 将项目标记聚合其下所有频道的状态,按优先级:任一频道 `needs-confirm` → 项目显示醒目脉冲;否则任一频道 `done` → 项目显示蓝色;否则任一频道 `active` → 项目显示绿色;否则显示中性态。

#### Scenario: 子频道需确认时项目醒目
- **WHEN** 某项目下至少一个频道为 `needs-confirm`
- **THEN** 该项目的标记 SHALL 显示为醒目脉冲

#### Scenario: 子频道仅活跃时项目绿色
- **WHEN** 某项目下没有 `needs-confirm` 或 `done` 频道,但至少一个频道为 `active`
- **THEN** 该项目的标记 SHALL 显示为绿色

#### Scenario: 完成优先于活跃低于需确认
- **WHEN** 某项目下同时存在 `done` 与 `active` 频道,且无 `needs-confirm`
- **THEN** 该项目的标记 SHALL 显示为蓝色(`done`)

### Requirement: 切换频道清除提醒标记

当用户在前端切换/进入某频道时,前端 SHALL 触发该频道粘性提醒态的清除,使该频道的 `needs-confirm`/`done` 标记随之消失。前端 SHALL 不要求用户点击额外的「已读」按钮。

#### Scenario: 进入频道后标记消失
- **WHEN** 用户点击/切换到一个处于 `needs-confirm` 或 `done` 的频道
- **THEN** 该频道的提醒标记 SHALL 在状态刷新后消失

#### Scenario: 实时活跃标记不被清除
- **WHEN** 用户进入一个处于 `active` 的频道
- **THEN** 该频道的绿色标记 SHALL 按实时状态继续显示,不被「清除」逻辑移除

### Requirement: 状态文案国际化

所有新增状态标记的提示文案 SHALL 提供 zh-CN 与 en 两种语言,不得硬编码到组件中。

#### Scenario: 中英文案存在
- **WHEN** 渲染任一状态标记的提示文案
- **THEN** zh-CN 与 en 的 locale 文件 SHALL 各自包含对应键值
