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
import {
  AlignLeft,
  Archive,
  Bell,
  CalendarDays,
  Kanban,
  ListChecks,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Shapes,
  Tags,
  UserPlus,
  X,
} from "lucide-react"

import { getMentionableUsers } from "@/lib/board-mentionable-users"
import type { CardDatesModel } from "@/lib/card-dates"
import {
  CARD_ID_PATTERN_TOKENS,
  previewCardDisplayId,
} from "@/lib/card-id-pattern"
import {
  BOARD_CARD_TYPES,
  getCardTypeMeta,
  type BoardCardTypeValue,
} from "@/lib/card-type-display"
import type { ChecklistModel } from "@/lib/checklist-display"
import type { CustomFieldDefinitionModel } from "@/lib/custom-field-display"
import type { CustomFieldClientValue } from "@/lib/custom-field-values"
import { m } from "@/lib/i18n"
import {
  isInlineImageLightboxOpen,
  preventCardDialogDismissOnLightbox,
} from "@/lib/inline-image-lightbox-state"
import { getLabelDisplayName, type BoardLabelModel } from "@/lib/label-display"
import { lexicalToPlainText } from "@/lib/lexical-text"
import { cn } from "@/lib/utils"
import { useBoardMentionAlerts } from "@/hooks/use-board-mention-alerts"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
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
import { BoardArchivedItems } from "@/components/board-archived-items"
import { BoardCalendarView } from "@/components/board-calendar-view"
import { BoardCustomFieldsManager } from "@/components/board-custom-fields-manager"
import { BoardLabelsManager } from "@/components/board-labels-manager"
import { BoardSwitcher, type BoardSummary } from "@/components/board-switcher"
import { CardAttachments } from "@/components/card-attachments"
import { CardChecklistBadge } from "@/components/card-checklist-badge"
import { CardChecklists } from "@/components/card-checklists"
import { CardComments } from "@/components/card-comments"
import { CardCustomFields } from "@/components/card-custom-fields"
import { CardDateBadge } from "@/components/card-date-badge"
import { CardDates } from "@/components/card-dates"
import { CardLabelStrips } from "@/components/card-label-strips"
import { CardLabels } from "@/components/card-labels"
import { CardLinkBadge } from "@/components/card-link-badge"
import { CardLinks } from "@/components/card-links"
import {
  CardTemplateActions,
  CreateFromTemplateMenu,
} from "@/components/card-template-actions"
import { CardTypeBadge } from "@/components/card-type-badge"
import { CardTypePicker } from "@/components/card-type-picker"
import { CustomFieldBadges } from "@/components/custom-field-badges"
import { DashboardHeaderActions } from "@/components/dashboard-header-actions"
import { Icons } from "@/components/icons"
import {
  InlineImageLightboxHost,
  InlineImageLightboxProvider,
} from "@/components/lexical/inline-image-lightbox-context"
import { RichTextEditor } from "@/components/rich-text-editor"

export type BoardCardModel = {
  id: string
  displayId: string | null
  title: string
  description: string | null
  cardType: BoardCardTypeValue
  isTemplate: boolean
  linkedCount: number
  startDate: string | null
  dueAt: string | null
  dueComplete: boolean
  order: number
  listId: string
  customFieldValues: CustomFieldClientValue[]
  labels: BoardLabelModel[]
  checklists: ChecklistModel[]
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
  cardIdPattern: string | null
  authorId: string
  members: BoardMemberModel[]
  lists: BoardListModel[]
  customFields: CustomFieldDefinitionModel[]
  labels: BoardLabelModel[]
}

export type BoardAccessModel = {
  role: "OWNER" | "EDITOR" | "VIEWER"
  canRead: boolean
  canEdit: boolean
  canManage: boolean
}

const msg = m()

const CARD_ID_TOKEN_DESCRIPTIONS: Record<string, string> = {
  "{Number}":
    "Número sequencial (reinicia diariamente quando um token de data é usado)",
  "{Number:3}": "Número com preenchimento de 3 dígitos (001, 002, …)",
  "{Date}": "Data no formato DDMMYYYY",
  "{Day}": "Dia no formato DD",
  "{Month}": "Mês no formato MM",
  "{Year}": "Ano no formato YYYY",
}

function boardRoleLabel(role: "OWNER" | "EDITOR" | "VIEWER") {
  if (role === "OWNER") return msg.common.owner
  if (role === "EDITOR") return msg.common.editor
  return msg.common.viewer
}

function initialsFor(member: BoardMemberModel) {
  const source = member.user.name || member.user.email || "?"
  return source.slice(0, 1).toUpperCase()
}

function normalizeCard(card: BoardCardModel): BoardCardModel {
  return {
    ...card,
    cardType: card.cardType ?? "DEFAULT",
    isTemplate: card.isTemplate ?? false,
    linkedCount: card.linkedCount ?? 0,
    startDate: card.startDate ?? null,
    dueAt: card.dueAt ?? null,
    dueComplete: card.dueComplete ?? false,
    customFieldValues: card.customFieldValues ?? [],
    labels: card.labels ?? [],
    checklists: card.checklists ?? [],
  }
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
        .map((card, cardIndex) =>
          normalizeCard({
            ...card,
            listId: list.id,
            order: cardIndex,
          })
        ),
    }))
}

