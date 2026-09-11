import { useState } from 'react'
import { IconEye, IconEyeOff, IconCopy, IconCheck } from '../../icons'

// Peças compartilhadas pelas abas da central. Tudo aqui segue o design system
// do Master Lock Automation (mesmo card/borda/botão de hubtv/shared.jsx lá) —
// se um dia as duas telas virarem um app só, nada precisa ser redesenhado.

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900'

export function Field({ label, hint, children }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

export function TextInput({ value, onChange, placeholder, type = 'text', disabled }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`${inputCls} disabled:bg-gray-50 disabled:text-gray-400`}
    />
  )
}

export function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`${inputCls} resize-y`}
    />
  )
}

export function Select({ value, onChange, options }) {
  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      {options.map((o) => (
        <option key={o.id} value={o.id}>{o.label}</option>
      ))}
    </select>
  )
}

// Senha de rede é digitada por quem está na casa, muitas vezes lendo de uma
// etiqueta atrás do roteador — esconder por padrão e deixar revelar evita os
// dois erros: ombro alheio e typo que só aparece depois da tag gravada.
export function PasswordInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={`${inputCls} pr-11`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-700 transition-colors"
      >
        {show ? <IconEyeOff width={16} height={16} /> : <IconEye width={16} height={16} />}
      </button>
    </div>
  )
}

export function CopyButton({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setDone(true)
      setTimeout(() => setDone(false), 1800)
    } catch {
      // Sem permissão de clipboard (http em rede local, por exemplo) — o texto
      // já está visível na tela, então o botão só não confirma.
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors"
    >
      {done ? <IconCheck width={14} height={14} /> : <IconCopy width={14} height={14} />}
      {done ? 'Copied' : label}
    </button>
  )
}

export function Spinner({ size = 16, className = '' }) {
  return (
    <span
      className={`inline-block rounded-full border-2 border-t-transparent animate-spin ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

export function SkeletonRows({ rows = 4 }) {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-5 py-4 flex items-center gap-4">
          <div className="w-9 h-9 rounded-lg bg-gray-100 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
            <div className="h-2.5 bg-gray-50 rounded animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ Icon, title, hint, action }) {
  return (
    <div className="border border-dashed border-gray-200 rounded-xl px-6 py-14 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-gray-50 text-gray-300 flex items-center justify-center mx-auto mb-4">
          <Icon width={24} height={24} />
        </div>
      )}
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {hint && <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Card({ title, hint, Icon, children, right }) {
  return (
    <section className="border border-gray-200 rounded-xl overflow-hidden">
      <header className="flex items-start gap-3 px-5 py-4 bg-gray-50 border-b border-gray-100">
        {Icon && <Icon width={18} height={18} className="text-gray-400 mt-0.5 flex-shrink-0" />}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
        </div>
        {right}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

// Selo de status usado na listagem e no leitor. `tone` é o nome da cor, não a
// classe inteira, pra não espalhar string de Tailwind por todo lado.
const TONES = {
  gray:   'bg-gray-100 text-gray-600 border-gray-200',
  green:  'bg-green-50 text-green-700 border-green-200',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-300',
  red:    'bg-red-50 text-red-700 border-red-200',
  black:  'bg-black text-white border-black',
}

export function Badge({ tone = 'gray', children }) {
  return (
    <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${TONES[tone] || TONES.gray}`}>
      {children}
    </span>
  )
}
