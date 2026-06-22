import type { BoardLabelModel } from "@/lib/label-display"
import { getLabelDisplayName } from "@/lib/label-display"
import { cn } from "@/lib/utils"

export function CardLabelStrips({
  labels,
  className,
}: {
  labels: BoardLabelModel[]
  className?: string
}) {
  if (labels.length === 0) {
    return null
  }

  return (
    <div className={cn("flex gap-0.5 px-3 pt-2", className)}>
      {labels.map((label) => (
        <span
          key={label.id}
          className="h-2 min-w-[40px] flex-1 rounded-sm"
          style={{ backgroundColor: label.color }}
          title={getLabelDisplayName(label)}
        />
      ))}
    </div>
  )
}