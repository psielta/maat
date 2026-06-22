import * as z from "zod"

import { getCurrentUserId, userCanEditBoard } from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import { db } from "@/lib/db"

const routeContextSchema = z.object({
  params: z.object({
    boardId: z.string(),
    cardId: z.string(),
    linkId: z.string(),
  }),
})

type RouteContext = {
  params: Promise<{
    boardId: string
    cardId: string
    linkId: string
  }>
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { params } = routeContextSchema.parse({
      params: await context.params,
    })
    const userId = await getCurrentUserId()

    if (!userId) {
      return new Response("Unauthorized", { status: 403 })
    }

    if (!(await userCanEditBoard(params.boardId, userId))) {
      return new Response(null, { status: 404 })
    }

    const link = await db.boardCardLink.findFirst({
      where: {
        id: params.linkId,
        OR: [{ cardAId: params.cardId }, { cardBId: params.cardId }],
        cardA: {
          list: {
            boardId: params.boardId,
          },
        },
      },
      select: {
        id: true,
      },
    })

    if (!link) {
      return new Response(null, { status: 404 })
    }

    await db.boardCardLink.delete({
      where: {
        id: params.linkId,
      },
    })

    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "card.link.deleted",
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}