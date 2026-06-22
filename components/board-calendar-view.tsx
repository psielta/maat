"use client"

import * as React from "react"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"

import type { BoardCardModel } from "@/components/board-view"
import { CardDateBadge } from "@/components/card-date-badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type CalendarCard = BoardCardModel & {
  listTitle: string
}

function buildCardsByDueDate(cards: CalendarCard[]) {
  const map = new Map<string, CalendarCard[]>()

  for (const card of cards) {
    if (!card.dueAt) {
      continue
    }

    const dueDate = parseISO(card.dueAt)
    const key = format(dueDate, "yyyy-MM-dd")
    const existing = map.get(key) ?? []
    existing.push(card)
    map.set(key, existing)
  }

  return map
}

export function BoardCalendarView({
  lists,
  onOpenCard,
}: {
  lists: Array<{
    id: string
    title: string
    cards: BoardCardModel[]
  }>
  onOpenCard: (card: BoardCardModel) => void
}) {
  const [month, setMonth] = React.useState(() => startOfMonth(new Date()))

  const cards = React.useMemo(
    () =>
      lists.flatMap((list) =>
        list.cards.map((card) => ({
          ...card,
          listTitle: list.title,
        }))
      ),
    [lists]
  )

  const cardsByDueDate = React.useMemo(
    () => buildCardsByDueDate(cards),
    [cards]
  )

  const days = React.useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [month])

  return (
    <div className="flex flex-1 flex-col overflow-hidden p-4">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-hidden rounded-xl border border-black/5 bg-white/70 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/20">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 px-0"
            onClick={() => setMonth((current) => addMonths(current, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-semibold">{format(month, "MMMM yyyy")}</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 px-0"
            onClick={() => setMonth((current) => addMonths(current, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 border-b text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
            <div key={label} className="px-2 py-2">
              {label}
            </div>
          ))}
        </div>

        <div className="grid flex-1 auto-rows-fr grid-cols-7 overflow-y-auto">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd")
            const dayCards = cardsByDueDate.get(key) ?? []
            const inMonth = isSameMonth(day, month)
            const isToday = isSameDay(day, new Date())

            return (
              <div
                key={key}
                className={cn(
                  "min-h-[110px] border-b border-r p-1.5",
                  !inMonth && "bg-muted/20 text-muted-foreground"
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                      isToday && "bg-primary text-primary-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {dayCards.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {dayCards.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {dayCards.slice(0, 3).map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => onOpenCard(card)}
                      className="w-full rounded-md border border-black/5 bg-card px-1.5 py-1 text-left shadow-sm transition-colors hover:border-primary/40 dark:border-white/10"
                    >
                      <p className="line-clamp-1 text-[11px] font-medium leading-tight">
                        {card.title}
                      </p>
                      <p className="line-clamp-1 text-[10px] text-muted-foreground">
                        {card.listTitle}
                      </p>
                      <CardDateBadge
                        dates={card}
                        className="mt-1 [&_span]:text-[10px]"
                      />
                    </button>
                  ))}
                  {dayCards.length > 3 && (
                    <p className="px-1 text-[10px] text-muted-foreground">
                      +{dayCards.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}