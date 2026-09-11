import { useEffect, useMemo, useState } from 'react'
import {
  IconTag, IconPlus, IconNfc, IconTrash, IconPencil, IconWifi,
  IconSearch, IconBook,
} from '../../icons'
import { Card, Field, TextInput, TextArea, PasswordInput, Select, Badge, EmptyState, SkeletonRows } from './shared'
import WriteTagModal from './WriteTagModal'
import { AUTH_MODES } from '../../utils/ndef'
import { listTags, createTag, updateTag, deleteTag, markWritten, TAG_KINDS } from '../../services/tagStore'

// Catálogo — a lista do que existe e o que ainda não foi gravado.
//
// O ponto dessa aba não é gravar (isso o modal faz): é responder "essa tag já
// foi pro campo?" sem alguém ter que ir lá conferir. Por isso a listagem
// mostra contagem de gravações e não só o conteúdo.

const KIND_ICON = { wifi: IconWifi, url: IconBook, text: IconTag }

const KIND_OPTIONS = Object.values(TAG_KINDS).map((k) => ({ id: k.id, label: k.label }))

const MODE_OPTIONS = [
  { id: 'wsc', label: 'Auto-join (Android)' },
  { id: 'url', label: 'Landing page (works on iPhone too)' },
]

const blank = { name: '', kind: 'url', payload: {} }

// Resumo de uma linha da lista: o suficiente pra reconhecer a tag sem abrir.
function summarize(tag) {
  const p = tag.payload ?? {}
  if (tag.kind === 'wifi') return p.mode === 'url' ? p.landingUrl : (p.ssid || '—')
  if (tag.kind === 'url') return p.url || '—'
  if (tag.kind === 'text') return p.text || '—'
  return '—'
}

function PayloadFields({ kind, payload, onChange }) {
  const set = (patch) => onChange({ ...payload, ...patch })

  if (kind === 'wifi') {
    const isOpen = payload.auth === 'open'
    return (
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Network name (SSID)">
          <TextInput value={payload.ssid} onChange={(v) => set({ ssid: v })} placeholder="MasterVH-Guest" />
        </Field>
        <Field label="Security">
          <Select value={payload.auth || 'wpa2'} onChange={(v) => set({ auth: v })} options={AUTH_MODES} />
        </Field>
        <Field label="Password" hint={isOpen ? 'Not used on an open network.' : '8 to 63 characters.'}>
          <PasswordInput value={isOpen ? '' : payload.password} onChange={(v) => set({ password: v })} />
        </Field>
        <Field label="Mode" hint="Auto-join is Android only — see the Wi-Fi tab.">
          <Select value={payload.mode || 'wsc'} onChange={(v) => set({ mode: v })} options={MODE_OPTIONS} />
        </Field>
        {payload.mode === 'url' && (
          <div className="md:col-span-2">
            <Field label="Landing page URL">
              <TextInput value={payload.landingUrl} onChange={(v) => set({ landingUrl: v })} placeholder="https://" />
            </Field>
          </div>
        )}
      </div>
    )
  }

  if (kind === 'url') {
    return (
      <Field
        label="URL"
        hint="Use our own domain with a short code (e.g. /t/a17) — the tag stays on the wall for years and the destination will change."
      >
        <TextInput value={payload.url} onChange={(v) => set({ url: v })} placeholder="https://" />
      </Field>
    )
  }

  return (
    <Field label="Text" hint="Shown by the phone as plain text. Keep it short — every character costs tag space.">
      <TextArea value={payload.text} onChange={(v) => set({ text: v })} rows={3} />
    </Field>
  )
}

export default function TagsTab({ reloadKey }) {
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)   // null | { ...tag } | blank com id undefined
  const [writing, setWriting] = useState(null)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      setTags(await listTags())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [reloadKey])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tags
    return tags.filter((t) =>
      [t.name, summarize(t)].join(' ').toLowerCase().includes(q))
  }, [tags, query])

  const save = async () => {
    setError('')
    try {
      if (editing.id) await updateTag(editing.id, editing)
      else await createTag(editing)
      setEditing(null)
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  const remove = async (tag) => {
    // Apagar do catálogo não apaga o chip: a tag física continua gravada e
    // funcionando na parede. O texto do confirm diz isso pra ninguém achar
    // que "excluir" desliga a tag da casa.
    const ok = window.confirm(
      'Delete "' + tag.name + '" from the catalog?\n\n' +
      'The physical tag keeps working — this only removes the record here.',
    )
    if (!ok) return
    await deleteTag(tag.id)
    await load()
  }

  return (
    <div className="space-y-4">

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setEditing({ ...blank })}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          <IconPlus width={15} height={15} />
          New tag
        </button>

        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <IconSearch width={15} height={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or content"
            className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <span className="text-xs text-gray-400 ml-auto">
          {tags.length} {tags.length === 1 ? 'tag' : 'tags'}
        </span>
      </div>

      {editing && (
        <Card
          title={editing.id ? 'Edit tag' : 'New tag'}
          hint="Saving here only records the tag. Writing it to a chip is a separate step."
          Icon={IconTag}
        >
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Name" hint="How the team will find it — not written to the chip.">
                <TextInput
                  value={editing.name}
                  onChange={(v) => setEditing({ ...editing, name: v })}
                  placeholder="e.g. Guest Wi-Fi — living room"
                />
              </Field>
              <Field label="Type" hint={TAG_KINDS[editing.kind]?.hint}>
                <Select
                  value={editing.kind}
                  onChange={(v) => setEditing({ ...editing, kind: v, payload: {} })}
                  options={KIND_OPTIONS}
                />
              </Field>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <PayloadFields
                kind={editing.kind}
                payload={editing.payload ?? {}}
                onChange={(payload) => setEditing({ ...editing, payload })}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={save}
                className="px-5 py-2.5 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Card>
      )}

      {loading && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <SkeletonRows rows={4} />
        </div>
      )}

      {!loading && !filtered.length && (
        <EmptyState
          Icon={IconTag}
          title={tags.length ? 'No tag matches that search' : 'No tags yet'}
          hint={tags.length
            ? 'Try the tag name or part of the link.'
            : 'Start with the Wi-Fi tab — it is the test tag for this project, and the one that saves the most support calls.'}
          action={!tags.length && (
            <button
              onClick={() => setEditing({ ...blank })}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              <IconPlus width={15} height={15} />
              New tag
            </button>
          )}
        />
      )}

      {!loading && !!filtered.length && (
        <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
          {filtered.map((tag) => {
            const Icon = KIND_ICON[tag.kind] || IconTag
            return (
              <div key={tag.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0">
                  <Icon width={17} height={17} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 truncate">{tag.name}</p>
                    <Badge tone={tag.writes ? 'green' : 'yellow'}>
                      {tag.writes ? 'Written ' + tag.writes + '×' : 'Not written'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{summarize(tag)}</p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setWriting(tag)}
                    title="Write to a chip"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-white hover:border-gray-400 transition-colors"
                  >
                    <IconNfc width={14} height={14} />
                    <span className="hidden sm:inline">Write</span>
                  </button>
                  <button
                    onClick={() => setEditing({ ...tag })}
                    title="Edit"
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-white transition-colors"
                  >
                    <IconPencil width={15} height={15} />
                  </button>
                  <button
                    onClick={() => remove(tag)}
                    title="Delete from catalog"
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-white transition-colors"
                  >
                    <IconTrash width={15} height={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {writing && (
        <WriteTagModal
          tag={writing}
          onClose={() => setWriting(null)}
          onWritten={async () => { await markWritten(writing.id); await load() }}
        />
      )}
    </div>
  )
}
