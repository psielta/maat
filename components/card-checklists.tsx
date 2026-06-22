"use client"

import * as React from "react"
import { ListChecks } from "lucide-react"

import type { ChecklistModel } from "@/lib/checklist-display"
import { sortChecklists } from "@/lib/checklist-display"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { ChecklistPanel } from "@/components/checklist-panel"

export function CardChecklists({
  boardId,
  cardId,
  checklists,
  canEdit,
  onChecklistsChange,
}: {
  boardId: string
  cardId: string
  checklists: ChecklistModel[]
  canEdit: boolean
  onChecklistsChange: (checklists: ChecklistModel[]) => void
}) {
  const [isCreating, setIsCreating] = React.useState(false)
  const sortedChecklists = React.useMemo(
    () => sortChecklists(checklists),
    [checklists]
  )

  function updateChecklist(next: ChecklistModel) {
    onChecklistsChange(
      sortChecklists(
        checklists.map((checklist) =>
          checklist.id === next.id ? next : checklist
        )
      )
    )
  }

  function removeChecklist(checklistId: string) {
    onChecklistsChange(
      checklists.filter((checklist) => checklist.id !== checklistId)
    )
  }

  async function addChecklist() {
    if (isCreating) {
      return
    }

    setIsCreating(true)

    const response = await fetch(
      `/api/boards/${boardId}/cards/${cardId}/checklists`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }
    )

    setIsCreating(false)

    if (!response.ok) {
      toast({
        title: "Something went wrong.",
        description: "Checklist was not created. Please try again.",
        variant: "destructive",
      })
      return
    }

    const checklist = await response.json()
    onChecklistsChange(sortChecklists([...checklists, checklist]))
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Checklists</h3>
        </div>
        {canEdit && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={addChecklist}
            disabled={isCreating}
          >
            Add checklist
          </Button>
        )}
      </div>

      <div className="space-y-3 pl-6">
        {sortedChecklists.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {canEdit
              ? "No checklists yet. Add one to track subtasks on this card."
              : "No checklists on this card."}
          </p>
        ) : (
          sortedChecklists.map((checklist) => (
            <ChecklistPanel
              key={checklist.id}
              boardId={boardId}
              cardId={cardId}
              checklist={checklist}
              canEdit={canEdit}
              onChecklistChange={updateChecklist}
              onChecklistDelete={() => removeChecklist(checklist.id)}
            />
          ))
        )}
      </div>
    </section>
  )
}