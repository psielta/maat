import {
  $applyNodeReplacement,
  TextNode,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedTextNode,
  type Spread,
} from "lexical"

export type SerializedMentionNode = Spread<
  {
    userId: string
    displayName: string
    type: "mention"
    version: 1
  },
  SerializedTextNode
>

export class MentionNode extends TextNode {
  __userId: string
  __displayName: string

  static getType(): string {
    return "mention"
  }

  static clone(node: MentionNode): MentionNode {
    return new MentionNode(
      node.__userId,
      node.__displayName,
      node.__text,
      node.__key
    )
  }

  constructor(
    userId: string,
    displayName: string,
    text?: string,
    key?: NodeKey
  ) {
    super(text ?? `@${displayName}`, key)
    this.__userId = userId
    this.__displayName = displayName
  }

  getUserId() {
    return this.__userId
  }

  getDisplayName() {
    return this.__displayName
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config)
    dom.className = config.theme.mention ?? "mention"
    dom.dataset.mentionUserId = this.__userId
    return dom
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    const updated = super.updateDOM(prevNode, dom, config)
    dom.className = config.theme.mention ?? "mention"
    dom.dataset.mentionUserId = this.__userId
    return updated
  }

  exportJSON(): SerializedMentionNode {
    return {
      ...super.exportJSON(),
      type: "mention",
      userId: this.__userId,
      displayName: this.__displayName,
      version: 1,
    }
  }

  static importJSON(serializedNode: SerializedMentionNode): MentionNode {
    return $createMentionNode(
      serializedNode.userId,
      serializedNode.displayName
    ).updateFromJSON(serializedNode)
  }

  isTextEntity(): true {
    return true
  }

  canInsertTextBefore(): boolean {
    return false
  }

  canInsertTextAfter(): boolean {
    return false
  }
}

export function $createMentionNode(
  userId: string,
  displayName: string
): MentionNode {
  return $applyNodeReplacement(new MentionNode(userId, displayName))
}

export function $isMentionNode(
  node: LexicalNode | null | undefined
): node is MentionNode {
  return node instanceof MentionNode
}