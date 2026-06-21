import * as z from "zod"

import { getCurrentUserId, userCanEditBoard } from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import { db } from "@/lib/db"
import { extractInlineImageIds } from "@/lib/lexical-inline-images"
import {
  cleanupOrphanInlineImages,
  InlineImageValidationError,
  promoteInlineImages,
} from "@/lib/promote-inline-images"
import { boardCardPatchSchema } from "@/lib/validations/board"

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
    const body = boardCardPatchSchema.parse(json)

    if (body.description !== undefined) {
      try {
        await promoteInlineImages({
          cardId: params.cardId,
          userId,
          content: body.description,
        })
      } catch (error) {
        if (error instanceof InlineImageValidationError) {
          return Response.json({ message: error.message }, { status: 422 })
        }
        throw error
      }
    }

    const card = await db.boardCard.update({
      where: {
        id: params.cardId,
      },
      data: {
        title: body.title,
        description: body.description,
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

    if (body.description !== undefined) {
      await cleanupOrphanInlineImages({
        cardId: params.cardId,
        userId,
        referencedIds: extractInlineImageIds(body.description ?? ""),
      })
    }

    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "card.updated",
    })

    return Response.json(card)
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

    if (!(await userCanAccessCard(params.boardId, params.cardId, userId))) {
      return new Response(null, { status: 404 })
    }

    await db.boardCard.delete({
      where: {
        id: params.cardId,
      },
    })
    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "card.deleted",
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}
