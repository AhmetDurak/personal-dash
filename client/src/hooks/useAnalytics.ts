import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

function getSessionId(): string {
  let id = sessionStorage.getItem('_aid')
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem('_aid', id) }
  return id
}

function detectDevice(): string {
  const ua = navigator.userAgent
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
  if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) return 'mobile'
  return 'desktop'
}

function detectBrowser(): string {
  const ua = navigator.userAgent
  if (ua.includes('Edg/'))    return 'Edge'
  if (ua.includes('Chrome/')) return 'Chrome'
  if (ua.includes('Firefox/'))return 'Firefox'
  if (ua.includes('Safari/')) return 'Safari'
  if (ua.includes('OPR/'))    return 'Opera'
  return 'Other'
}

function detectOS(): string {
  const ua = navigator.userAgent
  if (/Android/i.test(ua))          return 'Android'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS'
  if (/Windows/i.test(ua))          return 'Windows'
  if (/Mac OS X/i.test(ua))         return 'macOS'
  if (/Linux/i.test(ua))            return 'Linux'
  return 'Other'
}

function sendEvent(page: string, durationMs: number) {
  const payload = JSON.stringify({
    session_id:  getSessionId(),
    page,
    duration_ms: durationMs,
    device:      detectDevice(),
    browser:     detectBrowser(),
    os:          detectOS(),
  })
  // sendBeacon fires even during page unload
  navigator.sendBeacon('/api/analytics/event', new Blob([payload], { type: 'application/json' }))
}

export function useAnalytics() {
  const { pathname } = useLocation()
  const startRef = useRef(Date.now())

  useEffect(() => {
    startRef.current = Date.now()
    return () => {
      sendEvent(pathname, Date.now() - startRef.current)
    }
  }, [pathname])
}
