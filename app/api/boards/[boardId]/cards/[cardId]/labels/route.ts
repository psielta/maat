import * as z from "zod"

import { getCurrentUserId, userCanEditBoard } from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import { cardLabelSelect } from "@/lib/label-select"
import { serializeCardLabels } from "@/lib/label-serialize"
import { db } from "@/lib/db"
import { cardLabelsPatchSchema } from "@/lib/validations/board"

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

async function userCanAccessCard(boardId: string, cardId: string, userId: string) {
  if (!(await userCanEditBoard(boardId, userId))) {
    return false
  }

  const count = await db.boardCard.count({
    where: {
      id: cardId,
      list: {
        boardId,
      },
    },
  })

  return count > 0
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

    if (!(await userCanAccessCard(params.boardId, params.cardId, userId))) {
      return new Response(null, { status: 404 })
    }

    const json = await req.json()
    const body = cardLabelsPatchSchema.parse(json)
    const uniqueLabelIds = [...new Set(body.labelIds)]

    if (uniqueLabelIds.length > 0) {
      const validLabels = await db.boardLabel.findMany({
        where: {
          boardId: params.boardId,
          id: {
            in: uniqueLabelIds,
          },
        },
        select: {
          id: true,
        },
      })

      if (validLabels.length !== uniqueLabelIds.length) {
        return Response.json(
          { message: "One or more labels do not belong to this board." },
          { status: 422 }
        )
      }
    }

    await db.$transaction(async (tx) => {
      await tx.boardCardLabel.deleteMany({
        where: {
          cardId: params.cardId,
        },
      })

      if (uniqueLabelIds.length > 0) {
        await tx.boardCardLabel.createMany({
          data: uniqueLabelIds.map((labelId) => ({
            cardId: params.cardId,
            labelId,
          })),
        })
      }
    })

    const rows = await db.boardCardLabel.findMany({
      where: {
        cardId: params.cardId,
      },
      select: cardLabelSelect,
    })

    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "card.updated",
    })

    return Response.json(serializeCardLabels(rows))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}