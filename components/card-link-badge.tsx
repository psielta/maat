import { Link2 } from "lucide-react"

import { cn } from "@/lib/utils"

export function CardLinkBadge({
  linkedCount,
  className,
}: {
  linkedCount: number
  className?: string
}) {
  if (linkedCount <= 0) {
    return null
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border bg-muted/70 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground",
        className
      )}
    >
      <Link2 className="h-3 w-3" />
      {linkedCount}
    </span>
  )
}