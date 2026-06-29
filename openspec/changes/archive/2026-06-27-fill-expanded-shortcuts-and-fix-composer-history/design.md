## Context

当前移动端固定快捷键行已使用 grid 分配宽度,但展开区仍使用 `flex-wrap` 左对齐,在 390px 手机宽度下右侧空白明显。Composer 面板显示条件为 `composerMode === 'composer' || hasDraft`,导致草稿不为空时即使用户点关闭也会继续显示;输入历史项只写入草稿文本,没有显式切回 Composer 模式和聚焦,因此看起来“没有生效”。

## Goals / Non-Goals

**Goals:**

- 展开区快捷键行与固定行一致,把可用宽度分配给按键,避免右侧空白。
- 草稿不为空时仍允许用户折叠 Composer 面板,草稿入口继续提示并可恢复。
- 输入历史项选择后回填草稿、光标到末尾、Composer 面板保持打开且可编辑。
- 移动端设置/更多菜单顶部增加一键收起全部快捷键的图标动作。

**Non-Goals:**

- 不改变输入历史的数据结构或保存策略。
- 不改变固定快捷键默认顺序。
- 不重做 Composer UI 视觉结构。
- 不改变 PC toolbar 布局。

## Decisions

### D1. 展开区使用与固定行相同的 grid 行布局

移动端展开区每一行 SHALL 使用 `grid` 和 `repeat(row.length, minmax(34px, 1fr))`。每行的可用宽度分配给按键;如果用户配置过多按键,行容器仍允许横向滚动。

理由:固定行和展开区都属于快捷键条,应该采用一致的宽度分配模型。

### D2. Composer 面板显示只由 Composer 模式控制

`hasDraft` SHALL 只用于入口高亮和草稿恢复,不得强制 Composer 面板常驻。`showMobileComposerPanel` 改为 `composerMode === 'composer'`。关闭 Composer 时保留草稿和远端保存流程;清空草稿仍可返回 Direct。

理由:用户明确要求草稿不为空也能折叠。非空草稿强制显示破坏了“按需展开”的原本目标。

### D3. 历史项回填时显式打开 Composer

选择输入历史 SHALL 调用 Composer 打开逻辑,再设置草稿文本、光标和 dirty 状态,并在下一帧聚焦 textarea。历史面板随后关闭。

理由:回填文本如果发生在 Direct 模式或 textarea 尚未渲染时,用户看不到结果,因此必须先保证 Composer 面板进入可编辑状态。

### D4. 设置菜单第一行提供收起全部快捷键图标

在移动端设置/更多菜单内容顶部加入一个图标按钮,触发 `setCollapsed(true)` 并关闭菜单。该动作只折叠展开区,固定两行仍保持可见。

理由:用户需要快速收起全部展开快捷键,同时避免新增常驻第一行按钮挤占系统动作区。

## Risks / Trade-offs

- 草稿非空时面板可折叠后可能不够显眼 → 保持 Composer 草稿入口的 active/draft 高亮和 badge。
- 历史项回填会覆盖当前草稿 → 这是用户显式选择历史项的结果,保留现有行为。
- 展开区 grid 可能让少量按键变宽 → 这是为了消除右侧空白;按键仍保持最小宽度和横向滚动能力。
