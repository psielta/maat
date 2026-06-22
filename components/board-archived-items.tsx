"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

import type { ArchivedCardModel } from "@/lib/card-archive"
import type { ArchivedListModel } from "@/lib/list-archive"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type DeleteTarget =
  | { type: "card"; id: string }
  | { type: "list"; id: string }
  | null

export function BoardArchivedItems({
  boardId,
  open,
  onOpenChange,
  canEdit,
}: {
  boardId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  canEdit: boolean
}) {
  const router = useRouter()
  const [cards, setCards] = React.useState<ArchivedCardModel[]>([])
  const [lists, setLists] = React.useState<ArchivedListModel[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<DeleteTarget>(null)
  const [busyId, setBusyId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false

    async function loadArchivedItems() {
      setIsLoading(true)

      const [cardsResponse, listsResponse] = await Promise.all([
        fetch(`/api/boards/${boardId}/cards/archived`),
        fetch(`/api/boards/${boardId}/lists/archived`),
      ])

      if (cancelled) {
        return
      }

      setIsLoading(false)

      if (!cardsResponse.ok || !listsResponse.ok) {
        toast({
          title: "Something went wrong.",
          description: "Archived items could not be loaded. Please try again.",
          variant: "destructive",
        })
        return
      }

      setCards(await cardsResponse.json())
      setLists(await listsResponse.json())
    }

    void loadArchivedItems()

    return () => {
      cancelled = true
    }
  }, [boardId, open])

  async function restoreCard(cardId: string) {
    setBusyId(cardId)

    const response = await fetch(`/api/boards/${boardId}/cards/${cardId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ archived: false }),
    })

    setBusyId(null)

    if (!response.ok) {
      toast({
        title: "Something went wrong.",
        description: "The card was not restored. Please try again.",
        variant: "destructive",
      })
      return
    }

    setCards((current) => current.filter((card) => card.id !== cardId))
    router.refresh()
    toast({ description: "Card sent to board." })
  }

  async function restoreList(listId: string) {
    setBusyId(listId)

    const response = await fetch(`/api/boards/${boardId}/lists/${listId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ archived: false }),
    })

    setBusyId(null)

    if (!response.ok) {
      toast({
        title: "Something went wrong.",
        description: "The list was not restored. Please try again.",
        variant: "destructive",
      })
      return
    }

    setLists((current) => current.filter((list) => list.id !== listId))
    router.refresh()
    toast({ description: "List sent to board." })
  }

  async function deleteCard(cardId: string) {
    setBusyId(cardId)

    const response = await fetch(`/api/boards/${boardId}/cards/${cardId}`, {
      method: "DELETE",
    })

    setBusyId(null)
    setDeleteTarget(null)

    if (!response.ok) {
      toast({
        title: "Something went wrong.",
        description: "The card was not deleted. Please try again.",
        variant: "destructive",
      })
      return
    }

    setCards((current) => current.filter((card) => card.id !== cardId))
    router.refresh()
    toast({ description: "Card deleted permanently." })
  }

  async function deleteList(listId: string) {
    setBusyId(listId)

    const response = await fetch(`/api/boards/${boardId}/lists/${listId}`, {
      method: "DELETE",
    })

    setBusyId(null)
    setDeleteTarget(null)

    if (!response.ok) {
      toast({
        title: "Something went wrong.",
        description: "The list was not deleted. Please try again.",
        variant: "destructive",
      })
      return
    }

    setLists((current) => current.filter((list) => list.id !== listId))
    router.refresh()
    toast({ description: "List deleted permanently." })
  }

  const isEmpty = !isLoading && cards.length === 0 && lists.length === 0

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Archived items</DialogTitle>
            <DialogDescription>
              Cards and lists removed from the board stay here until restored or
              deleted permanently.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[420px] space-y-4 overflow-y-auto">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : isEmpty ? (
              <p className="text-sm text-muted-foreground">No archived items.</p>
            ) : (
              <>
                {lists.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Lists
                    </h3>
                    {lists.map((list) => (
                      <div
                        key={list.id}
                        className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {list.title}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {list.cardCount}{" "}
                            {list.cardCount === 1 ? "card" : "cards"}
                            {" · "}
                            Archived{" "}
                            {format(parseISO(list.archivedAt), "MMM d, yyyy")}
                          </p>
                        </div>
                        {canEdit && (
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8"
                              disabled={busyId === list.id}
                              onClick={() => void restoreList(list.id)}
                            >
                              Send to board
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 px-0 text-destructive hover:text-destructive"
                              disabled={busyId === list.id}
                              onClick={() =>
                                setDeleteTarget({ type: "list", id: list.id })
                              }
                              aria-label="Delete list permanently"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </section>
                )}

                {cards.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Cards
                    </h3>
                    {cards.map((card) => (
                      <div
                        key={card.id}
                        className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {card.title}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {card.listTitle}
                            {" · "}
                            Archived{" "}
                            {format(parseISO(card.archivedAt), "MMM d, yyyy")}
                          </p>
                          {card.displayId && (
                            <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                              {card.displayId}
                            </p>
                          )}
                        </div>
                        {canEdit && (
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8"
                              disabled={busyId === card.id}
                              onClick={() => void restoreCard(card.id)}
                            >
                              Send to board
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 px-0 text-destructive hover:text-destructive"
                              disabled={busyId === card.id}
                              onClick={() =>
                                setDeleteTarget({ type: "card", id: card.id })
                              }
                              aria-label="Delete card permanently"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </section>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeleteTarget(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === "list"
                ? "Delete list permanently?"
                : "Delete card permanently?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "list"
                ? "This action cannot be undone. The list and all of its cards will be removed."
                : "This action cannot be undone. The card and all of its comments, attachments, and checklists will be removed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteTarget) {
                  return
                }

                if (deleteTarget.type === "list") {
                  void deleteList(deleteTarget.id)
                } else {
                  void deleteCard(deleteTarget.id)
                }
              }}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}