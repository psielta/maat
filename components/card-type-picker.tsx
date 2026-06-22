"use client"

import { Shapes } from "lucide-react"

import {
  BOARD_CARD_TYPES,
  getCardTypeMeta,
  type BoardCardTypeValue,
} from "@/lib/card-type-display"
import { m } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
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

export function CardTypePicker({
  boardId,
  cardId,
  cardType,
  canEdit,
  onCardTypeChange,
}: {
  boardId: string
  cardId: string
  cardType: BoardCardTypeValue
  canEdit: boolean
  onCardTypeChange: (cardType: BoardCardTypeValue) => void
}) {
  const msgs = m()

  async function persistType(nextType: BoardCardTypeValue) {
    const previousType = cardType
    onCardTypeChange(nextType)

    const response = await fetch(`/api/boards/${boardId}/cards/${cardId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cardType: nextType }),
    })

    if (!response.ok) {
      onCardTypeChange(previousType)
      toast({
        title: msgs.common.errorTitle,
        description: msgs.toast.cardTypeNotSaved,
        variant: "destructive",
      })
      return
    }

    const card = await response.json()
    onCardTypeChange(card.cardType)
  }

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <Shapes className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{msgs.card.type}</h3>
      </div>
      <div className="flex flex-wrap gap-2 pl-6">
        {BOARD_CARD_TYPES.map((type) => {
          const meta = getCardTypeMeta(type)
          const Icon = meta.icon
          const isSelected = cardType === type

          return (
            <Button
              key={type}
              type="button"
              size="sm"
              variant={isSelected ? "default" : "outline"}
              disabled={!canEdit}
              className={cn(
                "h-8 gap-1.5",
                !isSelected && meta.className
              )}
              onClick={() => {
                if (!canEdit || isSelected) return
                void persistType(type)
              }}
            >
              {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
              {getCardTypeLabel(type)}
            </Button>
          )
        })}
      </div>
    </section>
  )
}