import * as z from "zod"

import { getCurrentUserId, userCanEditBoard } from "@/lib/board-access"
import { recordBoardEvent } from "@/lib/board-events"
import { customFieldValueSelect } from "@/lib/custom-field-select"
import { serializeCustomFieldValueRow } from "@/lib/custom-field-serialize"
import {
  CustomFieldValueError,
  normalizeCustomFieldValue,
} from "@/lib/custom-field-values"
import { db } from "@/lib/db"
import { msg } from "@/lib/messages/pt-br"
import { cardCustomFieldsPatchSchema } from "@/lib/validations/board"

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

async function userCanAccessCard(boardId: string, cardId: string, userId: string) {
  if (!(await userCanEditBoard(boardId, userId))) {
    return false
  }

  const count = await db.boardCard.count({
    where: {
      id: cardId,
      list: {
        boardId,
      },
    },
  })

  return count > 0
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { params } = routeContextSchema.parse({
      params: await context.params,
    })
    const userId = await getCurrentUserId()

    if (!userId) {
      return new Response("Unauthorized", { status: 403 })
    }

    if (!(await userCanAccessCard(params.boardId, params.cardId, userId))) {
      return new Response(null, { status: 404 })
    }

    const json = await req.json()
    const body = cardCustomFieldsPatchSchema.parse(json)
    const fields = await db.boardCustomField.findMany({
      where: {
        boardId: params.boardId,
      },
      select: {
        id: true,
        type: true,
        options: {
          select: {
            id: true,
          },
        },
      },
    })
    const fieldById = new Map(fields.map((field) => [field.id, field]))

    for (const entry of body.values) {
      const field = fieldById.get(entry.fieldId)
      if (!field) {
        return Response.json(
          { message: msg.api.customFieldsNotOnBoard },
          { status: 422 }
        )
      }

      let normalized
      try {
        normalized = normalizeCustomFieldValue(field, entry.value)
      } catch (error) {
        if (error instanceof CustomFieldValueError) {
          return Response.json({ message: error.message }, { status: 422 })
        }
        throw error
      }

      if (normalized === null) {
        await db.boardCardCustomFieldValue.deleteMany({
          where: {
            cardId: params.cardId,
            fieldId: entry.fieldId,
          },
        })
        continue
      }

      await db.boardCardCustomFieldValue.upsert({
        where: {
          cardId_fieldId: {
            cardId: params.cardId,
            fieldId: entry.fieldId,
          },
        },
        create: {
          cardId: params.cardId,
          fieldId: entry.fieldId,
          ...normalized,
        },
        update: normalized,
      })
    }

    const values = await db.boardCardCustomFieldValue.findMany({
      where: {
        cardId: params.cardId,
      },
      select: customFieldValueSelect,
    })

    await recordBoardEvent({
      boardId: params.boardId,
      actorId: userId,
      action: "card.custom_fields.updated",
    })

    return Response.json(values.map(serializeCustomFieldValueRow))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(error.issues, { status: 422 })
    }

    return new Response(null, { status: 500 })
  }
}