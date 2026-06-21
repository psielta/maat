import * as z from "zod"

import { getCurrentUserId, userCanReadBoard } from "@/lib/board-access"
import { getBoardChannel } from "@/lib/board-events"
import { createRedisSubscriber } from "@/lib/redis"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const routeContextSchema = z.object({
  params: z.object({
    boardId: z.string(),
  }),
})

type RouteContext = {
  params: Promise<{
    boardId: string
  }>
}

export async function GET(req: Request, context: RouteContext) {
  const { params } = routeContextSchema.parse({
    params: await context.params,
  })
  const userId = await getCurrentUserId()

  if (!userId) {
    return new Response("Unauthorized", { status: 403 })
  }

  if (!(await userCanReadBoard(params.boardId, userId))) {
    return new Response(null, { status: 404 })
  }

  const encoder = new TextEncoder()
  const channel = getBoardChannel(params.boardId)
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
        void subscriber.unsubscribe(channel).finally(() => subscriber.disconnect())
      }

      req.signal.addEventListener("abort", cleanup, { once: true })
      subscriber.on("message", (_channel, message) => {
        try {
          send("board:update", JSON.parse(message))
        } catch {
          send("board:update", { action: "board.updated" })
        }
      })

      await subscriber.subscribe(channel)
      send("ready", { boardId: params.boardId })
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
