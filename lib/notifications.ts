import { Prisma } from "@prisma/client"

import { db } from "@/lib/db"
import { getRedisPublisher } from "@/lib/redis"

export function getUserNotificationChannel(userId: string) {
  return `user:${userId}:notifications`
}

export async function createNotifications({
  userIds,
  actorId,
  type,
  data,
}: {
  userIds: string[]
  actorId: string | null
  type: string
  data: Prisma.InputJsonValue
}) {
  const recipients = Array.from(new Set(userIds)).filter(
    (id) => id && id !== actorId
  )

  if (recipients.length === 0) {
    return
  }

  await db.notification.createMany({
    data: recipients.map((userId) => ({
      userId,
      actorId,
      type,
      data,
    })),
  })

  try {
    const publisher = getRedisPublisher()
    await Promise.allSettled(
      recipients.map((userId) =>
        publisher.publish(
          getUserNotificationChannel(userId),
          JSON.stringify({ type })
        )
      )
    )
  } catch {
    // Notifications are persisted; realtime can recover on reconnect/refetch.
  }
}
