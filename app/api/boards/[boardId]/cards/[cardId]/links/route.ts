import * as z from "zod"

import {
  getCurrentUserId,
  userCanEditBoard,
  userCanReadBoard,
} from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import { normalizeCardLinkPair } from "@/lib/card-link-utils"
import { db } from "@/lib/db"
import { msg } from "@/lib/messages/pt-br"
import { cardLinkCreateSchema } from "@/lib/validations/board"

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

async function getActiveCardOnBoard(boardId: string, cardId: string) {
  return db.boardCard.findFirst({
    where: {
      id: cardId,
      archivedAt: null,
      list: {
        boardId,
        archivedAt: null,
      },
    },
    select: {
      id: true,
    },
  })
}

function serializeLinkedCard(card: {
  id: string
  title: string
  displayId: string | null
  listId: string
  list: {
    title: string
  }
}) {
  return {
    id: card.id,
    title: card.title,
    displayId: card.displayId,
    listId: card.listId,
    listTitle: card.list.title,
  }
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { params } = routeContextSchema.parse({
      params: await context.params,
    })
    const userId = await getCurrentUserId()

    if (!userId) {
      return new Response("Unauthorized", { status: 403 })
    }

    if (!(await userCanReadBoard(params.boardId, userId))) {
      return new Response(null, { status: 404 })
    }

    const card = await db.boardCard.findFirst({
      where: {
        id: params.cardId,
        archivedAt: null,
        list: {
          boardId: params.boardId,
          archivedAt: null,
        },
      },
      select: {
        id: true,
      },
    })

    if (!card) {
      return new Response(null, { status: 404 })
    }

    const links = await db.boardCardLink.findMany({
      where: {
        OR: [{ cardAId: params.cardId }, { cardBId: params.cardId }],
      },
      select: {
        id: true,
        cardAId: true,
        cardBId: true,
        cardA: {
          select: {
            id: true,
            title: true,
            displayId: true,
            listId: true,
            list: {
              select: {
                title: true,
              },
            },
          },
        },
        cardB: {
          select: {
            id: true,
            title: true,
            displayId: true,
            listId: true,
            list: {
              select: {
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    return Response.json(
      links.map((link) => ({
        id: link.id,
        card: serializeLinkedCard(
          link.cardAId === params.cardId ? link.cardB : link.cardA
        ),
      }))
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
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

    const sourceCard = await getActiveCardOnBoard(params.boardId, params.cardId)

    if (!sourceCard) {
      return new Response(null, { status: 404 })
    }

    const json = await req.json()
    const body = cardLinkCreateSchema.parse(json)

    if (body.targetCardId === params.cardId) {
      return Response.json(
        { message: msg.api.cardCannotLinkSelf },
        { status: 400 }
      )
    }

    const targetCard = await getActiveCardOnBoard(
      params.boardId,
      body.targetCardId
    )

    if (!targetCard) {
      return Response.json(
        { message: msg.api.targetCardNotFound },
        { status: 404 }
      )
    }

    const [cardAId, cardBId] = normalizeCardLinkPair(
      params.cardId,
      body.targetCardId
    )

    const existing = await db.boardCardLink.findUnique({
      where: {
        cardAId_cardBId: {
          cardAId,
          cardBId,
        },
      },
      select: {
        id: true,
      },
    })

    if (existing) {
      return Response.json(
        { message: msg.api.cardsAlreadyLinked },
        { status: 409 }
      )
    }

    const link = await db.boardCardLink.create({
      data: {
        cardAId,
        cardBId,
        createdById: userId,
      },
      select: {
        id: true,
        cardAId: true,
        cardBId: true,
        cardA: {
          select: {
            id: true,
            title: true,
            displayId: true,
            listId: true,
            list: {
              select: {
                title: true,
              },
            },
          },
        },
        cardB: {
          select: {
            id: true,
            title: true,
            displayId: true,
            listId: true,
            list: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    })

    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "card.link.created",
    })

    return Response.json(
      {
        id: link.id,
        card: serializeLinkedCard(
          link.cardAId === params.cardId ? link.cardB : link.cardA
        ),
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}