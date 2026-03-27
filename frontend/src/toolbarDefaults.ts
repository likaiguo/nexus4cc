export interface KeyDef {
  id: string
  label: string
  seq: string
  desc: string
  action?: 'scrollToBottom' | 'pasteClipboard' | 'copyTerminal' | 'fit'
  category: 'nav' | 'edit' | 'control' | 'input' | 'ui'
}

export interface ToolbarConfig {
  pinned: string[]
  expanded: string[]
}

// Unified label conventions:
// - ^X for Ctrl+X
// - M-x for Alt+x
// - Single symbols for arrows (↑↓←→), Enter (↵), Tab (⇥), Backspace (⌫)
// - Special actions use icons (↓↓ 📋 ⟳)

export const ALL_KEYS: KeyDef[] = [
  // === Navigation (nav) ===
  { id: 'up',         label: '↑',     seq: '\x1b[A',   desc: '上一条历史', category: 'nav' },
  { id: 'down',       label: '↓',     seq: '\x1b[B',   desc: '下一条历史', category: 'nav' },
  { id: 'left',       label: '←',     seq: '\x1b[D',   desc: '左移光标', category: 'nav' },
  { id: 'right',      label: '→',     seq: '\x1b[C',   desc: '右移光标', category: 'nav' },
  { id: 'ctrl-a',     label: '^A',    seq: '\x01',     desc: '移到行首', category: 'nav' },
  { id: 'ctrl-e',     label: '^E',    seq: '\x05',     desc: '移到行尾', category: 'nav' },
  { id: 'alt-b',      label: 'Mb',    seq: '\x1bb',    desc: '向后移动一词', category: 'nav' },
  { id: 'alt-f',      label: 'Mf',    seq: '\x1bf',    desc: '向前移动一词', category: 'nav' },

  // === Editing (edit) ===
  { id: 'backspace',  label: '⌫',    seq: '\x7f',     desc: '退格删除', category: 'edit' },
  { id: 'tab',        label: '⇥',     seq: '\t',       desc: '接受建议 / 补全', category: 'edit' },
  { id: 'ctrl-u',     label: '^U',    seq: '\x15',     desc: '删除整行', category: 'edit' },
  { id: 'ctrl-k',     label: '^K',    seq: '\x0b',     desc: '删至行尾', category: 'edit' },
  { id: 'ctrl-y',     label: '^Y',    seq: '\x19',     desc: '粘贴已删内容', category: 'edit' },
  { id: 'ctrl-d',     label: '^D',    seq: '\x04',     desc: '退出会话 / EOF', category: 'edit' },
  { id: 'ctrl-j',     label: '^J',    seq: '\x0a',     desc: '换行（多行输入）', category: 'edit' },
  { id: 'ctrl-z',     label: '^Z',    seq: '\x1a',     desc: '挂起进程', category: 'edit' },

  // === Control (control) ===
  { id: 'esc',        label: 'Esc',   seq: '\x1b',     desc: '取消 / Vim Normal', category: 'control' },
  { id: 'ctrl-c',     label: '^C',    seq: '\x03',     desc: '取消当前输入', category: 'control' },
  { id: 'enter',      label: '↵',     seq: '\r',       desc: '提交', category: 'control' },
  { id: 'ctrl-l',     label: '^L',    seq: '\x0c',     desc: '清屏（保留对话）', category: 'control' },
  { id: 'ctrl-r',     label: '^R',    seq: '\x12',     desc: '历史搜索', category: 'control' },
  { id: 'ctrl-o',     label: '^O',    seq: '\x0f',     desc: '切换详细输出', category: 'control' },
  { id: 'ctrl-t',     label: '^T',    seq: '\x14',     desc: '任务列表开关', category: 'control' },
  { id: 'ctrl-b',     label: '^B',    seq: '\x02',     desc: '后台任务', category: 'control' },
  { id: 'ctrl-g',     label: '^G',    seq: '\x07',     desc: '在编辑器中打开', category: 'control' },
  { id: 'ctrl-f',     label: '^F',    seq: '\x06',     desc: '终止所有 Agent', category: 'control' },

  // === Input (input) ===
  { id: 'slash',      label: '/',     seq: '/',        desc: '斜杠命令', category: 'input' },
  { id: 'bang',       label: '!',     seq: '!',        desc: 'Bash 模式', category: 'input' },
  { id: 'at',         label: '@',     seq: '@',        desc: '文件路径补全', category: 'input' },
  { id: 'backslash',  label: '\\',    seq: '\\',       desc: '反斜杠', category: 'input' },
  { id: 'ctrl-v',     label: '^V',    seq: '',         desc: '粘贴剪贴板', action: 'pasteClipboard', category: 'input' },
  { id: 'shift-tab',  label: '^⇥',    seq: '\x1b[Z',   desc: '切换权限模式', category: 'input' },

  // === UI Actions (ui) ===
  { id: 'scroll-btm', label: '↓↓',   seq: '',         desc: '滚动到底部', action: 'scrollToBottom', category: 'ui' },
  { id: 'copy-term',  label: 'Cp',    seq: '',         desc: '复制终端内容', action: 'copyTerminal', category: 'ui' },
  { id: 'fit',        label: 'Fit',   seq: '',         desc: '适配终端大小', action: 'fit', category: 'ui' },
]

// Reorganized factory defaults by priority and category grouping
export const FACTORY_PINNED = [
  // Control (most used)
  'esc', 'ctrl-c', 'enter',
  // Navigation
  'up', 'down', 'left', 'right',
  // Editing
  'backspace', 'tab',
  // Control extras
  'ctrl-l', 'ctrl-r',
  // Input
  'backslash', 'ctrl-v',
]

export const FACTORY_EXPANDED = [
  // Navigation group
  'ctrl-a', 'ctrl-e', 'alt-b', 'alt-f',
  // Editing group
  'ctrl-d', 'ctrl-u', 'ctrl-k', 'ctrl-y', 'ctrl-z', 'ctrl-j',
  // Control group
  'ctrl-b', 'ctrl-o', 'ctrl-t', 'ctrl-f', 'ctrl-g',
  // Input group
  'shift-tab', 'slash', 'bang', 'at',
  // UI Actions
  'scroll-btm', 'copy-term', 'fit',
]

export const FACTORY_CONFIG: ToolbarConfig = {
  pinned: FACTORY_PINNED,
  expanded: FACTORY_EXPANDED,
}
