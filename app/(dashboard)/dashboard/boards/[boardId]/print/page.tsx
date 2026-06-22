import { notFound, redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { getBoardAccess } from "@/lib/board-access"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { serializeCardDates } from "@/lib/card-dates"
import { cardSelect } from "@/lib/card-select"
import {
  customFieldSelect,
  customFieldValueSelect,
} from "@/lib/custom-field-select"
import { serializeCustomFieldValueRow } from "@/lib/custom-field-serialize"
import { cardChecklistsSelect } from "@/lib/checklist-select"
import { serializeCardChecklists } from "@/lib/checklist-serialize"
import { cardLabelSelect } from "@/lib/label-select"
import { serializeCardLabels } from "@/lib/label-serialize"
import { BoardPrintView } from "@/components/board-print-view"

interface BoardPrintPageProps {
  params: Promise<{
    boardId: string
  }>
}

export default async function BoardPrintPage({ params }: BoardPrintPageProps) {
  const { boardId } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect(authOptions?.pages?.signIn || "/login")
  }

  const access = await getBoardAccess(boardId, user.id)

  if (!access) {
    notFound()
  }

  const board = await db.board.findFirst({
    where: {
      id: boardId,
    },
    select: {
      id: true,
      title: true,
      customFields: {
        select: customFieldSelect,
        orderBy: {
          order: "asc",
        },
      },
      lists: {
        where: {
          archivedAt: null,
        },
        select: {
          id: true,
          order: true,
          cards: {
            where: {
              archivedAt: null,
            },
            select: {
              ...cardSelect,
              ...cardChecklistsSelect,
              customFieldValues: {
                select: customFieldValueSelect,
              },
              labels: {
                select: cardLabelSelect,
              },
            },
            orderBy: {
              order: "asc",
            },
          },
        },
        orderBy: {
          order: "asc",
        },
      },
    },
  })

  if (!board) {
    notFound()
  }

  const customFields = board.customFields.map((field) => ({
    id: field.id,
    name: field.name,
    type: field.type,
    showOnFront: field.showOnFront,
    options: field.options.map((option) => ({
      id: option.id,
      label: option.label,
      color: option.color,
    })),
  }))

  const cards = board.lists.flatMap((list) =>
    list.cards.map((card) => ({
      id: card.id,
      displayId: card.displayId,
      title: card.title,
      description: card.description,
      cardType: card.cardType,
      ...serializeCardDates(card),
      customFieldValues: card.customFieldValues.map(serializeCustomFieldValueRow),
      labels: serializeCardLabels(card.labels),
      checklists: serializeCardChecklists(card.checklists),
    }))
  )

  return (
    <BoardPrintView
      boardId={board.id}
      boardTitle={board.title}
      customFields={customFields}
      cards={cards}
      generatedBy={user.name ?? user.email ?? null}
    />
  )
}
