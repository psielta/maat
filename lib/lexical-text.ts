// Extracts a plain-text representation from a serialized Lexical editor state.
// Falls back to the raw string for legacy/plain-text values. Safe to use on the
// server (snippets) and client (card previews).
const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "quote",
  "listitem",
  "list",
])

export function lexicalToPlainText(value: string | null | undefined): string {
  if (!value) return ""
  const trimmed = value.trim()
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return trimmed

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return trimmed
  }

  const parts: string[] = []
  const walk = (node: any) => {
    if (!node || typeof node !== "object") return
    if (typeof node.text === "string") {
      parts.push(node.text)
      return
    }
    if (Array.isArray(node.children)) {
      node.children.forEach(walk)
    }
    if (typeof node.type === "string" && BLOCK_TYPES.has(node.type)) {
      parts.push(" ")
    }
  }

  const root = (parsed as { root?: unknown }).root ?? parsed
  walk(root)

  return parts.join("").replace(/\s+/g, " ").trim()
}
