import { randomUUID } from "crypto"
import * as z from "zod"

import { getBoardCardForAttachment } from "@/lib/board-attachments"
import { getCurrentUserId, userCanEditBoard } from "@/lib/board-access"
import { db } from "@/lib/db"
import { msg } from "@/lib/messages/pt-br"
import { buildStorageKey, createPresignedPutUrl } from "@/lib/storage"
import {
  boardAttachmentPresignSchema,
  MAX_ATTACHMENTS_PER_TARGET,
  MAX_INLINE_IMAGES_PER_CONTENT,
} from "@/lib/validations/board"

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

export async function POST(req: Request, context: RouteContext) {
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

    const card = await getBoardCardForAttachment(params.boardId, params.cardId)

    if (!card) {
      return new Response(null, { status: 404 })
    }

    const json = await req.json()
    const body = boardAttachmentPresignSchema.parse(json)

    const scope =
      body.target === "card"
        ? "CARD"
        : body.target === "comment"
          ? "COMMENT"
          : "INLINE"

    const limit =
      body.target === "inline"
        ? MAX_INLINE_IMAGES_PER_CONTENT
        : MAX_ATTACHMENTS_PER_TARGET

    const existingCount = await db.boardCardAttachment.count({
      where: {
        cardId: params.cardId,
        scope,
        status: { in: ["PENDING", "READY"] },
        ...(body.target === "comment" || body.target === "inline"
          ? { uploadedById: userId }
          : {}),
      },
    })

    if (existingCount >= limit) {
      return Response.json(
        {
          message:
            body.target === "inline"
              ? msg.api.inlineImageLimit
              : msg.api.attachmentLimit,
        },
        { status: 422 }
      )
    }

    const attachment = await db.boardCardAttachment.create({
      data: {
        fileName: body.fileName,
        mimeType: body.mimeType || "application/octet-stream",
        sizeBytes: BigInt(body.sizeBytes),
        storageKey: `pending/${randomUUID()}`,
        scope,
        cardId: params.cardId,
        uploadedById: userId,
      },
      select: { id: true },
    })

    const storageKey = buildStorageKey(
      params.boardId,
      params.cardId,
      attachment.id,
      body.fileName
    )

    await db.boardCardAttachment.update({
      where: { id: attachment.id },
      data: { storageKey },
    })

    const uploadUrl = await createPresignedPutUrl({
      key: storageKey,
      mimeType: body.mimeType || "application/octet-stream",
      sizeBytes: body.sizeBytes,
    })

    return Response.json(
      {
        attachmentId: attachment.id,
        uploadUrl,
        storageKey,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}