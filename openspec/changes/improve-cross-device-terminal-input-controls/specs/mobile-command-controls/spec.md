## ADDED Requirements

### Requirement: 移动端提供显式终端历史入口

移动端命令控件 SHALL 提供可发现的终端历史入口,用于打开当前项目/频道的 tmux scrollback 历史浮层。该入口 MAY 位于更多/设置菜单或紧凑系统操作区,但 MUST 不依赖用户记住隐藏手势。

#### Scenario: 更多菜单包含终端历史入口
- **WHEN** 用户在移动端打开更多/设置菜单
- **THEN** 菜单 SHALL 提供终端历史入口
- **AND** 该入口 SHALL 与 Composer 输入历史入口在文案或图标语义上可区分

#### Scenario: 终端历史入口不挤占固定快捷键行
- **WHEN** 用户在移动端查看固定快捷键两行
- **THEN** 终端历史入口 SHALL NOT 破坏固定快捷键行的既有顺序和布局稳定性

#### Scenario: 打开终端历史后保留工具栏可恢复
- **WHEN** 用户通过移动端终端历史入口打开历史浮层并随后关闭
- **THEN** 移动端工具栏 SHALL 恢复到打开历史前的可操作状态

### Requirement: 移动端区分终端历史与输入历史

移动端菜单 SHALL 将终端输出历史和 Composer 输入历史作为不同操作呈现。终端历史入口 SHALL 打开 tmux scrollback;输入历史入口 SHALL 打开或聚焦 Composer 并展示此前明确提交的输入记录。

#### Scenario: 点击终端历史打开 scrollback
- **WHEN** 用户点击移动端终端历史入口
- **THEN** 系统 SHALL 打开终端历史浮层并展示 tmux scrollback

#### Scenario: 点击输入历史打开 Composer 历史
- **WHEN** 用户点击移动端输入历史入口
- **THEN** 系统 SHALL 打开或聚焦 Composer
- **AND** 系统 SHALL 展示 Composer 输入历史列表

#### Scenario: 两类历史入口不会互相覆盖
- **WHEN** 移动端同时提供终端历史和输入历史入口
- **THEN** 触发其中一个入口 SHALL NOT 打开另一个入口对应的数据视图

### Requirement: 移动端 Composer 多行输入路径清晰

移动端 Composer SHALL 保留可见发送按钮,并支持在草稿中输入多行文本。移动端快捷键或键盘路径 SHALL 允许用户插入换行而不立即发送草稿。

#### Scenario: 移动端发送按钮发送草稿
- **WHEN** 用户在移动端 Composer 中输入非空草稿并点击发送按钮
- **THEN** 系统 SHALL 发送该草稿

#### Scenario: 移动端可输入多行草稿
- **WHEN** 用户在移动端 Composer 中插入换行
- **THEN** 系统 SHALL 将换行保留在草稿文本中
- **AND** 系统 SHALL NOT 因插入换行而发送草稿

#### Scenario: 移动端输入历史回填后仍可多行编辑
- **WHEN** 用户在移动端选择输入历史项回填草稿
- **THEN** Composer SHALL 保持可编辑
- **AND** 用户 SHALL 能继续插入或删除换行
