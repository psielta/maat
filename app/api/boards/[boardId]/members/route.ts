import * as z from "zod"

import {
  getCurrentUserId,
  userCanManageBoard,
  userCanReadBoard,
} from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import { db } from "@/lib/db"
import { boardMemberCreateSchema } from "@/lib/validations/board"

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

    const members = await db.boardMember.findMany({
      where: {
        boardId: params.boardId,
      },
      select: {
        id: true,
        role: true,
        userId: true,
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: [
        {
          role: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    })

    return Response.json(members)
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

    if (!(await userCanManageBoard(params.boardId, userId))) {
      return new Response(null, { status: 403 })
    }

    const json = await req.json()
    const body = boardMemberCreateSchema.parse(json)
    const user = await db.user.findUnique({
      where: {
        email: body.email,
      },
      select: {
        id: true,
      },
    })

    if (!user) {
      return new Response("User not found", { status: 404 })
    }

    const board = await db.board.findUnique({
      where: {
        id: params.boardId,
      },
      select: {
        authorId: true,
      },
    })

    if (!board) {
      return new Response(null, { status: 404 })
    }

    if (board.authorId === user.id) {
      return new Response("Owner is already a member", { status: 409 })
    }

    const member = await db.boardMember.upsert({
      where: {
        boardId_userId: {
          boardId: params.boardId,
          userId: user.id,
        },
      },
      create: {
        boardId: params.boardId,
        userId: user.id,
        role: body.role,
      },
      update: {
        role: body.role,
      },
      select: {
        id: true,
        role: true,
        userId: true,
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })
    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "member.upserted",
    })

    return Response.json(member, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}
