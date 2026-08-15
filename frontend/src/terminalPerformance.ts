export const TERMINAL_SCREEN_READER_STORAGE_KEY = 'nexus_terminal_screen_reader'

interface ReadableStorage {
  readonly getItem: (key: string) => string | null
}

interface WritableStorage extends ReadableStorage {
  readonly setItem: (key: string, value: string) => void
}

export function readTerminalScreenReaderMode(storage: ReadableStorage = localStorage): boolean {
  return storage.getItem(TERMINAL_SCREEN_READER_STORAGE_KEY) === 'true'
}

export function writeTerminalScreenReaderMode(
  enabled: boolean,
  storage: WritableStorage = localStorage,
): void {
  storage.setItem(TERMINAL_SCREEN_READER_STORAGE_KEY, String(enabled))
}
