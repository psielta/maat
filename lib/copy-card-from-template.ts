import { randomUUID } from "crypto"

import type { Prisma } from "@prisma/client"

import { generateCardDisplayId } from "@/lib/card-id-pattern"
import { cardSelect } from "@/lib/card-select"
import { extractInlineImageIds } from "@/lib/lexical-inline-images"
import { remapInlineImageIds } from "@/lib/remap-inline-images"
import { buildStorageKey, copyObject } from "@/lib/storage"

type TransactionClient = Prisma.TransactionClient

type TemplateAttachment = {
  id: string
  fileName: string
  mimeType: string
  sizeBytes: bigint
  storageKey: string
  scope: "CARD" | "COMMENT" | "INLINE"
  status: "PENDING" | "READY"
}

async function copyAttachment({
  tx,
  boardId,
  targetCardId,
  attachment,
  userId,
}: {
  tx: TransactionClient
  boardId: string
  targetCardId: string
  attachment: TemplateAttachment
  userId: string
}) {
  if (attachment.status !== "READY") {
    return null
  }

  const created = await tx.boardCardAttachment.create({
    data: {
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      storageKey: `pending/${randomUUID()}`,
      scope: attachment.scope,
      status: "READY",
      cardId: targetCardId,
      uploadedById: userId,
    },
    select: {
      id: true,
    },
  })

  const storageKey = buildStorageKey(
    boardId,
    targetCardId,
    created.id,
    attachment.fileName
  )

  await copyObject(attachment.storageKey, storageKey)

  await tx.boardCardAttachment.update({
    where: {
      id: created.id,
    },
    data: {
      storageKey,
    },
  })

  return {
    oldId: attachment.id,
    newId: created.id,
  }
}

export async function copyCardFromTemplate({
  tx,
  boardId,
  templateCardId,
  targetListId,
  userId,
  titleOverride,
}: {
  tx: TransactionClient
  boardId: string
  templateCardId: string
  targetListId: string
  userId: string
  titleOverride?: string
}) {
  const template = await tx.boardCard.findFirst({
    where: {
      id: templateCardId,
      isTemplate: true,
      archivedAt: null,
      list: {
        boardId,
        archivedAt: null,
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      cardType: true,
      startDate: true,
      dueAt: true,
      labels: {
        select: {
          labelId: true,
        },
      },
      customFieldValues: {
        select: {
          fieldId: true,
          textValue: true,
          numberValue: true,
          dateValue: true,
          boolValue: true,
          optionId: true,
        },
      },
      checklists: {
        select: {
          title: true,
          order: true,
          items: {
            select: {
              text: true,
              order: true,
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
      attachments: {
        where: {
          scope: {
            in: ["CARD", "INLINE"],
          },
          status: "READY",
        },
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          sizeBytes: true,
          storageKey: true,
          scope: true,
          status: true,
        },
      },
    },
  })

  if (!template) {
    return null
  }

  const targetList = await tx.boardList.findFirst({
    where: {
      id: targetListId,
      boardId,
      archivedAt: null,
    },
    select: {
      id: true,
    },
  })

  if (!targetList) {
    return null
  }

  const board = await tx.board.findFirst({
    where: {
      id: boardId,
    },
    select: {
      cardIdPattern: true,
    },
  })

  if (!board) {
    return null
  }

  const lastCard = await tx.boardCard.findFirst({
    where: {
      listId: targetListId,
      archivedAt: null,
    },
    orderBy: {
      order: "desc",
    },
    select: {
      order: true,
    },
  })

  const displayId = board.cardIdPattern
    ? await generateCardDisplayId(boardId, board.cardIdPattern, tx)
    : null

  const inlineImageIds = new Set(
    extractInlineImageIds(template.description ?? "")
  )
  const inlineAttachments = template.attachments.filter(
    (attachment) =>
      attachment.scope === "INLINE" && inlineImageIds.has(attachment.id)
  )
  const cardAttachments = template.attachments.filter(
    (attachment) => attachment.scope === "CARD"
  )

  const card = await tx.boardCard.create({
    data: {
      title: titleOverride?.trim() || template.title,
      description: template.description,
      cardType: template.cardType,
      isTemplate: false,
      startDate: template.startDate,
      dueAt: template.dueAt,
      dueComplete: false,
      displayId,
      order: (lastCard?.order ?? -1) + 1,
      listId: targetListId,
      labels: {
        create: template.labels.map((label) => ({
          labelId: label.labelId,
        })),
      },
      customFieldValues: {
        create: template.customFieldValues.map((value) => ({
          fieldId: value.fieldId,
          textValue: value.textValue,
          numberValue: value.numberValue,
          dateValue: value.dateValue,
          boolValue: value.boolValue,
          optionId: value.optionId,
        })),
      },
      checklists: {
        create: template.checklists.map((checklist) => ({
          title: checklist.title,
          order: checklist.order,
          items: {
            create: checklist.items.map((item) => ({
              text: item.text,
              order: item.order,
              isComplete: false,
            })),
          },
        })),
      },
    },
    select: cardSelect,
  })

  const idMap = new Map<string, string>()

  for (const attachment of [...cardAttachments, ...inlineAttachments]) {
    const copied = await copyAttachment({
      tx,
      boardId,
      targetCardId: card.id,
      attachment,
      userId,
    })

    if (copied) {
      idMap.set(copied.oldId, copied.newId)
    }
  }

  const nextDescription = remapInlineImageIds(template.description, idMap)

  if (nextDescription !== template.description) {
    await tx.boardCard.update({
      where: {
        id: card.id,
      },
      data: {
        description: nextDescription,
      },
    })
  }

  return card
}