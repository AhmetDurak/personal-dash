import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useDarkMode } from '../../hooks/useDarkMode'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import type { Lang } from '../../hooks/useLanguage'
import { NotificationsPanel } from './NotificationsPanel'
import { ConfirmDialog } from './ConfirmDialog'

const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'de', label: 'DE' },
  { value: 'tr', label: 'TR' },
]

function Logo() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="1" y="1"  width="8" height="8" rx="1.5" fill="#13B5EA" />
      <rect x="11" y="1"  width="8" height="8" rx="1.5" fill="white" fillOpacity="0.22" />
      <rect x="1"  y="11" width="8" height="8" rx="1.5" fill="white" fillOpacity="0.22" />
      <rect x="11" y="11" width="8" height="8" rx="1.5" fill="white" fillOpacity="0.22" />
    </svg>
  )
}

export function TopBar() {
  const { pathname } = useLocation()
  const { dark, toggle } = useDarkMode()
  const { user, logout } = useAuth()
  const { lang, t, setLang } = useLanguage()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [tokenCopied, setTokenCopied] = useState(false)

  const APPS = [
    { to: () => '/finance/overview',                                                    label: t.finance,  isActive: (p: string) => p.startsWith('/finance') },
    { to: () => localStorage.getItem('notebook:lastPath') ?? '/notebook/notes',         label: t.notebook, isActive: (p: string) => p.startsWith('/notebook') },
    { to: () => '/log',                                                                 label: t.log,      isActive: (p: string) => p.startsWith('/log') },
    { to: () => '/meal',                                                                label: t.meal,     isActive: (p: string) => p.startsWith('/meal') },
    { to: () => '/sport',                                                               label: t.sport,    isActive: (p: string) => p.startsWith('/sport') },
    { to: () => '/news',                                                                label: t.news,     isActive: (p: string) => p.startsWith('/news') },
  ]

  async function copyMobileToken() {
    const res = await fetch('/auth/me/token')
    if (!res.ok) return
    const { token } = await res.json() as { token: string }
    await navigator.clipboard.writeText(token)
    setTokenCopied(true)
    setTimeout(() => setTokenCopied(false), 2000)
  }

  return (
    <>
    <div className="h-10 bg-gray-950 flex items-center px-3 md:px-4 gap-1 flex-shrink-0 border-b border-gray-800 w-full overflow-hidden">
      {/* Brand */}
      <div className="flex items-center gap-2 pr-3 md:pr-4 mr-1 md:mr-2 border-r border-gray-800 flex-shrink-0">
        <Logo />
        <span className="hidden sm:inline text-sm font-semibold text-white tracking-tight">Personal Dashboard</span>
      </div>

      {/* App switcher */}
      {APPS.map(app => {
        const active = app.isActive(pathname)
        const href   = app.to()
        return (
          <Link
            key={href}
            to={href}
            className={`px-2.5 md:px-3 py-1 rounded text-sm font-medium transition-colors whitespace-nowrap ${
              active
                ? 'bg-white/10 text-white'
                : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            {app.label}
          </Link>
        )
      })}

      {/* Right side */}
      <div className="ml-auto flex items-center gap-1">
        {/* Language switcher */}
        <div className="hidden sm:flex items-center gap-0.5 px-1 py-0.5 rounded bg-white/5">
          {LANG_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setLang(o.value)}
              className={`text-[11px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
                lang === o.value ? 'bg-white/20 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <NotificationsPanel />
        <button
          onClick={toggle}
          className="flex items-center gap-1 px-2 md:px-3 py-1 rounded text-sm text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors"
        >
          <span>{dark ? '☀️' : '🌙'}</span>
          <span className="hidden md:inline font-medium">{dark ? t.light : t.dark}</span>
        </button>
        {user && (
          <div className="flex items-center gap-1.5 md:gap-2 pl-2 ml-1 border-l border-gray-800">
            {user.picture
              ? <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full flex-shrink-0" />
              : <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-gray-300 font-bold flex-shrink-0">{user.name[0]}</div>
            }
            <span className="hidden md:inline text-xs text-gray-400 max-w-[100px] truncate">{user.name}</span>
            <button
              onClick={copyMobileToken}
              className="hidden sm:block text-xs text-gray-500 hover:text-gray-300 transition-colors px-1"
              title="Copy mobile access token"
            >
              {tokenCopied ? '✓' : '📱'}
            </button>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-1"
            >
              <span className="hidden sm:inline">{t.signOut}</span>
              <span className="sm:hidden">↪</span>
            </button>
          </div>
        )}
      </div>
    </div>
    {showLogoutConfirm && (
      <ConfirmDialog
        message="You will be signed out of your account."
        confirmLabel={t.signOut}
        onConfirm={logout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    )}
    </>
  )
}
