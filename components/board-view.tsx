"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  closestCorners,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
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
import { GripVertical } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"

export type BoardCardModel = {
  id: string
  title: string
  description: string | null
  order: number
  listId: string
}

export type BoardListModel = {
  id: string
  title: string
  order: number
  cards: BoardCardModel[]
}

export type BoardMemberModel = {
  id: string
  role: "OWNER" | "EDITOR" | "VIEWER"
  userId: string
  user: {
    name: string | null
    email: string | null
    image: string | null
  }
}

export type BoardModel = {
  id: string
  title: string
  description: string | null
  authorId: string
  members: BoardMemberModel[]
  lists: BoardListModel[]
}

export type BoardAccessModel = {
  role: "OWNER" | "EDITOR" | "VIEWER"
  canRead: boolean
  canEdit: boolean
  canManage: boolean
}

type CardLocation = {
  listIndex: number
  cardIndex: number
}

function normalizeLists(lists: BoardListModel[]) {
  return [...lists]
    .sort((a, b) => a.order - b.order)
    .map((list, listIndex) => ({
      ...list,
      order: listIndex,
      cards: [...list.cards]
        .sort((a, b) => a.order - b.order)
        .map((card, cardIndex) => ({
          ...card,
          listId: list.id,
          order: cardIndex,
        })),
    }))
}

function findCardLocation(
  lists: BoardListModel[],
  cardId: string
): CardLocation | null {
  for (let listIndex = 0; listIndex < lists.length; listIndex++) {
    const cardIndex = lists[listIndex].cards.findIndex(
      (card) => card.id === cardId
    )

    if (cardIndex !== -1) {
      return { listIndex, cardIndex }
    }
  }

  return null
}

function buildOrderPayload(lists: BoardListModel[]) {
  return {
    lists: lists.map((list) => ({
      id: list.id,
      cards: list.cards.map((card) => card.id),
    })),
  }
}

function SortableCard({
  card,
  canEdit,
  onOpen,
}: {
  card: BoardCardModel
  canEdit: boolean
  onOpen: (card: BoardCardModel) => void
}) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, disabled: !canEdit })

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "group rounded-md border bg-background p-3 shadow-sm transition-colors hover:border-primary/50",
        isDragging && "opacity-60"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          ref={setActivatorNodeRef}
          className="mt-0.5 rounded-sm p-1 text-muted-foreground opacity-60 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
          aria-label="Drag card"
          type="button"
          disabled={!canEdit}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onOpen(card)}
          className="min-w-0 flex-1 text-left"
        >
          <h4 className="break-words text-sm font-medium leading-5">
            {card.title}
          </h4>
          {card.description && (
            <p className="mt-2 line-clamp-3 break-words text-xs leading-5 text-muted-foreground">
              {card.description}
            </p>
          )}
        </button>
      </div>
    </article>
  )
}

