import * as z from "zod"

import { getCurrentUserId } from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import {
  getChecklistOnCard,
  userCanEditCard,
} from "@/lib/card-route-access"
import { checklistSelect } from "@/lib/checklist-select"
import { serializeChecklist } from "@/lib/checklist-serialize"
import { db } from "@/lib/db"
import { checklistPatchSchema } from "@/lib/validations/board"

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
    const body = checklistPatchSchema.parse(json)

    const checklist = await db.boardCardChecklist.update({
      where: {
        id: params.checklistId,
      },
      data: {
        title: body.title,
      },
      select: checklistSelect,
    })

    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "card.updated",
    })

    return Response.json(serializeChecklist(checklist))
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

    const existing = await getChecklistOnCard(
      params.boardId,
      params.cardId,
      params.checklistId
    )

    if (!existing) {
      return new Response(null, { status: 404 })
    }

    await db.boardCardChecklist.delete({
      where: {
        id: params.checklistId,
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