const TOOL_RULES = {
  filesystem: ["file", "read", "write", "test", "code", "folder"],
  github: ["repo", "pr", "commit", "branch", "issue"]
}

export function filterTools(query) {
  query = query.toLowerCase()

  const allowed = []

  for (const [tool, keywords] of Object.entries(TOOL_RULES)) {
    if (keywords.some(k => query.includes(k))) {
      allowed.push(tool)
    }
  }

  if (allowed.length === 0) {
    allowed.push("filesystem")
  }

  return allowed
}