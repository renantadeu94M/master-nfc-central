// Catálogo de tags da central.
//
// Hoje persiste em localStorage. A forma das funções é de propósito a de uma
// API assíncrona (Promise, erro jogado) pra que trocar por um backend de
// verdade — Postgres + Express, como no Master Lock Automation — seja mexer só
// neste arquivo, sem tocar em nenhuma tela.

const KEY = 'mvh_nfc_tags_v1'

// Tipos de conteúdo que a central sabe gravar. Cada um diz como o payload é
// montado (ver buildRecords) e o que o formulário pede.
export const TAG_KINDS = {
  wifi: {
    id: 'wifi',
    label: 'Wi-Fi',
    hint: 'Guest joins the house network by tapping the tag.',
  },
  url: {
    id: 'url',
    label: 'Link',
    hint: 'Opens a page — house guide, review form, upsell menu, checklist.',
  },
  text: {
    id: 'text',
    label: 'Text',
    hint: 'Plain text shown by the phone. Good for a serial number or a code.',
  },
}

const now = () => new Date().toISOString()

// crypto.randomUUID não existe em contexto inseguro em alguns navegadores, e a
// central roda em http://<ip> durante o desenvolvimento — daí o fallback.
const newId = () =>
  (globalThis.crypto?.randomUUID?.() ?? 'tag_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8))

function readAll() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    // localStorage corrompido ou bloqueado (modo anônimo com cookies off):
    // a central abre vazia em vez de quebrar na primeira renderização.
    return []
  }
}

function writeAll(tags) {
  localStorage.setItem(KEY, JSON.stringify(tags))
  return tags
}

export async function listTags() {
  return readAll().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
}

export async function createTag(input) {
  if (!input?.name?.trim()) throw new Error('Name is required')
  if (!TAG_KINDS[input.kind]) throw new Error('Unknown tag type: ' + input.kind)

  const tag = {
    id: newId(),
    name: input.name.trim(),
    kind: input.kind,
    payload: input.payload ?? {},
    // Contadores de gravação: é o que responde "essa tag já foi pro campo?"
    // sem precisar ir na casa conferir.
    writes: 0,
    lastWrittenAt: null,
    createdAt: now(),
    updatedAt: now(),
  }
  const tags = readAll()
  tags.push(tag)
  writeAll(tags)
  return tag
}

export async function updateTag(id, patch) {
  const tags = readAll()
  const i = tags.findIndex((t) => t.id === id)
  if (i === -1) throw new Error('Tag not found')
  tags[i] = { ...tags[i], ...patch, id, updatedAt: now() }
  writeAll(tags)
  return tags[i]
}

export async function deleteTag(id) {
  writeAll(readAll().filter((t) => t.id !== id))
}

/** Registra que a tag física foi gravada — chamado pelo modal de gravação. */
export async function markWritten(id) {
  const tags = readAll()
  const i = tags.findIndex((t) => t.id === id)
  if (i === -1) return null
  tags[i] = {
    ...tags[i],
    writes: (tags[i].writes || 0) + 1,
    lastWrittenAt: now(),
    updatedAt: now(),
  }
  writeAll(tags)
  return tags[i]
}
