import * as z from "zod"

import { getBoardAttachment } from "@/lib/board-attachments"
import { getBoardAccess, getCurrentUserId } from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import { db } from "@/lib/db"
import { deleteObject } from "@/lib/storage"

const routeContextSchema = z.object({
  params: z.object({
    boardId: z.string(),
    cardId: z.string(),
    attachmentId: z.string(),
  }),
})

type RouteContext = {
  params: Promise<{
    boardId: string
    cardId: string
    attachmentId: string
  }>
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const { params } = routeContextSchema.parse({
      params: await context.params,
    })
    const userId = await getCurrentUserId()

    if (!userId) {
      return new Response("Unauthorized", { status: 403 })
    }

    const access = await getBoardAccess(params.boardId, userId)

    if (!access) {
      return new Response(null, { status: 404 })
    }

    const attachment = await getBoardAttachment(
      params.boardId,
      params.cardId,
      params.attachmentId
    )

    if (!attachment) {
      return new Response(null, { status: 404 })
    }

    const canDelete =
      attachment.uploadedById === userId ||
      access.canManage ||
      attachment.comment?.authorId === userId

    if (!canDelete) {
      return new Response(null, { status: 403 })
    }

    await db.boardCardAttachment.delete({ where: { id: attachment.id } })

    try {
      await deleteObject(attachment.storageKey)
    } catch {
      // Metadata is already removed; storage cleanup can be retried later.
    }

    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "attachment.deleted",
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}