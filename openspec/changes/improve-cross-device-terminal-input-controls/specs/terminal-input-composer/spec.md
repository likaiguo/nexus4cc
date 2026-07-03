## ADDED Requirements

### Requirement: PC 与移动端均可使用 Composer

系统 SHALL 在 PC 端和移动端提供 Composer 输入模式,让用户在发送到终端前编辑可见草稿。Composer SHALL 复用当前项目/频道的草稿持久化和输入历史 API,并在发送后按现有策略记录明确提交的文本。

#### Scenario: PC 端打开 Composer
- **WHEN** 用户在 PC 端触发 Composer 入口
- **THEN** 系统 SHALL 显示可编辑的 Composer 草稿输入区
- **AND** 输入区 SHALL 绑定当前项目/频道

#### Scenario: 移动端打开 Composer
- **WHEN** 用户在移动端触发 Composer 入口
- **THEN** 系统 SHALL 显示可编辑的 Composer 草稿输入区
- **AND** 现有移动端紧凑布局 SHALL 保持可用

#### Scenario: 跨端恢复同一频道草稿
- **WHEN** 当前项目/频道存在未发送 Composer 草稿
- **THEN** 用户在 PC 或移动端打开该频道 Composer 时 SHALL 能恢复该草稿文本和光标位置

### Requirement: Composer 输入历史跨端召回

Composer SHALL 在 PC 端和移动端支持召回输入历史。打开输入历史 SHALL 使用当前项目/频道优先的历史查询,选择历史项后 SHALL 将文本填入 Composer 草稿并保持可编辑。

#### Scenario: PC 端查看输入历史
- **WHEN** 用户在 PC 端打开 Composer 输入历史
- **THEN** 系统 SHALL 展示最近保存的输入历史
- **AND** 当前项目/频道的历史 SHALL 优先展示

#### Scenario: 移动端查看输入历史
- **WHEN** 用户在移动端打开 Composer 输入历史
- **THEN** 系统 SHALL 展示最近保存的输入历史
- **AND** 当前项目/频道的历史 SHALL 优先展示

#### Scenario: 选择历史项回填草稿
- **WHEN** 用户选择一条输入历史项
- **THEN** 系统 SHALL 将该历史文本回填到 Composer 草稿
- **AND** Composer 输入区 SHALL 保持展开且可编辑
- **AND** 光标 SHALL 位于回填文本末尾

### Requirement: Composer 多行键盘语义一致

Composer SHALL 在 PC 端和移动端采用一致的多行编辑和发送语义。非 IME 组合输入状态下,`Enter` SHALL 发送草稿,`Shift+Enter` SHALL 在草稿中插入换行,`Ctrl+Enter` 与 `Cmd+Enter` SHALL 发送草稿。

#### Scenario: Enter 发送草稿
- **WHEN** 用户在 Composer 中输入非空草稿并按下 `Enter`
- **THEN** 系统 SHALL 发送该草稿
- **AND** 系统 SHALL 按当前 Composer 设置决定是否追加终端 Enter 序列

#### Scenario: Shift Enter 插入换行
- **WHEN** 用户在 Composer 中按下 `Shift+Enter`
- **THEN** 系统 SHALL 在当前光标位置插入换行
- **AND** 系统 SHALL NOT 发送草稿

#### Scenario: Ctrl 或 Cmd Enter 发送草稿
- **WHEN** 用户在 Composer 中按下 `Ctrl+Enter` 或 `Cmd+Enter`
- **THEN** 系统 SHALL 发送该草稿

#### Scenario: IME 组合期间不发送
- **WHEN** 用户正在使用中文等 IME 在 Composer 中组合输入并触发 Enter 相关按键事件
- **THEN** 系统 SHALL NOT 提前发送拼音中间态或未确认文本

### Requirement: Direct Terminal 多行快捷键可用

Direct Terminal 模式 SHALL 保留直接发送终端控制序列的能力。PC 端和移动端 SHALL 提供可发现的换行控制路径,用于向终端发送换行/line-feed 序列而不是提交当前命令。

#### Scenario: Direct 模式 Shift Enter 发送换行序列
- **WHEN** 用户在 PC 端 Direct Terminal 模式按下 `Shift+Enter`
- **THEN** 系统 SHALL 向当前终端发送换行/line-feed 序列
- **AND** 系统 SHALL NOT 将其当作普通提交 Enter 处理

#### Scenario: 移动端快捷键发送换行序列
- **WHEN** 用户在移动端触发换行快捷键
- **THEN** 系统 SHALL 向当前终端发送换行/line-feed 序列

### Requirement: PC 剪贴板语义符合终端预期

PC 端键盘粘贴 SHALL 遵循浏览器和 xterm 的文本粘贴路径,将剪贴板文本粘贴到当前终端或当前 Composer 编辑区。图片或文件上传 SHALL 通过明确的上传/粘贴上传入口触发,不得由普通键盘文本粘贴或伪装成 `^V` 的终端控制键隐式触发。

#### Scenario: PC 键盘粘贴文本到终端
- **WHEN** 用户在 PC 端 Direct Terminal 中按下 `Ctrl+V` 或 `Cmd+V` 且剪贴板包含文本
- **THEN** 系统 SHALL 将文本粘贴到当前终端输入路径
- **AND** 系统 SHALL NOT 打开上传菜单或 paste sheet

#### Scenario: PC 键盘粘贴文本到 Composer
- **WHEN** 用户在 PC 端 Composer 输入区按下 `Ctrl+V` 或 `Cmd+V` 且剪贴板包含文本
- **THEN** 系统 SHALL 将文本插入 Composer 草稿
- **AND** 系统 SHALL NOT 直接发送该文本到终端

#### Scenario: 图片上传需要明确上传动作
- **WHEN** 用户要上传剪贴板图片或本地文件
- **THEN** 系统 SHALL 要求用户触发明确的上传或粘贴上传入口
- **AND** 系统 SHALL NOT 将该行为隐藏在标记为 `^V` 的终端控制键中

#### Scenario: 终端 Ctrl V 发送真实控制键
- **WHEN** 工具栏提供标记为 `^V` 的终端快捷键且用户触发该快捷键
- **THEN** 系统 SHALL 向终端发送真实 Ctrl+V 控制序列
- **AND** 系统 SHALL NOT 将该快捷键解释为应用级粘贴/上传动作

### Requirement: 粘贴上传动作与终端快捷键视觉区分

系统 SHALL 在工具栏和菜单中使用不同的图标、标签或可访问名称区分应用级粘贴/上传动作与终端控制键。应用级动作 SHALL 表达为粘贴文本、粘贴上传、上传文件或类似含义;终端控制键 SHALL 使用控制键标签并发送对应终端序列。

#### Scenario: 应用级粘贴动作不显示为控制键
- **WHEN** 工具栏展示应用级粘贴或粘贴上传动作
- **THEN** 该动作 SHALL NOT 仅以 `^V` 作为可见标签

#### Scenario: 终端控制键不执行上传
- **WHEN** 工具栏展示终端控制键
- **THEN** 该按键 SHALL 执行终端序列发送
- **AND** 该按键 SHALL NOT 打开文件选择器或上传流程
