import * as z from "zod"

import {
  getBoardAccess,
  getBoardForUser,
  getCurrentUserId,
} from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import { db } from "@/lib/db"
import { boardPatchSchema } from "@/lib/validations/board"

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

    const access = await getBoardAccess(params.boardId, userId)

    if (!access) {
      return new Response(null, { status: 404 })
    }

    if (!access.canEdit) {
      return new Response(null, { status: 403 })
    }

    const json = await req.json()
    const body = boardPatchSchema.parse(json)

    const updatedBoard = await db.board.update({
      where: {
        id: params.boardId,
      },
      data: {
        title: body.title,
        description: body.description,
        cardIdPattern: body.cardIdPattern,
      },
      select: {
        id: true,
        title: true,
        description: true,
        cardIdPattern: true,
      },
    })
    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "board.updated",
    })

    return Response.json(updatedBoard)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const { params } = routeContextSchema.parse({
      params: await context.params,
    })
    const userId = await getCurrentUserId()

    if (!userId) {
      return new Response("Unauthorized", { status: 403 })
    }

    const board = await getBoardForUser(params.boardId, userId)

    if (!board) {
      return new Response(null, { status: 404 })
    }

    if (board.authorId !== userId) {
      return new Response(null, { status: 403 })
    }

    await db.board.delete({
      where: {
        id: params.boardId,
      },
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}
