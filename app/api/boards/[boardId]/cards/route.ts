import * as z from "zod"

import { getCurrentUserId, userCanEditBoard } from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
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

    const lastCard = await db.boardCard.findFirst({
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

    const card = await db.boardCard.create({
      data: {
        title: body.title,
        description: body.description,
        order: (lastCard?.order ?? -1) + 1,
        listId: body.listId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        order: true,
        listId: true,
      },
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
