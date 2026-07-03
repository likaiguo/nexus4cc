## ADDED Requirements

### Requirement: 移动端固定 Ctrl V 恢复粘贴上传

移动端固定快捷键区中的内置 `ctrl-v` SHALL 恢复为应用级粘贴/上传入口。该入口 SHALL 保持 `^V` 可见标签和既有固定行顺序,并 SHALL 打开或执行当前终端上下文的粘贴/上传工作流,不得作为终端 literal-next 控制键直接发送 `\x16`。

#### Scenario: 移动端点击固定 Ctrl V 打开粘贴上传
- **WHEN** 用户在移动端点击固定快捷键区的 `^V`
- **THEN** 系统 SHALL 执行粘贴/上传动作
- **AND** 若未立即上传剪贴板图片,系统 SHALL 打开粘贴/上传面板

#### Scenario: 移动端固定 Ctrl V 不发送 literal-next
- **WHEN** 用户在移动端点击固定快捷键区的 `^V`
- **THEN** 系统 SHALL NOT 向终端直接发送 `\x16`

#### Scenario: 移动端固定快捷键顺序保持不变
- **WHEN** 用户使用出厂默认移动端快捷键配置
- **THEN** `ctrl-v` SHALL 保持在固定快捷键区既有位置
- **AND** 恢复粘贴/上传语义 SHALL NOT 改变其它固定快捷键的相对顺序

#### Scenario: 移动端粘贴上传面板支持图片和文件
- **WHEN** 用户通过移动端 `^V` 打开粘贴/上传面板
- **THEN** 用户 SHALL 能粘贴文本后编辑发送
- **AND** 用户 SHALL 能通过粘贴图片或显式选择文件触发上传
