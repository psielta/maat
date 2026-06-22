import * as z from "zod"

import { getCurrentUserId, userCanEditBoard } from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import { serializeCardDates } from "@/lib/card-dates"
import { cardSelect } from "@/lib/card-select"
import { copyCardFromTemplate } from "@/lib/copy-card-from-template"
import { cardChecklistsSelect } from "@/lib/checklist-select"
import { serializeCardChecklists } from "@/lib/checklist-serialize"
import { customFieldValueSelect } from "@/lib/custom-field-select"
import { serializeCustomFieldValueRow } from "@/lib/custom-field-serialize"
import { db } from "@/lib/db"
import { cardLabelSelect } from "@/lib/label-select"
import { serializeCardLabels } from "@/lib/label-serialize"
import { cardFromTemplateSchema } from "@/lib/validations/board"

const routeContextSchema = z.object({
  params: z.object({
    boardId: z.string(),
    cardId: z.string(),
  }),
})

type RouteContext = {
  params: Promise<{
    boardId: string
    cardId: string
  }>
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const { params } = routeContextSchema.parse({
      params: await context.params,
    })
    const userId = await getCurrentUserId()

    if (!userId) {
      return new Response("Unauthorized", { status: 403 })
    }

    if (!(await userCanEditBoard(params.boardId, userId))) {
      return new Response(null, { status: 404 })
    }

    const json = await req.json()
    const body = cardFromTemplateSchema.parse(json)

    const created = await db.$transaction((tx) =>
      copyCardFromTemplate({
        tx,
        boardId: params.boardId,
        templateCardId: params.cardId,
        targetListId: body.listId,
        userId,
        titleOverride: body.title,
      })
    )

    if (!created) {
      return new Response(null, { status: 404 })
    }

    const card = await db.boardCard.findFirst({
      where: {
        id: created.id,
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
    })

    if (!card) {
      return new Response(null, { status: 404 })
    }

    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "card.created",
    })

    const { customFieldValues, labels, checklists, ...baseCard } = card

    return Response.json(
      {
        ...baseCard,
        ...serializeCardDates(baseCard),
        customFieldValues: customFieldValues.map(serializeCustomFieldValueRow),
        labels: serializeCardLabels(labels),
        checklists: serializeCardChecklists(checklists),
        linkedCount: 0,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}