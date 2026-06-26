import type { ReactNode } from 'react'

const URL_RE = /https?:\/\/[^\s<>"']+/g

export function Linkified({ text, className }: { text: string; className?: string }): ReactNode {
  const parts: ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  URL_RE.lastIndex = 0
  while ((match = URL_RE.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    parts.push(
      <a
        key={match.index}
        href={match[0]}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="text-xero-green underline underline-offset-2 hover:opacity-80 break-all"
      >
        {match[0]}
      </a>
    )
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <span className={className}>{parts}</span>
}
