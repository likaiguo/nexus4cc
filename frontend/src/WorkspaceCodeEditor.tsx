import CodeMirror from '@uiw/react-codemirror'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { workspaceLanguageExtension, type WorkspaceEditorLanguage } from './workspaceEditor'

interface Props {
  value: string
  language: WorkspaceEditorLanguage
  fontSize: number
  onChange?: (value: string) => void
  readOnly?: boolean
  editable?: boolean
  lineWrapping?: boolean
}

export default function WorkspaceCodeEditor({ value, language, fontSize, onChange, readOnly = false, editable = true, lineWrapping = false }: Props) {
  const extensions = [
    ...workspaceLanguageExtension(language),
    ...(readOnly ? [EditorState.readOnly.of(true)] : []),
    ...(lineWrapping ? [EditorView.lineWrapping] : []),
    EditorView.theme({
      '&': {
        height: '100%',
        fontSize: `${fontSize}px`,
        backgroundColor: 'var(--nexus-bg2)',
        color: 'var(--nexus-text)',
      },
      '.cm-scroller': {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        lineHeight: '1.6',
        overflow: 'auto',
      },
      '.cm-content': {
        caretColor: 'var(--nexus-text)',
        minHeight: '100%',
        minWidth: lineWrapping ? '100%' : 'max-content',
      },
      '.cm-focused': {
        outline: 'none',
      },
      '.cm-gutters': {
        backgroundColor: 'var(--nexus-bg2)',
        borderRightColor: 'var(--nexus-border)',
        color: 'var(--nexus-muted)',
      },
      '.cm-activeLine, .cm-activeLineGutter': {
        backgroundColor: 'rgba(148, 163, 184, 0.12)',
      },
      '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
        backgroundColor: 'rgba(59, 130, 246, 0.35)',
      },
    }),
  ]

  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={oneDark}
      basicSetup={{
        autocompletion: true,
        bracketMatching: true,
        closeBrackets: true,
        foldGutter: true,
        highlightActiveLine: true,
        highlightSelectionMatches: true,
        lineNumbers: true,
        searchKeymap: true,
      }}
      extensions={extensions}
      editable={editable}
      readOnly={readOnly}
      onChange={onChange}
    />
  )
}
