type LexicalTreeNode = {
  type?: string
  attachmentId?: string
  children?: LexicalTreeNode[]
}

export function extractInlineImageIds(content: string): string[] {
  const trimmed = content.trim()
  if (!trimmed.startsWith("{")) {
    return []
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return []
  }

  const ids = new Set<string>()

  const walk = (node: LexicalTreeNode | null | undefined) => {
    if (!node || typeof node !== "object") {
      return
    }

    if (node.type === "image" && typeof node.attachmentId === "string") {
      ids.add(node.attachmentId)
    }

    node.children?.forEach(walk)
  }

  const root = (parsed as { root?: LexicalTreeNode }).root ?? parsed
  walk(root as LexicalTreeNode)

  return [...ids]
}