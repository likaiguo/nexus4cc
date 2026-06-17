## ADDED Requirements

### Requirement: ANSI 输出在终端和历史记录中保持可读

终端当前输出和历史记录浮层 SHALL 避免渲染出前景色与背景色对比度过低的文本。当 ANSI 序列指定浅色背景但未指定可读前景色,或指定反色视频时,渲染层 SHALL 根据当前主题选择可读的实际文字颜色。

#### Scenario: 白色背景代码块可读
- **WHEN** 输出包含白色或浅色背景的 ANSI 片段
- **THEN** 终端当前输出与历史记录浮层中的文字 SHALL 与背景有足够对比度,不得出现白底白字不可见

#### Scenario: 反色视频在历史记录中可读
- **WHEN** 历史记录内容包含 ANSI inverse/reverse video 样式
- **THEN** 历史记录浮层 SHALL 交换前景/背景并保持文字可读

### Requirement: 历史记录尽量返回 tmux 可保留的完整历史

历史记录拉取 SHALL 不固定限制为 3000 行。后端 SHALL 在安全上限内结合 tmux 当前 pane 的 `history_size` 捕获历史,前端 SHALL 请求深度历史,使长任务输出可以向上追溯到 tmux 当前可保留范围内的最早内容。

#### Scenario: 长输出可继续向上追溯
- **WHEN** 当前 pane 的历史超过 3000 行且未超过服务端安全上限
- **THEN** 用户打开历史记录后 SHALL 能继续向上滚动查看 3000 行之前的内容

#### Scenario: 新建会话保留更长历史
- **WHEN** nexus 服务启动后创建新的 tmux pane
- **THEN** 该 pane SHALL 使用提高后的 tmux history-limit,以便保留更长修复过程输出
