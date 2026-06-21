import { db } from "@/lib/db"
import { extractInlineImageIds } from "@/lib/lexical-inline-images"
import { MAX_INLINE_IMAGES_PER_CONTENT } from "@/lib/validations/board"

export class InlineImageValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "InlineImageValidationError"
  }
}

export async function promoteInlineImages({
  cardId,
  userId,
  content,
  commentId,
}: {
  cardId: string
  userId: string
  content: string | null | undefined
  commentId?: string
}) {
  const inlineImageIds = extractInlineImageIds(content ?? "")

  if (inlineImageIds.length > MAX_INLINE_IMAGES_PER_CONTENT) {
    throw new InlineImageValidationError("Too many inline images in this content.")
  }

  if (inlineImageIds.length === 0) {
    return
  }

  const attachments = await db.boardCardAttachment.findMany({
    where: {
      id: { in: inlineImageIds },
      cardId,
      scope: "INLINE",
    },
    select: {
      id: true,
      status: true,
      uploadedById: true,
    },
  })

  if (attachments.length !== inlineImageIds.length) {
    throw new InlineImageValidationError(
      "One or more inline images are invalid."
    )
  }

  const pendingIds: string[] = []

  for (const attachment of attachments) {
    if (attachment.status === "READY") {
      continue
    }

    if (attachment.status !== "PENDING" || attachment.uploadedById !== userId) {
      throw new InlineImageValidationError(
        "One or more inline images are invalid."
      )
    }

    pendingIds.push(attachment.id)
  }

  if (pendingIds.length === 0) {
    return
  }

  await db.boardCardAttachment.updateMany({
    where: {
      id: { in: pendingIds },
      cardId,
      uploadedById: userId,
      scope: "INLINE",
      status: "PENDING",
    },
    data: {
      status: "READY",
      ...(commentId ? { commentId } : {}),
    },
  })
}

export async function cleanupOrphanInlineImages({
  cardId,
  userId,
  referencedIds,
}: {
  cardId: string
  userId: string
  referencedIds: string[]
}) {
  await db.boardCardAttachment.deleteMany({
    where: {
      cardId,
      uploadedById: userId,
      scope: "INLINE",
      status: "PENDING",
      ...(referencedIds.length > 0 ? { id: { notIn: referencedIds } } : {}),
    },
  })
}