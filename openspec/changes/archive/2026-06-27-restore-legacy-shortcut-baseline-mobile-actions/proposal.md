## Why

昨天的快捷键修复把出厂固定快捷键误收缩为 10 个,导致顺序和个数偏离前天版本。移动端第一行也把低频的快捷键编辑入口常驻出来,而用户更需要直接打开本地/工作目录浏览。

## What Changes

- 恢复出厂快捷键基线到前天版本:
  - 固定区: `esc`, `ctrl-a`, `left`, `up`, `down`, `right`, `ctrl-e`, `backspace`, `backslash`, `slash`, `ctrl-c`, `ctrl-v`, `enter`, `tab`
  - 展开区: `alt-b`, `alt-f`, `ctrl-d`, `ctrl-u`, `ctrl-j`, `ctrl-k`, `ctrl-l`, `ctrl-y`, `ctrl-z`, `ctrl-r`, `ctrl-b`, `ctrl-o`, `ctrl-t`, `ctrl-f`, `ctrl-g`, `shift-tab`, `bang`, `at`, `scroll-btm`, `copy-term`, `fit`
- 自定义快捷键新增时 SHALL 允许用户选择加入固定行或展开行,不再只能默认加入固定行。
- 移动端第一行 SHALL 移除常驻“编辑快捷键”按钮;快捷键编辑继续保留在设置/更多菜单内。
- 移动端第一行 SHALL 将“浏览工作目录/本地目录”作为可见系统按钮放出,在设置/更多按钮前直接触达。
- 移动端快捷键行 SHALL 使用紧凑内容宽度,减少左右两侧尤其右侧无效留白,但仍允许横向滚动。
- 保持 Composer 草稿入口、Attention 入口和设置/更多入口的现有可用性。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mobile-command-controls`: 恢复快捷键默认顺序和个数,调整自定义快捷键新增目标,并更新移动端第一行系统按钮可见规则。

## Impact

- **前端 `toolbarDefaults.ts`**: 恢复前天版本的出厂固定/展开快捷键列表。
- **前端 `toolbarPresets.ts` / 测试**: 替换“自定义键只能追加固定区”的 helper/测试为“按用户选择追加到固定或展开区”。
- **前端 `Toolbar.tsx`**: 自定义快捷键新增表单提供固定/展开两个目标;移动端第一行隐藏快捷键编辑按钮,显示浏览工作目录按钮。
- **OpenSpec `mobile-command-controls`**: 同步默认快捷键基线和移动端系统行要求。
