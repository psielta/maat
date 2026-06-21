import {
  $applyNodeReplacement,
  DecoratorNode,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical"
import { createElement, type JSX } from "react"

import { InlineImageComponent } from "@/components/lexical/inline-image-component"

export type SerializedImageNode = Spread<
  {
    attachmentId: string
    altText: string
    width?: number
    height?: number
    type: "image"
    version: 1
  },
  SerializedLexicalNode
>

export class ImageNode extends DecoratorNode<JSX.Element> {
  __attachmentId: string
  __altText: string
  __width?: number
  __height?: number

  static getType(): string {
    return "image"
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__attachmentId,
      node.__altText,
      node.__width,
      node.__height,
      node.__key
    )
  }

  constructor(
    attachmentId: string,
    altText?: string,
    width?: number,
    height?: number,
    key?: NodeKey
  ) {
    super(key)
    this.__attachmentId = attachmentId
    this.__altText = altText ?? ""
    this.__width = width
    this.__height = height
  }

  getAttachmentId() {
    return this.__attachmentId
  }

  getAltText() {
    return this.__altText
  }

  setAltText(altText: string) {
    const writable = this.getWritable()
    writable.__altText = altText
  }

  createDOM(): HTMLElement {
    const span = document.createElement("span")
    span.className = "inline-image-container"
    return span
  }

  updateDOM(): false {
    return false
  }

  isInline(): false {
    return false
  }

  decorate(): JSX.Element {
    return createElement(InlineImageComponent, {
      attachmentId: this.__attachmentId,
      altText: this.__altText,
      width: this.__width,
      height: this.__height,
    })
  }

  exportJSON(): SerializedImageNode {
    return {
      attachmentId: this.__attachmentId,
      altText: this.__altText,
      width: this.__width,
      height: this.__height,
      type: "image",
      version: 1,
    }
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    return $createImageNode(
      serializedNode.attachmentId,
      serializedNode.altText,
      serializedNode.width,
      serializedNode.height
    )
  }
}

export function $createImageNode(
  attachmentId: string,
  altText?: string,
  width?: number,
  height?: number
): ImageNode {
  return $applyNodeReplacement(
    new ImageNode(attachmentId, altText, width, height)
  )
}

export function $isImageNode(
  node: LexicalNode | null | undefined
): node is ImageNode {
  return node instanceof ImageNode
}