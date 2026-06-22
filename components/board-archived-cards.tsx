"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

import type { ArchivedCardModel } from "@/lib/card-archive"
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

export function BoardArchivedCards({
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
  const [isLoading, setIsLoading] = React.useState(false)
  const [deleteCardId, setDeleteCardId] = React.useState<string | null>(null)
  const [busyCardId, setBusyCardId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false

    async function loadArchivedCards() {
      setIsLoading(true)

      const response = await fetch(`/api/boards/${boardId}/cards/archived`)

      if (cancelled) {
        return
      }

      setIsLoading(false)

      if (!response.ok) {
        toast({
          title: "Something went wrong.",
          description: "Archived cards could not be loaded. Please try again.",
          variant: "destructive",
        })
        return
      }

      setCards(await response.json())
    }

    void loadArchivedCards()

    return () => {
      cancelled = true
    }
  }, [boardId, open])

  async function restoreCard(cardId: string) {
    setBusyCardId(cardId)

    const response = await fetch(`/api/boards/${boardId}/cards/${cardId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ archived: false }),
    })

    setBusyCardId(null)

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

  async function deleteCard(cardId: string) {
    setBusyCardId(cardId)

    const response = await fetch(`/api/boards/${boardId}/cards/${cardId}`, {
      method: "DELETE",
    })

    setBusyCardId(null)
    setDeleteCardId(null)

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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Archived cards</DialogTitle>
            <DialogDescription>
              Cards removed from the board stay here until restored or deleted
              permanently.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[420px] space-y-2 overflow-y-auto">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : cards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No archived cards.</p>
            ) : (
              cards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{card.title}</p>
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
                        disabled={busyCardId === card.id}
                        onClick={() => void restoreCard(card.id)}
                      >
                        Send to board
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 px-0 text-destructive hover:text-destructive"
                        disabled={busyCardId === card.id}
                        onClick={() => setDeleteCardId(card.id)}
                        aria-label="Delete card permanently"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteCardId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeleteCardId(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete card permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The card and all of its comments,
              attachments, and checklists will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteCardId) {
                  void deleteCard(deleteCardId)
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