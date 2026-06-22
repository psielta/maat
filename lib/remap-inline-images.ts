type LexicalTreeNode = {
  type?: string
  attachmentId?: string
  children?: LexicalTreeNode[]
}

export function remapInlineImageIds(
  content: string | null | undefined,
  idMap: Map<string, string>
) {
  const trimmed = (content ?? "").trim()
  if (!trimmed.startsWith("{") || idMap.size === 0) {
    return content ?? null
  }

  let parsed: { root?: LexicalTreeNode }
  try {
    parsed = JSON.parse(trimmed) as { root?: LexicalTreeNode }
  } catch {
    return content ?? null
  }

  const walk = (node: LexicalTreeNode | null | undefined) => {
    if (!node || typeof node !== "object") {
      return
    }

    if (node.type === "image" && typeof node.attachmentId === "string") {
      const nextId = idMap.get(node.attachmentId)
      if (nextId) {
        node.attachmentId = nextId
      }
    }

    node.children?.forEach(walk)
  }

  walk(parsed.root ?? (parsed as LexicalTreeNode))

  return JSON.stringify(parsed)
}