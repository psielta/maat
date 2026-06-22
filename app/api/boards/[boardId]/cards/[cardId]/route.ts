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
import { parseDueAt, parseStartDate, serializeCardDates } from "@/lib/card-dates"
import { cardSelect } from "@/lib/card-select"
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

async function getCardOnBoard(boardId: string, cardId: string) {
  return db.boardCard.findFirst({
    where: {
      id: cardId,
      list: {
        boardId,
      },
    },
    select: {
      id: true,
      listId: true,
      archivedAt: true,
    },
  })
}

async function getNextCardOrder(listId: string) {
  const lastCard = await db.boardCard.findFirst({
    where: {
      listId,
      archivedAt: null,
    },
    orderBy: {
      order: "desc",
    },
    select: {
      order: true,
    },
  })

  return (lastCard?.order ?? -1) + 1
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
    const existing = await getCardOnBoard(params.boardId, params.cardId)

    if (!existing) {
      return new Response(null, { status: 404 })
    }

    if (body.archived === true && existing.archivedAt) {
      const card = await db.boardCard.findFirst({
        where: {
          id: params.cardId,
        },
        select: cardSelect,
      })

      return Response.json({
        ...card,
        ...serializeCardDates(card!),
      })
    }

    if (body.archived === false && !existing.archivedAt) {
      const card = await db.boardCard.findFirst({
        where: {
          id: params.cardId,
        },
        select: cardSelect,
      })

      return Response.json({
        ...card,
        ...serializeCardDates(card!),
      })
    }

    if (body.archived === true) {
      await db.boardCard.update({
        where: {
          id: params.cardId,
        },
        data: {
          archivedAt: new Date(),
        },
      })

      await recordBoardEvent({
        boardId: params.boardId,
        actorId: userId,
        action: "card.archived",
      })

      return new Response(null, { status: 204 })
    }

    if (body.isTemplate !== undefined) {
      if (body.isTemplate && existing.archivedAt) {
        return Response.json(
          { message: "Archived cards cannot be marked as templates." },
          { status: 400 }
        )
      }
    }

    if (body.archived === false) {
      const nextOrder = await getNextCardOrder(existing.listId)

      const card = await db.boardCard.update({
        where: {
          id: params.cardId,
        },
        data: {
          archivedAt: null,
          order: nextOrder,
        },
        select: cardSelect,
      })

      await recordBoardEvent({
        boardId: params.boardId,
        actorId: userId,
        action: "card.restored",
      })

      return Response.json({
        ...card,
        ...serializeCardDates(card),
      })
    }

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
        ...(body.cardType !== undefined && {
          cardType: body.cardType,
        }),
        ...(body.isTemplate !== undefined && {
          isTemplate: body.isTemplate,
        }),
        ...(body.startDate !== undefined && {
          startDate: parseStartDate(body.startDate),
        }),
        ...(body.dueAt !== undefined && {
          dueAt: parseDueAt(body.dueAt),
        }),
        ...(body.dueComplete !== undefined && {
          dueComplete: body.dueComplete,
        }),
      },
      select: cardSelect,
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

    return Response.json({
      ...card,
      ...serializeCardDates(card),
    })
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

    if (!(await userCanAccessCard(params.boardId, params.cardId, userId))) {
      return new Response(null, { status: 404 })
    }

    const existing = await getCardOnBoard(params.boardId, params.cardId)

    if (!existing) {
      return new Response(null, { status: 404 })
    }

    if (!existing.archivedAt) {
      return Response.json(
        {
          message: "Archive the card before deleting it permanently.",
        },
        { status: 400 }
      )
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