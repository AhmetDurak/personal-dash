export function compressResponse(data, type) {
  if (!data) return data
  const normalized = normalize(data)
  if (normalized.length > 5000) return summarize(normalized)
  if (type === 'filesystem' || type === 'Read') return compressFile(normalized)
  return data
}

function normalize(data) {
  if (typeof data === 'string') return data
  return JSON.stringify(data, null, 2)
}

function summarize(text) {
  return {
    summary: 'AUTO-SUMMARY (truncated)',
    preview: text.slice(0, 1000),
    truncated: true,
    originalSize: text.length,
  }
}

function compressFile(text) {
  return text.split('\n')
    .filter(l => /test|error|function|export|import|class|interface|type /.test(l))
    .slice(0, 50)
    .join('\n')
}
