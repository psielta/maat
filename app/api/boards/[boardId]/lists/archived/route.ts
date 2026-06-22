import * as z from "zod"

import { getCurrentUserId, userCanReadBoard } from "@/lib/board-access"
import { serializeArchivedList } from "@/lib/list-archive"
import { db } from "@/lib/db"

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

    const lists = await db.boardList.findMany({
      where: {
        boardId: params.boardId,
        archivedAt: {
          not: null,
        },
      },
      select: {
        id: true,
        title: true,
        archivedAt: true,
        _count: {
          select: {
            cards: {
              where: {
                archivedAt: null,
              },
            },
          },
        },
      },
      orderBy: {
        archivedAt: "desc",
      },
    })

    return Response.json(lists.map(serializeArchivedList))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}