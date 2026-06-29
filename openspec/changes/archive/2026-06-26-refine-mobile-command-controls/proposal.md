## Why

移动端当前 Composer 控件在终端底部常驻显示 `直连 / 草稿` 分段切换、追加 Enter、光标、历史、待处理、清空和发送按钮,视觉权重过高且占用终端高度。用户需要保留 Direct Terminal 与 Composer 能力,但低频操作应收纳到设置/更多菜单,高频操作才应出现在设置按钮前。

## What Changes

- 去掉移动端底部常驻的 `直连 / 草稿` 分段切换控件,Direct Terminal 仍作为默认输入路径保留。
- 将 Composer 变为按需展开:只有用户主动打开 Composer、存在未发送草稿、或 Composer 正在编辑时才占用底部输入空间。
- 将低频 Composer 操作并入移动端设置/更多菜单,包括输入模式切换、追加 Enter、历史输入和清空草稿。
- 保留或前置真正高频/需要注意的入口:
  - 未处理 Attention 事件应以紧凑按钮和 badge 显示在设置按钮前。
  - Composer 打开入口可作为紧凑按钮显示在设置按钮前,但不得替代用户自定义高频快捷键。
  - 用户自定义高频快捷键继续按移动端布局顺序显示在设置按钮前。
- 保持现有 Direct Terminal、Composer 草稿持久化、输入历史、IME 兼容和快捷键布局能力不退化。

## Capabilities

### New Capabilities

- `mobile-command-controls`: 移动端命令区与工具栏的可见控件策略,覆盖底部空间占用、低频操作收纳、高频操作前置和 Attention/Composer 入口可见性。

### Modified Capabilities

None. This change adds a focused UI-control policy capability and relies on the already planned Composer and personalized shortcut behavior from `improve-mobile-personalization-persistence`.

## Impact

- **前端 `Terminal.tsx`**:重构移动端 Composer 底部控件,移除常驻分段切换和低频按钮,改为按需展示草稿编辑区和紧凑入口。
- **前端 `Toolbar.tsx`**:扩展移动端设置/更多菜单,收纳 Composer 低频操作;在设置按钮前保留高频快捷键、Composer/Attention 紧凑入口。
- **i18n**:补充菜单项、按钮 title 和状态文案的 zh-CN/en 翻译。
- **测试/验证**:覆盖 390px 级移动宽度下终端高度、控件不换行溢出、Composer 打开/关闭、历史/清空/追加 Enter 入口可用。
- **部署**:实现后需要按项目约束重启 `nexus` 服务并验证可访问;若不可访问,立即回滚部署代码。
