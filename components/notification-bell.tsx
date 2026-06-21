"use client"

import * as React from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Bell } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type NotificationData = {
  boardId?: string
  boardTitle?: string
  cardId?: string
  cardTitle?: string
  actorName?: string
  snippet?: string
}

type NotificationItem = {
  id: string
  type: string
  data: NotificationData
  readAt: string | null
  createdAt: string
  actor: {
    name: string | null
    email: string | null
    image: string | null
  } | null
}

function describe(item: NotificationItem) {
  const data = item.data || {}
  const actor = data.actorName || item.actor?.name || item.actor?.email || "Someone"
  if (item.type === "comment.created") {
    return `${actor} commented on “${data.cardTitle ?? "a card"}”`
  }
  if (item.type === "comment.mentioned") {
    return `${actor} mentioned you on “${data.cardTitle ?? "a card"}”`
  }
  return `${actor} updated ${data.boardTitle ?? "a board"}`
}

export function NotificationBell({ className }: { className?: string }) {
  const [items, setItems] = React.useState<NotificationItem[]>([])
  const [unread, setUnread] = React.useState(0)
  const [open, setOpen] = React.useState(false)

  const load = React.useCallback(async () => {
    const response = await fetch("/api/notifications")
    if (response.ok) {
      const data = await response.json()
      setItems(data.items)
      setUnread(data.unreadCount)
    }
  }, [])

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

  async function markAllRead() {
    if (unread === 0) return
    setUnread(0)
    await fetch("/api/notifications", { method: "PATCH" })
  }

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      void markAllRead()
    }
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className={cn(
            "relative flex h-9 w-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent",
            className
          )}
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              {unread} new
            </span>
          )}
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="divide-y">
              {items.map((item) => {
                const data = item.data || {}
                const href = data.boardId
                  ? `/dashboard/boards/${data.boardId}`
                  : "/dashboard"
                return (
                  <li key={item.id}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex gap-2.5 px-3 py-2.5 transition-colors hover:bg-accent",
                        !item.readAt && "bg-primary/5"
                      )}
                    >
                      <Avatar className="mt-0.5 h-7 w-7 shrink-0">
                        {item.actor?.image && (
                          <AvatarImage
                            src={item.actor.image}
                            alt={item.actor.name ?? ""}
                          />
                        )}
                        <AvatarFallback className="bg-primary/15 text-[11px] font-semibold text-primary">
                          {(data.actorName || item.actor?.name || "?")
                            .slice(0, 1)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug">{describe(item)}</p>
                        {data.snippet && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {data.snippet}
                          </p>
                        )}
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(item.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      {!item.readAt && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
