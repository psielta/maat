import * as z from "zod"

import { serializeAttachment } from "@/lib/attachment-utils"
import { attachmentSelect } from "@/lib/board-attachments"
import {
  getCurrentUserId,
  userCanEditBoard,
  userCanReadBoard,
} from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import { db } from "@/lib/db"
import { lexicalToPlainText } from "@/lib/lexical-text"
import { createNotifications } from "@/lib/notifications"
import { boardCardCommentCreateSchema } from "@/lib/validations/board"

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

const commentSelect = {
  id: true,
  content: true,
  createdAt: true,
  authorId: true,
  author: {
    select: {
      name: true,
      email: true,
      image: true,
    },
  },
  attachments: {
    where: { status: "READY" },
    select: attachmentSelect,
    orderBy: { createdAt: "asc" as const },
  },
} as const

function serializeComment(
  comment: {
    id: string
    content: string
    createdAt: Date
    authorId: string
    author: {
      name: string | null
      email: string | null
      image: string | null
    }
    attachments: Array<{
      id: string
      fileName: string
      mimeType: string
      sizeBytes: bigint
      createdAt: Date
      uploadedById: string
    }>
  }
) {
  return {
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    authorId: comment.authorId,
    author: comment.author,
    attachments: comment.attachments.map(serializeAttachment),
  }
}

export async function GET(req: Request, context: RouteContext) {
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

    const cardExists = await db.boardCard.count({
      where: { id: params.cardId, list: { boardId: params.boardId } },
    })

    if (!cardExists) {
      return new Response(null, { status: 404 })
    }

    const comments = await db.boardCardComment.findMany({
      where: { cardId: params.cardId },
      select: commentSelect,
      orderBy: { createdAt: "asc" },
    })

    return Response.json(comments.map(serializeComment))
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

    const card = await db.boardCard.findFirst({
      where: { id: params.cardId, list: { boardId: params.boardId } },
      select: {
        id: true,
        title: true,
        list: {
          select: {
            board: {
              select: {
                id: true,
                title: true,
                authorId: true,
                members: { select: { userId: true } },
              },
            },
          },
        },
      },
    })

    if (!card) {
      return new Response(null, { status: 404 })
    }

    const json = await req.json()
    const body = boardCardCommentCreateSchema.parse(json)
    const attachmentIds = body.attachmentIds ?? []

    if (attachmentIds.length > 0) {
      const validAttachments = await db.boardCardAttachment.findMany({
        where: {
          id: { in: attachmentIds },
          cardId: params.cardId,
          commentId: null,
          uploadedById: userId,
          scope: "COMMENT",
          status: "PENDING",
        },
        select: { id: true },
      })

      if (validAttachments.length !== attachmentIds.length) {
        return Response.json(
          { message: "One or more attachments are invalid." },
          { status: 422 }
        )
      }
    }

    const comment = await db.$transaction(async (tx) => {
      const created = await tx.boardCardComment.create({
        data: {
          cardId: params.cardId,
          authorId: userId,
          content: body.content,
        },
        select: commentSelect,
      })

      if (attachmentIds.length > 0) {
        await tx.boardCardAttachment.updateMany({
          where: {
            id: { in: attachmentIds },
            cardId: params.cardId,
            commentId: null,
            uploadedById: userId,
            scope: "COMMENT",
            status: "PENDING",
          },
          data: {
            commentId: created.id,
            status: "READY",
          },
        })
      }

      return tx.boardCardComment.findUniqueOrThrow({
        where: { id: created.id },
        select: commentSelect,
      })
    })

    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "comment.created",
    })

    const board = card.list.board
    const recipientIds = [
      board.authorId,
      ...board.members.map((member) => member.userId),
    ]

    await createNotifications({
      userIds: recipientIds,
      actorId: userId,
      type: "comment.created",
      data: {
        boardId: board.id,
        boardTitle: board.title,
        cardId: card.id,
        cardTitle: card.title,
        actorName: comment.author.name || comment.author.email || "Someone",
        snippet: lexicalToPlainText(body.content).slice(0, 140),
      },
    })

    return Response.json(serializeComment(comment), { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}