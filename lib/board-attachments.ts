import { db } from "@/lib/db"

export const attachmentSelect = {
  id: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
  uploadedById: true,
} as const

export async function getBoardCardForAttachment(
  boardId: string,
  cardId: string
) {
  return db.boardCard.findFirst({
    where: {
      id: cardId,
      list: { boardId },
    },
    select: { id: true },
  })
}

export async function getBoardAttachment(
  boardId: string,
  cardId: string,
  attachmentId: string
) {
  return db.boardCardAttachment.findFirst({
    where: {
      id: attachmentId,
      cardId,
      card: { list: { boardId } },
    },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      storageKey: true,
      scope: true,
      status: true,
      createdAt: true,
      uploadedById: true,
      commentId: true,
      comment: {
        select: {
          authorId: true,
        },
      },
    },
  })
}