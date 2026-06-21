import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export type BoardAccess = {
  role: "OWNER" | "EDITOR" | "VIEWER"
  canRead: boolean
  canEdit: boolean
  canManage: boolean
}

export async function getCurrentUserId() {
  const user = await getCurrentUser()
  return user?.id ?? null
}

export async function getBoardAccess(
  boardId: string,
  userId: string
): Promise<BoardAccess | null> {
  const board = await db.board.findFirst({
    where: {
      id: boardId,
    },
    select: {
      authorId: true,
      members: {
        where: {
          userId,
        },
        select: {
          role: true,
        },
        take: 1,
      },
    },
  })

  if (!board) {
    return null
  }

  const role =
    board.authorId === userId ? "OWNER" : board.members[0]?.role ?? null

  if (!role) {
    return null
  }

  return {
    role,
    canRead: true,
    canEdit: role === "OWNER" || role === "EDITOR",
    canManage: role === "OWNER",
  }
}

export async function userCanReadBoard(boardId: string, userId: string) {
  return Boolean(await getBoardAccess(boardId, userId))
}

export async function userCanEditBoard(boardId: string, userId: string) {
  const access = await getBoardAccess(boardId, userId)
  return Boolean(access?.canEdit)
}

export async function userCanManageBoard(boardId: string, userId: string) {
  const access = await getBoardAccess(boardId, userId)
  return Boolean(access?.canManage)
}

export async function getBoardForUser(boardId: string, userId: string) {
  return db.board.findFirst({
    where: {
      id: boardId,
      OR: [
        {
          authorId: userId,
        },
        {
          members: {
            some: {
              userId,
            },
          },
        },
      ],
    },
  })
}
