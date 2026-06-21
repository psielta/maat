import * as z from "zod"

import { getCurrentUserId } from "@/lib/board-access"
import { userCanManageDiaryEntry } from "@/lib/diary-access"
import { db } from "@/lib/db"
import { diarySharePatchSchema } from "@/lib/validations/diary"

const routeContextSchema = z.object({
  params: z.object({
    entryId: z.string(),
    shareId: z.string(),
  }),
})

type RouteContext = {
  params: Promise<{
    entryId: string
    shareId: string
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

    if (!(await userCanManageDiaryEntry(params.entryId, userId))) {
      return new Response(null, { status: 403 })
    }

    const json = await req.json()
    const body = diarySharePatchSchema.parse(json)
    const existingShare = await db.workDiaryEntryShare.findFirst({
      where: {
        id: params.shareId,
        entryId: params.entryId,
      },
      select: {
        id: true,
      },
    })

    if (!existingShare) {
      return new Response(null, { status: 404 })
    }

    const share = await db.workDiaryEntryShare.update({
      where: {
        id: existingShare.id,
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

    return Response.json(share)
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

    if (!(await userCanManageDiaryEntry(params.entryId, userId))) {
      return new Response(null, { status: 403 })
    }

    const existingShare = await db.workDiaryEntryShare.findFirst({
      where: {
        id: params.shareId,
        entryId: params.entryId,
      },
      select: {
        id: true,
      },
    })

    if (!existingShare) {
      return new Response(null, { status: 404 })
    }

    await db.workDiaryEntryShare.delete({
      where: {
        id: existingShare.id,
      },
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}
