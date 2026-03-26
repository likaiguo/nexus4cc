import { useEffect, useState, useCallback } from 'react'
import { Icon } from './icons'

interface FileItem {
  name: string
  url: string
  size: number
  created: number
}

interface FileGroup {
  date: string
  files: FileItem[]
}

interface Props {
  token: string
  onClose: () => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function formatDate(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10)
  if (dateStr === today) return '今天'
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (dateStr === yesterday) return '昨天'
  return dateStr
}

export default function FilePanel({ token, onClose }: Props) {
  const [groups, setGroups] = useState<FileGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  const fetchFiles = useCallback(async () => {
    try {
      const r = await fetch('/api/files', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (r.ok) {
        const data = await r.json()
        setGroups(data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchFiles()
    // 每 10 秒刷新一次
    const interval = setInterval(fetchFiles, 10000)
    return () => clearInterval(interval)
  }, [fetchFiles])

  async function copyToClipboard(url: string, fullPath: string) {
    const textToCopy = fullPath
    let success = false

    // 尝试现代 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(textToCopy)
        success = true
      } catch {
        // fall through to legacy method
      }
    }

    // 降级方案：使用 execCommand
    if (!success) {
      try {
        const textarea = document.createElement('textarea')
        textarea.value = textToCopy
        textarea.style.cssText = 'position:fixed;left:-9999px;opacity:0;'
        document.body.appendChild(textarea)
        textarea.select()
        textarea.setSelectionRange(0, textToCopy.length)
        success = document.execCommand('copy')
        document.body.removeChild(textarea)
      } catch {
        // 最终失败
      }
    }

    if (success) {
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl(null), 2000)
    } else {
      // 如果都失败了，至少选中文字让用户手动复制
      alert(`请手动复制:\n${textToCopy}`)
    }
  }

  async function deleteFile(date: string, filename: string) {
    if (!confirm(`删除文件 "${filename}"?`)) return
    try {
      const r = await fetch(`/api/files/${date}/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (r.ok) {
        fetchFiles()
      }
    } catch {
      // ignore
    }
  }

  const totalFiles = groups.reduce((sum, g) => sum + g.files.length, 0)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 450,
        background: 'var(--nexus-bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid var(--nexus-border)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="folder" size={20} />
          <span style={{ color: 'var(--nexus-text)', fontWeight: 600, fontSize: 16 }}>
            上传文件
          </span>
          <span
            style={{
              color: 'var(--nexus-muted)',
              fontSize: 13,
              background: 'var(--nexus-bg2)',
              padding: '2px 8px',
              borderRadius: 10,
            }}
          >
            {totalFiles}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--nexus-text2)',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
          }}
        >
          <Icon name="x" size={20} />
        </button>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
        }}
      >
        {loading ? (
          <div
            style={{
              color: 'var(--nexus-muted)',
              textAlign: 'center',
              padding: 40,
              fontSize: 14,
            }}
          >
            加载中...
          </div>
        ) : groups.length === 0 ? (
          <div
            style={{
              color: 'var(--nexus-muted)',
              textAlign: 'center',
              padding: 40,
              fontSize: 14,
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>📁</div>
            <div>暂无上传文件</div>
            <div style={{ fontSize: 12, marginTop: 8, opacity: 0.7 }}>
              拖拽文件到终端或粘贴图片即可上传
            </div>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.date} style={{ marginBottom: 20 }}>
              <div
                style={{
                  color: 'var(--nexus-muted)',
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{formatDate(group.date)}</span>
                <span style={{ opacity: 0.5 }}>({group.files.length})</span>
              </div>
              <div
                style={{
                  background: 'var(--nexus-bg2)',
                  borderRadius: 8,
                  border: '1px solid var(--nexus-border)',
                  overflow: 'hidden',
                }}
              >
                {group.files.map((file, idx) => {
                  const fullPath = `/mnt/c/Users/libra/work/nexus/data/uploads/${group.date}/${file.name}`
                  const isCopied = copiedUrl === file.url
                  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name)
                  return (
                    <div
                      key={file.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        borderBottom:
                          idx < group.files.length - 1
                            ? '1px solid var(--nexus-border)'
                            : 'none',
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{isImage ? '🖼️' : '📄'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            color: 'var(--nexus-text)',
                            fontSize: 13,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontFamily: 'Menlo, Monaco, monospace',
                          }}
                          title={file.name}
                        >
                          {file.name}
                        </div>
                        <div
                          style={{
                            color: 'var(--nexus-muted)',
                            fontSize: 11,
                            marginTop: 2,
                          }}
                        >
                          {formatSize(file.size)}
                        </div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(file.url, fullPath)}
                        style={{
                          background: isCopied
                            ? 'var(--nexus-success)'
                            : 'transparent',
                          border: isCopied
                            ? 'none'
                            : '1px solid var(--nexus-border)',
                          borderRadius: 6,
                          color: isCopied ? '#fff' : 'var(--nexus-text2)',
                          cursor: 'pointer',
                          padding: '6px 10px',
                          fontSize: 12,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          transition: 'all 0.15s',
                        }}
                        title="复制完整路径"
                      >
                        <Icon name={isCopied ? 'check' : 'copy'} size={14} />
                        {isCopied ? '已复制' : '复制'}
                      </button>
                      <button
                        onClick={() => deleteFile(group.date, file.name)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--nexus-error)',
                          cursor: 'pointer',
                          padding: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0.6,
                        }}
                        title="删除"
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        ))}
      </div>

      {/* Footer hint */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--nexus-border)',
          color: 'var(--nexus-muted)',
          fontSize: 12,
          textAlign: 'center',
        }}
      >
        文件保存在服务器 data/uploads/ 目录，不进入 git 追踪
      </div>
    </div>
  )
}
