import { useEffect, useRef, useState } from 'react'
import { IconNfc, IconCheck, IconAlert, IconLockClosed } from '../../icons'
import { Badge, Spinner } from './shared'
import { writeTag, lockTag, sizeOf, explainNfcError, CHIPS } from '../../services/nfcWriter'
import { nfcSupport } from '../../utils/ndef'

// Modal de gravação — o único lugar do app que encosta no chip.
//
// A vida do scan é amarrada ao modal por um AbortController: sem isso o
// navegador continua esperando uma tag depois que a tela fecha, e a PRÓXIMA
// tag que alguém encostasse seria sobrescrita sem ninguém ter pedido.

export default function WriteTagModal({ tag, onClose, onWritten }) {
  const [phase, setPhase] = useState('ready')   // ready | waiting | done | error | locking | locked
  const [error, setError] = useState('')
  const [chip, setChip] = useState('ntag213')
  const abortRef = useRef(null)

  const support = nfcSupport()

  // Tamanho pode lançar (payload incompleto), e um throw aqui derrubaria a
  // tela inteira — então o erro vira estado, exibido antes de deixar gravar.
  let bytes = null
  let buildError = ''
  try {
    bytes = sizeOf(tag)
  } catch (e) {
    buildError = e.message
  }

  const capacity = CHIPS.find((c) => c.id === chip)?.bytes ?? 144
  const tooBig = bytes != null && bytes > capacity

  useEffect(() => () => abortRef.current?.abort(), [])

  const start = async () => {
    setError('')
    setPhase('waiting')
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      await writeTag(tag, { signal: ctrl.signal })
      setPhase('done')
      onWritten?.()
    } catch (e) {
      if (ctrl.signal.aborted) return   // fechou o modal no meio — não é erro
      setError(explainNfcError(e))
      setPhase('error')
    }
  }

  const cancel = () => {
    abortRef.current?.abort()
    setPhase('ready')
  }

  const lock = async () => {
    // Sem volta: o chip vira somente-leitura de forma permanente. O confirm
    // nativo basta aqui — é uma pergunta de sim/não, não um fluxo.
    const ok = window.confirm(
      'Lock this tag permanently?\n\n' +
      'The content can never be changed again — not by us either. ' +
      'Only do this once the tag is tested and going to the property.',
    )
    if (!ok) return

    setError('')
    setPhase('locking')
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      await lockTag({ signal: ctrl.signal })
      setPhase('locked')
    } catch (e) {
      if (ctrl.signal.aborted) return
      setError(explainNfcError(e))
      setPhase('error')
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden slide-in">

          <header className="flex items-start gap-3 px-5 py-4 border-b border-gray-100">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-gray-900 truncate">Write to tag</h3>
              <p className="text-xs text-gray-400 truncate">{tag.name}</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex-shrink-0 p-2 -m-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <span className="text-xl leading-none">×</span>
            </button>
          </header>

          <div className="p-5 space-y-4">

            {!support.ok && (
              <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-lg text-sm">
                {support.message}
              </div>
            )}

            {buildError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
                {buildError}
              </div>
            )}

            {/* Quanto do chip o conteúdo ocupa. O aviso vem ANTES de encostar
                na tag porque o erro do navegador pra "não coube" é um
                NotSupportedError seco, indistinguível de "tag não formatada". */}
            {bytes != null && (
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Chip</span>
                  <select
                    value={chip}
                    onChange={(e) => setChip(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    {CHIPS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <Badge tone={tooBig ? 'red' : 'gray'}>
                  {bytes} / {capacity} bytes
                </Badge>
              </div>
            )}

            {tooBig && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
                This content does not fit on a {CHIPS.find((c) => c.id === chip)?.label}. Pick a bigger chip, or
                shorten the link — a short redirect on our own domain is the usual fix.
              </div>
            )}

            {/* Alvo do toque: círculo grande, porque em celular o operador está
                com a tag numa mão e o telefone na outra. */}
            <div className="flex flex-col items-center py-6">
              <div
                className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-colors ${
                  phase === 'done' || phase === 'locked'
                    ? 'bg-green-50 text-green-600'
                    : phase === 'error'
                      ? 'bg-red-50 text-red-600'
                      : phase === 'waiting' || phase === 'locking'
                        ? 'bg-gray-50 text-gray-900 nfc-ping'
                        : 'bg-gray-50 text-gray-300'
                }`}
              >
                {phase === 'done' || phase === 'locked'
                  ? <IconCheck width={36} height={36} />
                  : phase === 'error'
                    ? <IconAlert width={32} height={32} />
                    : <IconNfc width={36} height={36} />}
              </div>

              <p className="text-sm text-gray-600 mt-5 text-center max-w-xs">
                {phase === 'ready'   && 'Hold the phone against the tag after you press the button below.'}
                {phase === 'waiting' && 'Waiting for a tag — touch the back of the phone to it and hold still.'}
                {phase === 'locking' && 'Touch the same tag again to lock it.'}
                {phase === 'done'    && 'Written. Tap the tag with any phone to test it before it goes on the wall.'}
                {phase === 'locked'  && 'Tag locked. It is read-only from now on.'}
                {phase === 'error'   && error}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {(phase === 'ready' || phase === 'error') && (
                <button
                  onClick={start}
                  disabled={!support.ok || !!buildError || tooBig}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-40 transition-colors"
                >
                  <IconNfc width={15} height={15} />
                  {phase === 'error' ? 'Try again' : 'Start writing'}
                </button>
              )}

              {(phase === 'waiting' || phase === 'locking') && (
                <button
                  onClick={cancel}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Spinner size={13} className="border-gray-400" />
                  Cancel
                </button>
              )}

              {phase === 'done' && (
                <>
                  <button
                    onClick={start}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
                  >
                    <IconNfc width={15} height={15} />
                    Write another
                  </button>
                  <button
                    onClick={lock}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                  >
                    <IconLockClosed width={15} height={15} />
                    Lock permanently
                  </button>
                </>
              )}

              {(phase === 'done' || phase === 'locked') && (
                <button
                  onClick={onClose}
                  className="ml-auto px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
