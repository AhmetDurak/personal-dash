import mermaid from 'mermaid'

let initializedDark: boolean | null = null
let counter = 0

function ensureInit(dark: boolean) {
  if (initializedDark === dark) return
  mermaid.initialize({
    startOnLoad: false,
    theme: dark ? 'dark' : 'default',
    securityLevel: 'strict',
    fontFamily: 'inherit',
  })
  initializedDark = dark
}

export async function renderMermaid(source: string, dark: boolean): Promise<string> {
  ensureInit(dark)
  const id = `mermaid-${Date.now()}-${counter++}`
  const { svg } = await mermaid.render(id, source)
  return svg
}
