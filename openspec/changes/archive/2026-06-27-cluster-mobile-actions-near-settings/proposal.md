## Why

当前移动端第一行只有设置/更多靠右,但编辑、展开/收起、Composer 草稿、Attention 等系统按钮仍从左侧开始,和用户希望“恢复昨天所有按钮到设置按钮周围,顺序保持一致,都放在右边”的操作习惯不一致。

## What Changes

- 移动端第一行系统快速操作 SHALL 聚合到右侧,围绕设置/更多按钮展示。
- 保持昨天三行布局中的系统按钮顺序:编辑快捷键、展开/收起、Composer 草稿、Attention、设置/更多。
- 第一行左侧 SHALL 留作弹性空白,不得把系统按钮分散到左侧。
- 第二、第三行固定快捷键顺序和自定义快捷键追加规则保持不变。
- PC 工具栏、embedded 侧边栏工具栏、Composer 草稿幂等打开逻辑保持不变。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mobile-command-controls`: 调整移动端第一行系统快速操作的右侧聚合位置和顺序要求。

## Impact

- **前端 `Toolbar.tsx`**: 调整移动端非 PC、非 embedded 分支的第一行布局,让系统按钮组整体靠右并保持顺序。
- **前端测试**: 更新或增加静态/单元检查,覆盖右侧聚合顺序。
- **OpenSpec `mobile-command-controls`**: 更新高频操作与 390px 布局要求。
