## ADDED Requirements

### Requirement: 移动端命令控件最小常驻占用

移动端终端 SHALL 不在 Direct Terminal 且无未发送 Composer 草稿时常驻显示完整 Composer 控制行。系统 MUST 不常驻显示 `直连 / 草稿` 分段切换控件。

#### Scenario: Direct Terminal 无草稿
- **WHEN** 用户在移动端处于 Direct Terminal 模式且当前频道没有未发送 Composer 草稿
- **THEN** 终端底部 SHALL 不显示完整 Composer 控制行,并 SHALL 保留终端主体高度给输出区域

#### Scenario: 不显示模式分段
- **WHEN** 用户在移动端查看终端底部操作区
- **THEN** 系统 SHALL NOT 显示常驻的 `直连 / 草稿` 分段切换控件

### Requirement: Composer 按需展开

移动端 SHALL 仅在用户主动打开 Composer、Composer 正在编辑、或当前频道存在未发送草稿时展示 Composer 输入区。Composer 展开后 SHALL 保留可见草稿、光标位置、发送动作和关闭/返回 Direct Terminal 的路径。

#### Scenario: 主动打开 Composer
- **WHEN** 用户点击移动端 Composer 紧凑入口或设置菜单中的 Composer 操作
- **THEN** 系统 SHALL 展开 Composer 输入区并聚焦可编辑草稿

#### Scenario: 存在未发送草稿
- **WHEN** 用户重新进入存在未发送 Composer 草稿的项目/频道
- **THEN** 系统 SHALL 展示可发现的草稿入口或输入区,避免草稿被静默隐藏

#### Scenario: 关闭 Composer
- **WHEN** 用户从 Composer 返回 Direct Terminal 且草稿为空
- **THEN** 系统 SHALL 收起 Composer 输入区并恢复直接终端输入路径

### Requirement: 低频 Composer 操作收纳

移动端 SHALL 将低频 Composer 操作收纳到设置/更多菜单,至少包括输入模式切换、发送时追加 Enter、输入历史和清空草稿。低频操作 SHALL 不占用终端底部常驻操作行。

#### Scenario: 设置菜单提供 Composer 操作
- **WHEN** 用户打开移动端设置/更多菜单
- **THEN** 菜单 SHALL 提供 Composer 输入模式、追加 Enter、输入历史和清空草稿相关操作

#### Scenario: 追加 Enter 不常驻
- **WHEN** 用户在移动端 Direct Terminal 或 Composer 输入区查看底部常驻操作
- **THEN** 追加 Enter 控件 SHALL NOT 作为独立常驻按钮显示

#### Scenario: 历史和清空不常驻
- **WHEN** 用户在移动端 Direct Terminal 或 Composer 输入区查看底部常驻操作
- **THEN** 历史输入和清空草稿控件 SHALL NOT 作为独立常驻按钮显示

### Requirement: 高频操作位于设置前

移动端工具栏 SHALL 将用户配置的高频快捷键和少量紧急系统入口放在设置/更多按钮前。设置/更多按钮 SHALL 继续作为低频操作的入口。

#### Scenario: 高频快捷键保留在设置前
- **WHEN** 用户在移动端配置了固定快捷键
- **THEN** 这些快捷键 SHALL 按用户配置顺序显示在设置/更多按钮前

#### Scenario: Attention 入口显著
- **WHEN** 存在未处理 Attention 事件
- **THEN** 移动端 SHALL 在设置/更多按钮前显示带计数的紧凑 Attention 入口

#### Scenario: 低频菜单不抢占高频区域
- **WHEN** 用户在移动端查看工具栏
- **THEN** 主题切换、快捷键编辑、文件列表、清空草稿和追加 Enter SHALL 留在设置/更多菜单内

### Requirement: 移动宽度布局稳定

移动端命令控件 SHALL 在 390px 宽度级别保持稳定布局。按钮、badge、草稿输入和设置菜单 SHALL 不发生文字溢出、互相遮挡或因状态变化导致工具栏异常增高。

#### Scenario: 390px 宽度查看 Direct Terminal
- **WHEN** 视口宽度约为 390px 且 Composer 未展开
- **THEN** 工具栏和终端区域 SHALL 不出现横向页面溢出或多行拥挤

#### Scenario: 390px 宽度编辑 Composer
- **WHEN** 视口宽度约为 390px 且 Composer 展开
- **THEN** 草稿输入、发送动作和设置/更多入口 SHALL 保持可点击且不互相遮挡