// Preserve the current array order and re-assign `order`/`listId` from indices.
// Used after drag operations, where the array order — not the stale `order`
// field — is the source of truth.
function reindexLists(lists: BoardListModel[]) {
  return lists.map((list, listIndex) => ({
    ...list,
    order: listIndex,
    cards: list.cards.map((card, cardIndex) =>
      normalizeCard({
        ...card,
        listId: list.id,
        order: cardIndex,
      })
    ),
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

function CardDisplayId({ displayId }: { displayId: string }) {
  return (
    <p className="mb-1.5 font-mono text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {displayId}
    </p>
  )
}

function CardSurface({
  card,
  customFields,
  className,
}: {
  card: BoardCardModel
  customFields: CustomFieldDefinitionModel[]
  className?: string
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
        card.isTemplate
          ? "border-dashed border-primary/30 bg-muted/40 dark:border-primary/40"
          : "border-black/5 dark:border-white/10",
        className
      )}
    >
      <CardLabelStrips labels={card.labels} />
      <div className="p-3 pt-2">
        {card.isTemplate ? (
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            {msg.card.template}
          </p>
        ) : null}
        {card.displayId && <CardDisplayId displayId={card.displayId} />}
        <p className="break-words text-sm font-medium leading-snug">
          {card.title}
        </p>
        <CustomFieldBadges
          fields={customFields}
          values={card.customFieldValues}
        />
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <CardTypeBadge cardType={card.cardType} />
          <CardDateBadge dates={card} className="mt-0" />
          <CardChecklistBadge checklists={card.checklists} />
          <CardLinkBadge linkedCount={card.linkedCount} />
        </div>
        {card.description && (
          <div className="mt-2 flex items-center gap-1.5 text-muted-foreground">
            <AlignLeft className="h-3.5 w-3.5 shrink-0" />
          </div>
        )}
      </div>
    </div>
  )
}

function SortableCard({
  card,
  customFields,
  boardLabels,
  canEdit,
  hasUnreadMention,
  onOpen,
  onArchive,
  onCardTypeChange,
  onCardLabelsChange,
  onEditLabels,
}: {
  card: BoardCardModel
  customFields: CustomFieldDefinitionModel[]
  boardLabels: BoardLabelModel[]
  canEdit: boolean
  hasUnreadMention: boolean
  onOpen: (card: BoardCardModel) => void
  onArchive: (card: BoardCardModel) => void
  onCardTypeChange: (card: BoardCardModel, cardType: BoardCardTypeValue) => void
  onCardLabelsChange: (card: BoardCardModel, labels: BoardLabelModel[]) => void
  onEditLabels?: () => void
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

  const selectedLabelIds = new Set(card.labels.map((label) => label.id))

  function toggleLabel(label: BoardLabelModel) {
    const nextLabels = selectedLabelIds.has(label.id)
      ? card.labels.filter((currentLabel) => currentLabel.id !== label.id)
      : [...card.labels, label].sort((left, right) => left.order - right.order)

    onCardLabelsChange(card, nextLabels)
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <article
          ref={setNodeRef}
          style={{
            transform: CSS.Transform.toString(transform),
            transition,
          }}
          onClick={() => onOpen(card)}
          className={cn(
            "group relative shrink-0 overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow",
            card.isTemplate
              ? "border-dashed border-primary/30 bg-muted/40 dark:border-primary/40"
              : "border-black/5 dark:border-white/10",
            "hover:border-primary/40 hover:shadow-md",
            hasUnreadMention && "mention-alert-card",
            canEdit && "cursor-grab active:cursor-grabbing",
            isDragging && "opacity-40"
          )}
          {...(canEdit ? attributes : {})}
          {...(canEdit ? listeners : {})}
        >
          {hasUnreadMention && (
            <span
              className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
              aria-label={msg.card.mentioned}
            >
              <Bell className="h-3 w-3" />
            </span>
          )}
          <CardLabelStrips labels={card.labels} />
          <div className="p-3 pt-2">
            {card.isTemplate ? (
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {msg.card.template}
              </p>
            ) : null}
            {card.displayId && <CardDisplayId displayId={card.displayId} />}
            <p className="break-words text-sm font-medium leading-snug">
              {card.title}
            </p>
            <CustomFieldBadges
              fields={customFields}
              values={card.customFieldValues}
            />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <CardTypeBadge cardType={card.cardType} />
              <CardDateBadge dates={card} className="mt-0" />
              <CardChecklistBadge checklists={card.checklists} />
              <CardLinkBadge linkedCount={card.linkedCount} />
            </div>
            {card.description && (
              <div className="mt-2 flex items-center gap-1.5 text-muted-foreground">
                <AlignLeft className="h-3.5 w-3.5 shrink-0" />
                <span className="line-clamp-1 text-xs leading-4">
                  {lexicalToPlainText(card.description)}
                </span>
              </div>
            )}
          </div>
        </article>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onSelect={() => onOpen(card)}>
          <Pencil className="mr-2 h-4 w-4" />
          {msg.card.details}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger disabled={!canEdit}>
            <Shapes className="mr-2 h-4 w-4" />
            {msg.card.type}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuRadioGroup
              value={card.cardType}
              onValueChange={(value) => {
                onCardTypeChange(card, value as BoardCardTypeValue)
              }}
            >
              {BOARD_CARD_TYPES.map((type) => {
                const meta = getCardTypeMeta(type)
                const Icon = meta.icon

                return (
                  <ContextMenuRadioItem key={type} value={type}>
                    {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
                    {meta.label}
                  </ContextMenuRadioItem>
                )
              })}
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger disabled={!canEdit}>
            <Tags className="mr-2 h-4 w-4" />
            {msg.card.labels}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-56">
            {boardLabels.length === 0 ? (
              <ContextMenuItem disabled>
                {msg.card.noLabelsOnBoard}
              </ContextMenuItem>
            ) : (
              boardLabels.map((label) => (
                <ContextMenuCheckboxItem
                  key={label.id}
                  checked={selectedLabelIds.has(label.id)}
                  onSelect={(event) => {
                    event.preventDefault()
                    toggleLabel(label)
                  }}
                >
                  <span
                    className="mr-2 h-3 w-3 rounded-sm"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="truncate">{getLabelDisplayName(label)}</span>
                </ContextMenuCheckboxItem>
              ))
            )}
            {onEditLabels ? (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem onSelect={onEditLabels}>
                  <Pencil className="mr-2 h-4 w-4" />
                  {msg.card.editLabels}
                </ContextMenuItem>
              </>
            ) : null}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem disabled={!canEdit} onSelect={() => onArchive(card)}>
          <Archive className="mr-2 h-4 w-4" />
          {msg.card.archiveCard}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

function CardComposer({
  value,
  onChange,
  onSubmit,
  isSubmitting,
  trailingAction,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isSubmitting: boolean
  trailingAction?: React.ReactNode
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const formRef = React.useRef<HTMLFormElement>(null)

  React.useEffect(() => {
    if (isOpen) {
      textareaRef.current?.focus()
    }
  }, [isOpen])

  const close = React.useCallback(() => {
    setIsOpen(false)
    onChange("")
  }, [onChange])

  React.useEffect(() => {
    if (!isOpen) return

    const timer = window.setTimeout(close, 30000)
    return () => window.clearTimeout(timer)
  }, [close, isOpen, value])

  if (!isOpen) {
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <Icons.add className="h-4 w-4 shrink-0" />
          {msg.board.addCardTitle}
        </button>
        {trailingAction}
      </div>
    )
  }

  return (
    <form
      ref={formRef}
      onBlur={(event) => {
        if (formRef.current?.contains(event.relatedTarget as Node | null)) {
          return
        }

        close()
      }}
      onSubmit={(event) => {
        event.preventDefault()
        if (!value.trim() || isSubmitting) return
        onSubmit()
        textareaRef.current?.focus()
      }}
    >
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={isSubmitting}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault()
            if (!value.trim() || isSubmitting) return
            onSubmit()
          }
          if (event.key === "Escape") close()
        }}
        placeholder={msg.board.addCardPlaceholder}
        className="min-h-[72px] resize-none border-none bg-card shadow-sm focus-visible:ring-2"
      />
      <div className="mt-2 flex items-center gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={!value.trim() || isSubmitting}
        >
          {isSubmitting && (
            <Icons.spinner className="mr-2 h-3.5 w-3.5 animate-spin" />
          )}
          {msg.board.addCard}
        </Button>
        <button
          type="button"
          onClick={close}
          disabled={isSubmitting}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
          aria-label={msg.common.cancel}
        >
          <X className="h-4 w-4" />
        </button>
        {trailingAction}
      </div>
    </form>
  )
}

function BoardListColumn({
  boardId,
  list,
  customFields,
  labels,
  canEdit,
  canManage,
  isOver,
  cardDraft,
  isCreatingCard,
  mentionedCardIds,
  onCardDraftChange,
  onCreateCard,
  onTemplateCardCreated,
  onRenameList,
  onArchiveList,
  onOpenCard,
  onArchiveCard,
  onCardTypeChange,
  onCardLabelsChange,
  onEditLabels,
}: {
  boardId: string
  list: BoardListModel
  customFields: CustomFieldDefinitionModel[]
  labels: BoardLabelModel[]
  canEdit: boolean
  canManage: boolean
  isOver: boolean
  cardDraft: string
  isCreatingCard: boolean
  mentionedCardIds: Set<string>
  onCardDraftChange: (listId: string, value: string) => void
  onCreateCard: (listId: string) => void
  onTemplateCardCreated: (card: BoardCardModel, listId: string) => void
  onRenameList: (listId: string, title: string) => void
  onArchiveList: (listId: string) => void
  onOpenCard: (card: BoardCardModel) => void
  onArchiveCard: (card: BoardCardModel) => void
  onCardTypeChange: (card: BoardCardModel, cardType: BoardCardTypeValue) => void
  onCardLabelsChange: (card: BoardCardModel, labels: BoardLabelModel[]) => void
  onEditLabels?: () => void
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
        "flex max-h-[calc(100vh-5.75rem)] w-[280px] shrink-0 flex-col rounded-xl border border-black/5 bg-muted/70 shadow-sm backdrop-blur-sm dark:border-white/5",
        isOver && "ring-2 ring-primary/40",
        isDragging && "opacity-50"
      )}
    >
      <div
        ref={setActivatorNodeRef}
        className={cn(
          "flex shrink-0 items-center gap-2 px-3 pt-3",
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
                aria-label={msg.board.listActions}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onSelect={() => setIsEditingTitle(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                {msg.board.renameList}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onArchiveList(list.id)}>
                <Archive className="mr-2 h-4 w-4" />
                {msg.board.archiveList}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain p-2">
        <SortableContext
          items={list.cards.map((card) => card.id)}
          strategy={verticalListSortingStrategy}
        >
          {list.cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              customFields={customFields}
              boardLabels={labels}
              canEdit={canEdit}
              hasUnreadMention={mentionedCardIds.has(card.id)}
              onOpen={onOpenCard}
              onArchive={onArchiveCard}
              onCardTypeChange={onCardTypeChange}
              onCardLabelsChange={onCardLabelsChange}
              onEditLabels={canManage ? onEditLabels : undefined}
            />
          ))}
        </SortableContext>
        {list.cards.length === 0 && !canEdit && (
          <p className="px-1 py-2 text-xs text-muted-foreground">
            {msg.board.noCards}
          </p>
        )}
      </div>

      {canEdit && (
        <div className="shrink-0 p-2 pt-0">
          <CardComposer
            value={cardDraft}
            onChange={(value) => onCardDraftChange(list.id, value)}
            onSubmit={() => onCreateCard(list.id)}
            isSubmitting={isCreatingCard}
            trailingAction={
              <CreateFromTemplateMenu
                boardId={boardId}
                listId={list.id}
                canEdit={canEdit}
                onCardCreated={(card) => onTemplateCardCreated(card, list.id)}
              />
            }
          />
        </div>
      )}
    </section>
  )
}

function ListSurface({
  list,
  customFields,
}: {
  list: BoardListModel
  customFields: CustomFieldDefinitionModel[]
}) {
  return (
    <section className="flex w-[280px] flex-col gap-2 rounded-xl border border-black/5 bg-muted/90 p-2 shadow-2xl backdrop-blur-sm dark:border-white/5">
      <div className="flex items-center gap-2 px-1 pt-1">
        <span className="flex-1 text-sm font-semibold">{list.title}</span>
        <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {list.cards.length}
        </span>
      </div>
      {list.cards.slice(0, 5).map((card) => (
        <CardSurface key={card.id} card={card} customFields={customFields} />
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
        {msg.board.addList}
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
        placeholder={msg.board.addListPlaceholder}
        className="mb-2 bg-background"
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={!value.trim()}>
          Adicionar lista
        </Button>
        <button
          type="button"
          onClick={close}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
          aria-label={msg.common.cancel}
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
      aria-label={msg.board.manageMembers}
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
  user: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
  boards: BoardSummary[]
}) {
  const router = useRouter()
  const { mentionedCardIds, markCardMentionsRead } = useBoardMentionAlerts(
    board.id
  )
  const [title, setTitle] = React.useState(board.title)
  const [description, setDescription] = React.useState(board.description ?? "")
  const [cardIdPattern, setCardIdPattern] = React.useState(
    board.cardIdPattern ?? ""
  )
  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [isSavingBoard, setIsSavingBoard] = React.useState(false)
  const [lists, setLists] = React.useState(() => normalizeLists(board.lists))
  const [members, setMembers] = React.useState(board.members)
  const mentionableUsers = React.useMemo(
    () => getMentionableUsers(members, user.id),
    [members, user.id]
  )
  const [memberEmail, setMemberEmail] = React.useState("")
  const [memberRole, setMemberRole] = React.useState<"EDITOR" | "VIEWER">(
    "EDITOR"
  )
  const [isShareOpen, setIsShareOpen] = React.useState(false)
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false)
  const [isCustomFieldsOpen, setIsCustomFieldsOpen] = React.useState(false)
  const [isLabelsOpen, setIsLabelsOpen] = React.useState(false)
  const [isArchivedOpen, setIsArchivedOpen] = React.useState(false)
  const [boardViewMode, setBoardViewMode] = React.useState<
    "board" | "calendar"
  >("board")
  const [customFields, setCustomFields] = React.useState(board.customFields)
  const [labels, setLabels] = React.useState(board.labels)
  const [isRealtimeConnected, setIsRealtimeConnected] = React.useState(false)
  const [cardDrafts, setCardDrafts] = React.useState<Record<string, string>>({})
  const [creatingCardListIds, setCreatingCardListIds] = React.useState(
    () => new Set<string>()
  )
  const [listDraft, setListDraft] = React.useState("")
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [activeType, setActiveType] = React.useState<"card" | "list" | null>(
    null
  )
  const [overListId, setOverListId] = React.useState<string | null>(null)
  const [eventSignal, setEventSignal] = React.useState(0)
  const [selectedCard, setSelectedCard] = React.useState<BoardCardModel | null>(
    null
  )
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

  const selectedCardList = React.useMemo(() => {
    if (!selectedCard) return null
    return lists.find((list) => list.id === selectedCard.listId) ?? null
  }, [selectedCard, lists])

  const cardIdPatternPreview = React.useMemo(() => {
    const trimmed = cardIdPattern.trim()
    if (!trimmed) return null
    return previewCardDisplayId(trimmed, 1)
  }, [cardIdPattern])

  React.useEffect(() => {
    setTitle(board.title)
    setDescription(board.description ?? "")
    setCardIdPattern(board.cardIdPattern ?? "")
    setLists(normalizeLists(board.lists))
    setMembers(board.members)
    setCustomFields(board.customFields)
    setLabels(board.labels)
  }, [board])

  React.useEffect(() => {
    const events = new EventSource(`/api/boards/${board.id}/events`)

    events.addEventListener("ready", () => setIsRealtimeConnected(true))
    events.addEventListener("error", () => setIsRealtimeConnected(false))
    events.addEventListener("board:update", (event) => {
      let action = ""
      try {
        action = JSON.parse((event as MessageEvent).data)?.action ?? ""
      } catch {
        action = ""
      }
      // Comment activity doesn't change board/list/card data, so only nudge
      // the open card's comments instead of refetching the whole board.
      if (action.startsWith("comment.") || action.startsWith("attachment.")) {
        setEventSignal((value) => value + 1)
      } else {
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

  function openCard(card: BoardCardModel) {
    setSelectedCard(normalizeCard(card))
    void markCardMentionsRead(card.id)
  }

  function updateCardCustomFieldValues(
    cardId: string,
    values: CustomFieldClientValue[]
  ) {
    setLists((current) =>
      current.map((list) => ({
        ...list,
        cards: list.cards.map((card) =>
          card.id === cardId ? { ...card, customFieldValues: values } : card
        ),
      }))
    )
    setSelectedCard((current) =>
      current?.id === cardId
        ? { ...current, customFieldValues: values }
        : current
    )
  }

  function updateCardDates(cardId: string, dates: CardDatesModel) {
    setLists((current) =>
      current.map((list) => ({
        ...list,
        cards: list.cards.map((card) =>
          card.id === cardId ? { ...card, ...dates } : card
        ),
      }))
    )
    setSelectedCard((current) =>
      current?.id === cardId ? { ...current, ...dates } : current
    )
  }

  function updateCardLabels(cardId: string, nextLabels: BoardLabelModel[]) {
    setLists((current) =>
      current.map((list) => ({
        ...list,
        cards: list.cards.map((card) =>
          card.id === cardId ? { ...card, labels: nextLabels } : card
        ),
      }))
    )
    setSelectedCard((current) =>
      current?.id === cardId ? { ...current, labels: nextLabels } : current
    )
  }

  function updateCardType(cardId: string, cardType: BoardCardTypeValue) {
    setLists((current) =>
      current.map((list) => ({
        ...list,
        cards: list.cards.map((card) =>
          card.id === cardId ? { ...card, cardType } : card
        ),
      }))
    )
    setSelectedCard((current) =>
      current?.id === cardId ? { ...current, cardType } : current
    )
  }

  function updateCardModel(cardId: string, patch: Partial<BoardCardModel>) {
    setLists((current) =>
      current.map((list) => ({
        ...list,
        cards: list.cards.map((card) =>
          card.id === cardId ? { ...card, ...patch } : card
        ),
      }))
    )
    setSelectedCard((current) =>
      current?.id === cardId ? { ...current, ...patch } : current
    )
  }

  function adjustLinkedCount(cardId: string, delta: number) {
    setLists((current) =>
      current.map((list) => ({
        ...list,
        cards: list.cards.map((card) =>
          card.id === cardId
            ? {
                ...card,
                linkedCount: Math.max(0, card.linkedCount + delta),
              }
            : card
        ),
      }))
    )
    setSelectedCard((current) =>
      current?.id === cardId
        ? {
            ...current,
            linkedCount: Math.max(0, current.linkedCount + delta),
          }
        : current
    )
  }

  function insertCreatedCard(card: BoardCardModel, listId: string) {
    const normalized = normalizeCard(card)
    setLists((current) =>
      normalizeLists(
        current.map((list) =>
          list.id === listId
            ? { ...list, cards: [...list.cards, normalized] }
            : list
        )
      )
    )
  }

  const allBoardCards = React.useMemo(
    () => lists.flatMap((list) => list.cards),
    [lists]
  )

  const listTitlesById = React.useMemo(
    () =>
      Object.fromEntries(lists.map((list) => [list.id, list.title] as const)),
    [lists]
  )

  function updateCardChecklists(
    cardId: string,
    nextChecklists: ChecklistModel[]
  ) {
    setLists((current) =>
      current.map((list) => ({
        ...list,
        cards: list.cards.map((card) =>
          card.id === cardId ? { ...card, checklists: nextChecklists } : card
        ),
      }))
    )
    setSelectedCard((current) =>
      current?.id === cardId
        ? { ...current, checklists: nextChecklists }
        : current
    )
  }

  function handleBoardLabelsChange(nextLabels: BoardLabelModel[]) {
    const nextLabelIds = new Set(nextLabels.map((label) => label.id))
    setLabels(nextLabels)
    setLists((current) =>
      current.map((list) => ({
        ...list,
        cards: list.cards.map((card) => ({
          ...card,
          labels: card.labels.filter((label) => nextLabelIds.has(label.id)),
        })),
      }))
    )
    setSelectedCard((current) =>
      current
        ? {
            ...current,
            labels: current.labels.filter((label) =>
              nextLabelIds.has(label.id)
            ),
          }
        : current
    )
  }

  async function saveBoardDetails() {
    if (!access.canEdit) return

    const nextTitle = title.trim()

    if (!nextTitle) {
      setTitle(board.title)
      return
    }

    const nextCardIdPattern = cardIdPattern.trim() || null

    if (
      nextTitle === board.title &&
      (description.trim() || null) === (board.description || null) &&
      nextCardIdPattern === (board.cardIdPattern || null)
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
        cardIdPattern: nextCardIdPattern,
      }),
    })

    setIsSavingBoard(false)

    if (!response.ok) {
      return toast({
        title: msg.common.errorTitle,
        description: `${msg.toast.boardNotSaved} ${msg.common.tryAgain}`,
        variant: "destructive",
      })
    }

    router.refresh()
  }

  async function deleteBoard() {
    if (!access.canManage) return
    if (!window.confirm(msg.board.deleteBoardConfirm)) return

    const response = await fetch(`/api/boards/${board.id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      return toast({
        title: msg.common.errorTitle,
        description: `${msg.toast.boardNotDeleted} ${msg.common.tryAgain}`,
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
        title: msg.common.errorTitle,
        description:
          "A nova ordem não foi salva. Atualize a página e tente novamente.",
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
        title: msg.common.errorTitle,
        description: `${msg.toast.listNotCreated} ${msg.common.tryAgain}`,
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
        title: msg.common.errorTitle,
        description: `${msg.toast.listNotRenamed} ${msg.common.tryAgain}`,
        variant: "destructive",
      })
    }

    router.refresh()
  }

  async function archiveList(listId: string) {
    if (!access.canEdit) return

    const previousLists = lists
    setLists((current) => current.filter((list) => list.id !== listId))

    const response = await fetch(`/api/boards/${board.id}/lists/${listId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ archived: true }),
    })

    if (!response.ok) {
      setLists(previousLists)
      return toast({
        title: msg.common.errorTitle,
        description: `${msg.toast.listNotArchived} ${msg.common.tryAgain}`,
        variant: "destructive",
      })
    }

    router.refresh()
    toast({ description: msg.toast.listArchived })
  }

  async function createCard(listId: string) {
    if (!access.canEdit) return
    if (creatingCardListIds.has(listId)) return

    const cardTitle = cardDrafts[listId]?.trim()

    if (!cardTitle) return

    setCreatingCardListIds((current) => {
      const next = new Set(current)
      next.add(listId)
      return next
    })

    try {
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
          title: msg.common.errorTitle,
          description: `${msg.toast.cardNotCreated} ${msg.common.tryAgain}`,
          variant: "destructive",
        })
      }

      const card = normalizeCard({
        ...(await response.json()),
        cardType: "DEFAULT",
        isTemplate: false,
        linkedCount: 0,
        customFieldValues: [] as CustomFieldClientValue[],
        labels: [],
        checklists: [],
      })
      setLists((current) =>
        normalizeLists(
          current.map((list) =>
            list.id === listId
              ? { ...list, cards: [...list.cards, card] }
              : list
          )
        )
      )
      setCardDrafts((current) => ({
        ...current,
        [listId]: "",
      }))
      router.refresh()
    } finally {
      setCreatingCardListIds((current) => {
        const next = new Set(current)
        next.delete(listId)
        return next
      })
    }
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
        title: msg.common.errorTitle,
        description: `${msg.toast.cardNotSaved} ${msg.common.tryAgain}`,
        variant: "destructive",
      })
    }

    const card = normalizeCard({
      ...(await response.json()),
      customFieldValues: selectedCard.customFieldValues,
      startDate: selectedCard.startDate,
      dueAt: selectedCard.dueAt,
      dueComplete: selectedCard.dueComplete,
      labels: selectedCard.labels,
      checklists: selectedCard.checklists,
    })
    setLists((current) =>
      normalizeLists(
        current.map((list) => ({
          ...list,
          cards: list.cards.map((item) => (item.id === card.id ? card : item)),
        }))
      )
    )
    setSelectedCard(card)
    router.refresh()
    return toast({ description: msg.toast.cardSaved })
  }

  async function updateCardTypeFromMenu(
    card: BoardCardModel,
    cardType: BoardCardTypeValue
  ) {
    if (!access.canEdit || card.cardType === cardType) return

    const previousType = card.cardType
    updateCardType(card.id, cardType)

    const response = await fetch(`/api/boards/${board.id}/cards/${card.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cardType }),
    })

    if (!response.ok) {
      updateCardType(card.id, previousType)
      return toast({
        title: msg.common.errorTitle,
        description: msg.toast.cardTypeNotSaved,
        variant: "destructive",
      })
    }

    const updatedCard = await response.json()
    updateCardType(card.id, updatedCard.cardType)
  }

  async function updateCardLabelsFromMenu(
    card: BoardCardModel,
    nextLabels: BoardLabelModel[]
  ) {
    if (!access.canEdit) return

    const previousLabels = card.labels
    updateCardLabels(card.id, nextLabels)

    const response = await fetch(
      `/api/boards/${board.id}/cards/${card.id}/labels`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          labelIds: nextLabels.map((label) => label.id),
        }),
      }
    )

    if (!response.ok) {
      updateCardLabels(card.id, previousLabels)
      return toast({
        title: msg.common.errorTitle,
        description: msg.toast.cardLabelsNotSaved,
        variant: "destructive",
      })
    }

    updateCardLabels(card.id, await response.json())
  }

  async function archiveCard(card: BoardCardModel) {
    if (!access.canEdit) return

    const cardId = card.id

    const response = await fetch(`/api/boards/${board.id}/cards/${cardId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ archived: true }),
    })

    if (!response.ok) {
      return toast({
        title: msg.common.errorTitle,
        description: `${msg.toast.cardNotArchived} ${msg.common.tryAgain}`,
        variant: "destructive",
      })
    }

    setLists((current) =>
      current.map((list) => ({
        ...list,
        cards: list.cards.filter((card) => card.id !== cardId),
      }))
    )
    setSelectedCard((current) => (current?.id === cardId ? null : current))
    router.refresh()
    toast({ description: msg.toast.cardArchived })
  }

  async function archiveSelectedCard() {
    if (!selectedCard) return

    await archiveCard(selectedCard)
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
        title: msg.common.errorTitle,
        description:
          response.status === 404
            ? "Esse usuário não existe neste sistema."
            : `O acesso ao board não foi atualizado. ${msg.common.tryAgain}`,
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
        title: msg.common.errorTitle,
        description: `${msg.toast.memberNotUpdated} ${msg.common.tryAgain}`,
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
        title: msg.common.errorTitle,
        description: `${msg.toast.memberNotRemoved} ${msg.common.tryAgain}`,
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
            aria-label={msg.board.homeAria}
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
              {boardRoleLabel(access.role)}
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
              {isRealtimeConnected ? msg.common.live : msg.common.offline}
            </span>
            {isSavingBoard && (
              <Icons.spinner className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="hidden items-center rounded-md border border-black/5 bg-white/50 p-0.5 dark:border-white/10 dark:bg-white/5 sm:flex">
              <button
                type="button"
                onClick={() => setBoardViewMode("board")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  boardViewMode === "board"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Kanban className="h-3.5 w-3.5" />
                {msg.board.board}
              </button>
              <button
                type="button"
                onClick={() => setBoardViewMode("calendar")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  boardViewMode === "calendar"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                {msg.board.calendar}
              </button>
            </div>
            <MemberStack
              members={members}
              onClick={() => setIsShareOpen(true)}
            />
            {access.canManage && (
              <Button
                type="button"
                size="sm"
                onClick={() => setIsShareOpen(true)}
                className="hidden gap-1.5 sm:inline-flex"
              >
                <UserPlus className="h-4 w-4" />
                {msg.board.share}
              </Button>
            )}
            {(access.canEdit || access.canManage) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-md bg-white/50 text-foreground transition-colors hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10"
                    aria-label={msg.board.boardActions}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {access.canRead && (
                    <DropdownMenuItem onSelect={() => setIsArchivedOpen(true)}>
                      <Archive className="mr-2 h-4 w-4" />
                      {msg.board.archivedItems}
                    </DropdownMenuItem>
                  )}
                  {access.canEdit && (
                    <DropdownMenuItem onSelect={() => setIsDetailsOpen(true)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar detalhes
                    </DropdownMenuItem>
                  )}
                  {access.canManage && (
                    <DropdownMenuItem
                      onSelect={() => setIsCustomFieldsOpen(true)}
                    >
                      <ListChecks className="mr-2 h-4 w-4" />
                      {msg.board.customFields}
                    </DropdownMenuItem>
                  )}
                  {access.canManage && (
                    <DropdownMenuItem onSelect={() => setIsLabelsOpen(true)}>
                      <Tags className="mr-2 h-4 w-4" />
                      {msg.board.labels}
                    </DropdownMenuItem>
                  )}
                  {access.canManage && (
                    <DropdownMenuItem onSelect={() => setIsShareOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      {msg.board.manageMembers}
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
                        {msg.board.deleteBoard}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <DashboardHeaderActions user={user} variant="board" />
          </div>
        </header>

        {boardViewMode === "calendar" ? (
          <BoardCalendarView lists={lists} onOpenCard={openCard} />
        ) : (
          <DndContext
            id="board-dnd-context"
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="flex min-h-0 flex-1 items-start gap-3 overflow-x-auto p-4">
              <SortableContext
                items={lists.map((list) => list.id)}
                strategy={horizontalListSortingStrategy}
              >
                {lists.map((list) => (
                  <BoardListColumn
                    key={list.id}
                    boardId={board.id}
                    list={list}
                    customFields={customFields}
                    labels={labels}
                    canEdit={access.canEdit}
                    canManage={access.canManage}
                    isOver={overListId === list.id && activeType === "card"}
                    cardDraft={cardDrafts[list.id] ?? ""}
                    isCreatingCard={creatingCardListIds.has(list.id)}
                    mentionedCardIds={mentionedCardIds}
                    onCardDraftChange={(listId, value) =>
                      setCardDrafts((current) => ({
                        ...current,
                        [listId]: value,
                      }))
                    }
                    onCreateCard={createCard}
                    onTemplateCardCreated={(card, listId) => {
                      insertCreatedCard(card, listId)
                      router.refresh()
                    }}
                    onRenameList={renameList}
                    onArchiveList={archiveList}
                    onOpenCard={openCard}
                    onArchiveCard={(card) => void archiveCard(card)}
                    onCardTypeChange={(card, cardType) =>
                      void updateCardTypeFromMenu(card, cardType)
                    }
                    onCardLabelsChange={(card, nextLabels) =>
                      void updateCardLabelsFromMenu(card, nextLabels)
                    }
                    onEditLabels={() => setIsLabelsOpen(true)}
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
                  {msg.board.noLists}
                </p>
              )}
            </div>

            <DragOverlay dropAnimation={null}>
              {activeType === "card" && activeCard ? (
                <CardSurface
                  card={activeCard}
                  customFields={customFields}
                  className="w-[264px] rotate-2 cursor-grabbing shadow-xl"
                />
              ) : activeType === "list" && activeList ? (
                <ListSurface list={activeList} customFields={customFields} />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Share / members dialog */}
      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{msg.board.shareBoard}</DialogTitle>
            <DialogDescription>
              Convide pessoas por e-mail e gerencie o acesso delas.
            </DialogDescription>
          </DialogHeader>

          {access.canManage && (
            <form className="grid gap-2" onSubmit={shareBoard}>
              <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                <Input
                  type="email"
                  value={memberEmail}
                  onChange={(event) => setMemberEmail(event.target.value)}
                  placeholder={msg.auth.emailPlaceholder}
                />
                <select
                  value={memberRole}
                  onChange={(event) =>
                    setMemberRole(event.target.value as "EDITOR" | "VIEWER")
                  }
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="EDITOR">{msg.common.editor}</option>
                  <option value="VIEWER">{msg.common.viewer}</option>
                </select>
                <Button type="submit" disabled={!memberEmail.trim()}>
                  Convidar
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
                    <option value="EDITOR">{msg.common.editor}</option>
                    <option value="VIEWER">{msg.common.viewer}</option>
                  </select>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium uppercase text-muted-foreground">
                    {boardRoleLabel(member.role)}
                  </span>
                )}
                {access.canManage && member.role !== "OWNER" && (
                  <button
                    type="button"
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                    aria-label={msg.board.removeMember}
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

      <BoardCustomFieldsManager
        boardId={board.id}
        fields={customFields}
        open={isCustomFieldsOpen}
        onOpenChange={setIsCustomFieldsOpen}
        onFieldsChange={setCustomFields}
      />

      <BoardArchivedItems
        boardId={board.id}
        open={isArchivedOpen}
        onOpenChange={setIsArchivedOpen}
        canEdit={access.canEdit}
      />

      <BoardLabelsManager
        boardId={board.id}
        labels={labels}
        open={isLabelsOpen}
        onOpenChange={setIsLabelsOpen}
        onLabelsChange={handleBoardLabelsChange}
      />

      {/* Board details dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{msg.board.boardDetails}</DialogTitle>
            <DialogDescription>{msg.board.boardDetailsDesc}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={msg.board.boardName}
              disabled={!access.canEdit}
            />
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={msg.board.description}
              className="min-h-[120px]"
              disabled={!access.canEdit}
            />
            <div className="space-y-2 rounded-lg border border-dashed p-3">
              <div>
                <p className="text-sm font-medium">{msg.board.cardIdPattern}</p>
                <p className="text-xs text-muted-foreground">
                  {msg.board.cardIdPatternHelp}
                </p>
              </div>
              <Input
                value={cardIdPattern}
                onChange={(event) => setCardIdPattern(event.target.value)}
                placeholder={msg.board.cardIdPatternPlaceholder}
                disabled={!access.canEdit}
                className="font-mono text-sm"
              />
              <div className="space-y-1 text-xs text-muted-foreground">
                {CARD_ID_PATTERN_TOKENS.map((item) => (
                  <p key={item.token}>
                    <span className="font-mono text-foreground">
                      {item.token}
                    </span>
                    {" — "}
                    {CARD_ID_TOKEN_DESCRIPTIONS[item.token] ?? item.description}
                  </p>
                ))}
              </div>
              {cardIdPatternPreview && (
                <p className="text-xs text-muted-foreground">
                  {msg.board.preview}:{" "}
                  <span className="font-mono font-medium text-foreground">
                    {cardIdPatternPreview}
                  </span>
                </p>
              )}
            </div>
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
                {msg.board.saveDetails}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Card detail dialog */}
      <Dialog
        open={!!selectedCard}
        onOpenChange={(open) => {
          if (!open && isInlineImageLightboxOpen()) return
          if (!open) setSelectedCard(null)
        }}
      >
        <InlineImageLightboxProvider>
          <DialogContent
            className="relative flex max-h-[88vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
            onEscapeKeyDown={preventCardDialogDismissOnLightbox}
          >
            <DialogHeader className="sr-only">
              <DialogTitle>{msg.card.details}</DialogTitle>
              <DialogDescription>{msg.card.detailsDesc}</DialogDescription>
            </DialogHeader>
            {selectedCard && (
              <>
                <div className="flex shrink-0 items-center gap-2 border-b px-4 py-2.5 pr-12">
                  {selectedCard.displayId && (
                    <span className="font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {selectedCard.displayId}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                    <Icons.boards className="h-3.5 w-3.5" />
                    {selectedCardList?.title ?? "Card"}
                  </span>
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
                  {/* Main column: title and description */}
                  <div className="space-y-5 p-5 md:min-h-0 md:flex-[1.7] md:overflow-y-auto">
                    <Input
                      value={cardTitleDraft}
                      onChange={(event) =>
                        setCardTitleDraft(event.target.value)
                      }
                      onBlur={() => {
                        if (
                          access.canEdit &&
                          cardTitleDraft.trim() &&
                          cardTitleDraft.trim() !== selectedCard.title
                        ) {
                          void saveSelectedCard()
                        }
                      }}
                      placeholder={msg.card.title}
                      disabled={!access.canEdit}
                      className="h-auto border-none px-0 text-xl font-semibold shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-default disabled:opacity-100"
                    />

                    <CardTemplateActions
                      boardId={board.id}
                      card={selectedCard}
                      lists={lists}
                      canEdit={access.canEdit}
                      onCardUpdated={(card) =>
                        updateCardModel(card.id, {
                          isTemplate: card.isTemplate,
                          cardType: card.cardType,
                        })
                      }
                      onCardCreated={(card, listId) => {
                        insertCreatedCard(card, listId)
                        router.refresh()
                      }}
                    />

                    <CardTypePicker
                      boardId={board.id}
                      cardId={selectedCard.id}
                      cardType={selectedCard.cardType}
                      canEdit={access.canEdit}
                      onCardTypeChange={(cardType) =>
                        updateCardType(selectedCard.id, cardType)
                      }
                    />

                    <section>
                      <div className="mb-2 flex items-center gap-2">
                        <AlignLeft className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold">
                          {msg.card.description}
                        </h3>
                      </div>
                      <div className="pl-6">
                        <RichTextEditor
                          key={selectedCard.id}
                          value={selectedCard.description}
                          editable={access.canEdit}
                          onChange={setCardDescriptionDraft}
                          uploadContext={{
                            boardId: board.id,
                            cardId: selectedCard.id,
                            target: "card-description",
                          }}
                        />
                        {access.canEdit && (
                          <div className="mt-2 flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={saveSelectedCard}
                            >
                              {msg.common.save}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={archiveSelectedCard}
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              {msg.card.archiveCard}
                            </Button>
                          </div>
                        )}
                      </div>
                    </section>

                    <CardDates
                      boardId={board.id}
                      cardId={selectedCard.id}
                      dates={{
                        startDate: selectedCard.startDate,
                        dueAt: selectedCard.dueAt,
                        dueComplete: selectedCard.dueComplete,
                      }}
                      canEdit={access.canEdit}
                      onDatesChange={(dates) =>
                        updateCardDates(selectedCard.id, dates)
                      }
                    />

                    <CardLabels
                      boardId={board.id}
                      cardId={selectedCard.id}
                      boardLabels={labels}
                      cardLabels={selectedCard.labels}
                      canEdit={access.canEdit}
                      canManage={access.canManage}
                      onLabelsChange={(next) =>
                        updateCardLabels(selectedCard.id, next)
                      }
                      onEditLabels={
                        access.canManage
                          ? () => setIsLabelsOpen(true)
                          : undefined
                      }
                    />

                    <CardChecklists
                      boardId={board.id}
                      cardId={selectedCard.id}
                      checklists={selectedCard.checklists}
                      canEdit={access.canEdit}
                      onChecklistsChange={(next) =>
                        updateCardChecklists(selectedCard.id, next)
                      }
                    />

                    <CardLinks
                      boardId={board.id}
                      cardId={selectedCard.id}
                      boardCards={allBoardCards}
                      listTitlesById={listTitlesById}
                      canEdit={access.canEdit}
                      onOpenCard={openCard}
                      onLinkedCountDelta={adjustLinkedCount}
                    />

                    <CardCustomFields
                      boardId={board.id}
                      cardId={selectedCard.id}
                      fields={customFields}
                      values={selectedCard.customFieldValues ?? []}
                      canEdit={access.canEdit}
                      onValuesChange={(values) =>
                        updateCardCustomFieldValues(selectedCard.id, values)
                      }
                    />

                    <CardAttachments
                      boardId={board.id}
                      cardId={selectedCard.id}
                      currentUserId={user.id}
                      canUpload={access.canEdit}
                      canManage={access.canManage}
                      refreshSignal={eventSignal}
                    />
                  </div>

                  {/* Side column: comments and activity */}
                  <div className="space-y-3 border-t p-5 md:min-h-0 md:flex-1 md:overflow-y-auto md:border-l md:border-t-0">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold">
                        {msg.card.commentsActivity}
                      </h3>
                    </div>
                    <CardComments
                      boardId={board.id}
                      cardId={selectedCard.id}
                      currentUserId={user.id}
                      canComment={access.canEdit}
                      canManage={access.canManage}
                      refreshSignal={eventSignal}
                      mentionableUsers={mentionableUsers}
                    />
                  </div>
                </div>
              </>
            )}
            <InlineImageLightboxHost />
          </DialogContent>
        </InlineImageLightboxProvider>
      </Dialog>
    </>
  )
}
