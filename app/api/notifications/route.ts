import { getCurrentUserId } from "@/lib/board-access"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const userId = await getCurrentUserId()

    if (!userId) {
      return new Response("Unauthorized", { status: 403 })
    }

    const [items, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          type: true,
          data: true,
          readAt: true,
          createdAt: true,
          actor: {
            select: {
              name: true,
              email: true,
              image: true,
            },
          },
        },
      }),
      db.notification.count({ where: { userId, readAt: null } }),
    ])

    return Response.json({ items, unreadCount })
  } catch {
    return new Response(null, { status: 500 })
  }
}

type NotificationData = {
  boardId?: string
  cardId?: string
}

export async function PATCH(request: Request) {
  try {
    const userId = await getCurrentUserId()

    if (!userId) {
      return new Response("Unauthorized", { status: 403 })
    }

    let cardId: string | undefined
    let boardId: string | undefined

    try {
      const body = await request.json()
      if (typeof body?.cardId === "string") {
        cardId = body.cardId
      }
      if (typeof body?.boardId === "string") {
        boardId = body.boardId
      }
    } catch {
      // Empty body marks all unread notifications as read.
    }

    if (cardId || boardId) {
      const unread = await db.notification.findMany({
        where: {
          userId,
          readAt: null,
          type: "comment.mentioned",
        },
        select: { id: true, data: true },
      })

      const ids = unread
        .filter((item) => {
          const data = item.data as NotificationData
          if (cardId && data.cardId !== cardId) return false
          if (boardId && data.boardId !== boardId) return false
          return true
        })
        .map((item) => item.id)

      if (ids.length > 0) {
        await db.notification.updateMany({
          where: { userId, id: { in: ids } },
          data: { readAt: new Date() },
        })
      }
    } else {
      await db.notification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
      })
    }

    return new Response(null, { status: 204 })
  } catch {
    return new Response(null, { status: 500 })
  }
}
