import * as z from "zod"

import { getCurrentUserId, userCanManageBoard } from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import { db } from "@/lib/db"
import { labelReorderSchema } from "@/lib/validations/board"

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
    const body = labelReorderSchema.parse(json)
    const currentLabels = await db.boardLabel.findMany({
      where: {
        boardId: params.boardId,
      },
      select: {
        id: true,
      },
    })
    const currentLabelIds = new Set(currentLabels.map((label) => label.id))
    const incomingLabelIds = new Set(body.labelIds)

    if (incomingLabelIds.size !== currentLabelIds.size) {
      return new Response("Invalid label order", { status: 400 })
    }

    for (const labelId of incomingLabelIds) {
      if (!currentLabelIds.has(labelId)) {
        return new Response("Invalid label order", { status: 400 })
      }
    }

    await db.$transaction(
      body.labelIds.map((labelId, index) =>
        db.boardLabel.update({
          where: {
            id: labelId,
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
      action: "label.reordered",
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}