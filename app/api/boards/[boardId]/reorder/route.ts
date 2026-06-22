import * as z from "zod"

import { getCurrentUserId, userCanEditBoard } from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import { db } from "@/lib/db"
import { boardReorderSchema } from "@/lib/validations/board"

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

    if (!(await userCanEditBoard(params.boardId, userId))) {
      return new Response(null, { status: 404 })
    }

    const json = await req.json()
    const body = boardReorderSchema.parse(json)
    const currentLists = await db.boardList.findMany({
      where: {
        boardId: params.boardId,
      },
      select: {
        id: true,
        cards: {
          where: {
            archivedAt: null,
          },
          select: {
            id: true,
          },
        },
      },
    })
    const currentListIds = new Set(currentLists.map((list) => list.id))
    const currentCardIds = new Set(
      currentLists.flatMap((list) => list.cards.map((card) => card.id))
    )
    const incomingListIds = new Set(body.lists.map((list) => list.id))
    const incomingCardIds = new Set(body.lists.flatMap((list) => list.cards))

    if (
      incomingListIds.size !== currentListIds.size ||
      incomingCardIds.size !== currentCardIds.size
    ) {
      return new Response("Invalid board order", { status: 400 })
    }

    for (const listId of incomingListIds) {
      if (!currentListIds.has(listId)) {
        return new Response("Invalid board order", { status: 400 })
      }
    }

    for (const cardId of incomingCardIds) {
      if (!currentCardIds.has(cardId)) {
        return new Response("Invalid board order", { status: 400 })
      }
    }

    await db.$transaction(
      body.lists.flatMap((list, listIndex) => [
        db.boardList.update({
          where: {
            id: list.id,
          },
          data: {
            order: listIndex,
          },
        }),
        ...list.cards.map((cardId, cardIndex) =>
          db.boardCard.update({
            where: {
              id: cardId,
            },
            data: {
              listId: list.id,
              order: cardIndex,
            },
          })
        ),
      ])
    )
    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "board.reordered",
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}
