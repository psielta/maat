import * as z from "zod"

import { getCurrentUserId } from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import { userCanEditCard } from "@/lib/card-route-access"
import { db } from "@/lib/db"
import { checklistReorderSchema } from "@/lib/validations/board"

const routeContextSchema = z.object({
  params: z.object({
    boardId: z.string(),
    cardId: z.string(),
  }),
})

type RouteContext = {
  params: Promise<{
    boardId: string
    cardId: string
  }>
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { params } = routeContextSchema.parse({
      params: await context.params,
    })
    const userId = await getCurrentUserId()

    if (!userId) {
      return new Response("Unauthorized", { status: 403 })
    }

    if (!(await userCanEditCard(params.boardId, params.cardId, userId))) {
      return new Response(null, { status: 404 })
    }

    const json = await req.json()
    const body = checklistReorderSchema.parse(json)
    const currentChecklists = await db.boardCardChecklist.findMany({
      where: {
        cardId: params.cardId,
      },
      select: {
        id: true,
      },
    })
    const currentIds = new Set(currentChecklists.map((checklist) => checklist.id))
    const incomingIds = new Set(body.checklistIds)

    if (incomingIds.size !== currentIds.size) {
      return new Response("Invalid checklist order", { status: 400 })
    }

    for (const checklistId of incomingIds) {
      if (!currentIds.has(checklistId)) {
        return new Response("Invalid checklist order", { status: 400 })
      }
    }

    await db.$transaction(
      body.checklistIds.map((checklistId, index) =>
        db.boardCardChecklist.update({
          where: {
            id: checklistId,
          },
          data: {
            order: index,
          },
        })
      )
    )

    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "card.updated",
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}