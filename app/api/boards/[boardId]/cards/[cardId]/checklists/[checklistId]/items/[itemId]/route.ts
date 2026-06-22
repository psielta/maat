import * as z from "zod"

import { getCurrentUserId } from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import {
  getChecklistOnCard,
  userCanEditCard,
} from "@/lib/card-route-access"
import { checklistItemSelect } from "@/lib/checklist-select"
import { serializeChecklistItem } from "@/lib/checklist-serialize"
import { db } from "@/lib/db"
import { checklistItemPatchSchema } from "@/lib/validations/board"

const routeContextSchema = z.object({
  params: z.object({
    boardId: z.string(),
    cardId: z.string(),
    checklistId: z.string(),
    itemId: z.string(),
  }),
})

type RouteContext = {
  params: Promise<{
    boardId: string
    cardId: string
    checklistId: string
    itemId: string
  }>
}

async function getChecklistItem(
  boardId: string,
  cardId: string,
  checklistId: string,
  itemId: string
) {
  return db.boardCardChecklistItem.findFirst({
    where: {
      id: itemId,
      checklistId,
      checklist: {
        cardId,
        card: {
          list: {
            boardId,
          },
        },
      },
    },
    select: {
      id: true,
    },
  })
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

    const checklist = await getChecklistOnCard(
      params.boardId,
      params.cardId,
      params.checklistId
    )

    if (!checklist) {
      return new Response(null, { status: 404 })
    }

    const existing = await getChecklistItem(
      params.boardId,
      params.cardId,
      params.checklistId,
      params.itemId
    )

    if (!existing) {
      return new Response(null, { status: 404 })
    }

    const json = await req.json()
    const body = checklistItemPatchSchema.parse(json)

    const item = await db.boardCardChecklistItem.update({
      where: {
        id: params.itemId,
      },
      data: {
        text: body.text,
        isComplete: body.isComplete,
      },
      select: checklistItemSelect,
    })

    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "card.updated",
    })

    return Response.json(serializeChecklistItem(item))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
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

    if (!(await userCanEditCard(params.boardId, params.cardId, userId))) {
      return new Response(null, { status: 404 })
    }

    const checklist = await getChecklistOnCard(
      params.boardId,
      params.cardId,
      params.checklistId
    )

    if (!checklist) {
      return new Response(null, { status: 404 })
    }

    const existing = await getChecklistItem(
      params.boardId,
      params.cardId,
      params.checklistId,
      params.itemId
    )

    if (!existing) {
      return new Response(null, { status: 404 })
    }

    await db.boardCardChecklistItem.delete({
      where: {
        id: params.itemId,
      },
    })

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