import * as z from "zod"

import { getCurrentUserId } from "@/lib/board-access"
import { msg } from "@/lib/messages/pt-br"
import { recordBoardEvent } from "@/lib/board-events"
import { db } from "@/lib/db"
import { boardCreateSchema } from "@/lib/validations/board"

export async function GET() {
  try {
    const userId = await getCurrentUserId()

    if (!userId) {
      return new Response(msg.common.unauthorized, { status: 403 })
    }

    const boards = await db.board.findMany({
      where: {
        OR: [
          {
            authorId: userId,
          },
          {
            members: {
              some: {
                userId,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        updatedAt: true,
        authorId: true,
        lists: {
          select: {
            _count: {
              select: {
                cards: true,
              },
            },
          },
        },
        members: {
          where: {
            userId,
          },
          select: {
            role: true,
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    return Response.json(boards)
  } catch {
    return new Response(null, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()

    if (!userId) {
      return new Response(msg.common.unauthorized, { status: 403 })
    }

    const json = await req.json()
    const body = boardCreateSchema.parse(json)

    const board = await db.board.create({
      data: {
        title: body.title,
        description: body.description,
        authorId: userId,
        members: {
          create: {
            userId,
            role: "OWNER",
          },
        },
        lists: {
          create: [
            { title: msg.board.defaultLists.todo, order: 0 },
            { title: msg.board.defaultLists.doing, order: 1 },
            { title: msg.board.defaultLists.done, order: 2 },
          ],
        },
      },
      select: {
        id: true,
      },
    })
    await recordBoardEvent({
      boardId: board.id,
      actorId: userId,
      action: "board.created",
    })

    return Response.json(board, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}
