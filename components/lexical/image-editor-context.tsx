"use client"

import * as React from "react"

export type ImageUploadContext = {
  boardId: string
  cardId: string
  target: "card-description" | "comment"
}

type ImageEditorContextValue = {
  uploadContext: ImageUploadContext
  previewUrls: Map<string, string>
  registerPreviewUrl: (attachmentId: string, url: string) => void
  insertImageFile: (file: File) => Promise<void>
  isUploading: boolean
}

const ImageEditorContext = React.createContext<ImageEditorContextValue | null>(
  null
)

export function ImageEditorProvider({
  value,
  children,
}: {
  value: ImageEditorContextValue
  children: React.ReactNode
}) {
  return (
    <ImageEditorContext.Provider value={value}>
      {children}
    </ImageEditorContext.Provider>
  )
}

export function useImageEditorContext() {
  const context = React.useContext(ImageEditorContext)
  if (!context) {
    throw new Error("useImageEditorContext must be used within ImageEditorProvider")
  }
  return context
}

export function useOptionalImageEditorContext() {
  return React.useContext(ImageEditorContext)
}