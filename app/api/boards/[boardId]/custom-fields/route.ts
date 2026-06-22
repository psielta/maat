import * as z from "zod"

import {
  getCurrentUserId,
  userCanManageBoard,
  userCanReadBoard,
} from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import { customFieldSelect } from "@/lib/custom-field-select"
import { serializeCustomField } from "@/lib/custom-field-serialize"
import { db } from "@/lib/db"
import {
  customFieldCreateSchema,
  MAX_CUSTOM_FIELDS_PER_BOARD,
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

    const fields = await db.boardCustomField.findMany({
      where: {
        boardId: params.boardId,
      },
      select: customFieldSelect,
      orderBy: {
        order: "asc",
      },
    })

    return Response.json(fields.map(serializeCustomField))
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
    const body = customFieldCreateSchema.parse(json)
    const fieldCount = await db.boardCustomField.count({
      where: {
        boardId: params.boardId,
      },
    })

    if (fieldCount >= MAX_CUSTOM_FIELDS_PER_BOARD) {
      return Response.json(
        {
          message: `Os boards podem ter no máximo ${MAX_CUSTOM_FIELDS_PER_BOARD} campos personalizados.`,
        },
        { status: 422 }
      )
    }

    const lastField = await db.boardCustomField.findFirst({
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

    const field = await db.boardCustomField.create({
      data: {
        boardId: params.boardId,
        name: body.name,
        type: body.type,
        showOnFront: body.showOnFront ?? false,
        order: (lastField?.order ?? -1) + 1,
        options:
          body.type === "DROPDOWN" && body.options
            ? {
                create: body.options.map((option, index) => ({
                  label: option.label,
                  color: option.color,
                  order: index,
                })),
              }
            : undefined,
      },
      select: customFieldSelect,
    })

    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "custom_field.created",
    })

    return Response.json(serializeCustomField(field), { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}