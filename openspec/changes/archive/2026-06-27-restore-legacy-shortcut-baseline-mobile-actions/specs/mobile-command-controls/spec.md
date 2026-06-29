## MODIFIED Requirements

### Requirement: 高频操作位于设置前

移动端工具栏 SHALL 默认展示三行快速操作区:第一行为系统快速操作,第二、第三行为用户配置的固定快捷键。第一行系统快速操作 SHALL 整体靠右并围绕设置/更多按钮展示;设置/更多按钮 SHALL 保留为低频操作入口并位于该右侧按钮组末位。浏览工作目录、展开/收起、Composer 草稿入口和未处理 Attention 入口 SHALL 可在第一行直接触达。快捷键编辑入口 SHALL NOT 作为移动端第一行常驻按钮显示,但 SHALL 保留在设置/更多菜单中。

#### Scenario: 系统快速操作默认可见
- **WHEN** 用户在移动端查看工具栏
- **THEN** 第一行 SHALL 在右侧显示浏览工作目录入口、展开/收起、Composer 草稿入口、以及有未处理事件时的 Attention 入口
- **AND** 设置/更多入口 SHALL 在同一右侧按钮组末位显示
- **AND** 系统按钮相对顺序 SHALL 为浏览工作目录、展开/收起、Composer 草稿入口、Attention 入口、设置/更多入口
- **AND** 快捷键编辑入口 SHALL NOT 作为第一行常驻按钮显示

#### Scenario: 快捷键编辑仍可通过菜单进入
- **WHEN** 用户在移动端打开设置/更多菜单
- **THEN** 菜单 SHALL 提供快捷键编辑入口

#### Scenario: 固定快捷键两行展示
- **WHEN** 用户在移动端配置了固定快捷键
- **THEN** 第二、第三行 SHALL 按用户配置顺序展示固定快捷键,并允许在空间不足时横向滚动或稳定截断,不得把默认固定快捷键全部藏进设置菜单
- **AND** 快捷键行 SHALL 将可用宽度分配给按键,不得通过左对齐内容或强制撑满空容器产生明显右侧空白

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

#### Scenario: 390px 宽度编辑 Composer
- **WHEN** 视口宽度约为 390px 且 Composer 展开
- **THEN** 草稿输入、发送动作和三行工具栏 SHALL 保持可点击且不互相遮挡

### Requirement: 固定区默认顺序和自定义追加

移动端固定快捷键区 SHALL 以出厂默认固定快捷键顺序作为默认位置基准。出厂默认固定区 SHALL 恢复为前天版本的 14 个快捷键,顺序为 `esc`, `ctrl-a`, `left`, `up`, `down`, `right`, `ctrl-e`, `backspace`, `backslash`, `slash`, `ctrl-c`, `ctrl-v`, `enter`, `tab`。出厂默认展开区 SHALL 为 `alt-b`, `alt-f`, `ctrl-d`, `ctrl-u`, `ctrl-j`, `ctrl-k`, `ctrl-l`, `ctrl-y`, `ctrl-z`, `ctrl-r`, `ctrl-b`, `ctrl-o`, `ctrl-t`, `ctrl-f`, `ctrl-g`, `shift-tab`, `bang`, `at`, `scroll-btm`, `copy-term`, `fit`。新增自定义快捷键 MUST 允许用户选择追加到固定快捷键区或展开区,不得强制单一目标。

#### Scenario: 默认固定区恢复前天顺序和个数
- **WHEN** 用户在移动端使用出厂默认快捷键配置
- **THEN** 固定快捷键区 SHALL 包含 14 个快捷键
- **AND** 固定快捷键区 SHALL 按 `esc`, `ctrl-a`, `left`, `up`, `down`, `right`, `ctrl-e`, `backspace`, `backslash`, `slash`, `ctrl-c`, `ctrl-v`, `enter`, `tab` 顺序展示
- **AND** 第二、第三行 SHALL 从该固定区顺序切分展示,不得因系统按钮行或推荐逻辑改变默认快捷键相对顺序

#### Scenario: 默认展开区恢复前天顺序和个数
- **WHEN** 用户在移动端使用出厂默认快捷键配置并展开快捷键区
- **THEN** 展开区 SHALL 包含 21 个快捷键
- **AND** 展开区 SHALL 按 `alt-b`, `alt-f`, `ctrl-d`, `ctrl-u`, `ctrl-j`, `ctrl-k`, `ctrl-l`, `ctrl-y`, `ctrl-z`, `ctrl-r`, `ctrl-b`, `ctrl-o`, `ctrl-t`, `ctrl-f`, `ctrl-g`, `shift-tab`, `bang`, `at`, `scroll-btm`, `copy-term`, `fit` 顺序展示

#### Scenario: 新增自定义快捷键可追加到固定区
- **WHEN** 用户在快捷键编辑器中新建自定义快捷键并选择固定行
- **THEN** 系统 SHALL 将该自定义快捷键追加到固定快捷键区末尾
- **AND** 默认固定快捷键的相对顺序 SHALL 保持不变

#### Scenario: 新增自定义快捷键可追加到展开区
- **WHEN** 用户在快捷键编辑器中新建自定义快捷键并选择展开区
- **THEN** 系统 SHALL 将该自定义快捷键追加到展开区末尾
- **AND** 固定快捷键区 SHALL 保持不变

#### Scenario: 用户仍可手动调整自定义快捷键
- **WHEN** 用户在快捷键编辑器中拖拽、移除或移动自定义快捷键
- **THEN** 系统 SHALL 按用户保存的配置展示,不得在后续加载时自动把该自定义键重排回其他位置
