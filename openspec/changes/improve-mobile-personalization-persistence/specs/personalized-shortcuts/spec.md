## ADDED Requirements

### Requirement: 设备独立快捷键布局

系统 SHALL 支持按设备类型保存快捷键布局,至少区分 `mobile` 与 `desktop`。每个设备类型 SHALL 能拥有独立的固定区、展开区和自定义按键列表。

#### Scenario: 移动端布局不影响桌面端
- **WHEN** 用户在移动端调整固定快捷键顺序
- **THEN** 桌面端 active layout SHALL 保持不变

#### Scenario: 桌面端布局不影响移动端
- **WHEN** 用户在桌面端添加或移除快捷键
- **THEN** 移动端 active layout SHALL 保持不变

### Requirement: 快捷键预设与一键应用

系统 SHALL 提供可一键应用的快捷键预设,包括出厂默认、Claude 常用、Shell 常用、移动极简等布局。应用预设 MUST 先更新当前设备类型的 active layout,不得删除用户自定义按键定义。

#### Scenario: 一键应用预设
- **WHEN** 用户选择一个快捷键预设并确认应用
- **THEN** 当前设备类型的快捷键布局 SHALL 更新为该预设定义

#### Scenario: 保留自定义按键
- **WHEN** 用户已有自定义按键并应用出厂预设
- **THEN** 系统 SHALL 保留自定义按键定义,但 MAY 将其从当前布局中移除

### Requirement: 高频快捷键统计

系统 SHALL 记录用户点击快捷键的使用次数和最近使用时间。统计记录 MUST 只包含快捷键 ID、设备类型和计数信息,不得记录终端输出或用户输入内容。

#### Scenario: 点击快捷键增加计数
- **WHEN** 用户点击任一工具栏快捷键
- **THEN** 后端 SHALL 增加该快捷键在当前设备类型下的使用次数

#### Scenario: 统计不包含敏感文本
- **WHEN** 系统保存快捷键使用统计
- **THEN** 统计记录 SHALL 不包含快捷键发送后的终端响应或用户输入历史

### Requirement: 快捷键推荐

系统 SHALL 基于本地使用统计生成高频快捷键推荐,用于建议用户置顶、重排或应用预设。推荐结果 MUST 可被用户忽略,不得自动改动布局。

#### Scenario: 推荐高频快捷键置顶
- **WHEN** 某快捷键在移动端使用频率高但不在固定区
- **THEN** 系统 SHALL 在快捷键设置中推荐将其加入固定区

#### Scenario: 忽略推荐不改变布局
- **WHEN** 用户忽略快捷键推荐
- **THEN** 系统 SHALL 保持当前布局不变

### Requirement: 快捷键配置兼容旧接口

现有 `/api/toolbar-config` 接口 SHALL 保持兼容。旧接口读取时 SHALL 返回当前设备或默认设备的 active layout;旧接口写入时 SHALL 更新兼容的 active layout。

#### Scenario: 旧前端读取工具栏配置
- **WHEN** 客户端请求 `/api/toolbar-config`
- **THEN** 后端 SHALL 返回包含 `pinned` 与 `expanded` 的兼容配置结构

#### Scenario: 旧前端写入工具栏配置
- **WHEN** 客户端向 `/api/toolbar-config` 提交合法配置
- **THEN** 后端 SHALL 将其保存为兼容 active layout

### Requirement: 自定义快捷键校验

系统 SHALL 校验自定义快捷键定义,确保每个自定义键具有唯一 ID、显示 label、合法终端序列或合法 UI action。无效配置 MUST 被拒绝且不得破坏已有布局。

#### Scenario: 拒绝无效序列
- **WHEN** 用户提交无法解析的自定义快捷键序列
- **THEN** 系统 SHALL 拒绝该配置并返回可理解的错误

#### Scenario: 保持旧布局
- **WHEN** 自定义快捷键保存失败
- **THEN** 系统 SHALL 保持保存前的快捷键布局不变
