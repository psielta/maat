import * as z from "zod"

import { getCurrentUserId } from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import {
  userCanEditCard,
  userCanReadCard,
} from "@/lib/card-route-access"
import { checklistSelect } from "@/lib/checklist-select"
import { serializeCardChecklists, serializeChecklist } from "@/lib/checklist-serialize"
import { db } from "@/lib/db"

import {
  checklistCreateSchema,
  MAX_CHECKLISTS_PER_CARD,
} from "@/lib/validations/board"

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

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { params } = routeContextSchema.parse({
      params: await context.params,
    })
    const userId = await getCurrentUserId()

    if (!userId) {
      return new Response("Unauthorized", { status: 403 })
    }

    if (!(await userCanReadCard(params.boardId, params.cardId, userId))) {
      return new Response(null, { status: 404 })
    }

    const checklists = await db.boardCardChecklist.findMany({
      where: {
        cardId: params.cardId,
      },
      select: checklistSelect,
      orderBy: {
        order: "asc",
      },
    })

    return Response.json(serializeCardChecklists(checklists))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
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

    const json = await req.json()
    const body = checklistCreateSchema.parse(json)
    const checklistCount = await db.boardCardChecklist.count({
      where: {
        cardId: params.cardId,
      },
    })

    if (checklistCount >= MAX_CHECKLISTS_PER_CARD) {
      return Response.json(
        {
          message: `Os cards podem ter no máximo ${MAX_CHECKLISTS_PER_CARD} checklists.`,
        },
        { status: 422 }
      )
    }

    const lastChecklist = await db.boardCardChecklist.findFirst({
      where: {
        cardId: params.cardId,
      },
      orderBy: {
        order: "desc",
      },
      select: {
        order: true,
      },
    })

    const checklist = await db.boardCardChecklist.create({
      data: {
        cardId: params.cardId,
        title: body.title?.trim() || "Checklist",
        order: (lastChecklist?.order ?? -1) + 1,
      },
      select: checklistSelect,
    })

    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "card.updated",
    })

    return Response.json(serializeChecklist(checklist), { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}