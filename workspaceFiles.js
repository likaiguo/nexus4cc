import { existsSync, readFileSync, statSync, writeFileSync } from 'fs'
import { isAbsolute, join, normalize } from 'path'

export const EDITABLE_FILE_MAX_BYTES = 2 * 1024 * 1024
const MTIME_CONFLICT_TOLERANCE_MS = 1

export class WorkspaceFileError extends Error {
  constructor(status, code, message) {
    super(message)
    this.name = 'WorkspaceFileError'
    this.status = status
    this.code = code
  }
}

export function resolveWorkspacePath(inputPath, workspaceRoot) {
  let p = String(inputPath || '')
  if (!p) throw new WorkspaceFileError(400, 'path_required', 'path required')
  if (!isAbsolute(p)) p = join(workspaceRoot, p)
  p = normalize(p)
  if (p.includes('..')) throw new WorkspaceFileError(403, 'invalid_path', 'invalid path')
  return p
}

export function isLikelyBinary(buffer) {
  if (buffer.length === 0) return false
  const sampleSize = Math.min(buffer.length, 8000)
  let suspicious = 0

  for (let i = 0; i < sampleSize; i++) {
    const byte = buffer[i]
    if (byte === 0) return true
    const allowedControl = byte === 7 || byte === 8 || byte === 9 || byte === 10 || byte === 12 || byte === 13 || byte === 27
    if (byte < 32 && !allowedControl) suspicious++
  }

  return suspicious / sampleSize > 0.3
}

export function readEditableWorkspaceFile(inputPath, workspaceRoot, options = {}) {
  const maxBytes = options.maxBytes ?? EDITABLE_FILE_MAX_BYTES
  const filePath = resolveWorkspacePath(inputPath, workspaceRoot)
  if (!existsSync(filePath)) throw new WorkspaceFileError(404, 'not_found', 'not found')

  const st = statSync(filePath)
  if (!st.isFile()) throw new WorkspaceFileError(404, 'not_found', 'not found')
  if (st.size > maxBytes) {
    throw new WorkspaceFileError(413, 'file_too_large', `file is too large to edit in the browser; limit is ${maxBytes} bytes`)
  }

  const buffer = readFileSync(filePath)
  if (isLikelyBinary(buffer)) {
    throw new WorkspaceFileError(415, 'binary_file', 'binary files cannot be edited in the browser')
  }

  return {
    path: filePath,
    content: buffer.toString('utf8'),
    size: st.size,
    mtimeMs: st.mtimeMs,
  }
}

export function saveEditableWorkspaceFile({ path, workspaceRoot, content = '', mtimeMs, maxBytes = EDITABLE_FILE_MAX_BYTES }) {
  const filePath = resolveWorkspacePath(path, workspaceRoot)
  if (!existsSync(filePath)) throw new WorkspaceFileError(404, 'not_found', 'not found')

  const st = statSync(filePath)
  if (!st.isFile()) throw new WorkspaceFileError(404, 'not_found', 'not found')

  if (typeof mtimeMs === 'number' && Number.isFinite(mtimeMs) && Math.abs(st.mtimeMs - mtimeMs) > MTIME_CONFLICT_TOLERANCE_MS) {
    throw new WorkspaceFileError(409, 'file_conflict', 'file changed on disk; reopen it before saving')
  }

  const nextContent = String(content)
  const nextBuffer = Buffer.from(nextContent, 'utf8')
  if (nextBuffer.length > maxBytes) {
    throw new WorkspaceFileError(413, 'file_too_large', `file is too large to edit in the browser; limit is ${maxBytes} bytes`)
  }

  writeFileSync(filePath, nextContent, 'utf8')
  const nextStat = statSync(filePath)
  return {
    ok: true,
    path: filePath,
    size: nextStat.size,
    mtimeMs: nextStat.mtimeMs,
  }
}
