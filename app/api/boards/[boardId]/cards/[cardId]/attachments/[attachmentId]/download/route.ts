import * as z from "zod"

import { getBoardAttachment } from "@/lib/board-attachments"
import { getCurrentUserId, userCanReadBoard } from "@/lib/board-access"
import { createPresignedGetUrl } from "@/lib/storage"

const routeContextSchema = z.object({
  params: z.object({
    boardId: z.string(),
    cardId: z.string(),
    attachmentId: z.string(),
  }),
})

type RouteContext = {
  params: Promise<{
    boardId: string
    cardId: string
    attachmentId: string
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

    const attachment = await getBoardAttachment(
      params.boardId,
      params.cardId,
      params.attachmentId
    )

    if (!attachment || attachment.status !== "READY") {
      return new Response(null, { status: 404 })
    }

    const downloadUrl = await createPresignedGetUrl(attachment.storageKey)

    return Response.redirect(downloadUrl, 302)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}