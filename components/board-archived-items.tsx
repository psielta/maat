"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { ptBR } from "date-fns/locale"

import type { ArchivedCardModel } from "@/lib/card-archive"
import type { ArchivedListModel } from "@/lib/list-archive"
import { m } from "@/lib/i18n"
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

const msg = m()

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
          title: msg.common.errorTitle,
          description: `Não foi possível carregar os itens arquivados. ${msg.common.tryAgain}`,
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
        title: msg.common.errorTitle,
        description: `O card não foi restaurado. ${msg.common.tryAgain}`,
        variant: "destructive",
      })
      return
    }

    setCards((current) => current.filter((card) => card.id !== cardId))
    router.refresh()
    toast({ description: msg.toast.cardRestored })
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
        title: msg.common.errorTitle,
        description: `A lista não foi restaurada. ${msg.common.tryAgain}`,
        variant: "destructive",
      })
      return
    }

    setLists((current) => current.filter((list) => list.id !== listId))
    router.refresh()
    toast({ description: msg.toast.listRestored })
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
        title: msg.common.errorTitle,
        description: `O card não foi excluído. ${msg.common.tryAgain}`,
        variant: "destructive",
      })
      return
    }

    setCards((current) => current.filter((card) => card.id !== cardId))
    router.refresh()
    toast({ description: msg.toast.cardDeletedPermanently })
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
        title: msg.common.errorTitle,
        description: `A lista não foi excluída. ${msg.common.tryAgain}`,
        variant: "destructive",
      })
      return
    }

    setLists((current) => current.filter((list) => list.id !== listId))
    router.refresh()
    toast({ description: msg.toast.listDeletedPermanently })
  }

  const isEmpty = !isLoading && cards.length === 0 && lists.length === 0

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{msg.board.archivedItems}</DialogTitle>
            <DialogDescription>{msg.board.archivedDesc}</DialogDescription>
          </DialogHeader>

          <div className="max-h-[420px] space-y-4 overflow-y-auto">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">{msg.common.loading}</p>
            ) : isEmpty ? (
              <p className="text-sm text-muted-foreground">{msg.board.archivedEmpty}</p>
            ) : (
              <>
                {lists.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {msg.board.archivedLists}
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
                            {list.cardCount === 1
                              ? msg.board.cardCountOne
                              : msg.board.cardCountMany.replace(
                                  "{count}",
                                  String(list.cardCount)
                                )}
                            {" · "}
                            {msg.board.archivedListOn}{" "}
                            {format(parseISO(list.archivedAt), "d MMM yyyy", {
                              locale: ptBR,
                            })}
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
                              {msg.board.restoreToBoard}
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
                              aria-label={msg.board.deleteListPermanently}
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
                      {msg.board.archivedCards}
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
                            {msg.board.archivedOn}{" "}
                            {format(parseISO(card.archivedAt), "d MMM yyyy", {
                              locale: ptBR,
                            })}
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
                              {msg.board.restoreToBoard}
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
                              aria-label={msg.board.deleteCardPermanently}
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
                ? msg.board.confirmDeleteListTitle
                : msg.board.confirmDeleteCardTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "list"
                ? msg.board.confirmDeleteListDesc
                : msg.board.confirmDeleteCardDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{msg.common.cancel}</AlertDialogCancel>
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
              {msg.board.deletePermanently}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}