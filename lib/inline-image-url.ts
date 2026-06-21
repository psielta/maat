export function buildInlineImageDownloadUrl(
  boardId: string,
  cardId: string,
  attachmentId: string
) {
  return `/api/boards/${boardId}/cards/${cardId}/attachments/${attachmentId}/download`
}

export function buildInlineImagePreviewUrl(
  boardId: string,
  cardId: string,
  attachmentId: string
) {
  return `/api/boards/${boardId}/cards/${cardId}/attachments/${attachmentId}/preview`
}