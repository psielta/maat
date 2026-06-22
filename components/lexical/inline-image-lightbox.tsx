"use client"

import * as React from "react"
import { X } from "lucide-react"

export function InlineImageLightboxOverlay({
  onClose,
  src,
  alt,
}: {
  onClose: () => void
  src: string
  alt: string
}) {
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return

      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      onClose()
    }

    document.addEventListener("keydown", onKeyDown, true)
    return () => document.removeEventListener("keydown", onKeyDown, true)
  }, [onClose])

  function handleClose(event: React.MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    onClose()
  }

  return (
    <div
      data-inline-image-lightbox=""
      className="absolute inset-0 z-[200] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Imagem ampliada"
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        handleClose(event)
      }}
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={handleClose}
        className="absolute right-4 top-4 z-[201] flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md transition-opacity hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-full max-w-full rounded-md object-contain"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  )
}