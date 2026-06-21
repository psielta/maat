export type AttachmentRecord = {
  id: string
  fileName: string
  mimeType: string
  sizeBytes: bigint
  createdAt: Date
  uploadedById: string
}

export type AttachmentResponse = {
  id: string
  fileName: string
  mimeType: string
  sizeBytes: string
  createdAt: string
  uploadedById: string
}

export function serializeAttachment(
  attachment: AttachmentRecord
): AttachmentResponse {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes.toString(),
    createdAt: attachment.createdAt.toISOString(),
    uploadedById: attachment.uploadedById,
  }
}

export function formatFileSize(sizeBytes: string | number | bigint) {
  const value = Number(sizeBytes)

  if (!Number.isFinite(value) || value <= 0) {
    return "0 B"
  }

  const units = ["B", "KB", "MB", "GB"]
  let size = value
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`
}