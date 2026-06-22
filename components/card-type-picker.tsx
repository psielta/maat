"use client"

import { Shapes } from "lucide-react"

import {
  BOARD_CARD_TYPES,
  getCardTypeMeta,
  type BoardCardTypeValue,
} from "@/lib/card-type-display"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

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
        title: "Something went wrong.",
        description: "Card type was not saved. Please try again.",
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
        <h3 className="text-sm font-semibold">Type</h3>
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
              {meta.label}
            </Button>
          )
        })}
      </div>
    </section>
  )
}