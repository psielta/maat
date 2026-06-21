import * as z from "zod"

import { getCurrentUserId } from "@/lib/board-access"
import { userCanManageDiaryEntry } from "@/lib/diary-access"
import { db } from "@/lib/db"
import { diaryShareCreateSchema } from "@/lib/validations/diary"

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

export async function POST(req: Request, context: RouteContext) {
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
    const body = diaryShareCreateSchema.parse(json)
    const [entry, targetUser] = await Promise.all([
      db.workDiaryEntry.findUnique({
        where: {
          id: params.entryId,
        },
        select: {
          authorId: true,
        },
      }),
      db.user.findUnique({
        where: {
          email: body.email,
        },
        select: {
          id: true,
        },
      }),
    ])

    if (!entry || !targetUser) {
      return new Response(null, { status: 404 })
    }

    if (entry.authorId === targetUser.id) {
      return new Response("The owner already has access.", { status: 409 })
    }

    const share = await db.workDiaryEntryShare.upsert({
      where: {
        entryId_userId: {
          entryId: params.entryId,
          userId: targetUser.id,
        },
      },
      create: {
        entryId: params.entryId,
        userId: targetUser.id,
        role: body.role,
      },
      update: {
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

    return Response.json(share, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}
