import { useMemo, useState } from 'react'
import { IconWifi, IconNfc, IconPlus, IconInfo } from '../../icons'
import { Card, Field, TextInput, PasswordInput, Select, CopyButton, Badge } from './shared'
import WriteTagModal from './WriteTagModal'
import { AUTH_MODES, buildWifiQrString } from '../../utils/ndef'
import { sizeOf } from '../../services/nfcWriter'
import { createTag } from '../../services/tagStore'

// Aba Wi-Fi — a primeira tag de teste do projeto.
//
// Escolhida como piloto porque é a que mais economiza suporte por real gasto:
// "qual é a senha do wi-fi" é a pergunta número 1 do hóspede, chega por
// WhatsApp fora de hora, e a resposta é sempre a mesma. Ver docs/NFC-IDEIAS.md.

const MODES = [
  { id: 'wsc', label: 'Auto-join (Android)' },
  { id: 'url', label: 'Landing page (works on iPhone too)' },
]

const empty = {
  property: '',
  ssid: '',
  password: '',
  auth: 'wpa2',
  mode: 'wsc',
  landingUrl: '',
}

export default function WifiTab({ onSaved }) {
  const [form, setForm] = useState(empty)
  const [writing, setWriting] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const isOpen = form.auth === 'open'
  const authNote = AUTH_MODES.find((a) => a.id === form.auth)?.note

  // A tag "em memória" que o modal grava. Não passa pelo catálogo: dá pra
  // testar uma rede sem sujar a lista com tag de teste.
  const draft = useMemo(() => ({
    id: 'draft',
    name: form.ssid ? 'Wi-Fi — ' + form.ssid : 'Wi-Fi',
    kind: 'wifi',
    property: form.property,
    payload: {
      ssid: form.ssid,
      password: form.password,
      auth: form.auth,
      mode: form.mode,
      landingUrl: form.landingUrl,
    },
  }), [form])

  let bytes = null
  let buildError = ''
  try {
    if (form.ssid || form.landingUrl) bytes = sizeOf(draft)
  } catch (e) {
    buildError = e.message
  }

  const ready = form.mode === 'url'
    ? !!form.landingUrl
    : !!form.ssid && (isOpen || !!form.password)

  const qrString = form.ssid
    ? buildWifiQrString({ ssid: form.ssid, password: form.password, auth: form.auth })
    : ''

  const save = async () => {
    setError('')
    try {
      await createTag({
        name: 'Wi-Fi — ' + (form.ssid || form.property || 'network'),
        kind: 'wifi',
        property: form.property,
        room: '',
        payload: draft.payload,
      })
      setNotice('Saved to the catalog. You can write it to more tags from the Tags tab.')
      setTimeout(() => setNotice(''), 6000)
      onSaved?.()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">

      {notice && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg text-sm">{notice}</div>
      )}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <Card
        title="Network"
        hint="The credentials exactly as they are on the router. A typo here becomes a tag that silently fails in the house."
        Icon={IconWifi}
      >
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Property" hint="Only a label for the catalog — it is not written to the tag.">
            <TextInput value={form.property} onChange={(v) => set({ property: v })} placeholder="e.g. Solterra 4218" />
          </Field>

          <Field label="Network name (SSID)" hint="Case sensitive. Up to 32 bytes.">
            <TextInput value={form.ssid} onChange={(v) => set({ ssid: v })} placeholder="e.g. MasterVH-Guest" />
          </Field>

          <Field label="Security" hint={authNote}>
            <Select value={form.auth} onChange={(v) => set({ auth: v })} options={AUTH_MODES} />
          </Field>

          <Field label="Password" hint={isOpen ? 'Not used on an open network.' : '8 to 63 characters.'}>
            <PasswordInput
              value={isOpen ? '' : form.password}
              onChange={(v) => set({ password: v })}
              placeholder={isOpen ? '—' : 'Router password'}
            />
          </Field>
        </div>

        {/* WPA3 não existe no padrão WSC. Silenciar isso seria entregar uma tag
            que não funciona e ninguém entende por quê — então o aviso aparece
            junto do seletor, não escondido na documentação. */}
        <div className="flex items-start gap-2 mt-4 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
          <IconInfo width={14} height={14} className="mt-0.5 flex-shrink-0 text-gray-400" />
          <p>
            A router set to <strong>WPA3 only</strong> cannot be provisioned this way — the Wi-Fi tag standard predates
            WPA3. Set the guest network to WPA2, or use the landing page mode below.
          </p>
        </div>
      </Card>

      <Card
        title="How the tag behaves"
        hint="No single format works on both systems — pick which problem you would rather have."
        Icon={IconNfc}
      >
        <Field label="Mode">
          <Select value={form.mode} onChange={(v) => set({ mode: v })} options={MODES} />
        </Field>

        <div className="mt-4 text-sm text-gray-600 space-y-2">
          {form.mode === 'wsc' ? (
            <>
              <p>
                <strong>Android</strong> shows a "connect to {form.ssid || 'network'}?" prompt the moment the phone
                touches the tag. One tap and the guest is online.
              </p>
              <p>
                <strong>iPhone</strong> reads the tag, does not recognise the format, and does nothing — to the guest
                it looks broken. Put the QR code below on the same plaque so iPhones have a way in.
              </p>
            </>
          ) : (
            <>
              <p>
                Both systems open the page, which shows the network name, the password with a copy button, and the
                QR code. Works everywhere, costs the guest one extra tap on Android.
              </p>
              <p className="text-gray-400 text-xs">
                Point this at our own domain, never at a third-party link shortener — the tag lives on a wall for
                years and the redirect has to keep working.
              </p>
            </>
          )}
        </div>

        {form.mode === 'url' && (
          <div className="mt-4">
            <Field label="Landing page URL" hint="e.g. https://ferias.mastervh.com/wifi/solterra-4218">
              <TextInput value={form.landingUrl} onChange={(v) => set({ landingUrl: v })} placeholder="https://" />
            </Field>
          </div>
        )}
      </Card>

      {qrString && (
        <Card
          title="QR fallback"
          hint="The same credentials in the format an iPhone camera understands. Print it next to the tag."
          Icon={IconInfo}
          right={<CopyButton text={qrString} />}
        >
          <code className="block text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5 break-all">
            {qrString}
          </code>
          <p className="text-xs text-gray-400 mt-2">
            Paste it into any QR generator. Pointing a phone camera at the result joins the network.
          </p>
        </Card>
      )}

      <div className="flex items-center gap-3 flex-wrap pt-2">
        <button
          onClick={() => setWriting(true)}
          disabled={!ready || !!buildError}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-40 transition-colors"
        >
          <IconNfc width={15} height={15} />
          Write to tag
        </button>

        <button
          onClick={save}
          disabled={!ready || !!buildError}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 transition-colors"
        >
          <IconPlus width={15} height={15} />
          Save to catalog
        </button>

        {bytes != null && !buildError && <Badge tone="gray">{bytes} bytes</Badge>}
        {buildError && <span className="text-xs text-red-600">{buildError}</span>}
      </div>

      {writing && (
        <WriteTagModal tag={draft} onClose={() => setWriting(false)} />
      )}
    </div>
  )
}
