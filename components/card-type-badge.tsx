import {
  getCardTypeMeta,
  shouldShowCardTypeBadge,
  type BoardCardTypeValue,
} from "@/lib/card-type-display"
import { m } from "@/lib/i18n"
import { cn } from "@/lib/utils"

function getCardTypeLabel(type: BoardCardTypeValue) {
  const msgs = m()
  switch (type) {
    case "TASK":
      return msgs.cardTypes.task
    case "BUG":
      return msgs.cardTypes.bug
    case "FEATURE":
      return msgs.cardTypes.feature
    case "EPIC":
      return msgs.cardTypes.epic
    default:
      return msgs.common.noType
  }
}

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
      {getCardTypeLabel(cardType)}
    </span>
  )
}