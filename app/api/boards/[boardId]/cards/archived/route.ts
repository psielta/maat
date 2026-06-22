import * as z from "zod"

import { getCurrentUserId, userCanReadBoard } from "@/lib/board-access"
import { serializeArchivedCard } from "@/lib/card-archive"
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

    const cards = await db.boardCard.findMany({
      where: {
        archivedAt: {
          not: null,
        },
        list: {
          boardId: params.boardId,
        },
      },
      select: {
        id: true,
        title: true,
        displayId: true,
        archivedAt: true,
        listId: true,
        list: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        archivedAt: "desc",
      },
    })

    return Response.json(cards.map(serializeArchivedCard))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}