import * as z from "zod"

import { getCurrentUserId, userCanEditBoard } from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import { db } from "@/lib/db"
import { msg } from "@/lib/messages/pt-br"
import { boardListPatchSchema } from "@/lib/validations/board"

const routeContextSchema = z.object({
  params: z.object({
    boardId: z.string(),
    listId: z.string(),
  }),
})

type RouteContext = {
  params: Promise<{
    boardId: string
    listId: string
  }>
}

async function userCanAccessList(boardId: string, listId: string, userId: string) {
  if (!(await userCanEditBoard(boardId, userId))) {
    return false
  }

  const count = await db.boardList.count({
    where: {
      id: listId,
      boardId,
    },
  })

  return count > 0
}

async function getListOnBoard(boardId: string, listId: string) {
  return db.boardList.findFirst({
    where: {
      id: listId,
      boardId,
    },
    select: {
      id: true,
      archivedAt: true,
    },
  })
}

async function getNextListOrder(boardId: string) {
  const lastList = await db.boardList.findFirst({
    where: {
      boardId,
      archivedAt: null,
    },
    orderBy: {
      order: "desc",
    },
    select: {
      order: true,
    },
  })

  return (lastList?.order ?? -1) + 1
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

    if (!(await userCanAccessList(params.boardId, params.listId, userId))) {
      return new Response(null, { status: 404 })
    }

    const json = await req.json()
    const body = boardListPatchSchema.parse(json)
    const existing = await getListOnBoard(params.boardId, params.listId)

    if (!existing) {
      return new Response(null, { status: 404 })
    }

    if (body.archived === true && existing.archivedAt) {
      const list = await db.boardList.findFirst({
        where: {
          id: params.listId,
        },
        select: {
          id: true,
          title: true,
          order: true,
        },
      })

      return Response.json(list)
    }

    if (body.archived === false && !existing.archivedAt) {
      const list = await db.boardList.findFirst({
        where: {
          id: params.listId,
        },
        select: {
          id: true,
          title: true,
          order: true,
        },
      })

      return Response.json(list)
    }

    if (body.archived === true) {
      await db.boardList.update({
        where: {
          id: params.listId,
        },
        data: {
          archivedAt: new Date(),
        },
      })

      await recordBoardEvent({
        boardId: params.boardId,
        actorId: userId,
        action: "list.archived",
      })

      return new Response(null, { status: 204 })
    }

    if (body.archived === false) {
      const nextOrder = await getNextListOrder(params.boardId)

      const list = await db.boardList.update({
        where: {
          id: params.listId,
        },
        data: {
          archivedAt: null,
          order: nextOrder,
        },
        select: {
          id: true,
          title: true,
          order: true,
        },
      })

      await recordBoardEvent({
        boardId: params.boardId,
        actorId: userId,
        action: "list.restored",
      })

      return Response.json(list)
    }

    const list = await db.boardList.update({
      where: {
        id: params.listId,
      },
      data: {
        title: body.title,
      },
      select: {
        id: true,
        title: true,
        order: true,
      },
    })
    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "list.updated",
    })

    return Response.json(list)
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

    if (!(await userCanAccessList(params.boardId, params.listId, userId))) {
      return new Response(null, { status: 404 })
    }

    const existing = await getListOnBoard(params.boardId, params.listId)

    if (!existing) {
      return new Response(null, { status: 404 })
    }

    if (!existing.archivedAt) {
      return Response.json(
        {
          message: msg.api.archiveListBeforeDelete,
        },
        { status: 400 }
      )
    }

    await db.boardList.delete({
      where: {
        id: params.listId,
      },
    })
    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "list.deleted",
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}