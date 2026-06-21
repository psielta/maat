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

export async function PATCH() {
  try {
    const userId = await getCurrentUserId()

    if (!userId) {
      return new Response("Unauthorized", { status: 403 })
    }

    await db.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    })

    return new Response(null, { status: 204 })
  } catch {
    return new Response(null, { status: 500 })
  }
}