function BoardListColumn({
  list,
  canEdit,
  cardDraft,
  onCardDraftChange,
  onCreateCard,
  onRenameList,
  onDeleteList,
  onOpenCard,
}: {
  list: BoardListModel
  canEdit: boolean
  cardDraft: string
  onCardDraftChange: (listId: string, value: string) => void
  onCreateCard: (listId: string) => void
  onRenameList: (listId: string, title: string) => void
  onDeleteList: (listId: string) => void
  onOpenCard: (card: BoardCardModel) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: list.id, disabled: !canEdit })
  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [titleDraft, setTitleDraft] = React.useState(list.title)

  React.useEffect(() => {
    setTitleDraft(list.title)
  }, [list.title])

  function submitTitle() {
    const nextTitle = titleDraft.trim()

    setIsEditingTitle(false)

    if (!nextTitle || nextTitle === list.title) {
      setTitleDraft(list.title)
      return
    }

    onRenameList(list.id, nextTitle)
  }

  return (
    <section className="flex h-full w-[290px] shrink-0 flex-col rounded-md border bg-muted/70">
      <div className="flex items-center gap-2 border-b p-3">
        {isEditingTitle ? (
          <Input
            autoFocus
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={submitTitle}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitTitle()
              if (event.key === "Escape") {
                setIsEditingTitle(false)
                setTitleDraft(list.title)
              }
            }}
            className="h-8 bg-background"
          />
        ) : (
          <button
            type="button"
            onClick={() => canEdit && setIsEditingTitle(true)}
            className="min-w-0 flex-1 text-left text-sm font-semibold"
          >
            <span className="line-clamp-1">{list.title}</span>
          </button>
        )}
        <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
          {list.cards.length}
        </span>
        <button
          type="button"
          className="rounded-md p-1 text-muted-foreground hover:bg-background hover:text-destructive"
          aria-label="Delete list"
          disabled={!canEdit}
          onClick={() => onDeleteList(list.id)}
        >
          <Icons.trash className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[120px] flex-1 flex-col gap-3 p-3 transition-colors",
          isOver && "bg-primary/5"
        )}
      >
        <SortableContext
          items={list.cards.map((card) => card.id)}
          strategy={verticalListSortingStrategy}
        >
          {list.cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              canEdit={canEdit}
              onOpen={onOpenCard}
            />
          ))}
        </SortableContext>
      </div>
      <form
        className="border-t p-3"
        onSubmit={(event) => {
          event.preventDefault()
          onCreateCard(list.id)
        }}
      >
        <Input
          value={cardDraft}
          onChange={(event) => onCardDraftChange(list.id, event.target.value)}
          placeholder="Add a card"
          className="mb-2 bg-background"
          disabled={!canEdit}
        />
        <Button
          type="submit"
          size="sm"
          className="w-full"
          disabled={!canEdit || !cardDraft.trim()}
        >
          <Icons.add className="mr-2 h-4 w-4" />
          Add card
        </Button>
      </form>
    </section>
  )
}

