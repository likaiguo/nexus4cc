const DEFAULT_LIMIT = 6

export function parseRecentWorkspacePaths(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.filter((path): path is string => typeof path === 'string' && path.trim().length > 0))]
  } catch {
    return []
  }
}

export function mergeRecentWorkspacePaths(
  preferred: readonly string[],
  additional: readonly string[],
  limit = DEFAULT_LIMIT,
): string[] {
  return [...new Set([...preferred, ...additional].map(path => path.trim()).filter(Boolean))].slice(0, limit)
}
