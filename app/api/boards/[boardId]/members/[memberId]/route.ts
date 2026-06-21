import * as z from "zod"

import { getCurrentUserId, userCanManageBoard } from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import { db } from "@/lib/db"
import { boardMemberPatchSchema } from "@/lib/validations/board"

const routeContextSchema = z.object({
  params: z.object({
    boardId: z.string(),
    memberId: z.string(),
  }),
})

type RouteContext = {
  params: Promise<{
    boardId: string
    memberId: string
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

    if (!(await userCanManageBoard(params.boardId, userId))) {
      return new Response(null, { status: 403 })
    }

    const json = await req.json()
    const body = boardMemberPatchSchema.parse(json)
    const existingMember = await db.boardMember.findFirst({
      where: {
        id: params.memberId,
        boardId: params.boardId,
        role: {
          not: "OWNER",
        },
      },
      select: {
        id: true,
      },
    })

    if (!existingMember) {
      return new Response(null, { status: 404 })
    }

    const member = await db.boardMember.update({
      where: {
        id: existingMember.id,
      },
      data: {
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
      action: "member.updated",
    })

    return Response.json(member)
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

    if (!(await userCanManageBoard(params.boardId, userId))) {
      return new Response(null, { status: 403 })
    }

    const existingMember = await db.boardMember.findFirst({
      where: {
        id: params.memberId,
        boardId: params.boardId,
        role: {
          not: "OWNER",
        },
      },
      select: {
        id: true,
      },
    })

    if (!existingMember) {
      return new Response(null, { status: 404 })
    }

    await db.boardMember.delete({
      where: {
        id: existingMember.id,
      },
    })
    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "member.deleted",
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}
