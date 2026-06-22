import { Check, Clock } from "lucide-react"

import {
  type CardDatesModel,
  dueStatusStyles,
  formatDueBadgeLabel,
  formatStartBadgeLabel,
  getDueStatus,
} from "@/lib/card-dates"
import { cn } from "@/lib/utils"

export function CardDateBadge({
  dates,
  className,
}: {
  dates: Pick<CardDatesModel, "startDate" | "dueAt" | "dueComplete">
  className?: string
}) {
  const dueStatus = getDueStatus(dates.dueAt, dates.dueComplete)
  const hasDue = dates.dueAt && dueStatus !== "none"
  const hasStart = Boolean(dates.startDate)

  if (!hasDue && !hasStart) {
    return null
  }

  return (
    <div className={cn("mt-2 flex flex-wrap items-center gap-1.5", className)}>
      {hasStart && dates.startDate && (
        <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/70 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatStartBadgeLabel(dates.startDate)}
        </span>
      )}
      {hasDue && dates.dueAt && (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium",
            dueStatusStyles[dueStatus].className,
            dueStatus === "complete" && "line-through"
          )}
        >
          {dueStatus === "complete" ? (
            <Check className="h-3 w-3" />
          ) : (
            <Clock className="h-3 w-3" />
          )}
          {formatDueBadgeLabel(dates.dueAt)}
        </span>
      )}
    </div>
  )
}