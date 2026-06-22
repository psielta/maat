import * as z from "zod"

import { getCurrentUserId, userCanManageBoard } from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import { customFieldSelect } from "@/lib/custom-field-select"
import { serializeCustomField } from "@/lib/custom-field-serialize"
import { db } from "@/lib/db"
import { customFieldPatchSchema } from "@/lib/validations/board"

const routeContextSchema = z.object({
  params: z.object({
    boardId: z.string(),
    fieldId: z.string(),
  }),
})

type RouteContext = {
  params: Promise<{
    boardId: string
    fieldId: string
  }>
}

async function getBoardField(boardId: string, fieldId: string) {
  return db.boardCustomField.findFirst({
    where: {
      id: fieldId,
      boardId,
    },
    select: {
      id: true,
      type: true,
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

    const existing = await getBoardField(params.boardId, params.fieldId)
    if (!existing) {
      return new Response(null, { status: 404 })
    }

    const json = await req.json()
    const body = customFieldPatchSchema.parse(json)

    if (body.options !== undefined && existing.type !== "DROPDOWN") {
      return Response.json(
        { message: "Options are only supported for dropdown fields." },
        { status: 422 }
      )
    }

    const field = await db.$transaction(async (tx) => {
      if (body.options !== undefined) {
        await tx.boardCustomFieldOption.deleteMany({
          where: {
            fieldId: params.fieldId,
          },
        })
      }

      return tx.boardCustomField.update({
        where: {
          id: params.fieldId,
        },
        data: {
          name: body.name,
          showOnFront: body.showOnFront,
          options:
            body.options !== undefined
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
    })

    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "custom_field.updated",
    })

    return Response.json(serializeCustomField(field))
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

    const existing = await getBoardField(params.boardId, params.fieldId)
    if (!existing) {
      return new Response(null, { status: 404 })
    }

    await db.boardCustomField.delete({
      where: {
        id: params.fieldId,
      },
    })

    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "custom_field.deleted",
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}