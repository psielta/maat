"use client"

import * as React from "react"
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Pencil, Trash2 } from "lucide-react"

import type { ChecklistItemModel, ChecklistModel } from "@/lib/checklist-display"
import { getChecklistProgress } from "@/lib/checklist-display"
import { m } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"
import { cn } from "@/lib/utils"

function reindexItems(items: ChecklistItemModel[]) {
  return items.map((item, index) => ({
    ...item,
    order: index,
  }))
}

function SortableChecklistItem({
  item,
  canEdit,
  onToggle,
  onTextChange,
  onDelete,
}: {
  item: ChecklistItemModel
  canEdit: boolean
  onToggle: (itemId: string, isComplete: boolean) => void
  onTextChange: (itemId: string, text: string) => void
  onDelete: (itemId: string) => void
}) {
  const msgs = m()
  const [isEditing, setIsEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(item.text)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: !canEdit,
  })

  React.useEffect(() => {
    if (!isEditing) {
      setDraft(item.text)
    }
  }, [item.text, isEditing])

  function commitText() {
    const nextText = draft.trim()
    setIsEditing(false)

    if (!nextText || nextText === item.text) {
      setDraft(item.text)
      return
    }

    onTextChange(item.id, nextText)
  }

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "group flex items-start gap-2 rounded-md px-1 py-1.5",
        isDragging && "opacity-50"
      )}
    >
      {canEdit && (
        <button
          type="button"
          className="mt-0.5 cursor-grab touch-none text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          aria-label={msgs.checklist.reorderItem}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <Checkbox
        id={`checklist-item-${item.id}`}
        checked={item.isComplete}
        disabled={!canEdit}
        onCheckedChange={(checked) => onToggle(item.id, checked === true)}
        className="mt-0.5"
      />
      {isEditing ? (
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitText}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              commitText()
            }
            if (event.key === "Escape") {
              setDraft(item.text)
              setIsEditing(false)
            }
          }}
          autoFocus
          className="h-7 flex-1 text-sm"
        />
      ) : (
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => canEdit && setIsEditing(true)}
          className={cn(
            "min-h-7 flex-1 text-left text-sm leading-6",
            item.isComplete && "text-muted-foreground line-through",
            canEdit && "rounded-sm hover:bg-muted/60"
          )}
        >
          {item.text}
        </button>
      )}
      {canEdit && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 shrink-0 px-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => onDelete(item.id)}
          aria-label={msgs.checklist.deleteItem}
        >
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      )}
    </li>
  )
}

