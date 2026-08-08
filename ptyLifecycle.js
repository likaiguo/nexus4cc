export function handlePtyExit({ key, entry, ptyMap, exitCode, logger = console }) {
  logger.log(`PTY ${key} exited with code ${exitCode}`)
  ptyMap.delete(key)
  for (const client of entry.clients) {
    if (client.readyState === 1) client.close(1011, 'terminal process exited')
  }
}
