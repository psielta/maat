"use client"

import * as React from "react"
import { LayoutTemplate, Plus } from "lucide-react"

import type { BoardCardModel, BoardListModel } from "@/components/board-view"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"

type TemplateSummary = {
  id: string
  title: string
  listTitle: string
}

export function CreateFromTemplateMenu({
  boardId,
  listId,
  canEdit,
  onCardCreated,
}: {
  boardId: string
  listId: string
  canEdit: boolean
  onCardCreated: (card: BoardCardModel) => void
}) {
  const [templates, setTemplates] = React.useState<TemplateSummary[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  async function loadTemplates() {
    setIsLoading(true)
    const response = await fetch(`/api/boards/${boardId}/cards/templates`)
    setIsLoading(false)

    if (!response.ok) {
      return
    }

    setTemplates(await response.json())
  }

  async function createFromTemplate(templateId: string) {
    const response = await fetch(
      `/api/boards/${boardId}/cards/${templateId}/from-template`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ listId }),
      }
    )

    if (!response.ok) {
      toast({
        title: "Something went wrong.",
        description: "Card was not created from template. Please try again.",
        variant: "destructive",
      })
      return
    }

    onCardCreated(await response.json())
    toast({ description: "Card created from template." })
  }

  if (!canEdit) {
    return null
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) {
          void loadTemplates()
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <LayoutTemplate className="h-4 w-4" />
          Create from template
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {isLoading ? (
          <DropdownMenuItem disabled>Loading templates…</DropdownMenuItem>
        ) : templates.length === 0 ? (
          <DropdownMenuItem disabled>No templates on this board</DropdownMenuItem>
        ) : (
          templates.map((template) => (
            <DropdownMenuItem
              key={template.id}
              onClick={() => void createFromTemplate(template.id)}
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{template.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {template.listTitle}
                </p>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function CardTemplateActions({
  boardId,
  card,
  lists,
  canEdit,
  onCardUpdated,
  onCardCreated,
}: {
  boardId: string
  card: BoardCardModel
  lists: BoardListModel[]
  canEdit: boolean
  onCardUpdated: (card: BoardCardModel) => void
  onCardCreated: (card: BoardCardModel, listId: string) => void
}) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [targetListId, setTargetListId] = React.useState(card.listId)
  const [titleOverride, setTitleOverride] = React.useState(card.title)

  async function toggleTemplate() {
    const response = await fetch(`/api/boards/${boardId}/cards/${card.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isTemplate: !card.isTemplate }),
    })

    if (!response.ok) {
      toast({
        title: "Something went wrong.",
        description: "Template setting was not saved. Please try again.",
        variant: "destructive",
      })
      return
    }

    const updated = await response.json()
    onCardUpdated({
      ...card,
      ...updated,
      customFieldValues: card.customFieldValues,
      labels: card.labels,
      checklists: card.checklists,
      linkedCount: card.linkedCount,
    })
    toast({
      description: updated.isTemplate
        ? "Card marked as template."
        : "Template removed from card.",
    })
  }

  async function createFromTemplate() {
    const response = await fetch(
      `/api/boards/${boardId}/cards/${card.id}/from-template`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listId: targetListId,
          title: titleOverride.trim() || undefined,
        }),
      }
    )

    if (!response.ok) {
      toast({
        title: "Something went wrong.",
        description: "Card was not created from template. Please try again.",
        variant: "destructive",
      })
      return
    }

    const created = await response.json()
    onCardCreated(created, targetListId)
    setIsDialogOpen(false)
    toast({ description: "Card created from template." })
  }

  if (!canEdit) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant="outline" onClick={toggleTemplate}>
        <LayoutTemplate className="mr-2 h-4 w-4" />
        {card.isTemplate ? "Remove template" : "Make template"}
      </Button>
      {card.isTemplate ? (
        <Button type="button" size="sm" onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create card from template
        </Button>
      ) : null}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create card from template</DialogTitle>
            <DialogDescription>
              Choose the destination list and optional title for the new card.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">List</label>
              <select
                value={targetListId}
                onChange={(event) => setTargetListId(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={titleOverride}
                onChange={(event) => setTitleOverride(event.target.value)}
                placeholder="Card title"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => void createFromTemplate()}>
              Create card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}