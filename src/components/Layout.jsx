import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { IconMenu, IconNfc, IconUser, IconSettings } from '../icons'
import { APP_VERSION } from '../version'

// Casca do app — mesma estrutura do Layout.jsx do Master Lock Automation:
// sidebar de 64 (16 quando recolhida), item ativo marcado por borda amarela à
// esquerda, topbar de 64 com o título em Optima e o selo BETA.
//
// O que NÃO veio de lá ainda: login, permissões por papel e i18n. Este projeto
// roda sem autenticação porque ainda é ferramenta interna de bancada — antes
// de ir pro ar tem que herdar o AuthContext do outro projeto, senão qualquer
// um com o link grava tag com o nome da empresa.

const TOP_MENU = [
  { id: 'nfc', label: 'NFC Central', Icon: IconNfc },
]

export default function Layout({ children }) {
  const [open, setOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const page = location.pathname === '/' ? 'nfc' : location.pathname.slice(1).split('/')[0]

  const handleMenuToggle = () => {
    if (window.innerWidth < 768) setMobileOpen((v) => !v)
    else setOpen((v) => !v)
  }

  const MenuButton = ({ id, label, Icon, badge }) => {
    const active = id === page
    return (
      <button
        onClick={() => { navigate(id === 'nfc' ? '/' : `/${id}`); setMobileOpen(false) }}
        title={label}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-4 ${
          active
            ? 'border-yellow-500 bg-gray-50 text-gray-900'
            : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
        }`}
      >
        <Icon width={18} height={18} className="flex-shrink-0" />
        <span className={`truncate text-[15px] ${active ? 'font-semibold' : ''} ${!open ? 'md:hidden' : ''}`}>{label}</span>
        {badge && (
          <span className={`ml-auto text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-yellow-500 text-black flex-shrink-0 ${!open ? 'md:hidden' : ''}`}>
            {badge}
          </span>
        )}
      </button>
    )
  }

  // Placeholder visual — mesma altura/estilo do MenuButton, sem onClick e sem
  // navegação. Marca o que já está previsto mas ainda não existe, em vez de um
  // item que leva a lugar nenhum.
  const StaticMenuLabel = ({ label, Icon }) => (
    <div className="w-full flex items-center gap-3 px-4 py-3 text-left border-l-4 border-transparent text-gray-400 cursor-default select-none">
      <Icon width={18} height={18} className="flex-shrink-0" />
      <span className={`truncate text-[15px] ${!open ? 'md:hidden' : ''}`}>{label}</span>
    </div>
  )

  return (
    <div className="min-h-screen bg-white flex text-gray-800">

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'bg-white border-r border-gray-200 flex flex-col transition-all duration-300',
          'fixed inset-y-0 left-0 z-40 w-64',
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
          'md:sticky md:top-0 md:h-screen md:z-auto md:translate-x-0 md:shadow-none',
          open ? 'md:w-64' : 'md:w-16',
        ].join(' ')}
      >
        <div className="h-16 flex items-center px-4 border-b border-gray-100 overflow-hidden">
          <div className="w-9 h-9 rounded-lg bg-black text-white flex items-center justify-center flex-shrink-0">
            <IconNfc width={19} height={19} />
          </div>
          <div className={`ml-2 leading-tight overflow-hidden min-w-0 ${!open ? 'md:hidden' : ''}`}>
            <p className="app-title text-sm text-gray-900 truncate">Master NFC</p>
            <p className="text-[10px] italic text-gray-400 truncate">Vacation rental tags</p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden ml-auto flex-shrink-0 p-2.5 w-11 h-11 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>

        <nav className="flex-1 py-3">
          {TOP_MENU.map((item) => <MenuButton key={item.id} {...item} />)}
        </nav>

        {open && (
          <p className="text-[10px] text-gray-400 text-center pb-1">Version {APP_VERSION}</p>
        )}
        <div className="border-t border-gray-100 py-2">
          <StaticMenuLabel label="Settings" Icon={IconSettings} />
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-3">
          <button
            onClick={handleMenuToggle}
            className="p-2.5 w-11 h-11 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Toggle menu"
          >
            <IconMenu width={20} height={20} />
          </button>

          <div className="leading-tight min-w-0">
            <h1 className="app-title text-xl text-gray-900 truncate">Master NFC</h1>
            <p className="text-[11px] italic text-gray-400 truncate">Vacation rental tags</p>
          </div>

          <span className="text-xs font-semibold uppercase tracking-wide bg-black text-white px-3 py-1 rounded-full flex-shrink-0">
            Beta
          </span>

          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            <span className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-sm font-medium text-gray-700">Local</span>
              <span className="text-[11px] text-gray-400">No login yet</span>
            </span>
            <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0 border border-gray-300 flex items-center justify-center">
              <IconUser width={18} height={18} className="text-gray-500" />
            </div>
          </div>
        </header>

        <main className="flex-1 bg-white overflow-auto">{children}</main>
      </div>
    </div>
  )
}
