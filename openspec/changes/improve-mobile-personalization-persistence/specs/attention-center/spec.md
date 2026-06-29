## ADDED Requirements

### Requirement: 注意力事件持久化

系统 SHALL 将需要用户关注的事项保存为 SQLite 注意力事件,至少包括频道 `needs-confirm`、频道 `done`、任务完成和任务失败。每个事件 MUST 包含类型、项目、频道、摘要、状态、创建时间和更新时间。

#### Scenario: 确认提示生成事件
- **WHEN** 后端检测到某频道进入 `needs-confirm`
- **THEN** 系统 SHALL 创建或更新该频道对应的注意力事件

#### Scenario: 完成状态生成事件
- **WHEN** 后端检测到某频道进入 `done`
- **THEN** 系统 SHALL 创建或更新该频道对应的注意力事件

#### Scenario: 任务失败生成事件
- **WHEN** 非交互任务以失败状态结束
- **THEN** 系统 SHALL 创建任务失败注意力事件

### Requirement: 注意力事件去重

系统 SHALL 对同一项目、频道、事件类型和关联任务生成稳定 dedupe key。重复检测到同一事项时 MUST 更新已有未解决事件,不得无限新增重复事件。

#### Scenario: 重复确认提示不刷屏
- **WHEN** 同一频道连续多轮检测到同一 `needs-confirm` 状态
- **THEN** 系统 SHALL 更新已有未解决事件的更新时间,而不是创建多条重复事件

#### Scenario: 新任务生成独立事件
- **WHEN** 同一频道的不同任务分别完成
- **THEN** 系统 SHALL 为不同任务生成可区分的注意力事件

### Requirement: 事件状态流转

注意力事件 SHALL 支持 `new`、`seen`、`resolved` 和 `dismissed` 状态。进入频道或打开事件详情 SHALL 将 `new` 标记为 `seen`;只有用户明确确认处理、解决或关闭时,事件才 SHALL 变为 `resolved` 或 `dismissed`。

#### Scenario: 进入频道仅标记已看
- **WHEN** 用户进入包含 `new` 注意力事件的频道
- **THEN** 系统 SHALL 将相关事件标记为 `seen`,但不得自动标记为 `resolved`

#### Scenario: 用户确认解决事件
- **WHEN** 用户在 Attention Center 中确认某事件已处理
- **THEN** 系统 SHALL 将该事件状态更新为 `resolved`

#### Scenario: 用户忽略事件
- **WHEN** 用户在 Attention Center 中 dismiss 某事件
- **THEN** 系统 SHALL 将该事件状态更新为 `dismissed`

### Requirement: Attention Center 显著入口

前端 SHALL 提供显著的 Attention Center 入口,在移动端和桌面端都显示未解决事件计数。存在 `new` 或 `seen` 但未解决事件时,入口 SHALL 在视觉上可被用户注意到。

#### Scenario: 显示未解决计数
- **WHEN** 存在未解决注意力事件
- **THEN** Attention Center 入口 SHALL 显示未解决事件数量

#### Scenario: 无事件时保持低干扰
- **WHEN** 不存在未解决注意力事件
- **THEN** Attention Center 入口 SHALL 不显示醒目的未处理徽标

### Requirement: 事件列表与跳转

Attention Center SHALL 展示注意力事件列表,包含项目、频道、类型、摘要、时间和状态。用户选择事件时 SHALL 能跳转到对应项目和频道。

#### Scenario: 展示事件摘要
- **WHEN** 用户打开 Attention Center
- **THEN** 前端 SHALL 展示未解决事件列表及每条事件的项目、频道、类型、摘要和时间

#### Scenario: 点击事件跳转频道
- **WHEN** 用户点击某个频道事件
- **THEN** 前端 SHALL 切换到该事件对应的项目和频道

### Requirement: 浏览器通知与标题联动

系统 SHALL 在用户允许通知时对新的高优先级注意力事件发送浏览器通知,并在页面标题或入口徽标中反映未解决数量。通知不得包含完整敏感输出,只显示事件类型和简短摘要。

#### Scenario: 新确认事件触发通知
- **WHEN** 产生新的 `needs-confirm` 注意力事件且浏览器通知权限已允许
- **THEN** 前端 SHALL 发送一条简短浏览器通知

#### Scenario: 标题显示未解决数量
- **WHEN** 存在未解决注意力事件
- **THEN** 页面标题或应用入口 SHALL 显示未解决数量
