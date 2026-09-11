import { buildWscPayload, WSC_MIME, estimateNdefSize } from '../utils/ndef'

// Ponte entre uma tag do catálogo e a mensagem NDEF que vai pro chip.
//
// Separado das telas de propósito: a regra de "o que cada tipo de tag vira em
// bytes" é a parte que não pode divergir entre a aba Wi-Fi e a aba Tags, que
// gravam pela mesma porta.

// Capacidade útil (bytes de área NDEF) dos chips que a gente usa. NTAG213 é o
// padrão da operação por preço; os outros entram quando o conteúdo não cabe.
export const CHIPS = [
  { id: 'ntag213', label: 'NTAG213', bytes: 144 },
  { id: 'ntag215', label: 'NTAG215', bytes: 504 },
  { id: 'ntag216', label: 'NTAG216', bytes: 888 },
]

/**
 * Monta os registros NDEF de uma tag do catálogo.
 * Retorna o formato que o Web NFC espera em `NDEFReader.write({ records })`.
 */
export function buildRecords(tag) {
  const p = tag.payload ?? {}

  if (tag.kind === 'wifi') {
    // Dois modos, porque nenhum atende os dois sistemas:
    //
    // - 'wsc': registro Wi-Fi Simple Config. O Android reconhece e oferece
    //   "conectar a <rede>" na hora. O iPhone lê a tag, não entende o tipo e
    //   não faz nada — pro hóspede parece que a tag está quebrada.
    // - 'url': registro de link pra uma página que mostra a senha (e um QR
    //   que a câmera do iPhone usa pra entrar). Funciona nos dois, mas exige
    //   um toque a mais no Android.
    //
    // Por isso a plaquinha da casa vai ter os dois meios (ver docs/WIFI-TAG.md)
    // e a escolha aqui é de quem grava, não um padrão escondido no código.
    if (p.mode === 'url') {
      if (!p.landingUrl) throw new Error('Landing page URL is required in link mode')
      return [{ recordType: 'url', data: p.landingUrl }]
    }
    return [{
      recordType: 'mime',
      mediaType: WSC_MIME,
      data: buildWscPayload({ ssid: p.ssid, password: p.password, auth: p.auth }),
    }]
  }

  if (tag.kind === 'url') {
    if (!p.url) throw new Error('URL is required')
    return [{ recordType: 'url', data: p.url }]
  }

  if (tag.kind === 'text') {
    if (!p.text) throw new Error('Text is required')
    return [{ recordType: 'text', data: p.text, lang: p.lang || 'en' }]
  }

  throw new Error('Unknown tag type: ' + tag.kind)
}

/** Bytes que a tag vai ocupar — pra avisar antes de encostar no chip. */
export function sizeOf(tag) {
  return estimateNdefSize(buildRecords(tag))
}

/**
 * Espera o usuário encostar uma tag e grava.
 *
 * `signal` vem de um AbortController da tela: sem ele o scan do navegador fica
 * vivo depois que o modal fecha, e a PRÓXIMA tag encostada seria gravada sem
 * ninguém pedir.
 */
export async function writeTag(tag, { signal, overwrite = true } = {}) {
  if (!('NDEFReader' in window)) {
    throw new Error('This browser has no Web NFC. Use Chrome on Android.')
  }
  const reader = new window.NDEFReader()
  await reader.write({ records: buildRecords(tag) }, { overwrite, signal })
  return true
}

/**
 * Trava a tag permanentemente (one-way). Depois disso o conteúdo NUNCA mais
 * muda — nem por nós.
 *
 * Vale pra tag que fica exposta ao hóspede: uma tag destravada pode ser
 * regravada por qualquer pessoa com um celular, inclusive apontando pra um
 * site falso com a nossa marca. Ver docs/NFC-IDEIAS.md.
 */
export async function lockTag({ signal } = {}) {
  if (!('NDEFReader' in window)) {
    throw new Error('This browser has no Web NFC. Use Chrome on Android.')
  }
  const reader = new window.NDEFReader()
  await reader.makeReadOnly({ signal })
  return true
}

/** Mensagem de erro do navegador traduzida pra algo acionável. */
export function explainNfcError(e) {
  const name = e?.name || ''
  if (name === 'NotAllowedError') {
    return 'Permission denied. Allow NFC for this site, and check that NFC is turned on in the phone settings.'
  }
  if (name === 'NotSupportedError') {
    return 'The tag could not take this content — it is either not NDEF-formatted or too small. Try a blank NTAG213 or a larger chip.'
  }
  if (name === 'NetworkError') {
    return 'The tag moved away before the write finished. Hold the phone still on the tag until the confirmation appears.'
  }
  if (name === 'AbortError') {
    return 'Cancelled.'
  }
  return e?.message || 'Could not write the tag.'
}
