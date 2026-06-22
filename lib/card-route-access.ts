import { userCanEditBoard, userCanReadBoard } from "@/lib/board-access"
import { db } from "@/lib/db"

export async function cardExistsOnBoard(boardId: string, cardId: string) {
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

export async function userCanReadCard(
  boardId: string,
  cardId: string,
  userId: string
) {
  if (!(await userCanReadBoard(boardId, userId))) {
    return false
  }

  return cardExistsOnBoard(boardId, cardId)
}

export async function userCanEditCard(
  boardId: string,
  cardId: string,
  userId: string
) {
  if (!(await userCanEditBoard(boardId, userId))) {
    return false
  }

  return cardExistsOnBoard(boardId, cardId)
}

export async function getChecklistOnCard(
  boardId: string,
  cardId: string,
  checklistId: string
) {
  return db.boardCardChecklist.findFirst({
    where: {
      id: checklistId,
      cardId,
      card: {
        list: {
          boardId,
        },
      },
    },
    select: {
      id: true,
    },
  })
}