import { FACTORY_CONFIG, type ToolbarConfig } from './toolbarDefaults'

export type ToolbarDeviceType = 'mobile' | 'desktop'

export interface ToolbarPreset {
  id: string
  labelKey: string
  config: ToolbarConfig
}

export interface ShortcutRecommendation {
  keyId: string
  useCount: number
  lastUsedAt?: string
  recommendedAction: 'pin' | 'keep'
}

export function toolbarDeviceType(width: number): ToolbarDeviceType {
  return width >= 768 ? 'desktop' : 'mobile'
}

export function mergePresetWithCustom(preset: ToolbarConfig, current: ToolbarConfig): ToolbarConfig {
  return {
    pinned: [...preset.pinned],
    expanded: [...preset.expanded],
    custom: current.custom ? [...current.custom] : undefined,
  }
}

export function applyRecommendation(config: ToolbarConfig, keyId: string): ToolbarConfig {
  if (config.pinned.includes(keyId)) return config
  return {
    ...config,
    pinned: [...config.pinned, keyId],
    expanded: config.expanded.filter(id => id !== keyId),
  }
}

export function appendCustomKeyToSection(
  config: ToolbarConfig,
  keyDef: NonNullable<ToolbarConfig['custom']>[number],
  section: 'pinned' | 'expanded',
): ToolbarConfig {
  return {
    ...config,
    custom: [...(config.custom ?? []), keyDef],
    [section]: [...config[section], keyDef.id],
  }
}

export const TOOLBAR_PRESETS: ToolbarPreset[] = [
  {
    id: 'factory',
    labelKey: 'toolbarPresets.factory',
    config: FACTORY_CONFIG,
  },
  {
    id: 'claude',
    labelKey: 'toolbarPresets.claude',
    config: {
      pinned: ['esc', 'ctrl-c', 'ctrl-v', 'enter', 'tab', 'shift-tab', 'slash', 'at', 'backslash', 'up', 'down', 'left', 'right'],
      expanded: ['ctrl-l', 'ctrl-r', 'ctrl-b', 'ctrl-o', 'ctrl-t', 'ctrl-g', 'ctrl-f', 'terminal-history', 'scroll-btm', 'copy-term', 'fit'],
    },
  },
  {
    id: 'shell',
    labelKey: 'toolbarPresets.shell',
    config: {
      pinned: ['esc', 'ctrl-a', 'ctrl-e', 'ctrl-c', 'ctrl-d', 'ctrl-z', 'tab', 'enter', 'up', 'down', 'left', 'right'],
      expanded: ['alt-b', 'alt-f', 'ctrl-u', 'ctrl-k', 'ctrl-y', 'ctrl-l', 'ctrl-r', 'bang', 'backslash', 'terminal-history', 'scroll-btm', 'copy-term', 'fit'],
    },
  },
  {
    id: 'mobile-minimal',
    labelKey: 'toolbarPresets.mobileMinimal',
    config: {
      pinned: ['esc', 'ctrl-c', 'ctrl-v', 'enter', 'tab', 'slash', 'up', 'down', 'left', 'right'],
      expanded: ['ctrl-a', 'ctrl-e', 'backspace', 'shift-tab', 'at', 'backslash', 'ctrl-l', 'terminal-history', 'scroll-btm', 'copy-term', 'fit'],
    },
  },
]
