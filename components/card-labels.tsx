"use client"

import * as React from "react"
import { Check, Tags } from "lucide-react"

import type { BoardLabelModel } from "@/lib/label-display"
import { getLabelDisplayName } from "@/lib/label-display"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

export function CardLabels({
  boardId,
  cardId,
  boardLabels,
  cardLabels,
  canEdit,
  canManage,
  onLabelsChange,
  onEditLabels,
}: {
  boardId: string
  cardId: string
  boardLabels: BoardLabelModel[]
  cardLabels: BoardLabelModel[]
  canEdit: boolean
  canManage: boolean
  onLabelsChange: (labels: BoardLabelModel[]) => void
  onEditLabels?: () => void
}) {
  const selectedIds = React.useMemo(
    () => new Set(cardLabels.map((label) => label.id)),
    [cardLabels]
  )

  function buildLabelsFromIds(nextIds: string[]) {
    const idSet = new Set(nextIds)
    return boardLabels
      .filter((label) => idSet.has(label.id))
      .sort((left, right) => left.order - right.order)
  }

  async function persistLabels(nextIds: string[], previousLabels: BoardLabelModel[]) {
    const response = await fetch(
      `/api/boards/${boardId}/cards/${cardId}/labels`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ labelIds: nextIds }),
      }
    )

    if (!response.ok) {
      onLabelsChange(previousLabels)
      toast({
        title: "Something went wrong.",
        description: "Card labels were not saved. Please try again.",
        variant: "destructive",
      })
      return
    }

    onLabelsChange(await response.json())
  }

  function toggleLabel(labelId: string) {
    if (!canEdit) {
      return
    }

    const previousLabels = cardLabels
    const nextIds = selectedIds.has(labelId)
      ? cardLabels
          .map((label) => label.id)
          .filter((id) => id !== labelId)
      : [...cardLabels.map((label) => label.id), labelId]

    onLabelsChange(buildLabelsFromIds(nextIds))
    void persistLabels(nextIds, previousLabels)
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Tags className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Labels</h3>
        </div>
        {canManage && onEditLabels && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={onEditLabels}
          >
            Edit labels
          </Button>
        )}
      </div>

      <div className="pl-6">
        {boardLabels.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {canManage
              ? "No labels yet. Use Edit labels to create board labels."
              : "No labels on this board."}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {boardLabels.map((label) => {
              const selected = selectedIds.has(label.id)
              const displayName = getLabelDisplayName(label)

              return (
                <button
                  key={label.id}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => toggleLabel(label.id)}
                  className={cn(
                    "inline-flex min-h-8 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-white transition-opacity",
                    selected ? "opacity-100 ring-2 ring-offset-2" : "opacity-70 hover:opacity-100",
                    !canEdit && "cursor-default"
                  )}
                  style={{
                    backgroundColor: label.color,
                    ...(selected ? { ringColor: label.color } : {}),
                  }}
                  title={displayName}
                >
                  {selected && <Check className="h-3.5 w-3.5" />}
                  <span className="max-w-[160px] truncate">
                    {label.name.trim() || "\u00a0"}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}