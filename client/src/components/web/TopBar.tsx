import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useDarkMode } from '../../hooks/useDarkMode'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import type { Lang } from '../../hooks/useLanguage'
import { NotificationsPanel } from './NotificationsPanel'
import { ConfirmDialog } from './ConfirmDialog'
import { resetTour } from './AppTour'

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
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!userMenuOpen) return
    function handleClick(e: MouseEvent) {
      if (!userMenuRef.current?.contains(e.target as Node)) {
        setUserMenuOpen(false)
        setSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [userMenuOpen])

  const APPS = [
    { to: () => '/today',                                                               label: t.planner,    isActive: (p: string) => p.startsWith('/today') },
    { to: () => '/finance/overview',                                                    label: t.finance,    isActive: (p: string) => p.startsWith('/finance') },
    { to: () => localStorage.getItem('life:lastPath') ?? '/life/log',                  label: t.life,       isActive: (p: string) => p.startsWith('/life') },
    { to: () => localStorage.getItem('learn:lastPath') ?? '/learn/notes',              label: t.learn,      isActive: (p: string) => p.startsWith('/learn') },
    { to: () => '/news',                                                                label: t.news,       isActive: (p: string) => p.startsWith('/news') },
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
    <div className="h-10 bg-gray-950/95 backdrop-blur-md flex items-center px-3 md:px-4 gap-1 flex-shrink-0 border-b border-white/5 w-full sticky top-0 z-30">
      {/* Brand */}
      <div className="flex items-center gap-2 pr-3 md:pr-4 mr-1 md:mr-2 border-r border-gray-800 flex-shrink-0">
        <Logo />
        <span className="hidden sm:inline text-sm font-semibold text-white tracking-tight">Personal Dashboard</span>
      </div>

      {/* App switcher — scrollable on mobile */}
      <div className="flex-1 flex overflow-x-auto min-w-0" style={{ scrollbarWidth: 'none' }}>
        {APPS.map(app => {
          const active = app.isActive(pathname)
          const href   = app.to()
          return (
            <Link
              key={href}
              to={href}
              className={`flex-shrink-0 px-2.5 md:px-3 py-1 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-white/10 text-white'
                  : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              {app.label}
            </Link>
          )
        })}
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-1">
        <NotificationsPanel />

        {/* User menu */}
        {user && (
          <div ref={userMenuRef} className="relative flex items-center pl-2 ml-1 border-l border-gray-800">
            <button
              onClick={() => setUserMenuOpen(o => !o)}
              className="flex items-center gap-1.5 md:gap-2 text-gray-400 hover:text-gray-200 transition-colors"
            >
              {user.picture
                ? <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full flex-shrink-0" />
                : <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] text-gray-300 font-bold flex-shrink-0">{user.name[0]}</div>
              }
              <span className="hidden md:inline text-xs max-w-[100px] truncate">{user.name}</span>
              <svg className="w-3 h-3 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl py-2 min-w-[200px] z-50">

                {settingsOpen ? (
                  /* ── Settings sub-panel ── */
                  <>
                    <button
                      onClick={() => setSettingsOpen(false)}
                      className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1.5 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back
                    </button>

                    <div className="border-t border-gray-800 my-1" />

                    {/* Language */}
                    <div className="px-3 py-2">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">{t.language}</p>
                      <div className="flex gap-1">
                        {LANG_OPTIONS.map(o => (
                          <button
                            key={o.value}
                            onClick={() => setLang(o.value)}
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors flex-1 ${
                              lang === o.value ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/10'
                            }`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-gray-800 my-1" />

                    {/* Dark / Light toggle */}
                    <button
                      onClick={toggle}
                      className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <span>{dark ? '☀️' : '🌙'}</span>
                        <span>{dark ? t.light : t.dark}</span>
                      </span>
                      <span className={`w-8 h-4 rounded-full relative flex-shrink-0 transition-colors ${dark ? 'bg-blue-500' : 'bg-gray-600'}`}>
                        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${dark ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </span>
                    </button>

                    <div className="border-t border-gray-800 my-1" />

                    {/* Replay tour */}
                    <button
                      onClick={() => { resetTour(); window.location.reload() }}
                      className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors flex items-center gap-2"
                    >
                      <span>🗺</span>
                      <span>Replay intro tour</span>
                    </button>
                  </>
                ) : (
                  /* ── Main menu ── */
                  <>
                    {/* Settings entry */}
                    <button
                      onClick={() => setSettingsOpen(true)}
                      className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <span>⚙</span>
                        <span>Settings</span>
                      </span>
                      <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    <div className="border-t border-gray-800 my-1" />

                    {/* Mobile token */}
                    <button
                      onClick={copyMobileToken}
                      className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors flex items-center gap-2"
                    >
                      <span>{tokenCopied ? '✓' : '📱'}</span>
                      <span>{tokenCopied ? 'Copied!' : 'Copy mobile token'}</span>
                    </button>

                    <div className="border-t border-gray-800 my-1" />

                    {/* Sign out */}
                    <button
                      onClick={() => { setUserMenuOpen(false); setShowLogoutConfirm(true) }}
                      className="w-full text-left px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors flex items-center gap-2"
                    >
                      <span>↪</span>
                      <span>{t.signOut}</span>
                    </button>
                  </>
                )}
              </div>
            )}
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
