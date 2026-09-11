// Codificação/decodificação NDEF usada pela central.
//
// O Web NFC monta o envelope NDEF sozinho (cabeçalho de registro, TNF, flags),
// então aqui só cuidamos do que ele NÃO sabe montar: o payload binário do
// registro Wi-Fi (WSC). Pra "text" e "url" a gente entrega a string crua e o
// navegador resolve.

// ---------------------------------------------------------------------------
// Suporte do navegador
// ---------------------------------------------------------------------------

// Web NFC existe só no Chrome/Edge do Android (a partir do 89) e exige origem
// segura. Em iPhone NÃO existe em navegador nenhum — nem no Chrome do iOS, que
// por baixo é o motor do Safari. Por isso a checagem é por API presente, não
// por user agent: quando/se o Safari implementar, a central passa a funcionar
// sem a gente tocar em nada.
export function nfcSupport() {
  const hasApi = typeof window !== 'undefined' && 'NDEFReader' in window
  const secure = typeof window !== 'undefined' && window.isSecureContext
  const ios = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)

  if (hasApi && secure) return { ok: true, reason: null }
  if (hasApi && !secure) {
    return {
      ok: false,
      reason: 'insecure',
      message: 'NFC requires a secure origin (HTTPS or localhost). Open this page over HTTPS to write tags.',
    }
  }
  if (ios) {
    return {
      ok: false,
      reason: 'ios',
      message: 'iPhone cannot write NFC tags from the browser — iOS has no Web NFC. Use an Android phone to record the tags; iPhones can still READ them once written.',
    }
  }
  return {
    ok: false,
    reason: 'unsupported',
    message: 'This browser has no Web NFC. Use Chrome on Android to read and write tags.',
  }
}

// ---------------------------------------------------------------------------
// Wi-Fi Simple Config (WSC) — o payload que faz o Android oferecer "conectar"
// ---------------------------------------------------------------------------
//
// Estrutura TLV big-endian: 2 bytes de tipo, 2 bytes de tamanho, N de valor.
// Tudo vive dentro de um Credential (0x100E). A ordem abaixo é a que os
// leitores do Android esperam na prática — fora dela alguns aparelhos ignoram
// o registro em silêncio, sem erro nenhum.
const WSC = {
  CREDENTIAL:  0x100e,
  NETWORK_IDX: 0x1026,
  SSID:        0x1045,
  AUTH_TYPE:   0x1003,
  ENCR_TYPE:   0x100f,
  NETWORK_KEY: 0x1027,
  MAC_ADDRESS: 0x1020,
}

// Valores do WSC spec. WPA3-SAE não existe nessa tabela: roteador em WPA3 puro
// não tem como ser provisionado por essa via — ver AUTH_MODES abaixo.
const AUTH = {
  open:     0x0001,
  wpa2:     0x0020,  // WPA2-Personal (PSK) — o caso normal
  wpa_wpa2: 0x0022,  // WPA/WPA2 misto — roteador legado
}

const ENCR = {
  none: 0x0001,
  aes:  0x0008,
  both: 0x000c,  // AES + TKIP, par do modo misto
}

// O que a tela oferece. `note` é o texto que aparece embaixo do seletor.
export const AUTH_MODES = [
  { id: 'wpa2',     label: 'WPA2 (PSK)',         note: 'The normal choice for a house router.' },
  { id: 'wpa_wpa2', label: 'WPA / WPA2 mixed',   note: 'For older routers that accept both.' },
  { id: 'open',     label: 'Open (no password)', note: 'No key is written to the tag.' },
]

const enc = new TextEncoder()

function tlv(type, value) {
  const out = new Uint8Array(4 + value.length)
  out[0] = (type >> 8) & 0xff
  out[1] = type & 0xff
  out[2] = (value.length >> 8) & 0xff
  out[3] = value.length & 0xff
  out.set(value, 4)
  return out
}

const u16 = (n) => new Uint8Array([(n >> 8) & 0xff, n & 0xff])

function concat(chunks) {
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(total)
  let at = 0
  for (const c of chunks) { out.set(c, at); at += c.length }
  return out
}

/**
 * Monta o payload `application/vnd.wfa.wsc` de uma rede.
 * Retorna Uint8Array pronto pra ir no `data` de um registro mime.
 */
export function buildWscPayload({ ssid, password, auth = 'wpa2' }) {
  if (!ssid) throw new Error('SSID is required')

  const isOpen = auth === 'open'
  if (!isOpen && !password) throw new Error('Password is required for a secured network')

  const ssidBytes = enc.encode(ssid)
  // 32 bytes é o teto do padrão 802.11 pro SSID — acima disso o roteador não
  // anuncia e a tag ficaria apontando pra uma rede que não existe.
  if (ssidBytes.length > 32) throw new Error('SSID is longer than the 32-byte limit')

  const keyBytes = isOpen ? new Uint8Array(0) : enc.encode(password)
  if (!isOpen && (keyBytes.length < 8 || keyBytes.length > 63)) {
    throw new Error('WPA password must be between 8 and 63 characters')
  }

  const authVal = AUTH[auth] ?? AUTH.wpa2
  const encrVal = isOpen ? ENCR.none : (auth === 'wpa_wpa2' ? ENCR.both : ENCR.aes)

  const credential = concat([
    tlv(WSC.NETWORK_IDX, new Uint8Array([1])),   // legado, mas alguns leitores exigem
    tlv(WSC.SSID,        ssidBytes),
    tlv(WSC.AUTH_TYPE,   u16(authVal)),
    tlv(WSC.ENCR_TYPE,   u16(encrVal)),
    tlv(WSC.NETWORK_KEY, keyBytes),
    tlv(WSC.MAC_ADDRESS, new Uint8Array(6)),     // 00:00:00:00:00:00 = qualquer AP
  ])

  return tlv(WSC.CREDENTIAL, credential)
}

