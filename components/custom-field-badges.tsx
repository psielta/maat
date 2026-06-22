import { Check } from "lucide-react"

import {
  type CustomFieldDefinitionModel,
  getFrontCustomFieldBadges,
} from "@/lib/custom-field-display"
import type { CustomFieldClientValue } from "@/lib/custom-field-values"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function CustomFieldBadges({
  fields,
  values,
  className,
}: {
  fields: CustomFieldDefinitionModel[]
  values?: CustomFieldClientValue[]
  className?: string
}) {
  const badges = getFrontCustomFieldBadges(fields, values ?? [])

  if (badges.length === 0) {
    return null
  }

  return (
    <div className={cn("mt-2 flex flex-wrap gap-1.5", className)}>
      {badges.map((badge) => {
        if (badge.field.type === "DROPDOWN" && badge.option) {
          return (
            <Badge
              key={badge.field.id}
              className="max-w-full truncate border-0 text-[11px] font-medium text-white"
              style={{ backgroundColor: badge.option.color }}
            >
              {badge.option.label}
            </Badge>
          )
        }

        if (badge.field.type === "CHECKBOX") {
          return (
            <Badge
              key={badge.field.id}
              variant="secondary"
              className="max-w-full gap-1 truncate text-[11px]"
            >
              <Check className="h-3 w-3" />
              {badge.displayValue}
            </Badge>
          )
        }

        return (
          <Badge
            key={badge.field.id}
            variant="secondary"
            className="max-w-full truncate text-[11px]"
          >
            {badge.field.type === "TEXT" || badge.field.type === "NUMBER"
              ? `${badge.field.name}: ${badge.displayValue}`
              : badge.displayValue}
          </Badge>
        )
      })}
    </div>
  )
}