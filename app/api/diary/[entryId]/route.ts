import * as z from "zod"

import { getCurrentUserId } from "@/lib/board-access"
import {
  diaryEntryAccessWhere,
  getDiaryEntryAccess,
} from "@/lib/diary-access"
import { db } from "@/lib/db"
import { diaryEntryPatchSchema } from "@/lib/validations/diary"

const routeContextSchema = z.object({
  params: z.object({
    entryId: z.string(),
  }),
})

type RouteContext = {
  params: Promise<{
    entryId: string
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

    const entry = await db.workDiaryEntry.findFirst({
      where: diaryEntryAccessWhere(params.entryId, userId),
      include: {
        shares: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    })

    if (!entry) {
      return new Response(null, { status: 404 })
    }

    return Response.json(entry)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
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

    const access = await getDiaryEntryAccess(params.entryId, userId)

    if (!access?.canEdit) {
      return new Response(null, { status: 403 })
    }

    const json = await req.json()
    const body = diaryEntryPatchSchema.parse(json)
    const entry = await db.workDiaryEntry.update({
      where: {
        id: params.entryId,
      },
      data: {
        title: body.title,
        content: body.content,
      },
    })

    return Response.json(entry)
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

    const access = await getDiaryEntryAccess(params.entryId, userId)

    if (!access?.canManage) {
      return new Response(null, { status: 403 })
    }

    await db.workDiaryEntry.delete({
      where: {
        id: params.entryId,
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
