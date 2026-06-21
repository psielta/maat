"use client"

import * as React from "react"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import {
  COMMAND_PRIORITY_HIGH,
  PASTE_COMMAND,
} from "lexical"

import { useImageEditorContext } from "@/components/lexical/image-editor-context"

export function ImagesPlugin() {
  const [editor] = useLexicalComposerContext()
  const { insertImageFile } = useImageEditorContext()
  const [isDragging, setIsDragging] = React.useState(false)
  const uploadQueueRef = React.useRef(Promise.resolve())

  const queueImageFile = React.useCallback(
    (file: File) => {
      uploadQueueRef.current = uploadQueueRef.current.then(() =>
        insertImageFile(file)
      )
    },
    [insertImageFile]
  )

  React.useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        const clipboardEvent = event as ClipboardEvent
        const items = clipboardEvent.clipboardData?.items
        if (!items) return false

        const imageFiles: File[] = []
        for (const item of items) {
          if (item.kind === "file" && item.type.startsWith("image/")) {
            const file = item.getAsFile()
            if (file) imageFiles.push(file)
          }
        }

        if (imageFiles.length === 0) return false

        clipboardEvent.preventDefault()
        imageFiles.forEach((file) => queueImageFile(file))
        return true
      },
      COMMAND_PRIORITY_HIGH
    )
  }, [editor, queueImageFile])

  React.useEffect(() => {
    const root = editor.getRootElement()
    if (!root) return

    function onDragOver(event: DragEvent) {
      const hasImage = Array.from(event.dataTransfer?.items ?? []).some(
        (item) => item.kind === "file" && item.type.startsWith("image/")
      )
      if (!hasImage) return
      event.preventDefault()
      event.stopPropagation()
      setIsDragging(true)
    }

    function onDragLeave(event: DragEvent) {
      event.preventDefault()
      setIsDragging(false)
    }

    function onDrop(event: DragEvent) {
      const files = Array.from(event.dataTransfer?.files ?? []).filter((file) =>
        file.type.startsWith("image/")
      )
      if (files.length === 0) return

      event.preventDefault()
      event.stopPropagation()
      setIsDragging(false)
      files.forEach((file) => queueImageFile(file))
    }

    root.addEventListener("dragover", onDragOver)
    root.addEventListener("dragleave", onDragLeave)
    root.addEventListener("drop", onDrop)

    return () => {
      root.removeEventListener("dragover", onDragOver)
      root.removeEventListener("dragleave", onDragLeave)
      root.removeEventListener("drop", onDrop)
    }
  }, [editor, queueImageFile])

  return isDragging ? (
    <div className="pointer-events-none absolute inset-0 z-10 rounded-md ring-2 ring-primary ring-offset-2" />
  ) : null
}