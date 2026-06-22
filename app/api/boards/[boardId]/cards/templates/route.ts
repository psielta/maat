import * as z from "zod"

import { getCurrentUserId, userCanEditBoard } from "@/lib/board-access"
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

    if (!(await userCanEditBoard(params.boardId, userId))) {
      return new Response(null, { status: 404 })
    }

    const templates = await db.boardCard.findMany({
      where: {
        isTemplate: true,
        archivedAt: null,
        list: {
          boardId: params.boardId,
          archivedAt: null,
        },
      },
      select: {
        id: true,
        title: true,
        list: {
          select: {
            title: true,
          },
        },
      },
      orderBy: [{ list: { order: "asc" } }, { order: "asc" }],
    })

    return Response.json(
      templates.map((template) => ({
        id: template.id,
        title: template.title,
        listTitle: template.list.title,
      }))
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}