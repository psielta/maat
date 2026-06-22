"use client"

import * as React from "react"
import { Expand } from "lucide-react"

import { useOptionalInlineImageLightbox } from "@/components/lexical/inline-image-lightbox-context"
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
  const lightbox = useOptionalInlineImageLightbox()
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

  if (hasError) {
    return (
      <span className="my-2 block">
        <span className="flex h-24 items-center justify-center rounded-md border border-dashed bg-muted text-xs text-muted-foreground">
          Image unavailable
        </span>
      </span>
    )
  }

  return (
    <span className="my-2 block">
      <button
        type="button"
        aria-label="Ampliar imagem"
        disabled={!lightbox}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          event.stopPropagation()
          lightbox?.openLightbox({
            src: currentSrc,
            alt: altText || "Imagem inline",
          })
        }}
        className={cn(
          "group relative inline-block max-w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          lightbox ? "cursor-zoom-in" : "cursor-default"
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentSrc}
          alt={altText || "Imagem inline"}
          width={width}
          height={height}
          className={cn(
            "max-h-[480px] max-w-full rounded-md border object-contain transition-opacity group-hover:opacity-90"
          )}
          onError={() => {
            if (fallbackSrc && currentSrc !== fallbackSrc) {
              setCurrentSrc(fallbackSrc)
              return
            }
            setHasError(true)
          }}
        />
        {lightbox && (
          <span className="pointer-events-none absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/85 text-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
            <Expand className="h-3.5 w-3.5" />
          </span>
        )}
      </button>
    </span>
  )
}