export function ChecklistPanel({
  boardId,
  cardId,
  checklist,
  canEdit,
  onChecklistChange,
  onChecklistDelete,
}: {
  boardId: string
  cardId: string
  checklist: ChecklistModel
  canEdit: boolean
  onChecklistChange: (next: ChecklistModel) => void
  onChecklistDelete: () => void
}) {
  const msgs = m()
  const [items, setItems] = React.useState(checklist.items)
  const [titleDraft, setTitleDraft] = React.useState(checklist.title)
  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [newItemDraft, setNewItemDraft] = React.useState("")
  const [isAddingItem, setIsAddingItem] = React.useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  React.useEffect(() => {
    setItems(checklist.items)
    setTitleDraft(checklist.title)
  }, [checklist])

  const progress = getChecklistProgress(items)
  const sortedItems = React.useMemo(
    () => [...items].sort((left, right) => left.order - right.order),
    [items]
  )

  function syncChecklist(nextItems: ChecklistItemModel[]) {
    onChecklistChange({
      ...checklist,
      items: nextItems,
    })
  }

  async function persistItemPatch(
    itemId: string,
    body: { text?: string; isComplete?: boolean },
    previousItems: ChecklistItemModel[]
  ) {
    const response = await fetch(
      `/api/boards/${boardId}/cards/${cardId}/checklists/${checklist.id}/items/${itemId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    )

    if (!response.ok) {
      setItems(previousItems)
      syncChecklist(previousItems)
      toast({
        title: msgs.common.errorTitle,
        description: msgs.toast.checklistItemNotSaved,
        variant: "destructive",
      })
      return
    }

    const item = await response.json()
    const nextItems = reindexItems(
      previousItems.map((current) =>
        current.id === itemId ? { ...current, ...item } : current
      )
    )
    setItems(nextItems)
    syncChecklist(nextItems)
  }

  function handleToggle(itemId: string, isComplete: boolean) {
    const previousItems = items
    const nextItems = items.map((item) =>
      item.id === itemId ? { ...item, isComplete } : item
    )
    setItems(nextItems)
    syncChecklist(nextItems)
    void persistItemPatch(itemId, { isComplete }, previousItems)
  }

  function handleTextChange(itemId: string, text: string) {
    const previousItems = items
    const nextItems = items.map((item) =>
      item.id === itemId ? { ...item, text } : item
    )
    setItems(nextItems)
    syncChecklist(nextItems)
    void persistItemPatch(itemId, { text }, previousItems)
  }

  async function handleDeleteItem(itemId: string) {
    const previousItems = items
    const nextItems = reindexItems(items.filter((item) => item.id !== itemId))
    setItems(nextItems)
    syncChecklist(nextItems)

    const response = await fetch(
      `/api/boards/${boardId}/cards/${cardId}/checklists/${checklist.id}/items/${itemId}`,
      {
        method: "DELETE",
      }
    )

    if (!response.ok) {
      setItems(previousItems)
      syncChecklist(previousItems)
      toast({
        title: msgs.common.errorTitle,
        description: msgs.toast.checklistItemNotDeleted,
        variant: "destructive",
      })
    }
  }

  async function handleAddItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const text = newItemDraft.trim()
    if (!text || isAddingItem) {
      return
    }

    setIsAddingItem(true)

    const response = await fetch(
      `/api/boards/${boardId}/cards/${cardId}/checklists/${checklist.id}/items`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      }
    )

    setIsAddingItem(false)

    if (!response.ok) {
      toast({
        title: msgs.common.errorTitle,
        description: msgs.toast.checklistItemNotAdded,
        variant: "destructive",
      })
      return
    }

    const item = await response.json()
    const nextItems = reindexItems([...items, item])
    setItems(nextItems)
    syncChecklist(nextItems)
    setNewItemDraft("")
  }

  async function handleTitleSave() {
    const nextTitle = titleDraft.trim()
    setIsEditingTitle(false)

    if (!nextTitle || nextTitle === checklist.title) {
      setTitleDraft(checklist.title)
      return
    }

    const response = await fetch(
      `/api/boards/${boardId}/cards/${cardId}/checklists/${checklist.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: nextTitle }),
      }
    )

    if (!response.ok) {
      setTitleDraft(checklist.title)
      toast({
        title: msgs.common.errorTitle,
        description: msgs.toast.checklistNotRenamed,
        variant: "destructive",
      })
      return
    }

    const nextChecklist = await response.json()
    onChecklistChange({
      ...checklist,
      ...nextChecklist,
      items,
    })
  }

  async function handleDeleteChecklist() {
    if (!window.confirm(msgs.checklist.confirmDelete)) {
      return
    }

    const response = await fetch(
      `/api/boards/${boardId}/cards/${cardId}/checklists/${checklist.id}`,
      {
        method: "DELETE",
      }
    )

    if (!response.ok) {
      toast({
        title: msgs.common.errorTitle,
        description: msgs.toast.checklistNotDeleted,
        variant: "destructive",
      })
      return
    }

    onChecklistDelete()
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = sortedItems.findIndex((item) => item.id === active.id)
    const newIndex = sortedItems.findIndex((item) => item.id === over.id)

    if (oldIndex < 0 || newIndex < 0) {
      return
    }

    const previousItems = items
    const nextItems = reindexItems(arrayMove(sortedItems, oldIndex, newIndex))
    setItems(nextItems)
    syncChecklist(nextItems)

    const response = await fetch(
      `/api/boards/${boardId}/cards/${cardId}/checklists/${checklist.id}/items/reorder`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemIds: nextItems.map((item) => item.id),
        }),
      }
    )

    if (!response.ok) {
      setItems(previousItems)
      syncChecklist(previousItems)
      toast({
        title: msgs.common.errorTitle,
        description: msgs.toast.checklistOrderNotSaved,
        variant: "destructive",
      })
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-border/70 p-3">
      <div className="flex items-start justify-between gap-2">
        {isEditingTitle ? (
          <Input
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void handleTitleSave()
              }
              if (event.key === "Escape") {
                setTitleDraft(checklist.title)
                setIsEditingTitle(false)
              }
            }}
            autoFocus
            className="h-8 flex-1 text-sm font-semibold"
          />
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h4 className="truncate text-sm font-semibold">{checklist.title}</h4>
            {canEdit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 shrink-0 px-0"
                onClick={() => setIsEditingTitle(true)}
                aria-label={msgs.checklist.renameChecklist}
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>
        )}
        {canEdit && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 shrink-0 px-0"
            onClick={handleDeleteChecklist}
            aria-label={msgs.checklist.deleteChecklist}
          >
            <Icons.trash className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        )}
      </div>

      {progress.total > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {msgs.common.percentComplete.replace(
                "{percent}",
                String(progress.percent)
              )}
            </span>
            <span>
              {progress.completed}/{progress.total}
            </span>
          </div>
          <Progress value={progress.percent} className="h-2" />
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedItems.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-0.5">
            {sortedItems.map((item) => (
              <SortableChecklistItem
                key={item.id}
                item={item}
                canEdit={canEdit}
                onToggle={handleToggle}
                onTextChange={handleTextChange}
                onDelete={handleDeleteItem}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {canEdit && (
        <form onSubmit={handleAddItem} className="flex items-center gap-2">
          <Input
            value={newItemDraft}
            onChange={(event) => setNewItemDraft(event.target.value)}
            placeholder={msgs.checklist.addItem}
            className="h-8 flex-1 text-sm"
            disabled={isAddingItem}
          />
          <Button
            type="submit"
            size="sm"
            className="h-8"
            disabled={!newItemDraft.trim() || isAddingItem}
          >
            {msgs.common.add}
          </Button>
        </form>
      )}
    </section>
  )
}