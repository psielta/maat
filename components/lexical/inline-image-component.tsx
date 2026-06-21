"use client"

import * as React from "react"

import { useOptionalImageEditorContext } from "@/components/lexical/image-editor-context"
import {
  buildInlineImageDownloadUrl,
  buildInlineImagePreviewUrl,
} from "@/lib/inline-image-url"
import { cn } from "@/lib/utils"

export function InlineImageComponent({
  attachmentId,
  altText,
  width,
  height,
}: {
  attachmentId: string
  altText: string
  width?: number
  height?: number
}) {
  const context = useOptionalImageEditorContext()
  const [hasError, setHasError] = React.useState(false)

  const initialSrc = React.useMemo(() => {
    if (!context) return null

    const preview = context.previewUrls.get(attachmentId)
    if (preview) return preview

    const { boardId, cardId } = context.uploadContext
    return buildInlineImageDownloadUrl(boardId, cardId, attachmentId)
  }, [attachmentId, context])

  const fallbackSrc = React.useMemo(() => {
    if (!context) return null
    const { boardId, cardId } = context.uploadContext
    return buildInlineImagePreviewUrl(boardId, cardId, attachmentId)
  }, [attachmentId, context])

  const [currentSrc, setCurrentSrc] = React.useState(initialSrc)

  React.useEffect(() => {
    setCurrentSrc(initialSrc)
    setHasError(false)
  }, [initialSrc])

  if (!context || !currentSrc) {
    return (
      <span className="my-2 block h-24 animate-pulse rounded-md bg-muted" />
    )
  }

  return (
    <span className="my-2 block">
      {hasError ? (
        <span className="flex h-24 items-center justify-center rounded-md border border-dashed bg-muted text-xs text-muted-foreground">
          Image unavailable
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentSrc}
          alt={altText || "Inline image"}
          width={width}
          height={height}
          className={cn("max-h-[480px] max-w-full rounded-md border object-contain")}
          onError={() => {
            if (fallbackSrc && currentSrc !== fallbackSrc) {
              setCurrentSrc(fallbackSrc)
              return
            }
            setHasError(true)
          }}
        />
      )}
    </span>
  )
}