export const WSC_MIME = 'application/vnd.wfa.wsc'

/**
 * Tamanho em bytes que a mensagem NDEF vai ocupar na tag, incluindo o
 * cabeçalho de cada registro. Serve pra avisar ANTES de gravar que não cabe
 * numa NTAG213 (144 bytes úteis) — o erro do navegador nesse caso é um
 * "NotSupportedError" seco que não ajuda ninguém.
 */
export function estimateNdefSize(records) {
  return records.reduce((total, r) => {
    const payload = r.recordType === 'mime'
      ? r.data.length
      // "text" carrega 1 byte de status + o código de idioma ("en" = 2);
      // "url" carrega 1 byte de abreviação de prefixo.
      : enc.encode(String(r.data)).length + (r.recordType === 'text' ? 3 : 1)
    const typeLen = r.recordType === 'mime' ? enc.encode(r.mediaType).length : 1
    // Cabeçalho: 1 de flags + 1 de type length + 1 ou 4 de payload length
    return total + 2 + typeLen + (payload < 256 ? 1 : 4) + payload
  }, 0)
}

// ---------------------------------------------------------------------------
// Formato WIFI: — o mesmo string que vai num QR Code
// ---------------------------------------------------------------------------
//
// Não é NFC: é a convenção de QR que a câmera do iPhone entende. Fica aqui
// porque a plaquinha da casa leva os dois (ver docs/NFC-IDEIAS.md), e a fonte
// da verdade — SSID e senha — é a mesma.
const escapeWifi = (s) => String(s).replace(/([\\;,:"])/g, '\\$1')

export function buildWifiQrString({ ssid, password, auth = 'wpa2', hidden = false }) {
  const t = auth === 'open' ? 'nopass' : 'WPA'
  const p = auth === 'open' ? '' : escapeWifi(password)
  return 'WIFI:T:' + t + ';S:' + escapeWifi(ssid) + ';P:' + p + ';H:' + (hidden ? 'true' : 'false') + ';;'
}

// ---------------------------------------------------------------------------
// Leitura — transforma o que o navegador entrega em algo exibível
// ---------------------------------------------------------------------------

const dec = (data, encoding = 'utf-8') => new TextDecoder(encoding).decode(data)

const toHex = (data) =>
  Array.from(new Uint8Array(data.buffer ?? data))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ')

/** Lê de volta um Credential WSC — usado só pra conferir o que foi gravado. */
function parseWsc(data) {
  const view = new DataView(data.buffer ?? data)
  const out = {}
  // Entra no Credential externo antes de varrer: os campos que interessam
  // estão aninhados dentro dele, não no nível de cima.
  let at = 0
  if (view.byteLength >= 4 && view.getUint16(0) === WSC.CREDENTIAL) at = 4

  while (at + 4 <= view.byteLength) {
    const type = view.getUint16(at)
    const len = view.getUint16(at + 2)
    const value = new Uint8Array(
      view.buffer,
      view.byteOffset + at + 4,
      Math.max(0, Math.min(len, view.byteLength - at - 4)),
    )
    if (type === WSC.SSID) out.ssid = dec(value)
    if (type === WSC.NETWORK_KEY) out.password = dec(value)
    if (type === WSC.AUTH_TYPE && value.length === 2) {
      const v = (value[0] << 8) | value[1]
      out.auth = Object.keys(AUTH).find((k) => AUTH[k] === v) ?? '0x' + v.toString(16)
    }
    at += 4 + len
  }
  return out
}

/** Normaliza um registro lido pra { kind, label, value }. */
export function describeRecord(record) {
  try {
    if (record.recordType === 'text') {
      return { kind: 'text', label: 'Text (' + (record.lang || '??') + ')', value: dec(record.data, record.encoding) }
    }
    if (record.recordType === 'url' || record.recordType === 'absolute-url') {
      return { kind: 'url', label: 'URL', value: dec(record.data) }
    }
    if (record.recordType === 'mime' && record.mediaType === WSC_MIME) {
      const wifi = parseWsc(record.data)
      return {
        kind: 'wifi',
        label: 'Wi-Fi (WSC)',
        value: 'SSID: ' + (wifi.ssid ?? '—') + '  ·  Security: ' + (wifi.auth ?? '—'),
        wifi,
      }
    }
    if (record.recordType === 'mime') {
      return { kind: 'mime', label: 'MIME (' + record.mediaType + ')', value: toHex(record.data) }
    }
    if (record.recordType === 'empty') {
      return { kind: 'empty', label: 'Empty record', value: 'The tag is formatted but has no content.' }
    }
    return { kind: 'raw', label: record.recordType || 'unknown', value: toHex(record.data) }
  } catch (e) {
    return { kind: 'raw', label: record.recordType || 'unknown', value: 'Could not decode: ' + e.message }
  }
}
