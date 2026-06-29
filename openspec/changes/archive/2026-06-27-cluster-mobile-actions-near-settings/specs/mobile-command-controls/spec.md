## MODIFIED Requirements

### Requirement: 高频操作位于设置前

移动端工具栏 SHALL 默认展示三行快速操作区:第一行为系统快速操作,第二、第三行为用户配置的固定快捷键。第一行系统快速操作 SHALL 整体靠右并围绕设置/更多按钮展示;设置/更多按钮 SHALL 保留为低频操作入口并位于该右侧按钮组末位。编辑快捷键、展开/收起、Composer 草稿入口和未处理 Attention 入口 SHALL 可在第一行直接触达。

#### Scenario: 系统快速操作默认可见
- **WHEN** 用户在移动端查看工具栏
- **THEN** 第一行 SHALL 在右侧显示编辑快捷键、展开/收起、Composer 草稿入口、以及有未处理事件时的 Attention 入口
- **AND** 设置/更多入口 SHALL 在同一右侧按钮组末位显示
- **AND** 系统按钮相对顺序 SHALL 为编辑快捷键、展开/收起、Composer 草稿入口、Attention 入口、设置/更多入口

#### Scenario: 固定快捷键两行展示
- **WHEN** 用户在移动端配置了固定快捷键
- **THEN** 第二、第三行 SHALL 按用户配置顺序展示固定快捷键,并允许在空间不足时横向滚动或稳定截断,不得把默认固定快捷键全部藏进设置菜单

#### Scenario: Attention 入口显著
- **WHEN** 存在未处理 Attention 事件
- **THEN** 移动端 SHALL 在第一行右侧系统按钮组内显示带计数的紧凑 Attention 入口

#### Scenario: 低频菜单不抢占快捷键区域
- **WHEN** 用户在移动端查看工具栏
- **THEN** 主题切换、文件列表、追加 Enter、输入历史和清空草稿 SHALL 留在设置/更多菜单内,不得挤占第二、第三行固定快捷键

### Requirement: 移动宽度布局稳定

移动端命令控件 SHALL 在 390px 宽度级别保持稳定三行工具栏布局。按钮、badge、草稿输入和设置菜单 SHALL 不发生文字溢出、互相遮挡或因状态变化导致工具栏异常增高。

#### Scenario: 390px 宽度查看 Direct Terminal
- **WHEN** 视口宽度约为 390px 且 Composer 未展开
- **THEN** 工具栏 SHALL 默认显示一行右侧系统操作和两行固定快捷键,页面 SHALL 不出现横向溢出或控件互相遮挡
- **AND** 设置/更多按钮 SHALL 保持在第一行右侧按钮组末位可点击位置

#### Scenario: 390px 宽度编辑 Composer
- **WHEN** 视口宽度约为 390px 且 Composer 展开
- **THEN** 草稿输入、发送动作和三行工具栏 SHALL 保持可点击且不互相遮挡
