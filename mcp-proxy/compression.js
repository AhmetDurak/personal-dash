export function compressResponse(data, type) {
  if (!data) return data

  const normalized = normalize(data)

  if (normalized.length > 5000) {
    return summarize(normalized)
  }

  if (type === "filesystem") {
    return compressFile(normalized)
  }

  if (type === "github") {
    return compressGit(data)
  }

  return data
}

function normalize(data) {
  if (typeof data === "string") return data

  if (typeof data === "object") {
    return JSON.stringify(data, null, 2)
  }

  return String(data)
}

function summarize(data) {
  const text = normalize(data)

  return {
    summary: "AUTO-SUMMARY (truncated)",
    preview: text.slice(0, 1000),
    truncated: true,
    originalSize: text.length
  }
}

function compressFile(data) {
  const text = normalize(data)
  const lines = text.split("\n")

  return lines
    .filter(l =>
      l.includes("test") ||
      l.includes("error") ||
      l.includes("function") ||
      l.includes("export")
    )
    .slice(0, 50)
    .join("\n")
}

function compressGit(data) {
  return {
    summary: "git response compressed",
    preview: Array.isArray(data) ? data.slice(0, 10) : data,
    truncated: true
  }
}