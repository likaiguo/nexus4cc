## ADDED Requirements

### Requirement: 全局注意力入口联动

前端 SHALL 在现有项目/频道状态标记之外,提供全局 Attention Center 入口并显示未解决注意力事件数量。该入口 SHALL 在移动端和桌面端均可访问。

#### Scenario: 状态点外显示全局入口
- **WHEN** 存在未解决注意力事件
- **THEN** 前端 SHALL 在项目/频道状态点之外显示可进入 Attention Center 的入口

#### Scenario: 移动端可访问入口
- **WHEN** 用户使用移动端布局
- **THEN** Attention Center 入口 SHALL 在常用导航或工具区域中可直接打开

### Requirement: 状态标记与事件确认语义分离

前端 SHALL 将频道状态点视为快速导航提示,将 Attention Center 事件视为待处理事项。进入频道 MAY 清除状态点,但不得让对应事件从 Attention Center 中消失,除非用户明确 resolved 或 dismissed。

#### Scenario: 进入频道后事件仍在
- **WHEN** 用户进入一个存在 `needs-confirm` 事件的频道
- **THEN** 频道状态点 MAY 按实时状态变化,但该事件 SHALL 仍在 Attention Center 中以 `seen` 状态显示

#### Scenario: 用户处理后事件消失
- **WHEN** 用户在 Attention Center 中将事件标记为 resolved 或 dismissed
- **THEN** 该事件 SHALL 从默认未解决列表中移除

### Requirement: 未解决数量国际化与可访问

Attention Center 入口的提示文案和未解决数量说明 SHALL 提供 zh-CN 与 en 文案,并提供可访问 title 或 aria-label。

#### Scenario: 中英文提示存在
- **WHEN** 渲染 Attention Center 入口
- **THEN** zh-CN 与 en locale 文件 SHALL 包含入口文案和未解决数量文案
