"use client"

import * as React from "react"

import {
  NOTIFICATIONS_CHANGED_EVENT,
  notifyNotificationsChanged,
} from "@/lib/notification-events"

type NotificationData = {
  boardId?: string
  cardId?: string
}

type NotificationItem = {
  id: string
  type: string
  data: NotificationData
  readAt: string | null
}

export function useBoardMentionAlerts(boardId: string) {
  const [mentionedCardIds, setMentionedCardIds] = React.useState<Set<string>>(
    () => new Set()
  )

  const load = React.useCallback(async () => {
    const response = await fetch("/api/notifications")
    if (!response.ok) return

    const data = await response.json()
    const items = (data.items ?? []) as NotificationItem[]
    const next = new Set<string>()

    for (const item of items) {
      if (item.readAt) continue
      if (item.type !== "comment.mentioned") continue
      if (item.data.boardId !== boardId) continue
      if (!item.data.cardId) continue
      next.add(item.data.cardId)
    }

    setMentionedCardIds(next)
  }, [boardId])

  React.useEffect(() => {
    void load()
  }, [load])

  React.useEffect(() => {
    const events = new EventSource("/api/notifications/events")
    events.addEventListener("notification", () => {
      void load()
    })
    return () => events.close()
  }, [load])

  React.useEffect(() => {
    function onChanged() {
      void load()
    }

    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged)
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onChanged)
  }, [load])

  const markCardMentionsRead = React.useCallback(async (cardId: string) => {
    if (!mentionedCardIds.has(cardId)) return

    setMentionedCardIds((current) => {
      const next = new Set(current)
      next.delete(cardId)
      return next
    })

    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, boardId }),
    })

    notifyNotificationsChanged()
  }, [boardId, mentionedCardIds])

  return { mentionedCardIds, markCardMentionsRead }
}