import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import GhostShield from './GhostShield'
import { Icon } from './icons'
import { type QuickPhrase, useQuickPhrases } from './quickPhrases'

interface Props {
  token: string
  onClose: () => void
  onSend: (phrase: QuickPhrase) => void
}

type FormState = {
  id: string | null
  title: string
  text: string
  appendEnter: boolean
}

const EMPTY_FORM: FormState = {
  id: null,
  title: '',
  text: '',
  appendEnter: true,
}

export default function QuickPhrasesPanel({ token, onClose, onSend }: Props) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const { deletePhrase, error, loading, movePhrase, recordPhraseUse, savePhrase, saving, setError, sortedPhrases } = useQuickPhrases(token)

  function startCreate() {
    setForm(EMPTY_FORM)
    setEditing(true)
    setError('')
  }

  function startEdit(phrase: QuickPhrase) {
    setForm({
      id: phrase.id,
      title: phrase.title,
      text: phrase.text,
      appendEnter: phrase.appendEnter,
    })
    setEditing(true)
    setError('')
  }

  async function submitForm() {
    const title = form.title.trim()
    const text = form.text
    if (!title || !text.trim()) {
      setError(t('quickPhrases.required'))
      return
    }
    setError('')
    if (await savePhrase(form.id, { title, text, appendEnter: form.appendEnter })) {
      setForm(EMPTY_FORM)
      setEditing(false)
    }
  }

  async function removePhrase(phrase: QuickPhrase) {
    if (await deletePhrase(phrase, form.id)) {
      setForm(EMPTY_FORM)
      setEditing(false)
    }
  }

  async function sendPhrase(phrase: QuickPhrase) {
    onSend(phrase)
    onClose()
    recordPhraseUse(phrase.id)
  }

  return (
    <div className="fixed inset-0 z-[620] flex items-end justify-center sm:items-center p-0 sm:p-4">
      <GhostShield />
      <div className="absolute inset-0 bg-black/45" onPointerDown={onClose} />
      <section
        className="relative z-[621] w-full sm:max-w-[560px] max-h-[82dvh] sm:max-h-[78vh] bg-nexus-menu-bg border border-nexus-border rounded-t-lg sm:rounded-lg shadow-[0_18px_60px_rgba(0,0,0,0.45)] flex flex-col overflow-hidden"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-2 px-3.5 py-3 border-b border-nexus-border shrink-0">
          <Icon name="message" size={18} className="text-nexus-accent shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="m-0 text-sm font-semibold text-nexus-text truncate">{t('quickPhrases.title')}</h2>
            <p className="m-0 mt-0.5 text-[11px] text-nexus-text-2 truncate">{t('quickPhrases.subtitle')}</p>
          </div>
          <button
            type="button"
            className="h-8 w-8 rounded-md bg-transparent border border-nexus-border text-nexus-text-2 cursor-pointer flex items-center justify-center shrink-0"
            onPointerDown={(e) => { e.preventDefault(); startCreate() }}
            title={t('quickPhrases.add')}
            aria-label={t('quickPhrases.add')}
          >
            <Icon name="plus" size={15} />
          </button>
          <button
            type="button"
            className="h-8 w-8 rounded-md bg-transparent border border-nexus-border text-nexus-text-2 cursor-pointer flex items-center justify-center shrink-0"
            onPointerDown={(e) => { e.preventDefault(); onClose() }}
            title={t('common.close')}
            aria-label={t('common.close')}
          >
            <Icon name="x" size={15} />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {error && (
            <div className="mx-3 mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-nexus-error">
              {error}
            </div>
          )}

          {editing && (
            <div className="m-3 rounded-md border border-nexus-border bg-nexus-bg p-3 flex flex-col gap-2.5">
              <input
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder={t('quickPhrases.titlePlaceholder')}
                className="w-full box-border bg-nexus-bg-2 border border-nexus-border rounded-md text-nexus-text text-sm px-3 py-2 outline-none focus:border-nexus-accent"
              />
              <textarea
                value={form.text}
                onChange={(e) => setForm(prev => ({ ...prev, text: e.target.value }))}
                placeholder={t('quickPhrases.textPlaceholder')}
                rows={4}
                className="w-full box-border bg-nexus-bg-2 border border-nexus-border rounded-md text-nexus-text text-sm leading-5 font-mono px-3 py-2 outline-none resize-y focus:border-nexus-accent"
              />
              <label className="flex items-center gap-2 text-xs text-nexus-text-2">
                <input
                  type="checkbox"
                  checked={form.appendEnter}
                  onChange={(e) => setForm(prev => ({ ...prev, appendEnter: e.target.checked }))}
                />
                <span>{t('quickPhrases.appendEnter')}</span>
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="h-8 px-3 rounded-md bg-transparent border border-nexus-border text-nexus-text-2 text-xs cursor-pointer"
                  onPointerDown={(e) => { e.preventDefault(); setEditing(false); setForm(EMPTY_FORM); setError('') }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  className="h-8 px-3 rounded-md bg-nexus-accent border-none text-white text-xs cursor-pointer disabled:opacity-50"
                  onPointerDown={(e) => { e.preventDefault(); submitForm() }}
                >
                  {form.id ? t('common.save') : t('quickPhrases.create')}
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-nexus-text-2">{t('common.loading')}</div>
          ) : sortedPhrases.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="text-sm text-nexus-text mb-2">{t('quickPhrases.empty')}</div>
              <button
                type="button"
                className="h-9 px-3 rounded-md bg-nexus-accent border-none text-white text-sm cursor-pointer"
                onPointerDown={(e) => { e.preventDefault(); startCreate() }}
              >
                {t('quickPhrases.add')}
              </button>
            </div>
          ) : (
            <div className="p-2">
              {sortedPhrases.map((phrase, index) => (
                <article key={phrase.id} className="group rounded-md border border-nexus-border bg-nexus-bg mb-2 overflow-hidden">
                  <button
                    type="button"
                    className="w-full text-left bg-transparent border-none cursor-pointer p-3 block"
                    onPointerDown={(e) => { e.preventDefault(); sendPhrase(phrase) }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1 text-sm font-medium text-nexus-text truncate">{phrase.title}</div>
                      <span className="text-[10px] text-nexus-muted shrink-0">{phrase.appendEnter ? t('quickPhrases.enterOn') : t('quickPhrases.enterOff')}</span>
                    </div>
                    <div className="mt-1.5 text-xs text-nexus-text-2 font-mono whitespace-pre-wrap break-words max-h-[4.5rem] overflow-hidden">
                      {phrase.text}
                    </div>
                  </button>
                  <div className="flex items-center justify-between gap-2 px-2.5 py-2 border-t border-nexus-border">
                    <div className="text-[11px] text-nexus-muted">
                      {t('quickPhrases.usage', { count: phrase.useCount || 0 })}
                    </div>
                    <div className="flex items-center gap-1">
                      <IconButton
                        title={t('quickPhrases.moveUp')}
                        disabled={index === 0 || saving}
                        onClick={() => movePhrase(phrase, -1)}
                        icon="chevronUp"
                      />
                      <IconButton
                        title={t('quickPhrases.moveDown')}
                        disabled={index === sortedPhrases.length - 1 || saving}
                        onClick={() => movePhrase(phrase, 1)}
                        icon="chevronDown"
                      />
                      <IconButton
                        title={t('common.edit')}
                        disabled={saving}
                        onClick={() => startEdit(phrase)}
                        icon="pencil"
                      />
                      <IconButton
                        title={t('common.delete')}
                        disabled={saving}
                        onClick={() => removePhrase(phrase)}
                        icon="trash"
                        danger
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function IconButton({ title, icon, onClick, disabled = false, danger = false }: { title: string; icon: 'chevronUp' | 'chevronDown' | 'pencil' | 'trash'; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`h-8 w-8 rounded-md bg-transparent border border-nexus-border cursor-pointer flex items-center justify-center disabled:opacity-35 ${danger ? 'text-nexus-error' : 'text-nexus-text-2'}`}
      onPointerDown={(e) => { e.preventDefault(); if (!disabled) onClick() }}
      title={title}
      aria-label={title}
    >
      <Icon name={icon} size={14} />
    </button>
  )
}
