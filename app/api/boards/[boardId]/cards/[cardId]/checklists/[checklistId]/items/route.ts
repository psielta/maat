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

import {
  checklistItemCreateSchema,
  MAX_ITEMS_PER_CHECKLIST,
} from "@/lib/validations/board"

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

export async function POST(req: Request, context: RouteContext) {
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
    const body = checklistItemCreateSchema.parse(json)
    const itemCount = await db.boardCardChecklistItem.count({
      where: {
        checklistId: params.checklistId,
      },
    })

    if (itemCount >= MAX_ITEMS_PER_CHECKLIST) {
      return Response.json(
        {
          message: `As checklists podem ter no máximo ${MAX_ITEMS_PER_CHECKLIST} itens.`,
        },
        { status: 422 }
      )
    }

    const lastItem = await db.boardCardChecklistItem.findFirst({
      where: {
        checklistId: params.checklistId,
      },
      orderBy: {
        order: "desc",
      },
      select: {
        order: true,
      },
    })

    const item = await db.boardCardChecklistItem.create({
      data: {
        checklistId: params.checklistId,
        text: body.text,
        order: (lastItem?.order ?? -1) + 1,
      },
      select: checklistItemSelect,
    })

    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "card.updated",
    })

    return Response.json(serializeChecklistItem(item), { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}