import { useState } from 'react'
import { IconTag, IconWifi, IconScan, IconNfc } from '../icons'
import TagsTab from '../components/nfc/TagsTab'
import WifiTab from '../components/nfc/WifiTab'
import ReaderTab from '../components/nfc/ReaderTab'
import { nfcSupport } from '../utils/ndef'
import { APP_VERSION } from '../version'

// Central de NFC — a tela única do projeto por enquanto.
//
// Mesma marcação da TVsPage do Master Lock Automation (título + subtítulo +
// barra de abas com border-b-2): quem já opera aquele painel não precisa
// aprender nada novo aqui.

const TABS = [
  { id: 'tags',   label: 'Tags',   Icon: IconTag },
  { id: 'wifi',   label: 'Wi-Fi',  Icon: IconWifi },
  { id: 'reader', label: 'Reader', Icon: IconScan },
]

export default function NfcCentralPage() {
  const [activeTab, setActiveTab] = useState('tags')
  // Salvar na aba Wi-Fi tem que aparecer na lista da aba Tags. Um contador
  // simples evita ter que subir o estado do catálogo inteiro pra cá só por
  // causa disso.
  const [reloadKey, setReloadKey] = useState(0)

  const support = nfcSupport()

  return (
    <div className="bg-white min-h-full p-4 md:p-8">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h2 className="page-title text-3xl text-gray-900">NFC Central</h2>
        <div className="flex items-baseline gap-3 flex-shrink-0">
          <p className="text-[10px] text-gray-400">Version {APP_VERSION}</p>
        </div>
      </div>
      <p className="text-gray-500 mb-6">
        Create, record and check the NFC tags that go into the houses. Tags are written from this page directly to the
        chip — no separate app on the phone.
      </p>

      {/* Estado do NFC do aparelho. Fica no topo e não dentro de cada aba
          porque é a primeira pergunta de quem abre isso num desktop e não
          entende por que nada grava. */}
      <div className="flex items-center gap-3 flex-wrap mb-6 pb-6 border-b border-gray-200">
        <span
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
            support.ok
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-yellow-50 text-yellow-700 border-yellow-300'
          }`}
        >
          <IconNfc width={14} height={14} />
          {support.ok ? 'NFC ready on this device' : 'NFC not available here'}
        </span>
        {!support.ok && (
          <span className="text-sm text-gray-500">{support.message}</span>
        )}
      </div>

      {/* Abas — mesma marcação da TVsPage do Master Lock */}
      <div className="flex items-center gap-6 mb-8 border-b border-gray-200 overflow-x-auto">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
              activeTab === id
                ? 'border-black text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <Icon width={15} height={15} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'tags'   && <TagsTab reloadKey={reloadKey} />}
      {activeTab === 'wifi'   && <WifiTab onSaved={() => setReloadKey((k) => k + 1)} />}
      {activeTab === 'reader' && <ReaderTab />}
    </div>
  )
}
