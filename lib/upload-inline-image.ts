import type { AttachmentResponse } from "@/lib/attachment-utils"
import { messages } from "@/lib/messages/pt-br"
import { putFile } from "@/lib/upload-file"
import {
  isAllowedInlineImageMime,
  MAX_INLINE_IMAGE_SIZE_BYTES,
} from "@/lib/validations/board"

export function validateInlineImageFile(file: File) {
  if (file.size <= 0) {
    return messages.validation.imageEmpty
  }

  const mimeType = file.type || "application/octet-stream"
  if (!isAllowedInlineImageMime(mimeType)) {
    return messages.validation.imagesSupported
  }

  if (file.size > MAX_INLINE_IMAGE_SIZE_BYTES) {
    return messages.validation.imagesMaxSize
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
        messages.validation.imageUploadStartFailed
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
    throw new Error(messages.validation.imageUploadFinalizeFailed)
  }

  return (await completeResponse.json()) as AttachmentResponse
}