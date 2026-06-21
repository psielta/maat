import { db } from "@/lib/db"
import { getRedisPublisher } from "@/lib/redis"

export async function recordBoardEvent({
  boardId,
  actorId,
  action,
}: {
  boardId: string
  actorId: string | null
  action: string
}) {
  const event = await db.boardEvent.create({
    data: {
      boardId,
      actorId,
      action,
    },
    select: {
      id: true,
      action: true,
      boardId: true,
      actorId: true,
      createdAt: true,
    },
  })

  try {
    await getRedisPublisher().publish(
      getBoardChannel(boardId),
      JSON.stringify({
        id: event.id,
        action: event.action,
        boardId: event.boardId,
        actorId: event.actorId,
        createdAt: event.createdAt.toISOString(),
      })
    )
  } catch {
    // The mutation is already persisted. Realtime can recover on reconnect.
  }
}

export function getBoardChannel(boardId: string) {
  return `board:${boardId}`
}
