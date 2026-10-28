import { Component, type ReactNode } from 'react'

const RELOAD_FLAG = 'route-error-reloaded'

// Catches a page that fails to load or render (seen on older embedded browsers like
// the Kindle Scribe after client-side navigation). First failure on a URL: reload once,
// which is what fixes it by hand. If it fails again: show the error instead of a blank page.
export class RouteErrorBoundary extends Component<{ resetKey: string; children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('[route] page failed:', error)
    let reloadedFor: string | null = null
    try { reloadedFor = sessionStorage.getItem(RELOAD_FLAG) } catch { /* storage unavailable */ }
    if (reloadedFor !== location.href) {
      try { sessionStorage.setItem(RELOAD_FLAG, location.href) } catch { /* storage unavailable */ }
      location.reload()
    }
  }

  componentDidUpdate(prev: { resetKey: string }) {
    // Navigating away from a failed page clears the error.
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">This page failed to load.</p>
        <p className="text-xs text-gray-500 dark:text-slate-400 break-all max-w-md">{error.message}</p>
        <button onClick={() => location.reload()}
          className="text-sm px-4 min-h-[44px] rounded-lg bg-xero-green text-white font-medium">Reload</button>
      </div>
    )
  }
}
