import * as z from "zod"

import { serializeAttachment } from "@/lib/attachment-utils"
import {
  attachmentSelect,
  getBoardAttachment,
} from "@/lib/board-attachments"
import { getCurrentUserId } from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import { db } from "@/lib/db"
import { headObject } from "@/lib/storage"

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

export async function POST(req: Request, context: RouteContext) {
  try {
    const { params } = routeContextSchema.parse({
      params: await context.params,
    })
    const userId = await getCurrentUserId()

    if (!userId) {
      return new Response("Unauthorized", { status: 403 })
    }

    const attachment = await getBoardAttachment(
      params.boardId,
      params.cardId,
      params.attachmentId
    )

    if (!attachment) {
      return new Response(null, { status: 404 })
    }

    if (attachment.uploadedById !== userId) {
      return new Response(null, { status: 403 })
    }

    if (attachment.status === "READY") {
      return Response.json(serializeAttachment(attachment))
    }

    const object = await headObject(attachment.storageKey)
    const objectSize = object.ContentLength ?? 0

    if (objectSize <= 0 || objectSize > Number(attachment.sizeBytes)) {
      return Response.json(
        { message: "Uploaded object size does not match the declared size." },
        { status: 422 }
      )
    }

    const updated = await db.boardCardAttachment.update({
      where: { id: attachment.id },
      data: {
        status: attachment.scope === "CARD" ? "READY" : "PENDING",
      },
      select: attachmentSelect,
    })

    if (attachment.scope === "CARD") {
      await recordBoardEvent({
        boardId: params.boardId,
        actorId: userId,
        action: "attachment.created",
      })
    }

    return Response.json(serializeAttachment(updated))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}