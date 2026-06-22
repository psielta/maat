import * as z from "zod"

import { getCurrentUserId, userCanManageBoard } from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import { labelSelect } from "@/lib/label-select"
import { serializeBoardLabel } from "@/lib/label-serialize"
import { db } from "@/lib/db"
import { labelPatchSchema } from "@/lib/validations/board"

const routeContextSchema = z.object({
  params: z.object({
    boardId: z.string(),
    labelId: z.string(),
  }),
})

type RouteContext = {
  params: Promise<{
    boardId: string
    labelId: string
  }>
}

async function getBoardLabel(boardId: string, labelId: string) {
  return db.boardLabel.findFirst({
    where: {
      id: labelId,
      boardId,
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

    if (!(await userCanManageBoard(params.boardId, userId))) {
      return new Response(null, { status: 404 })
    }

    const existing = await getBoardLabel(params.boardId, params.labelId)
    if (!existing) {
      return new Response(null, { status: 404 })
    }

    const json = await req.json()
    const body = labelPatchSchema.parse(json)

    const label = await db.boardLabel.update({
      where: {
        id: params.labelId,
      },
      data: {
        name: body.name !== undefined ? body.name.trim() : undefined,
        color: body.color,
      },
      select: labelSelect,
    })

    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "label.updated",
    })

    return Response.json(serializeBoardLabel(label))
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

    if (!(await userCanManageBoard(params.boardId, userId))) {
      return new Response(null, { status: 404 })
    }

    const existing = await getBoardLabel(params.boardId, params.labelId)
    if (!existing) {
      return new Response(null, { status: 404 })
    }

    await db.boardLabel.delete({
      where: {
        id: params.labelId,
      },
    })

    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "label.deleted",
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}