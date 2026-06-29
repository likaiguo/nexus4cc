## ADDED Requirements

### Requirement: 移动端 Composer 模式

移动端 SHALL 提供 Composer 模式,让用户在发送到终端前编辑可见草稿。Composer SHALL 显示当前文本、光标位置和发送动作,并支持基本编辑、换行和清空。

#### Scenario: 编辑可见草稿
- **WHEN** 用户在移动端启用 Composer 并输入文本
- **THEN** 界面 SHALL 显示待发送草稿和当前光标位置

#### Scenario: 发送草稿
- **WHEN** 用户点击发送动作
- **THEN** 系统 SHALL 将 Composer 草稿按当前发送设置写入当前 WebSocket 终端连接

#### Scenario: 清空草稿
- **WHEN** 用户清空 Composer 草稿
- **THEN** 界面 SHALL 移除未发送文本且不得向终端发送内容

### Requirement: Direct Terminal 模式保留

移动端 SHALL 保留 Direct Terminal 模式,使用户可以继续将输入直接发送到 xterm/WebSocket。Composer 模式不得破坏 vim、shell TUI、方向键、Ctrl 组合键和已有工具栏快捷键行为。

#### Scenario: 切换到 Direct Terminal
- **WHEN** 用户将输入模式切换为 Direct Terminal
- **THEN** 移动端输入 SHALL 使用现有直接终端输入路径发送字符和控制序列

#### Scenario: 工具栏快捷键继续可用
- **WHEN** Composer 模式开启且用户点击工具栏控制键
- **THEN** 该快捷键 SHALL 按其定义发送终端序列或执行 UI action

### Requirement: Composer 草稿持久化

系统 SHALL 按项目和频道保存未发送 Composer 草稿及光标位置。用户重新进入同一项目/频道时,Composer SHALL 自动恢复最近未发送草稿。

#### Scenario: 重新进入频道恢复草稿
- **WHEN** 用户在频道 A 输入 Composer 草稿后离开并再次进入频道 A
- **THEN** Composer SHALL 恢复该频道的未发送文本和光标位置

#### Scenario: 发送后清除草稿
- **WHEN** 用户成功发送 Composer 草稿
- **THEN** 系统 SHALL 清除该项目/频道对应的未发送草稿

### Requirement: 输入历史召回

Composer SHALL 支持从 SQLite 输入历史中召回此前明确提交的文本。历史召回 MUST 按最近使用排序,并支持按当前项目/频道优先展示。

#### Scenario: 查看最近输入
- **WHEN** 用户打开输入历史
- **THEN** Composer SHALL 展示最近保存的输入记录

#### Scenario: 选择历史填入草稿
- **WHEN** 用户选择一条历史输入
- **THEN** Composer SHALL 将该文本填入草稿并将光标置于可编辑位置

### Requirement: IME 与组合输入兼容

Composer SHALL 正确处理中文等 IME 组合输入,不得在组合过程中提前发送拼音中间态到终端。只有用户确认发送时,Composer 文本才 SHALL 写入 WebSocket。

#### Scenario: 中文输入不提前发送
- **WHEN** 用户使用中文 IME 在 Composer 中输入字符
- **THEN** 系统 SHALL 不在 composition 过程中向终端发送中间拼音

#### Scenario: 确认发送最终文本
- **WHEN** 用户完成 IME 组合并点击发送
- **THEN** 系统 SHALL 发送 Composer 中可见的最终文本

### Requirement: Composer 发送设置

Composer SHALL 支持配置发送时是否追加 Enter。该设置 MUST 持久化到用户设置并在下次打开时自动恢复。

#### Scenario: 发送时追加 Enter
- **WHEN** 用户开启发送后追加 Enter 并发送草稿
- **THEN** 系统 SHALL 向终端写入草稿文本后追加回车序列

#### Scenario: 发送时不追加 Enter
- **WHEN** 用户关闭发送后追加 Enter 并发送草稿
- **THEN** 系统 SHALL 只向终端写入草稿文本
