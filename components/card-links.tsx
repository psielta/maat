"use client"

import * as React from "react"
import { Link2, Search, Unlink } from "lucide-react"

import type { BoardCardModel } from "@/components/board-view"
import type { CardLinkModel } from "@/lib/card-link-display"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { m } from "@/lib/i18n"

export function CardLinks({
  boardId,
  cardId,
  boardCards,
  canEdit,
  onOpenCard,
  listTitlesById,
  onLinkedCountDelta,
}: {
  boardId: string
  cardId: string
  boardCards: BoardCardModel[]
  listTitlesById: Record<string, string>
  canEdit: boolean
  onOpenCard: (card: BoardCardModel) => void
  onLinkedCountDelta: (cardId: string, delta: number) => void
}) {
  const msgs = m()
  const [links, setLinks] = React.useState<CardLinkModel[]>([])
  const [query, setQuery] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false

    async function loadLinks() {
      setIsLoading(true)
      const response = await fetch(
        `/api/boards/${boardId}/cards/${cardId}/links`
      )

      if (!response.ok) {
        if (!cancelled) {
          setIsLoading(false)
        }
        return
      }

      const payload = (await response.json()) as CardLinkModel[]
      if (!cancelled) {
        setLinks(payload)
        setIsLoading(false)
      }
    }

    void loadLinks()

    return () => {
      cancelled = true
    }
  }, [boardId, cardId])

  const linkedIds = React.useMemo(
    () => new Set(links.map((link) => link.card.id)),
    [links]
  )

  const searchResults = React.useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return []
    }

    return boardCards
      .filter((card) => {
        if (card.id === cardId) return false
        if (linkedIds.has(card.id)) return false

        const haystack = [
          card.title,
          card.displayId ?? "",
        ]
          .join(" ")
          .toLowerCase()

        return haystack.includes(normalized)
      })
      .slice(0, 8)
  }, [boardCards, cardId, linkedIds, query])

  async function addLink(targetCardId: string) {
    const response = await fetch(
      `/api/boards/${boardId}/cards/${cardId}/links`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ targetCardId }),
      }
    )

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      toast({
        title: msgs.common.errorTitle,
        description: payload?.message ?? msgs.toast.cardLinksNotCreated,
        variant: "destructive",
      })
      return
    }

    const link = (await response.json()) as CardLinkModel
    setLinks((current) => [...current, link])
    onLinkedCountDelta(cardId, 1)
    onLinkedCountDelta(link.card.id, 1)
    setQuery("")
  }

  async function removeLink(linkId: string, linkedCardId: string) {
    const previous = links
    const next = links.filter((link) => link.id !== linkId)
    setLinks(next)
    onLinkedCountDelta(cardId, -1)

    const response = await fetch(
      `/api/boards/${boardId}/cards/${cardId}/links/${linkId}`,
      {
        method: "DELETE",
      }
    )

    if (!response.ok) {
      setLinks(previous)
      onLinkedCountDelta(cardId, 1)
      toast({
        title: msgs.common.errorTitle,
        description: msgs.toast.cardLinksNotRemoved,
        variant: "destructive",
      })
      return
    }

    onLinkedCountDelta(linkedCardId, -1)
  }

  function openLinkedCard(link: CardLinkModel) {
    const card = boardCards.find((item) => item.id === link.card.id)
    if (!card) {
      toast({
        title: msgs.toast.cardUnavailable,
        description: msgs.toast.cardUnavailableDesc,
      })
      return
    }

    onOpenCard(card)
  }

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <Link2 className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{msgs.card.linkedCards}</h3>
      </div>

      <div className="space-y-3 pl-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">
            {msgs.card.loadingLinks}
          </p>
        ) : links.length === 0 ? (
          <p className="text-sm text-muted-foreground">{msgs.card.noLinks}</p>
        ) : (
          <ul className="space-y-2">
            {links.map((link) => (
              <li
                key={link.id}
                className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => openLinkedCard(link)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-medium">{link.card.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {link.card.displayId
                      ? `${link.card.displayId} · `
                      : ""}
                    {link.card.listTitle}
                  </p>
                </button>
                {canEdit ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 p-0"
                    onClick={() => void removeLink(link.id, link.card.id)}
                    aria-label={msgs.card.unlinkCard.replace(
                      "{title}",
                      link.card.title
                    )}
                  >
                    <Unlink className="h-4 w-4" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {canEdit ? (
          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={msgs.card.searchLinks}
                className="pl-8"
              />
            </div>
            {searchResults.length > 0 ? (
              <ul className="overflow-hidden rounded-md border">
                {searchResults.map((card) => (
                  <li key={card.id}>
                    <button
                      type="button"
                      onClick={() => void addLink(card.id)}
                      className="flex w-full flex-col items-start px-3 py-2 text-left transition-colors hover:bg-muted/60"
                    >
                      <span className="text-sm font-medium">{card.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {card.displayId ? `${card.displayId} · ` : ""}
                        {listTitlesById[card.listId] ?? msgs.card.listFallback}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}