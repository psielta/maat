import * as z from "zod"

import { getCurrentUserId, userCanEditBoard } from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import { generateCardDisplayId } from "@/lib/card-id-pattern"
import { db } from "@/lib/db"
import { boardCardCreateSchema } from "@/lib/validations/board"

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

export async function POST(req: Request, context: RouteContext) {
  try {
    const { params } = routeContextSchema.parse({
      params: await context.params,
    })
    const userId = await getCurrentUserId()

    if (!userId) {
      return new Response("Unauthorized", { status: 403 })
    }

    if (!(await userCanEditBoard(params.boardId, userId))) {
      return new Response(null, { status: 404 })
    }

    const json = await req.json()
    const body = boardCardCreateSchema.parse(json)
    const list = await db.boardList.findFirst({
      where: {
        id: body.listId,
        boardId: params.boardId,
      },
      select: {
        id: true,
      },
    })

    if (!list) {
      return new Response(null, { status: 404 })
    }

    const board = await db.board.findFirst({
      where: {
        id: params.boardId,
      },
      select: {
        cardIdPattern: true,
      },
    })

    if (!board) {
      return new Response(null, { status: 404 })
    }

    const card = await db.$transaction(async (tx) => {
      const lastCard = await tx.boardCard.findFirst({
        where: {
          listId: body.listId,
        },
        orderBy: {
          order: "desc",
        },
        select: {
          order: true,
        },
      })

      const displayId = board.cardIdPattern
        ? await generateCardDisplayId(params.boardId, board.cardIdPattern, tx)
        : null

      return tx.boardCard.create({
        data: {
          title: body.title,
          description: body.description,
          displayId,
          order: (lastCard?.order ?? -1) + 1,
          listId: body.listId,
        },
        select: {
          id: true,
          displayId: true,
          title: true,
          description: true,
          order: true,
          listId: true,
        },
      })
    })
    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "card.created",
    })

    return Response.json(card, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}
