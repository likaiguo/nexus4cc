# channel-attention Specification

## Purpose

后端为全部 tmux session(项目)的全部 window(频道)持续采样并判定状态,维护粘性提醒态(`needs-confirm` / `done`),并通过经鉴权的聚合接口向前端暴露全量频道状态,使用户无需逐一进入频道即可感知哪些频道需要关注。

## Requirements

### Requirement: 全频道状态轮询

后端 SHALL 定时对全部 tmux session(项目)的全部 window(频道)执行 `tmux capture-pane` 采样,并对每个频道启发式计算其状态,无论该频道当前是否被某个 WebSocket 客户端连接(attached)。轮询频率与单次采样行数 MUST 设上限以限制对 tmux 与 CPU 的压力。

#### Scenario: 轮询覆盖未连接的频道
- **WHEN** 某项目存在一个当前没有任何客户端连接的频道
- **THEN** 后端仍 SHALL 在下一个轮询周期采样该频道输出并计算其状态

#### Scenario: 限制采样开销
- **WHEN** 后端执行一轮全频道采样
- **THEN** 每个频道的 `capture-pane` 采样行数 MUST 不超过设定上限,且两轮采样间隔 MUST 不小于设定的最小周期

### Requirement: 频道状态判定

后端 SHALL 为每个频道判定以下互斥状态之一:`active`(活跃对话/运行中)、`needs-confirm`(等待用户交互确认)、`done`(会话完成)、`idle`(空闲)、`shell`(已退出到 shell)。判定 SHALL 基于终端最近输出的启发式解析,不依赖修改 Claude 或外部信号。

#### Scenario: 检测到确认提示
- **WHEN** 频道最近输出包含交互确认提示特征(例如包含选项列表与 `❯`/`>` 光标,或 "Do you want to proceed" 一类确认问句)
- **THEN** 该频道状态 SHALL 判定为 `needs-confirm`

#### Scenario: 检测到会话完成
- **WHEN** 频道先前为运行态(近期有输出),其后进入 idle(超过空闲阈值无新输出),且最后一行不是 shell 提示符
- **THEN** 该频道状态 SHALL 判定为 `done`

#### Scenario: 检测到活跃运行
- **WHEN** 频道在最近的空闲阈值内有新输出且未匹配确认提示特征
- **THEN** 该频道状态 SHALL 判定为 `active`

#### Scenario: 退出到 shell
- **WHEN** 频道最后一行为 shell 提示符(以 `$` 或 `#` 结尾)
- **THEN** 该频道状态 SHALL 判定为 `shell`

### Requirement: 粘性提醒态

`needs-confirm` 与 `done` SHALL 为粘性提醒态:一旦置位,即使后续轮询的实时状态发生变化,也 SHALL 持续保持,直到被显式清除(已读)。`active`、`idle`、`shell` SHALL 为实时态,随每轮轮询更新,不具粘性。

#### Scenario: needs-confirm 在用户响应前保持
- **WHEN** 某频道被置为 `needs-confirm`,且用户尚未进入该频道
- **THEN** 后续轮询 SHALL 持续将该频道报告为 `needs-confirm`,即使终端输出已不再匹配确认特征

#### Scenario: done 在用户查看前保持
- **WHEN** 某频道被置为 `done`,且用户尚未进入该频道
- **THEN** 后续轮询 SHALL 持续将该频道报告为 `done`

### Requirement: 进入频道清除提醒

当用户进入/切换到某频道时,后端 SHALL 清除该频道的粘性提醒态(`needs-confirm` / `done`),清除后该频道 SHALL 回到实时态。清除 SHALL 复用现有的频道切换/激活路径,不要求用户执行额外的显式操作。

#### Scenario: 切换到频道清除 needs-confirm
- **WHEN** 某频道处于 `needs-confirm`,用户切换/进入该频道
- **THEN** 后端 SHALL 清除该频道的粘性提醒态,使其后续状态由实时轮询决定

#### Scenario: 切换到频道清除 done
- **WHEN** 某频道处于 `done`,用户切换/进入该频道
- **THEN** 后端 SHALL 清除该频道的粘性提醒态

#### Scenario: 进入其它频道不影响本频道提醒
- **WHEN** 频道 A 处于 `needs-confirm`,用户进入频道 B(A ≠ B)
- **THEN** 频道 A 的 `needs-confirm` SHALL 保持不变

### Requirement: 聚合状态接口

后端 SHALL 提供一个经鉴权的接口,返回全部项目所有频道的当前状态(含粘性提醒态)。返回结构 SHALL 能将状态按项目与频道索引定位,供前端在项目列表与频道标签上渲染。

#### Scenario: 返回全部项目频道状态
- **WHEN** 已鉴权客户端请求聚合状态接口
- **THEN** 响应 SHALL 包含每个项目每个频道的状态枚举值,且可按 项目名 + 频道 index 索引

#### Scenario: 未鉴权拒绝
- **WHEN** 未携带有效令牌的客户端请求聚合状态接口
- **THEN** 后端 SHALL 返回未授权错误且不泄露状态数据
