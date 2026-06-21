import type { AttachmentResponse } from "@/lib/attachment-utils"
import { putFile } from "@/lib/upload-file"
import {
  isAllowedInlineImageMime,
  MAX_INLINE_IMAGE_SIZE_BYTES,
} from "@/lib/validations/board"

export function validateInlineImageFile(file: File) {
  if (file.size <= 0) {
    return "The selected image is empty."
  }

  const mimeType = file.type || "application/octet-stream"
  if (!isAllowedInlineImageMime(mimeType)) {
    return "Only JPEG, PNG, WebP, and GIF images are supported."
  }

  if (file.size > MAX_INLINE_IMAGE_SIZE_BYTES) {
    return "Images must be 10MB or smaller."
  }

  return null
}

export async function uploadInlineImage({
  boardId,
  cardId,
  file,
  onProgress,
}: {
  boardId: string
  cardId: string
  file: File
  onProgress?: (progress: number) => void
}) {
  const validationError = validateInlineImageFile(file)

  if (validationError) {
    throw new Error(validationError)
  }

  const mimeType = file.type || "application/octet-stream"

  const presignResponse = await fetch(
    `/api/boards/${boardId}/cards/${cardId}/attachments/presign`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name || "image.png",
        mimeType,
        sizeBytes: file.size,
        target: "inline",
      }),
    }
  )

  if (!presignResponse.ok) {
    const payload = await presignResponse.json().catch(() => null)
    throw new Error(
      (payload as { message?: string } | null)?.message ??
        "Could not start the image upload."
    )
  }

  const presign = (await presignResponse.json()) as {
    attachmentId: string
    uploadUrl: string
  }

  await putFile(presign.uploadUrl, file, onProgress)

  const completeResponse = await fetch(
    `/api/boards/${boardId}/cards/${cardId}/attachments/${presign.attachmentId}/complete`,
    { method: "POST" }
  )

  if (!completeResponse.ok) {
    throw new Error("Could not finalize the image upload.")
  }

  return (await completeResponse.json()) as AttachmentResponse
}