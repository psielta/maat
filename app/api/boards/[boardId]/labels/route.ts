import * as z from "zod"

import {
  getCurrentUserId,
  userCanManageBoard,
  userCanReadBoard,
} from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import { labelSelect } from "@/lib/label-select"
import { serializeBoardLabel } from "@/lib/label-serialize"
import { db } from "@/lib/db"
import {
  labelCreateSchema,
  MAX_LABELS_PER_BOARD,
} from "@/lib/validations/board"

const routeContextSchema = z.object({
  params: z.object({
    boardId: z.string(),
  }),
})

type RouteContext = {
  params: Promise<{
    boardId: string
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

    if (!(await userCanReadBoard(params.boardId, userId))) {
      return new Response(null, { status: 404 })
    }

    const labels = await db.boardLabel.findMany({
      where: {
        boardId: params.boardId,
      },
      select: labelSelect,
      orderBy: {
        order: "asc",
      },
    })

    return Response.json(labels.map(serializeBoardLabel))
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

    if (!(await userCanManageBoard(params.boardId, userId))) {
      return new Response(null, { status: 404 })
    }

    const json = await req.json()
    const body = labelCreateSchema.parse(json)
    const labelCount = await db.boardLabel.count({
      where: {
        boardId: params.boardId,
      },
    })

    if (labelCount >= MAX_LABELS_PER_BOARD) {
      return Response.json(
        {
          message: `Os boards podem ter no máximo ${MAX_LABELS_PER_BOARD} etiquetas.`,
        },
        { status: 422 }
      )
    }

    const lastLabel = await db.boardLabel.findFirst({
      where: {
        boardId: params.boardId,
      },
      orderBy: {
        order: "desc",
      },
      select: {
        order: true,
      },
    })

    const label = await db.boardLabel.create({
      data: {
        boardId: params.boardId,
        name: body.name?.trim() ?? "",
        color: body.color,
        order: (lastLabel?.order ?? -1) + 1,
      },
      select: labelSelect,
    })

    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "label.created",
    })

    return Response.json(serializeBoardLabel(label), { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}