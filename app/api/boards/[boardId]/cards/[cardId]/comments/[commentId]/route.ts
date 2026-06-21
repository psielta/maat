import * as z from "zod"

import {
  getBoardAccess,
  getCurrentUserId,
} from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import { db } from "@/lib/db"

const routeContextSchema = z.object({
  params: z.object({
    boardId: z.string(),
    cardId: z.string(),
    commentId: z.string(),
  }),
})

type RouteContext = {
  params: Promise<{
    boardId: string
    cardId: string
    commentId: string
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

    const comment = await db.boardCardComment.findFirst({
      where: {
        id: params.commentId,
        cardId: params.cardId,
        card: { list: { boardId: params.boardId } },
      },
      select: { id: true, authorId: true },
    })

    if (!comment) {
      return new Response(null, { status: 404 })
    }

    // Only the comment author or a board owner can remove a comment.
    if (comment.authorId !== userId && !access.canManage) {
      return new Response(null, { status: 403 })
    }

    await db.boardCardComment.delete({ where: { id: params.commentId } })

    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "comment.deleted",
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}