export function BoardView({
  board,
  access,
}: {
  board: BoardModel
  access: BoardAccessModel
}) {
  const router = useRouter()
  const [title, setTitle] = React.useState(board.title)
  const [description, setDescription] = React.useState(board.description ?? "")
  const [isSavingBoard, setIsSavingBoard] = React.useState(false)
  const [lists, setLists] = React.useState(() => normalizeLists(board.lists))
  const [members, setMembers] = React.useState(board.members)
  const [memberEmail, setMemberEmail] = React.useState("")
  const [memberRole, setMemberRole] =
    React.useState<"EDITOR" | "VIEWER">("EDITOR")
  const [isRealtimeConnected, setIsRealtimeConnected] = React.useState(false)
  const [cardDrafts, setCardDrafts] = React.useState<Record<string, string>>({})
  const [listDraft, setListDraft] = React.useState("")
  const [selectedCard, setSelectedCard] =
    React.useState<BoardCardModel | null>(null)
  const [cardTitleDraft, setCardTitleDraft] = React.useState("")
  const [cardDescriptionDraft, setCardDescriptionDraft] = React.useState("")
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
    setTitle(board.title)
    setDescription(board.description ?? "")
    setLists(normalizeLists(board.lists))
    setMembers(board.members)
  }, [board])

  React.useEffect(() => {
    const events = new EventSource(`/api/boards/${board.id}/events`)

    events.addEventListener("ready", () => setIsRealtimeConnected(true))
    events.addEventListener("error", () => setIsRealtimeConnected(false))
    events.addEventListener("board:update", (event) => {
      try {
        JSON.parse((event as MessageEvent).data)
        router.refresh()
      } catch {
        router.refresh()
      }
    })

    return () => {
      events.close()
    }
  }, [board.id, router])

  React.useEffect(() => {
    if (selectedCard) {
      setCardTitleDraft(selectedCard.title)
      setCardDescriptionDraft(selectedCard.description ?? "")
    }
  }, [selectedCard])

  async function saveBoardDetails() {
    if (!access.canEdit) return

    const nextTitle = title.trim()

    if (!nextTitle) {
      setTitle(board.title)
      return
    }

    setIsSavingBoard(true)

    const response = await fetch(`/api/boards/${board.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: nextTitle,
        description: description.trim() || null,
      }),
    })

    setIsSavingBoard(false)

    if (!response.ok) {
      return toast({
        title: "Something went wrong.",
        description: "Your board was not saved. Please try again.",
        variant: "destructive",
      })
    }

    router.refresh()
    return toast({
      description: "Board saved.",
    })
  }

  async function deleteBoard() {
    if (!access.canManage) return
    if (!window.confirm("Delete this board and all of its cards?")) return

    const response = await fetch(`/api/boards/${board.id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      return toast({
        title: "Something went wrong.",
        description: "Your board was not deleted. Please try again.",
        variant: "destructive",
      })
    }

    router.push("/dashboard/boards")
    router.refresh()
  }

  async function persistOrder(nextLists: BoardListModel[]) {
    if (!access.canEdit) return

    const response = await fetch(`/api/boards/${board.id}/reorder`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildOrderPayload(nextLists)),
    })

    if (!response.ok) {
      setLists(normalizeLists(board.lists))
      return toast({
        title: "Something went wrong.",
        description: "The card order was not saved. Please refresh and try again.",
        variant: "destructive",
      })
    }

    router.refresh()
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!access.canEdit) return

    const { active, over } = event

    if (!over || active.id === over.id) return

    const activeId = String(active.id)
    const overId = String(over.id)
    const source = findCardLocation(lists, activeId)

    if (!source) return

    const overListIndex = lists.findIndex((list) => list.id === overId)
    const overCard = findCardLocation(lists, overId)
    const targetListIndex =
      overListIndex !== -1 ? overListIndex : overCard?.listIndex ?? -1

    if (targetListIndex === -1) return

    const nextLists = normalizeLists(lists)

    if (source.listIndex === targetListIndex && overCard) {
      const cards = nextLists[source.listIndex].cards
      nextLists[source.listIndex].cards = arrayMove(
        cards,
        source.cardIndex,
        overCard.cardIndex
      )
    } else {
      const [movedCard] = nextLists[source.listIndex].cards.splice(
        source.cardIndex,
        1
      )
      const targetCards = nextLists[targetListIndex].cards
      const insertIndex = overCard ? overCard.cardIndex : targetCards.length

      targetCards.splice(insertIndex, 0, {
        ...movedCard,
        listId: nextLists[targetListIndex].id,
      })
    }

    const normalized = normalizeLists(nextLists)
    setLists(normalized)
    void persistOrder(normalized)
  }

  async function createList() {
    if (!access.canEdit) return

    const nextTitle = listDraft.trim()

    if (!nextTitle) return

    const response = await fetch(`/api/boards/${board.id}/lists`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: nextTitle,
      }),
    })

    if (!response.ok) {
      return toast({
        title: "Something went wrong.",
        description: "Your list was not created. Please try again.",
        variant: "destructive",
      })
    }

    const list = await response.json()
    setLists((current) =>
      normalizeLists([
        ...current,
        {
          ...list,
          cards: [],
        },
      ])
    )
    setListDraft("")
    router.refresh()
  }

  async function renameList(listId: string, nextTitle: string) {
    if (!access.canEdit) return

    const previousLists = lists
    setLists((current) =>
      current.map((list) =>
        list.id === listId ? { ...list, title: nextTitle } : list
      )
    )

    const response = await fetch(`/api/boards/${board.id}/lists/${listId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: nextTitle,
      }),
    })

    if (!response.ok) {
      setLists(previousLists)
      return toast({
        title: "Something went wrong.",
        description: "Your list was not renamed. Please try again.",
        variant: "destructive",
      })
    }

    router.refresh()
  }

  async function deleteList(listId: string) {
    if (!access.canEdit) return
    if (!window.confirm("Delete this list and all cards in it?")) return

    const previousLists = lists
    setLists((current) => current.filter((list) => list.id !== listId))

    const response = await fetch(`/api/boards/${board.id}/lists/${listId}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      setLists(previousLists)
      return toast({
        title: "Something went wrong.",
        description: "Your list was not deleted. Please try again.",
        variant: "destructive",
      })
    }

    router.refresh()
  }

  async function createCard(listId: string) {
    if (!access.canEdit) return

    const title = cardDrafts[listId]?.trim()

    if (!title) return

    const response = await fetch(`/api/boards/${board.id}/cards`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        listId,
        title,
      }),
    })

    if (!response.ok) {
      return toast({
        title: "Something went wrong.",
        description: "Your card was not created. Please try again.",
        variant: "destructive",
      })
    }

    const card = await response.json()
    setLists((current) =>
      normalizeLists(
        current.map((list) =>
          list.id === listId ? { ...list, cards: [...list.cards, card] } : list
        )
      )
    )
    setCardDrafts((current) => ({
      ...current,
      [listId]: "",
    }))
    router.refresh()
  }

  async function saveSelectedCard() {
    if (!access.canEdit) return
    if (!selectedCard) return

    const nextTitle = cardTitleDraft.trim()

    if (!nextTitle) return

    const response = await fetch(
      `/api/boards/${board.id}/cards/${selectedCard.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: nextTitle,
          description: cardDescriptionDraft.trim() || null,
        }),
      }
    )

    if (!response.ok) {
      return toast({
        title: "Something went wrong.",
        description: "Your card was not saved. Please try again.",
        variant: "destructive",
      })
    }

    const card = await response.json()
    setLists((current) =>
      normalizeLists(
        current.map((list) => ({
          ...list,
          cards: list.cards.map((item) => (item.id === card.id ? card : item)),
        }))
      )
    )
    setSelectedCard(null)
    router.refresh()
  }

  async function deleteSelectedCard() {
    if (!access.canEdit) return
    if (!selectedCard) return
    if (!window.confirm("Delete this card?")) return

    const response = await fetch(
      `/api/boards/${board.id}/cards/${selectedCard.id}`,
      {
        method: "DELETE",
      }
    )

    if (!response.ok) {
      return toast({
        title: "Something went wrong.",
        description: "Your card was not deleted. Please try again.",
        variant: "destructive",
      })
    }

    setLists((current) =>
      current.map((list) => ({
        ...list,
        cards: list.cards.filter((card) => card.id !== selectedCard.id),
      }))
    )
    setSelectedCard(null)
    router.refresh()
  }

  async function shareBoard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!access.canManage) return

    const response = await fetch(`/api/boards/${board.id}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: memberEmail,
        role: memberRole,
      }),
    })

    if (!response.ok) {
      return toast({
        title: "Something went wrong.",
        description:
          response.status === 404
            ? "That user does not exist in this system."
            : "Board access was not updated. Please try again.",
        variant: "destructive",
      })
    }

    const member = await response.json()
    setMembers((current) => {
      const withoutMember = current.filter((item) => item.id !== member.id)
      return [...withoutMember, member]
    })
    setMemberEmail("")
    router.refresh()
  }

  async function updateMemberRole(memberId: string, role: "EDITOR" | "VIEWER") {
    if (!access.canManage) return

    const response = await fetch(
      `/api/boards/${board.id}/members/${memberId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      }
    )

    if (!response.ok) {
      return toast({
        title: "Something went wrong.",
        description: "Member permissions were not updated. Please try again.",
        variant: "destructive",
      })
    }

    const member = await response.json()
    setMembers((current) =>
      current.map((item) => (item.id === member.id ? member : item))
    )
    router.refresh()
  }

  async function removeMember(memberId: string) {
    if (!access.canManage) return

    const response = await fetch(
      `/api/boards/${board.id}/members/${memberId}`,
      {
        method: "DELETE",
      }
    )

    if (!response.ok) {
      return toast({
        title: "Something went wrong.",
        description: "Member access was not removed. Please try again.",
        variant: "destructive",
      })
    }

    setMembers((current) => current.filter((member) => member.id !== memberId))
    router.refresh()
  }

  return (
    <>
      <div className="flex min-h-[calc(100vh-13rem)] flex-col gap-6">
        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-4 rounded-md border bg-card p-4 text-card-foreground md:flex-row md:items-end md:justify-between">
            <div className="grid flex-1 gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/dashboard/boards"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "w-fit px-2"
                  )}
                >
                  <Icons.chevronLeft className="mr-2 h-4 w-4" />
                  Boards
                </Link>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium uppercase text-primary">
                  {access.role.toLowerCase()}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-1 text-xs font-medium",
                    isRealtimeConnected
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isRealtimeConnected ? "Live" : "Offline"}
                </span>
              </div>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={saveBoardDetails}
                disabled={!access.canEdit}
                className="h-auto border-none bg-transparent px-0 text-3xl font-semibold shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-default disabled:opacity-100"
              />
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                onBlur={saveBoardDetails}
                placeholder="Board description"
                disabled={!access.canEdit}
                className="min-h-[70px] resize-none border-none bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-default disabled:opacity-100"
              />
            </div>
            <div className="flex gap-2">
              {access.canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={saveBoardDetails}
                  disabled={isSavingBoard}
                >
                  {isSavingBoard && (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save
                </Button>
              )}
              {access.canManage && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={deleteBoard}
                >
                  <Icons.trash className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-md border bg-card p-4 text-card-foreground">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Members</h2>
              <span className="text-xs text-muted-foreground">
                {members.length}
              </span>
            </div>
            <div className="grid gap-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 rounded-md border bg-background p-2"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {(member.user.name || member.user.email || "?")
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {member.user.name || member.user.email}
                    </p>
                    {member.user.email && (
                      <p className="truncate text-xs text-muted-foreground">
                        {member.user.email}
                      </p>
                    )}
                  </div>
                  {access.canManage && member.role !== "OWNER" ? (
                    <select
                      value={member.role}
                      onChange={(event) =>
                        void updateMemberRole(
                          member.id,
                          event.target.value as "EDITOR" | "VIEWER"
                        )
                      }
                      className="h-8 rounded-md border bg-background px-2 text-xs"
                    >
                      <option value="EDITOR">Editor</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium uppercase text-muted-foreground">
                      {member.role.toLowerCase()}
                    </span>
                  )}
                  {access.canManage && member.role !== "OWNER" && (
                    <button
                      type="button"
                      className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
                      aria-label="Remove member"
                      onClick={() => void removeMember(member.id)}
                    >
                      <Icons.close className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {access.canManage && (
              <form className="mt-3 grid gap-2" onSubmit={shareBoard}>
                <Input
                  type="email"
                  value={memberEmail}
                  onChange={(event) => setMemberEmail(event.target.value)}
                  placeholder="user@example.com"
                />
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <select
                    value={memberRole}
                    onChange={(event) =>
                      setMemberRole(event.target.value as "EDITOR" | "VIEWER")
                    }
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="EDITOR">Editor</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                  <Button type="submit" disabled={!memberEmail.trim()}>
                    Share
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <div className="-mx-4 flex flex-1 gap-4 overflow-x-auto px-4 pb-4">
            {lists.map((list) => (
              <BoardListColumn
                key={list.id}
                list={list}
                canEdit={access.canEdit}
                cardDraft={cardDrafts[list.id] ?? ""}
                onCardDraftChange={(listId, value) =>
                  setCardDrafts((current) => ({
                    ...current,
                    [listId]: value,
                  }))
                }
                onCreateCard={createCard}
                onRenameList={renameList}
                onDeleteList={deleteList}
                onOpenCard={setSelectedCard}
              />
            ))}

            <form
              className="h-fit w-[290px] shrink-0 rounded-md border bg-card p-3"
              onSubmit={(event) => {
                event.preventDefault()
                void createList()
              }}
            >
              <Input
                value={listDraft}
                onChange={(event) => setListDraft(event.target.value)}
                placeholder="Add a list"
                className="mb-2"
                disabled={!access.canEdit}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={!access.canEdit || !listDraft.trim()}
              >
                <Icons.add className="mr-2 h-4 w-4" />
                Add list
              </Button>
            </form>
          </div>
        </DndContext>
      </div>

      <Dialog open={!!selectedCard} onOpenChange={() => setSelectedCard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{access.canEdit ? "Edit card" : "Card"}</DialogTitle>
            <DialogDescription className="sr-only">
              Update the card title and notes.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Input
              value={cardTitleDraft}
              onChange={(event) => setCardTitleDraft(event.target.value)}
              placeholder="Card title"
              disabled={!access.canEdit}
            />
            <Textarea
              value={cardDescriptionDraft}
              onChange={(event) => setCardDescriptionDraft(event.target.value)}
              placeholder="Description"
              className="min-h-[140px]"
              disabled={!access.canEdit}
            />
          </div>
          {access.canEdit && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="destructive"
                onClick={deleteSelectedCard}
              >
                <Icons.trash className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <Button type="button" onClick={saveSelectedCard}>
                Save card
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
