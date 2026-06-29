## Why

移动端固定快捷键行已经减少右侧空白,但展开区仍然左对齐并留下大块空白。Composer 草稿非空时面板会被强制常驻,导致无法折叠;输入历史列表虽然能显示,但选择历史后没有可靠进入可编辑草稿状态。

## What Changes

- 移动端展开区快捷键行 SHALL 像固定行一样将可用宽度分配给按键,减少右侧空白浪费。
- Composer 草稿非空时用户仍 SHALL 能折叠 Composer 面板,草稿保留并通过草稿入口重新打开。
- 输入历史项 SHALL 可点击/触摸后回填到 Composer 草稿,设置光标到末尾,并保持 Composer 面板打开可编辑。
- 移动端设置/更多菜单第一行 SHALL 增加一个快捷图标,用于一键收起全部快捷键/折叠展开区。
- 保持历史保存、草稿持久化、固定快捷键布局和现有系统按钮顺序不退化。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mobile-command-controls`: 调整展开区布局、Composer 折叠语义、输入历史回填行为和设置菜单快捷收起入口。

## Impact

- **前端 `Toolbar.tsx`**: 展开区改为 grid 分配宽度;设置/更多菜单顶部增加收起全部快捷键图标动作。
- **前端 `Terminal.tsx`**: Composer 面板显示条件改为只由 Composer 模式控制;历史项回填时显式打开 Composer 并聚焦;草稿入口继续可恢复非空草稿。
- **测试**: 更新聚焦静态/单元测试覆盖展开区填满、菜单快捷收起、草稿可折叠和历史回填行为。
- **OpenSpec `mobile-command-controls`**: 同步行为要求。
