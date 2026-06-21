"use client"

import * as React from "react"

import { InlineImageLightboxOverlay } from "@/components/lexical/inline-image-lightbox"
import { setInlineImageLightboxOpen } from "@/lib/inline-image-lightbox-state"

type LightboxPayload = {
  src: string
  alt: string
}

type InlineImageLightboxContextValue = {
  lightbox: LightboxPayload | null
  openLightbox: (payload: LightboxPayload) => void
  closeLightbox: () => void
}

const InlineImageLightboxContext =
  React.createContext<InlineImageLightboxContextValue | null>(null)

export function InlineImageLightboxProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [lightbox, setLightbox] = React.useState<LightboxPayload | null>(null)

  React.useLayoutEffect(() => {
    setInlineImageLightboxOpen(lightbox !== null)
    return () => setInlineImageLightboxOpen(false)
  }, [lightbox])

  const openLightbox = React.useCallback((payload: LightboxPayload) => {
    setLightbox(payload)
  }, [])

  const closeLightbox = React.useCallback(() => {
    setLightbox(null)
  }, [])

  const value = React.useMemo(
    () => ({
      lightbox,
      openLightbox,
      closeLightbox,
    }),
    [lightbox, openLightbox, closeLightbox]
  )

  return (
    <InlineImageLightboxContext.Provider value={value}>
      {children}
    </InlineImageLightboxContext.Provider>
  )
}

export function InlineImageLightboxHost() {
  const { lightbox, closeLightbox } = useInlineImageLightbox()

  if (!lightbox) {
    return null
  }

  return (
    <InlineImageLightboxOverlay
      src={lightbox.src}
      alt={lightbox.alt}
      onClose={closeLightbox}
    />
  )
}

export function useInlineImageLightbox() {
  const context = React.useContext(InlineImageLightboxContext)
  if (!context) {
    throw new Error(
      "useInlineImageLightbox must be used within InlineImageLightboxProvider"
    )
  }
  return context
}

export function useOptionalInlineImageLightbox() {
  return React.useContext(InlineImageLightboxContext)
}