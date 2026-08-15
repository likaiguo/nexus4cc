import { execFileSync } from 'node:child_process'
import { basename, dirname, extname, isAbsolute, join, normalize } from 'node:path'
import { existsSync, statSync } from 'node:fs'

export function parseGitStatus(output) {
  const tokens = String(output || '').split('\0')
  const changes = []

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (!token || token.length < 4) continue
    const indexStatus = token[0]
    const worktreeStatus = token[1]
    const relativePath = token.slice(3)
    changes.push({ indexStatus, worktreeStatus, relativePath })
    if (indexStatus === 'R' || indexStatus === 'C' || worktreeStatus === 'R' || worktreeStatus === 'C') {
      index += 1
    }
  }

  return changes
}

const CODE_EXTENSIONS = new Set([
  '.c', '.cc', '.cpp', '.cs', '.css', '.cts', '.go', '.h', '.hpp', '.html', '.java', '.js', '.json',
  '.jsx', '.kt', '.kts', '.less', '.mjs', '.mts', '.php', '.py', '.pyi', '.rb', '.rs', '.scss', '.sh',
  '.sql', '.svelte', '.swift', '.toml', '.ts', '.tsx', '.vue', '.yaml', '.yml', '.zsh',
])
const SOURCE_EXCLUDES = ['.learnings/', '.omo/', '.tmp/', 'node_modules/', 'frontend/dist/']
const EXTENSIONLESS_CODE_FILES = new Set(['Dockerfile', 'Makefile', 'Rakefile', 'Gemfile'])

export function isCodeChangePath(relativePath) {
  const normalizedPath = String(relativePath || '').replaceAll('\\', '/')
  if (!normalizedPath || SOURCE_EXCLUDES.some(prefix => normalizedPath.startsWith(prefix) || normalizedPath.includes(`/${prefix}`))) {
    return false
  }
  return CODE_EXTENSIONS.has(extname(normalizedPath).toLowerCase()) || EXTENSIONLESS_CODE_FILES.has(basename(normalizedPath))
}

export function listGitChanges(startPath) {
  const normalizedStart = normalize(String(startPath || '.'))
  const directory = existsSync(normalizedStart) && statSync(normalizedStart).isFile()
    ? dirname(normalizedStart)
    : normalizedStart

  try {
    const repoRoot = execFileSync('git', ['-C', directory, 'rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
    const output = execFileSync('git', ['-C', repoRoot, 'status', '--porcelain=v1', '-z', '--untracked-files=all'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 4 * 1024 * 1024,
    })
    const changes = parseGitStatus(output).filter(change => isCodeChangePath(change.relativePath)).map(change => {
      const absolutePath = isAbsolute(change.relativePath)
        ? normalize(change.relativePath)
        : normalize(join(repoRoot, change.relativePath))
      return {
        ...change,
        name: change.relativePath.split('/').pop() || change.relativePath,
        path: absolutePath,
        directory: dirname(absolutePath),
        exists: existsSync(absolutePath),
      }
    })
    return { repoRoot, changes }
  } catch {
    return { repoRoot: null, changes: [] }
  }
}
