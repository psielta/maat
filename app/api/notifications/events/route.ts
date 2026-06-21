import { getCurrentUserId } from "@/lib/board-access"
import { getUserNotificationChannel } from "@/lib/notifications"
import { createRedisSubscriber } from "@/lib/redis"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const userId = await getCurrentUserId()

  if (!userId) {
    return new Response("Unauthorized", { status: 403 })
  }

  const encoder = new TextEncoder()
  const channel = getUserNotificationChannel(userId)
  const subscriber = createRedisSubscriber()
  let heartbeat: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      function cleanup() {
        if (heartbeat) {
          clearInterval(heartbeat)
          heartbeat = null
        }

        subscriber.removeAllListeners("message")
        void subscriber
          .unsubscribe(channel)
          .finally(() => subscriber.disconnect())
      }

      req.signal.addEventListener("abort", cleanup, { once: true })
      subscriber.on("message", (_channel, message) => {
        try {
          send("notification", JSON.parse(message))
        } catch {
          send("notification", { type: "notification" })
        }
      })

      await subscriber.subscribe(channel)
      send("ready", { userId })
      heartbeat = setInterval(() => {
        send("ping", { at: Date.now() })
      }, 25000)
    },
    cancel() {
      if (heartbeat) {
        clearInterval(heartbeat)
        heartbeat = null
      }

      subscriber.removeAllListeners("message")
      void subscriber.unsubscribe(channel).finally(() => subscriber.disconnect())
    },
  })

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    },
  })
}
