"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { AlignLeft, MoreHorizontal, Pencil, UserPlus, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { BoardSwitcher, type BoardSummary } from "@/components/board-switcher"
import { Icons } from "@/components/icons"
import { UserAccountNav } from "@/components/user-account-nav"

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

function initialsFor(member: BoardMemberModel) {
  const source = member.user.name || member.user.email || "?"
  return source.slice(0, 1).toUpperCase()
}

// Sort by the authoritative `order` field. Use only for server-provided data.
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

// Preserve the current array order and re-assign `order`/`listId` from indices.
// Used after drag operations, where the array order — not the stale `order`
// field — is the source of truth.
function reindexLists(lists: BoardListModel[]) {
  return lists.map((list, listIndex) => ({
    ...list,
    order: listIndex,
    cards: list.cards.map((card, cardIndex) => ({
      ...card,
      listId: list.id,
      order: cardIndex,
    })),
  }))
}

function findContainer(lists: BoardListModel[], id: string): string | null {
  if (lists.some((list) => list.id === id)) {
    return id
  }
  const owner = lists.find((list) => list.cards.some((card) => card.id === id))
  return owner ? owner.id : null
}

function buildOrderPayload(lists: BoardListModel[]) {
  return {
    lists: lists.map((list) => ({
      id: list.id,
      cards: list.cards.map((card) => card.id),
    })),
  }
}

function CardSurface({
  card,
  className,
}: {
  card: BoardCardModel
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-black/5 bg-card p-3 text-card-foreground shadow-sm dark:border-white/10",
        className
      )}
    >
      <p className="break-words text-sm font-medium leading-snug">
        {card.title}
      </p>
      {card.description && (
        <div className="mt-2 flex items-center gap-1.5 text-muted-foreground">
          <AlignLeft className="h-3.5 w-3.5 shrink-0" />
        </div>
      )}
    </div>
  )
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
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: "card" },
    disabled: !canEdit,
  })

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      onClick={() => onOpen(card)}
      className={cn(
        "group rounded-lg border border-black/5 bg-card p-3 text-card-foreground shadow-sm transition-shadow dark:border-white/10",
        "hover:border-primary/40 hover:shadow-md",
        canEdit && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
      {...(canEdit ? attributes : {})}
      {...(canEdit ? listeners : {})}
    >
      <p className="break-words text-sm font-medium leading-snug">
        {card.title}
      </p>
      {card.description && (
        <div className="mt-2 flex items-center gap-1.5 text-muted-foreground">
          <AlignLeft className="h-3.5 w-3.5 shrink-0" />
          <span className="line-clamp-1 text-xs leading-4">
            {plainTextPreview(card.description)}
          </span>
        </div>
      )}
    </article>
  )
}

// Cards may store a plain string or (later) richer serialized content. Keep the
// board preview resilient to both by extracting a short plain-text snippet.
function plainTextPreview(value: string) {
  const trimmed = value.trim()
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const text = extractTextFromLexical(JSON.parse(trimmed))
      if (text) return text
    } catch {
      // Not serialized editor state — fall back to the raw value.
    }
  }
  return trimmed
}

function extractTextFromLexical(state: unknown): string {
  const parts: string[] = []
  const walk = (node: any) => {
    if (!node || typeof node !== "object") return
    if (typeof node.text === "string") parts.push(node.text)
    const children = node.children ?? node.root?.children
    if (Array.isArray(children)) children.forEach(walk)
    else if (node.root) walk(node.root)
  }
  walk(state)
  return parts.join(" ").trim()
}

function CardComposer({
  value,
  onChange,
  onSubmit,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (isOpen) {
      textareaRef.current?.focus()
    }
  }, [isOpen])

  function close() {
    setIsOpen(false)
    onChange("")
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
      >
        <Icons.add className="h-4 w-4" />
        Add a card
      </button>
    )
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (!value.trim()) return
        onSubmit()
        textareaRef.current?.focus()
      }}
    >
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault()
            if (!value.trim()) return
            onSubmit()
          }
          if (event.key === "Escape") close()
        }}
        placeholder="Enter a title for this card…"
        className="min-h-[72px] resize-none border-none bg-card shadow-sm focus-visible:ring-2"
      />
      <div className="mt-2 flex items-center gap-2">
        <Button type="submit" size="sm" disabled={!value.trim()}>
          Add card
        </Button>
        <button
          type="button"
          onClick={close}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </form>
  )
}

