import {
  getCardTypeMeta,
  shouldShowCardTypeBadge,
  type BoardCardTypeValue,
} from "@/lib/card-type-display"
import { cn } from "@/lib/utils"

export function CardTypeBadge({
  cardType,
  className,
}: {
  cardType: BoardCardTypeValue
  className?: string
}) {
  if (!shouldShowCardTypeBadge(cardType)) {
    return null
  }

  const meta = getCardTypeMeta(cardType)
  const Icon = meta.icon

  if (!Icon) {
    return null
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-muted/80 px-1.5 py-0.5 text-[11px] font-medium",
        meta.className,
        className
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {meta.label}
    </span>
  )
}