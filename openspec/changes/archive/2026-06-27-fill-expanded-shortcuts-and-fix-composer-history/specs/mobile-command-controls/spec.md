## MODIFIED Requirements

### Requirement: Composer 按需展开

移动端 SHALL 仅在用户主动打开 Composer 或 Composer 正在编辑时展示 Composer 输入区。Composer 展开后 SHALL 保留可见草稿、光标位置、发送动作和关闭/返回 Direct Terminal 的路径。当前频道存在未发送草稿时,系统 SHALL 保留可发现的草稿入口,但 SHALL NOT 因草稿非空而强制 Composer 面板常驻。

#### Scenario: 主动打开 Composer
- **WHEN** 用户点击移动端 Composer 紧凑入口或设置菜单中的 Composer 操作
- **THEN** 系统 SHALL 展开 Composer 输入区并聚焦可编辑草稿

#### Scenario: 存在未发送草稿
- **WHEN** 用户重新进入存在未发送 Composer 草稿的项目/频道
- **THEN** 系统 SHALL 展示可发现的草稿入口,避免草稿被静默隐藏
- **AND** Composer 输入区 SHALL NOT 因草稿非空而强制常驻展开

#### Scenario: 关闭 Composer
- **WHEN** 用户从 Composer 返回 Direct Terminal
- **THEN** 系统 SHALL 收起 Composer 输入区并恢复直接终端输入路径
- **AND** 若草稿非空,系统 SHALL 保留草稿并允许用户稍后通过草稿入口重新打开

### Requirement: 低频 Composer 操作收纳

移动端 SHALL 将低频 Composer 操作收纳到设置/更多菜单,至少包括输入模式切换、发送时追加 Enter、输入历史和清空草稿。低频操作 SHALL 不占用终端底部常驻操作行。输入历史 SHALL 在选择历史项后回填到 Composer 草稿并保持可编辑。

#### Scenario: 设置菜单提供 Composer 操作
- **WHEN** 用户打开移动端设置/更多菜单
- **THEN** 菜单 SHALL 提供 Composer 输入模式、追加 Enter、输入历史和清空草稿相关操作

#### Scenario: 追加 Enter 不常驻
- **WHEN** 用户在移动端 Direct Terminal 或 Composer 输入区查看底部常驻操作
- **THEN** 追加 Enter 控件 SHALL NOT 作为独立常驻按钮显示

#### Scenario: 历史和清空不常驻
- **WHEN** 用户在移动端 Direct Terminal 或 Composer 输入区查看底部常驻操作
- **THEN** 历史输入和清空草稿控件 SHALL NOT 作为独立常驻按钮显示

#### Scenario: 输入历史回填生效
- **WHEN** 用户打开输入历史并选择一条历史输入
- **THEN** 系统 SHALL 将该历史文本回填到 Composer 草稿
- **AND** Composer 输入区 SHALL 保持展开且 textarea 可编辑
- **AND** 光标 SHALL 位于回填文本末尾

### Requirement: 高频操作位于设置前

移动端工具栏 SHALL 默认展示三行快速操作区:第一行为系统快速操作,第二、第三行为用户配置的固定快捷键。第一行系统快速操作 SHALL 整体靠右并围绕设置/更多按钮展示;设置/更多按钮 SHALL 保留为低频操作入口并位于该右侧按钮组末位。浏览工作目录、展开/收起、Composer 草稿入口和未处理 Attention 入口 SHALL 可在第一行直接触达。快捷键编辑入口 SHALL NOT 作为移动端第一行常驻按钮显示,但 SHALL 保留在设置/更多菜单中。设置/更多菜单 SHALL 在第一行提供一键收起全部展开快捷键的图标动作。

#### Scenario: 系统快速操作默认可见
- **WHEN** 用户在移动端查看工具栏
- **THEN** 第一行 SHALL 在右侧显示浏览工作目录入口、展开/收起、Composer 草稿入口、以及有未处理事件时的 Attention 入口
- **AND** 设置/更多入口 SHALL 在同一右侧按钮组末位显示
- **AND** 系统按钮相对顺序 SHALL 为浏览工作目录、展开/收起、Composer 草稿入口、Attention 入口、设置/更多入口
- **AND** 快捷键编辑入口 SHALL NOT 作为第一行常驻按钮显示

#### Scenario: 快捷键编辑仍可通过菜单进入
- **WHEN** 用户在移动端打开设置/更多菜单
- **THEN** 菜单 SHALL 提供快捷键编辑入口

#### Scenario: 设置菜单快速收起展开区
- **WHEN** 用户在移动端打开设置/更多菜单
- **THEN** 菜单第一行 SHALL 提供一键收起全部展开快捷键的图标动作
- **AND** 用户触发该动作后,展开区快捷键 SHALL 收起,固定快捷键两行 SHALL 保持可见

#### Scenario: 固定快捷键两行展示
- **WHEN** 用户在移动端配置了固定快捷键
- **THEN** 第二、第三行 SHALL 按用户配置顺序展示固定快捷键,并允许在空间不足时横向滚动或稳定截断,不得把默认固定快捷键全部藏进设置菜单
- **AND** 快捷键行 SHALL 将可用宽度分配给按键,不得通过左对齐内容或强制撑满空容器产生明显右侧空白

#### Scenario: 展开区快捷键填满宽度
- **WHEN** 用户在移动端展开快捷键区
- **THEN** 展开区每一行 SHALL 将可用宽度分配给按键
- **AND** 展开区 SHALL 不通过左对齐内容产生明显右侧空白

#### Scenario: Attention 入口显著
- **WHEN** 存在未处理 Attention 事件
- **THEN** 移动端 SHALL 在第一行右侧系统按钮组内显示带计数的紧凑 Attention 入口

#### Scenario: 低频菜单不抢占快捷键区域
- **WHEN** 用户在移动端查看工具栏
- **THEN** 主题切换、文件列表、快捷键编辑、追加 Enter、输入历史和清空草稿 SHALL 留在设置/更多菜单内,不得挤占第二、第三行固定快捷键

### Requirement: 移动宽度布局稳定

移动端命令控件 SHALL 在 390px 宽度级别保持稳定三行工具栏布局。按钮、badge、草稿输入和设置菜单 SHALL 不发生文字溢出、互相遮挡或因状态变化导致工具栏异常增高。

#### Scenario: 390px 宽度查看 Direct Terminal
- **WHEN** 视口宽度约为 390px 且 Composer 未展开
- **THEN** 工具栏 SHALL 默认显示一行右侧系统操作和两行固定快捷键,页面 SHALL 不出现横向溢出或控件互相遮挡
- **AND** 浏览工作目录按钮 SHALL 在第一行右侧系统按钮组内可点击
- **AND** 固定快捷键行 SHALL 减少左右无效留白,不得让右侧空白占用可分配给快捷键的空间
- **AND** 设置/更多按钮 SHALL 保持在第一行右侧按钮组末位可点击位置

#### Scenario: 390px 宽度查看展开区
- **WHEN** 视口宽度约为 390px 且展开快捷键区显示
- **THEN** 展开区快捷键 SHALL 按行填满可用宽度并保持可点击
- **AND** 页面 SHALL 不因展开区布局产生异常横向溢出或明显右侧空白

#### Scenario: 390px 宽度编辑 Composer
- **WHEN** 视口宽度约为 390px 且 Composer 展开
- **THEN** 草稿输入、发送动作和三行工具栏 SHALL 保持可点击且不互相遮挡
