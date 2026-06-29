## MODIFIED Requirements

### Requirement: 高频操作位于设置前

移动端工具栏 SHALL 默认展示三行快速操作区:第一行为系统快速操作,第二、第三行为用户配置的固定快捷键。设置/更多按钮 SHALL 保留为低频操作入口,但编辑快捷键、展开/收起、Composer 草稿入口和未处理 Attention 入口 SHALL 可在第一行直接触达。

#### Scenario: 系统快速操作默认可见
- **WHEN** 用户在移动端查看工具栏
- **THEN** 第一行 SHALL 显示设置/更多、编辑快捷键、展开/收起、Composer 草稿入口以及有未处理事件时的 Attention 入口

#### Scenario: 固定快捷键两行展示
- **WHEN** 用户在移动端配置了固定快捷键
- **THEN** 第二、第三行 SHALL 按用户配置顺序展示固定快捷键,并允许在空间不足时横向滚动或稳定截断,不得把默认固定快捷键全部藏进设置菜单

#### Scenario: Attention 入口显著
- **WHEN** 存在未处理 Attention 事件
- **THEN** 移动端 SHALL 在第一行快速操作区显示带计数的紧凑 Attention 入口

#### Scenario: 低频菜单不抢占快捷键区域
- **WHEN** 用户在移动端查看工具栏
- **THEN** 主题切换、文件列表、追加 Enter、输入历史和清空草稿 SHALL 留在设置/更多菜单内,不得挤占第二、第三行固定快捷键

### Requirement: 移动宽度布局稳定

移动端命令控件 SHALL 在 390px 宽度级别保持稳定三行工具栏布局。按钮、badge、草稿输入和设置菜单 SHALL 不发生文字溢出、互相遮挡或因状态变化导致工具栏异常增高。

#### Scenario: 390px 宽度查看 Direct Terminal
- **WHEN** 视口宽度约为 390px 且 Composer 未展开
- **THEN** 工具栏 SHALL 默认显示一行系统快速操作和两行固定快捷键,页面 SHALL 不出现横向溢出或控件互相遮挡

#### Scenario: 390px 宽度编辑 Composer
- **WHEN** 视口宽度约为 390px 且 Composer 展开
- **THEN** 草稿输入、发送动作和三行工具栏 SHALL 保持可点击且不互相遮挡

## ADDED Requirements

### Requirement: Composer 草稿入口幂等

移动端 Composer 草稿入口 SHALL 是幂等打开动作。用户连续点击草稿入口 MUST 保持 Composer 面板可见,并确保 textarea 渲染、聚焦和键盘输入路径一致;不得因重复点击导致输入框消失或无法重新看到。

#### Scenario: 连续点击草稿入口
- **WHEN** 用户连续点击移动端草稿快捷入口两次或更多次
- **THEN** Composer 面板 SHALL 保持展开,textarea SHALL 可见且可编辑

#### Scenario: 草稿入口恢复隐藏输入框
- **WHEN** Composer 面板因为焦点切换、菜单关闭或键盘状态变化而失焦
- **THEN** 用户再次点击草稿入口 SHALL 重新聚焦 Composer textarea,而不是切换隐藏面板

#### Scenario: 空草稿也可保持编辑
- **WHEN** Composer 面板为空且用户点击草稿入口
- **THEN** 系统 SHALL 保持 Composer 模式并显示空 textarea,直到用户显式关闭 Composer 或发送/清空后返回 Direct Terminal
