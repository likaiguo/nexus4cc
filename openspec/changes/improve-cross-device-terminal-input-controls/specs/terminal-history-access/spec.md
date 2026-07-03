## ADDED Requirements

### Requirement: 跨端显式打开终端历史

系统 SHALL 在 PC 端和移动端提供显式入口打开当前项目/频道的终端输出历史。该入口 SHALL 使用 tmux scrollback 数据源并复用现有历史记录浮层能力,不得要求用户只能通过移动端手势或浏览器原生滚动查找历史输出。

#### Scenario: PC 端打开终端历史
- **WHEN** 用户在 PC 端触发终端历史入口
- **THEN** 系统 SHALL 打开当前项目/频道的终端历史浮层
- **AND** 历史内容 SHALL 来自当前 tmux pane 的 scrollback API

#### Scenario: 移动端打开终端历史
- **WHEN** 用户在移动端触发终端历史入口
- **THEN** 系统 SHALL 打开当前项目/频道的终端历史浮层
- **AND** 用户 SHALL 不需要依赖隐藏手势才能进入历史记录

#### Scenario: 历史入口跟随当前频道
- **WHEN** 用户切换到另一个项目或频道后打开终端历史
- **THEN** 系统 SHALL 请求切换后项目/频道对应的 tmux scrollback

### Requirement: 终端历史与输入历史术语区分

系统 SHALL 在用户可见文案和操作入口中区分终端输出历史与 Composer 输入历史。用于查看 tmux scrollback 的入口 SHALL 表达为终端历史或输出历史;用于召回此前提交文本的入口 SHALL 表达为输入历史。

#### Scenario: 混合菜单中区分两类历史
- **WHEN** 同一菜单或工具区同时存在终端历史和输入历史入口
- **THEN** 系统 SHALL 使用不同文案或可访问标签区分两类入口

#### Scenario: 终端历史不展示输入历史数据
- **WHEN** 用户打开终端历史入口
- **THEN** 系统 SHALL 展示 tmux scrollback 内容
- **AND** 系统 SHALL NOT 将 SQLite 输入历史列表作为终端历史展示

#### Scenario: 输入历史不展示终端输出
- **WHEN** 用户打开 Composer 输入历史入口
- **THEN** 系统 SHALL 展示此前明确提交的 Composer 文本
- **AND** 系统 SHALL NOT 展示完整 tmux scrollback

### Requirement: 移动端历史手势匹配查看旧输出预期

移动端历史手势 SHALL 与查看更早终端输出的用户预期保持一致。系统 MAY 保留手势进入历史模式,但手势方向、阈值和文案 MUST 避免出现“向上/向下”语义与实际触发方向相反的情况。无论手势是否触发,显式终端历史入口 SHALL 始终可用。

#### Scenario: 向旧输出方向手势打开历史
- **WHEN** 用户在移动端终端区域执行查看更早输出的历史手势
- **THEN** 系统 SHALL 打开终端历史浮层或开始预取历史内容

#### Scenario: 反向手势不误触历史
- **WHEN** 用户执行与查看旧输出相反方向的滚动或返回当前输出手势
- **THEN** 系统 SHALL NOT 因方向语义错误而误打开终端历史浮层

#### Scenario: 手势不可用时仍可进入历史
- **WHEN** 浏览器、触控设备或用户操作导致历史手势未触发
- **THEN** 用户 SHALL 仍可通过显式终端历史入口打开历史浮层

### Requirement: 历史浮层退出保持可预期

终端历史浮层 SHALL 提供明确关闭动作,并保留滚动到底部返回终端的现有行为。PC 和移动端 SHALL 使用一致的关闭语义,避免用户进入历史后无法返回当前终端。

#### Scenario: 点击关闭历史
- **WHEN** 用户在历史浮层点击关闭动作
- **THEN** 系统 SHALL 关闭历史浮层并返回当前终端

#### Scenario: 滚动到底部返回终端
- **WHEN** 用户在历史浮层滚动到内容底部
- **THEN** 系统 SHALL 关闭历史浮层并返回当前终端

#### Scenario: 返回后当前终端仍可输入
- **WHEN** 历史浮层关闭后
- **THEN** 当前终端或 Composer 输入路径 SHALL 恢复为关闭历史前可用状态
