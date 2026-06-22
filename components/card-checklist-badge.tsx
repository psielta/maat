import { ListChecks } from "lucide-react"

import {
  getCardChecklistSummary,
  type ChecklistModel,
} from "@/lib/checklist-display"
import { cn } from "@/lib/utils"

export function CardChecklistBadge({
  checklists,
  className,
}: {
  checklists: ChecklistModel[]
  className?: string
}) {
  const summary = getCardChecklistSummary(checklists)

  if (summary.total === 0) {
    return null
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-muted/70 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground",
        className
      )}
    >
      <ListChecks className="h-3 w-3" />
      {summary.completed}/{summary.total}
    </span>
  )
}