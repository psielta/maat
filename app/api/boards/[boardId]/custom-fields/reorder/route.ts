import * as z from "zod"

import { getCurrentUserId, userCanManageBoard } from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import { db } from "@/lib/db"
import { customFieldReorderSchema } from "@/lib/validations/board"

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

    const json = await req.json()
    const body = customFieldReorderSchema.parse(json)
    const currentFields = await db.boardCustomField.findMany({
      where: {
        boardId: params.boardId,
      },
      select: {
        id: true,
      },
    })
    const currentFieldIds = new Set(currentFields.map((field) => field.id))
    const incomingFieldIds = new Set(body.fieldIds)

    if (incomingFieldIds.size !== currentFieldIds.size) {
      return new Response("Invalid custom field order", { status: 400 })
    }

    for (const fieldId of incomingFieldIds) {
      if (!currentFieldIds.has(fieldId)) {
        return new Response("Invalid custom field order", { status: 400 })
      }
    }

    await db.$transaction(
      body.fieldIds.map((fieldId, index) =>
        db.boardCustomField.update({
          where: {
            id: fieldId,
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
      action: "custom_field.reordered",
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}