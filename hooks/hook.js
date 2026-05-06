import { readFileSync, statSync } from 'fs'
import { logToolUsage } from './telemetry.js'
import { updateLearning } from './learning.js'
import { compressResponse } from './compression.js'

const LARGE_FILE_BYTES = 50_000
const LARGE_OUTPUT_BYTES = 20_000
const DEFAULT_LIMIT = 200

function readStdin() {
  try { return JSON.parse(readFileSync(0, 'utf-8')) } catch { process.exit(0) }
}

const { hook_event_name, tool_name, tool_input, tool_response } = readStdin()

if (hook_event_name === 'PreToolUse' && tool_name === 'Read') {
  const filePath = tool_input?.file_path
  if (filePath && tool_input?.limit == null) {
    let size = 0
    try { size = statSync(filePath).size } catch { process.exit(0) }
    if (size > LARGE_FILE_BYTES) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          updatedInput: { ...tool_input, limit: DEFAULT_LIMIT },
        },
      }))
    }
  }
  process.exit(0)
}

if (hook_event_name === 'PostToolUse') {
  const responseStr = JSON.stringify(tool_response ?? '')
  const size = responseStr.length
  try {
    logToolUsage({ tool: tool_name, query: JSON.stringify(tool_input ?? '').slice(0, 120), duration: 0, size, status: 'completed' })
    updateLearning({ tool: tool_name, success: true })
  } catch {}
  if (size > LARGE_OUTPUT_BYTES) {
    const compressed = compressResponse(tool_response, tool_name)
    const preview = (typeof compressed === 'string' ? compressed : JSON.stringify(compressed, null, 2)).slice(0, 2000)
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `[proxy] Output was ${Math.round(size / 1024)}KB — compressed view:\n${preview}`,
      },
    }))
  }
  process.exit(0)
}

process.exit(0)
