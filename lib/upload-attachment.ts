import type { AttachmentResponse } from "@/lib/attachment-utils"
import { messages } from "@/lib/messages/pt-br"
import { putFile } from "@/lib/upload-file"
import { MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/validations/board"

export type AttachmentModel = AttachmentResponse

export function validateAttachmentFile(file: File) {
  if (file.size <= 0) {
    return messages.validation.fileEmpty
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return messages.validation.filesMaxSize
  }

  return null
}

export async function uploadAttachment({
  boardId,
  cardId,
  file,
  target,
  onProgress,
}: {
  boardId: string
  cardId: string
  file: File
  target: "card" | "comment"
  onProgress?: (progress: number) => void
}) {
  const validationError = validateAttachmentFile(file)

  if (validationError) {
    throw new Error(validationError)
  }

  const presignResponse = await fetch(
    `/api/boards/${boardId}/cards/${cardId}/attachments/presign`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        target,
      }),
    }
  )

  if (!presignResponse.ok) {
    throw new Error(messages.validation.uploadStartFailed)
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
    throw new Error(messages.validation.uploadFinalizeFailed)
  }

  return (await completeResponse.json()) as AttachmentModel
}