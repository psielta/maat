import * as z from "zod"

import { getCurrentUserId } from "@/lib/board-access"
import { db } from "@/lib/db"
import { diaryEntryCreateSchema } from "@/lib/validations/diary"

export async function GET() {
  try {
    const userId = await getCurrentUserId()

    if (!userId) {
      return new Response("Unauthorized", { status: 403 })
    }

    const entries = await db.workDiaryEntry.findMany({
      where: {
        OR: [
          {
            authorId: userId,
          },
          {
            shares: {
              some: {
                userId,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        authorId: true,
        shares: {
          where: {
            userId,
          },
          select: {
            role: true,
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    return Response.json(entries)
  } catch {
    return new Response(null, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId()

    if (!userId) {
      return new Response("Unauthorized", { status: 403 })
    }

    const json = await req.json()
    const body = diaryEntryCreateSchema.parse(json)
    const entry = await db.workDiaryEntry.create({
      data: {
        title: body.title,
        content: body.content,
        authorId: userId,
      },
      select: {
        id: true,
      },
    })

    return Response.json(entry, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}
