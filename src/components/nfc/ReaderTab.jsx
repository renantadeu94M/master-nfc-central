import { useEffect, useRef, useState } from 'react'
import { IconScan, IconNfc, IconAlert } from '../../icons'
import { Badge, Spinner, EmptyState } from './shared'
import { nfcSupport, describeRecord } from '../../utils/ndef'
import { explainNfcError } from '../../services/nfcWriter'

// Leitor — a ferramenta de conferência.
//
// Existe por um motivo operacional: depois de gravar, alguém precisa confirmar
// que o chip ficou com o que a gente acha que ficou. Sem isso a única forma de
// verificar é encostar o celular e ver "se abre", o que não diferencia "gravou
// certo" de "gravou o conteúdo antigo que já estava lá".

export default function ReaderTab() {
  const [scanning, setScanning] = useState(false)
  const [reads, setReads] = useState([])
  const [error, setError] = useState('')
  const abortRef = useRef(null)

  const support = nfcSupport()

  // Encerra o scan ao sair da aba — senão o navegador segue lendo tag em
  // segundo plano enquanto o operador está em outra tela.
  useEffect(() => () => abortRef.current?.abort(), [])

  const start = async () => {
    setError('')
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const reader = new window.NDEFReader()
      await reader.scan({ signal: ctrl.signal })
      setScanning(true)

      reader.onreading = ({ message, serialNumber }) => {
        setReads((prev) => [{
          at: new Date().toLocaleTimeString(),
          serial: serialNumber || '—',
          records: [...message.records].map(describeRecord),
        }, ...prev].slice(0, 20))   // 20 leituras bastam pra conferir um lote
      }

      reader.onreadingerror = () => {
        setError('A tag was detected but could not be read. It may be damaged, or not NDEF-formatted.')
      }
    } catch (e) {
      setError(explainNfcError(e))
      setScanning(false)
    }
  }

  const stop = () => {
    abortRef.current?.abort()
    setScanning(false)
  }

  return (
    <div className="space-y-4 max-w-3xl">

      {!support.ok && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-lg text-sm">
          {support.message}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
          <IconAlert width={16} height={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        {!scanning ? (
          <button
            onClick={start}
            disabled={!support.ok}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            <IconScan width={15} height={15} />
            Start scanning
          </button>
        ) : (
          <>
            <button
              onClick={stop}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Spinner size={13} className="border-gray-400" />
              Stop
            </button>
            <span className="text-sm text-gray-500">Touch a tag to the back of the phone.</span>
          </>
        )}

        {!!reads.length && (
          <button
            onClick={() => setReads([])}
            className="ml-auto text-xs font-semibold text-gray-400 hover:text-gray-900 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {!reads.length && (
        <EmptyState
          Icon={IconNfc}
          title={scanning ? 'Waiting for a tag' : 'Nothing read yet'}
          hint="Every tag you touch shows up here with its serial number and the records it carries — use it to confirm a write before the tag goes on the wall."
        />
      )}

      {reads.map((r, i) => (
        <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
          <header className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100">
            <IconNfc width={16} height={16} className="text-gray-400 flex-shrink-0" />
            <code className="text-xs text-gray-600 truncate">{r.serial}</code>
            <span className="ml-auto text-xs text-gray-400 flex-shrink-0">{r.at}</span>
          </header>

          <div className="divide-y divide-gray-100">
            {!r.records.length && (
              <p className="px-5 py-4 text-sm text-gray-400">The tag is empty — formatted, but with no records.</p>
            )}
            {r.records.map((rec, j) => (
              <div key={j} className="px-5 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge tone={rec.kind === 'wifi' ? 'green' : 'gray'}>{rec.label}</Badge>
                </div>
                <p className="text-sm text-gray-700 break-all">{rec.value}</p>
                {/* A senha só aparece porque quem está lendo é a nossa equipe
                    conferindo a própria tag — é o mesmo dado que ela acabou de
                    digitar na aba Wi-Fi, não um segredo de terceiro. */}
                {rec.wifi?.password && (
                  <p className="text-xs text-gray-400 mt-1">Password on the tag: {rec.wifi.password}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
