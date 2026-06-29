## ADDED Requirements

### Requirement: 频道注意力事件输出

后端 SHALL 在现有频道状态轮询基础上,为 `needs-confirm` 与 `done` 状态生成持久化注意力事件。事件写入 SHALL 不改变现有聚合状态接口的实时状态返回能力。

#### Scenario: needs-confirm 写入事件
- **WHEN** 频道状态被判定为 `needs-confirm`
- **THEN** 后端 SHALL 创建或更新该频道的 `needs-confirm` 注意力事件

#### Scenario: done 写入事件
- **WHEN** 频道状态被判定为 `done`
- **THEN** 后端 SHALL 创建或更新该频道的 `done` 注意力事件

### Requirement: 状态点清除不删除事件

当用户进入频道并清除频道粘性状态点时,后端 SHALL 保留对应注意力事件,并将未查看事件标记为 `seen`。事件 SHALL 持续存在直到用户明确 resolved 或 dismissed。

#### Scenario: 进入频道保留事件
- **WHEN** 用户进入处于 `needs-confirm` 的频道
- **THEN** 后端 SHALL 清除该频道状态点的粘性提醒,并将对应注意力事件标记为 `seen` 而不是删除

#### Scenario: 已完成事件等待确认
- **WHEN** 用户进入处于 `done` 的频道
- **THEN** 后端 SHALL 清除该频道状态点的粘性提醒,但对应 `done` 事件 SHALL 保留在 Attention Center 中直到用户处理

### Requirement: 事件摘要限制

后端生成频道注意力事件时 SHALL 只保存短摘要和必要定位信息,不得保存完整 pane 输出。摘要长度 MUST 设上限。

#### Scenario: 保存短摘要
- **WHEN** 后端从 tmux 采样输出生成注意力事件
- **THEN** 事件 SHALL 只包含受长度限制的最后输出摘要

#### Scenario: 不保存完整 scrollback
- **WHEN** 频道输出包含大量历史文本
- **THEN** 注意力事件 SHALL 不保存完整 scrollback 内容
