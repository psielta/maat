"use client"

import * as React from "react"
import { LayoutTemplate, Plus } from "lucide-react"

import type { BoardCardModel, BoardListModel } from "@/components/board-view"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
import { m } from "@/lib/i18n"

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
  const msgs = m()
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
        title: msgs.common.errorTitle,
        description: msgs.toast.templateCardNotCreated,
        variant: "destructive",
      })
      return
    }

    onCardCreated(await response.json())
    toast({ description: msgs.toast.templateCardCreated })
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
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-foreground"
                aria-label={msgs.card.createFromTemplateAria}
              >
                <LayoutTemplate className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            {msgs.board.createFromTemplateTooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="start" className="w-72">
        {isLoading ? (
          <DropdownMenuItem disabled>
            {msgs.board.loadingTemplates}
          </DropdownMenuItem>
        ) : templates.length === 0 ? (
          <DropdownMenuItem disabled>{msgs.board.noTemplates}</DropdownMenuItem>
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
  const msgs = m()
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
        title: msgs.common.errorTitle,
        description: msgs.toast.templateNotSaved,
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
        ? msgs.toast.cardMarkedTemplate
        : msgs.toast.templateRemoved,
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
        title: msgs.common.errorTitle,
        description: msgs.toast.templateCardNotCreated,
        variant: "destructive",
      })
      return
    }

    const created = await response.json()
    onCardCreated(created, targetListId)
    setIsDialogOpen(false)
    toast({ description: msgs.toast.templateCardCreated })
  }

  if (!canEdit) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant="outline" onClick={toggleTemplate}>
        <LayoutTemplate className="mr-2 h-4 w-4" />
        {card.isTemplate ? msgs.card.removeTemplate : msgs.card.makeTemplate}
      </Button>
      {card.isTemplate ? (
        <Button type="button" size="sm" onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {msgs.card.createFromTemplate}
        </Button>
      ) : null}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{msgs.card.createFromTemplateTitle}</DialogTitle>
            <DialogDescription>
              {msgs.card.createFromTemplateDesc}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">{msgs.card.list}</label>
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
              <label className="text-sm font-medium">{msgs.card.title}</label>
              <Input
                value={titleOverride}
                onChange={(event) => setTitleOverride(event.target.value)}
                placeholder={msgs.card.title}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => void createFromTemplate()}>
              {msgs.card.createCard}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}