import type { AttachmentResponse } from "@/lib/attachment-utils"
import { MAX_ATTACHMENT_SIZE_BYTES } from "@/lib/validations/board"

export type AttachmentModel = AttachmentResponse

function putFile(
  uploadUrl: string,
  file: File,
  onProgress?: (progress: number) => void
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open("PUT", uploadUrl)
    request.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream"
    )

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) {
        return
      }

      onProgress(Math.round((event.loaded / event.total) * 100))
    }

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve()
        return
      }

      reject(new Error("Upload failed."))
    }

    request.onerror = () => reject(new Error("Upload failed."))
    request.send(file)
  })
}

export function validateAttachmentFile(file: File) {
  if (file.size <= 0) {
    return "The selected file is empty."
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return "Files must be 120MB or smaller."
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
    throw new Error("Could not start the upload.")
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
    throw new Error("Could not finalize the upload.")
  }

  return (await completeResponse.json()) as AttachmentModel
}