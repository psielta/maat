import * as z from "zod"

import { getCurrentUserId } from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import {
  getChecklistOnCard,
  userCanEditCard,
} from "@/lib/card-route-access"
import { db } from "@/lib/db"
import { checklistItemReorderSchema } from "@/lib/validations/board"

const routeContextSchema = z.object({
  params: z.object({
    boardId: z.string(),
    cardId: z.string(),
    checklistId: z.string(),
  }),
})

type RouteContext = {
  params: Promise<{
    boardId: string
    cardId: string
    checklistId: string
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

    const existing = await getChecklistOnCard(
      params.boardId,
      params.cardId,
      params.checklistId
    )

    if (!existing) {
      return new Response(null, { status: 404 })
    }

    const json = await req.json()
    const body = checklistItemReorderSchema.parse(json)
    const currentItems = await db.boardCardChecklistItem.findMany({
      where: {
        checklistId: params.checklistId,
      },
      select: {
        id: true,
      },
    })
    const currentIds = new Set(currentItems.map((item) => item.id))
    const incomingIds = new Set(body.itemIds)

    if (incomingIds.size !== currentIds.size) {
      return new Response("Invalid item order", { status: 400 })
    }

    for (const itemId of incomingIds) {
      if (!currentIds.has(itemId)) {
        return new Response("Invalid item order", { status: 400 })
      }
    }

    await db.$transaction(
      body.itemIds.map((itemId, index) =>
        db.boardCardChecklistItem.update({
          where: {
            id: itemId,
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