function BoardListColumn({
  list,
  canEdit,
  isOver,
  cardDraft,
  onCardDraftChange,
  onCreateCard,
  onRenameList,
  onDeleteList,
  onOpenCard,
}: {
  list: BoardListModel
  canEdit: boolean
  isOver: boolean
  cardDraft: string
  onCardDraftChange: (listId: string, value: string) => void
  onCreateCard: (listId: string) => void
  onRenameList: (listId: string, title: string) => void
  onDeleteList: (listId: string) => void
  onOpenCard: (card: BoardCardModel) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list.id,
    data: { type: "list" },
    disabled: !canEdit,
  })
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

  const canDragList = canEdit && !isEditingTitle

  return (
    <section
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex max-h-full w-[280px] shrink-0 flex-col rounded-xl border border-black/5 bg-muted/70 shadow-sm backdrop-blur-sm dark:border-white/5",
        isOver && "ring-2 ring-primary/40",
        isDragging && "opacity-50"
      )}
    >
      <div
        ref={setActivatorNodeRef}
        className={cn(
          "flex items-center gap-2 px-3 pt-3",
          canDragList && "cursor-grab active:cursor-grabbing"
        )}
        {...(canDragList ? attributes : {})}
        {...(canDragList ? listeners : {})}
      >
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
            className="h-8 bg-background font-semibold"
          />
        ) : (
          <button
            type="button"
            onClick={() => canEdit && setIsEditingTitle(true)}
            className="min-w-0 flex-1 rounded px-1 py-0.5 text-left text-sm font-semibold transition-colors hover:bg-foreground/5"
          >
            <span className="line-clamp-1">{list.title}</span>
          </button>
        )}
        <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {list.cards.length}
        </span>
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                aria-label="List actions"
                onPointerDown={(event) => event.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onSelect={() => setIsEditingTitle(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Rename list
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => onDeleteList(list.id)}
              >
                <Icons.trash className="mr-2 h-4 w-4" />
                Delete list
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex min-h-[8px] flex-1 flex-col gap-2 overflow-y-auto p-2">
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
        {list.cards.length === 0 && !canEdit && (
          <p className="px-1 py-2 text-xs text-muted-foreground">No cards yet.</p>
        )}
      </div>

      {canEdit && (
        <div className="p-2 pt-0">
          <CardComposer
            value={cardDraft}
            onChange={(value) => onCardDraftChange(list.id, value)}
            onSubmit={() => onCreateCard(list.id)}
          />
        </div>
      )}
    </section>
  )
}

function ListSurface({ list }: { list: BoardListModel }) {
  return (
    <section className="flex w-[280px] flex-col gap-2 rounded-xl border border-black/5 bg-muted/90 p-2 shadow-2xl backdrop-blur-sm dark:border-white/5">
      <div className="flex items-center gap-2 px-1 pt-1">
        <span className="flex-1 text-sm font-semibold">{list.title}</span>
        <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {list.cards.length}
        </span>
      </div>
      {list.cards.slice(0, 5).map((card) => (
        <CardSurface key={card.id} card={card} />
      ))}
    </section>
  )
}

function ListComposer({
  value,
  onChange,
  onSubmit,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  function close() {
    setIsOpen(false)
    onChange("")
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-fit w-[280px] shrink-0 items-center gap-2 rounded-xl border border-dashed border-foreground/20 bg-foreground/5 px-3 py-3 text-sm font-medium text-foreground/80 backdrop-blur-sm transition-colors hover:bg-foreground/10"
      >
        <Icons.add className="h-4 w-4" />
        Add another list
      </button>
    )
  }

  return (
    <form
      className="h-fit w-[280px] shrink-0 rounded-xl border border-black/5 bg-muted/80 p-2 shadow-sm backdrop-blur-sm dark:border-white/5"
      onSubmit={(event) => {
        event.preventDefault()
        if (!value.trim()) return
        onSubmit()
        inputRef.current?.focus()
      }}
    >
      <Input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") close()
        }}
        placeholder="Enter list title…"
        className="mb-2 bg-background"
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={!value.trim()}>
          Add list
        </Button>
        <button
          type="button"
          onClick={close}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </form>
  )
}

