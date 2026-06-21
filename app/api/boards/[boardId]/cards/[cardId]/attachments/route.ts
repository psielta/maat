import * as z from "zod"

import { serializeAttachment } from "@/lib/attachment-utils"
import { attachmentSelect } from "@/lib/board-attachments"
import { getCurrentUserId, userCanReadBoard } from "@/lib/board-access"
import { db } from "@/lib/db"

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

    const attachments = await db.boardCardAttachment.findMany({
      where: {
        cardId: params.cardId,
        scope: "CARD",
        status: "READY",
      },
      select: attachmentSelect,
      orderBy: { createdAt: "asc" },
    })

    return Response.json(attachments.map(serializeAttachment))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}