function MemberStack({
  members,
  onClick,
}: {
  members: BoardMemberModel[]
  onClick: () => void
}) {
  const visible = members.slice(0, 4)
  const overflow = members.length - visible.length

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center -space-x-2 rounded-full p-0.5 transition-transform hover:scale-105"
      aria-label="Manage members"
    >
      {visible.map((member) => (
        <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
          {member.user.image && (
            <AvatarImage src={member.user.image} alt={member.user.name ?? ""} />
          )}
          <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
            {initialsFor(member)}
          </AvatarFallback>
        </Avatar>
      ))}
      {overflow > 0 && (
        <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-semibold text-muted-foreground">
          +{overflow}
        </span>
      )}
    </button>
  )
}

export function BoardView({
  board,
  access,
  user,
  boards,
}: {
  board: BoardModel
  access: BoardAccessModel
  user: { name: string | null; email: string | null; image: string | null }
  boards: BoardSummary[]
}) {
  const router = useRouter()
  const [title, setTitle] = React.useState(board.title)
  const [description, setDescription] = React.useState(board.description ?? "")
  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [isSavingBoard, setIsSavingBoard] = React.useState(false)
  const [lists, setLists] = React.useState(() => normalizeLists(board.lists))
  const [members, setMembers] = React.useState(board.members)
  const [memberEmail, setMemberEmail] = React.useState("")
  const [memberRole, setMemberRole] =
    React.useState<"EDITOR" | "VIEWER">("EDITOR")
  const [isShareOpen, setIsShareOpen] = React.useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false)
  const [isRealtimeConnected, setIsRealtimeConnected] = React.useState(false)
  const [cardDrafts, setCardDrafts] = React.useState<Record<string, string>>({})
  const [listDraft, setListDraft] = React.useState("")
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [activeType, setActiveType] = React.useState<"card" | "list" | null>(
    null
  )
  const [overListId, setOverListId] = React.useState<string | null>(null)
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

  const activeCard = React.useMemo(() => {
    if (!activeId || activeType !== "card") return null
    for (const list of lists) {
      const card = list.cards.find((item) => item.id === activeId)
      if (card) return card
    }
    return null
  }, [activeId, activeType, lists])

  const activeList = React.useMemo(() => {
    if (!activeId || activeType !== "list") return null
    return lists.find((list) => list.id === activeId) ?? null
  }, [activeId, activeType, lists])

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
    events.addEventListener("board:update", () => {
      router.refresh()
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

    if (
      nextTitle === board.title &&
      (description.trim() || null) === (board.description || null)
    ) {
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

    router.push("/dashboard")
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
        description:
          "The new order was not saved. Please refresh and try again.",
        variant: "destructive",
      })
    }

    router.refresh()
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id)
    const type = lists.some((list) => list.id === id) ? "list" : "card"
    setActiveId(id)
    setActiveType(type)
  }

  function handleDragOver(event: DragOverEvent) {
    if (activeType !== "card") return

    const { active, over } = event
    if (!over) return

    const activeCardId = String(active.id)
    const overId = String(over.id)
    const activeContainer = findContainer(lists, activeCardId)
    const overContainer = findContainer(lists, overId)

    if (!activeContainer || !overContainer) return

    setOverListId(overContainer)

    if (activeContainer === overContainer) return

    setLists((prev) => {
      const activeListData = prev.find((list) => list.id === activeContainer)
      const overListData = prev.find((list) => list.id === overContainer)

      if (!activeListData || !overListData) return prev

      const activeIndex = activeListData.cards.findIndex(
        (card) => card.id === activeCardId
      )

      if (activeIndex === -1) return prev

      const moved = activeListData.cards[activeIndex]
      const overIsList = prev.some((list) => list.id === overId)

      let newIndex: number
      if (overIsList) {
        newIndex = overListData.cards.length
      } else {
        const overIndex = overListData.cards.findIndex(
          (card) => card.id === overId
        )
        const translatedTop = active.rect.current.translated?.top
        const isBelow =
          translatedTop != null &&
          translatedTop > over.rect.top + over.rect.height / 2
        newIndex =
          overIndex >= 0
            ? overIndex + (isBelow ? 1 : 0)
            : overListData.cards.length
      }

      return prev.map((list) => {
        if (list.id === activeContainer) {
          return {
            ...list,
            cards: list.cards.filter((card) => card.id !== activeCardId),
          }
        }
        if (list.id === overContainer) {
          const nextCards = [
            ...list.cards.slice(0, newIndex),
            { ...moved, listId: list.id },
            ...list.cards.slice(newIndex),
          ]
          return { ...list, cards: nextCards }
        }
        return list
      })
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    const type = activeType

    setActiveId(null)
    setActiveType(null)
    setOverListId(null)

    if (!access.canEdit || !over) return

    const activeIdValue = String(active.id)
    const overId = String(over.id)

    if (type === "list") {
      const overListIdValue = lists.some((list) => list.id === overId)
        ? overId
        : findContainer(lists, overId)

      if (!overListIdValue || activeIdValue === overListIdValue) return

      const oldIndex = lists.findIndex((list) => list.id === activeIdValue)
      const newIndex = lists.findIndex((list) => list.id === overListIdValue)

      if (oldIndex === -1 || newIndex === -1) return

      const next = reindexLists(arrayMove(lists, oldIndex, newIndex))
      setLists(next)
      void persistOrder(next)
      return
    }

    const activeContainer = findContainer(lists, activeIdValue)
    const overContainer = lists.some((list) => list.id === overId)
      ? overId
      : findContainer(lists, overId)

    if (!activeContainer || !overContainer) {
      const next = reindexLists(lists)
      setLists(next)
      void persistOrder(next)
      return
    }

    let next = lists

    if (activeContainer === overContainer) {
      const listData = lists.find((list) => list.id === activeContainer)
      if (listData) {
        const oldIndex = listData.cards.findIndex(
          (card) => card.id === activeIdValue
        )
        const overIsList = lists.some((list) => list.id === overId)
        const newIndex = overIsList
          ? listData.cards.length - 1
          : listData.cards.findIndex((card) => card.id === overId)

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          next = lists.map((list) =>
            list.id === activeContainer
              ? { ...list, cards: arrayMove(list.cards, oldIndex, newIndex) }
              : list
          )
        }
      }
    }

    const normalized = reindexLists(next)
    setLists(normalized)
    void persistOrder(normalized)
  }

  function handleDragCancel() {
    setActiveId(null)
    setActiveType(null)
    setOverListId(null)
    setLists(normalizeLists(board.lists))
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

    const cardTitle = cardDrafts[listId]?.trim()

    if (!cardTitle) return

    const response = await fetch(`/api/boards/${board.id}/cards`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        listId,
        title: cardTitle,
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
      <div className="flex h-full flex-col bg-gradient-to-br from-sky-100 via-sky-50 to-indigo-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        {/* Single app header — brand, board switcher, title and actions */}
        <header className="flex shrink-0 items-center gap-2 border-b border-black/5 bg-white/50 px-3 py-2 backdrop-blur-md dark:border-white/10 dark:bg-black/20">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-1.5 font-bold"
            aria-label="Maat home"
          >
            <Icons.logo className="h-5 w-5 text-primary" />
            <span className="hidden text-base md:inline">Maat</span>
          </Link>

          <span className="hidden h-5 w-px bg-border sm:block" />

          <BoardSwitcher boards={boards} currentBoardId={board.id} />

          <div className="flex min-w-0 flex-1 items-center gap-2">
            {isEditingTitle ? (
              <Input
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={() => {
                  setIsEditingTitle(false)
                  void saveBoardDetails()
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    event.currentTarget.blur()
                  }
                  if (event.key === "Escape") {
                    setTitle(board.title)
                    setIsEditingTitle(false)
                  }
                }}
                className="h-8 max-w-xs bg-background text-base font-semibold"
              />
            ) : (
              <button
                type="button"
                onClick={() => access.canEdit && setIsEditingTitle(true)}
                className="min-w-0 rounded px-1.5 py-1 text-left text-base font-semibold transition-colors hover:bg-foreground/5"
              >
                <span className="line-clamp-1">{title}</span>
              </button>
            )}

            <span className="hidden shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary sm:inline-block">
              {access.role.toLowerCase()}
            </span>
            <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-white/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground dark:bg-white/10 md:inline-flex">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  isRealtimeConnected
                    ? "animate-pulse bg-emerald-500"
                    : "bg-muted-foreground/50"
                )}
              />
              {isRealtimeConnected ? "Live" : "Offline"}
            </span>
            {isSavingBoard && (
              <Icons.spinner className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <MemberStack members={members} onClick={() => setIsShareOpen(true)} />
            {access.canManage && (
              <Button
                type="button"
                size="sm"
                onClick={() => setIsShareOpen(true)}
                className="hidden gap-1.5 sm:inline-flex"
              >
                <UserPlus className="h-4 w-4" />
                Share
              </Button>
            )}
            {(access.canEdit || access.canManage) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-md bg-white/50 text-foreground transition-colors hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10"
                    aria-label="Board actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {access.canEdit && (
                    <DropdownMenuItem onSelect={() => setIsDetailsOpen(true)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit details
                    </DropdownMenuItem>
                  )}
                  {access.canManage && (
                    <DropdownMenuItem onSelect={() => setIsShareOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Manage members
                    </DropdownMenuItem>
                  )}
                  {access.canManage && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => void deleteBoard()}
                      >
                        <Icons.trash className="mr-2 h-4 w-4" />
                        Delete board
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <span className="hidden h-5 w-px bg-border sm:block" />
            <UserAccountNav user={user} />
          </div>
        </header>

        {/* Lists canvas */}
        <DndContext
          id="board-dnd-context"
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex flex-1 items-start gap-3 overflow-x-auto p-4">
            <SortableContext
              items={lists.map((list) => list.id)}
              strategy={horizontalListSortingStrategy}
            >
              {lists.map((list) => (
                <BoardListColumn
                  key={list.id}
                  list={list}
                  canEdit={access.canEdit}
                  isOver={overListId === list.id && activeType === "card"}
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
            </SortableContext>

            {access.canEdit && (
              <ListComposer
                value={listDraft}
                onChange={setListDraft}
                onSubmit={createList}
              />
            )}

            {lists.length === 0 && !access.canEdit && (
              <p className="px-2 py-8 text-sm text-muted-foreground">
                This board has no lists yet.
              </p>
            )}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeType === "card" && activeCard ? (
              <CardSurface
                card={activeCard}
                className="w-[264px] rotate-2 cursor-grabbing shadow-xl"
              />
            ) : activeType === "list" && activeList ? (
              <ListSurface list={activeList} />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Share / members dialog */}
      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share board</DialogTitle>
            <DialogDescription>
              Invite people by email and manage their access.
            </DialogDescription>
          </DialogHeader>

          {access.canManage && (
            <form className="grid gap-2" onSubmit={shareBoard}>
              <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                <Input
                  type="email"
                  value={memberEmail}
                  onChange={(event) => setMemberEmail(event.target.value)}
                  placeholder="user@example.com"
                />
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
                  Invite
                </Button>
              </div>
            </form>
          )}

          <div className="grid max-h-[320px] gap-2 overflow-y-auto pr-1">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-lg border bg-card p-2"
              >
                <Avatar className="h-9 w-9">
                  {member.user.image && (
                    <AvatarImage
                      src={member.user.image}
                      alt={member.user.name ?? ""}
                    />
                  )}
                  <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                    {initialsFor(member)}
                  </AvatarFallback>
                </Avatar>
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
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                    aria-label="Remove member"
                    onClick={() => void removeMember(member.id)}
                  >
                    <Icons.close className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Board details dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Board details</DialogTitle>
            <DialogDescription>
              Update the board name and description.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Board name"
              disabled={!access.canEdit}
            />
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Description"
              className="min-h-[120px]"
              disabled={!access.canEdit}
            />
          </div>
          {access.canEdit && (
            <DialogFooter>
              <Button
                type="button"
                onClick={async () => {
                  await saveBoardDetails()
                  setIsDetailsOpen(false)
                }}
              >
                Save details
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Card detail dialog */}
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
