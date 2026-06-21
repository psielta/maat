import { db } from "@/lib/db"

export type DiaryAccess = {
  role: "OWNER" | "EDITOR" | "VIEWER"
  canRead: boolean
  canEdit: boolean
  canManage: boolean
}

export async function getDiaryEntryAccess(
  entryId: string,
  userId: string
): Promise<DiaryAccess | null> {
  const entry = await db.workDiaryEntry.findFirst({
    where: {
      id: entryId,
    },
    select: {
      authorId: true,
      shares: {
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

  if (!entry) {
    return null
  }

  const role =
    entry.authorId === userId ? "OWNER" : entry.shares[0]?.role ?? null

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

export async function userCanReadDiaryEntry(entryId: string, userId: string) {
  return Boolean(await getDiaryEntryAccess(entryId, userId))
}

export async function userCanEditDiaryEntry(entryId: string, userId: string) {
  const access = await getDiaryEntryAccess(entryId, userId)
  return Boolean(access?.canEdit)
}

export async function userCanManageDiaryEntry(entryId: string, userId: string) {
  const access = await getDiaryEntryAccess(entryId, userId)
  return Boolean(access?.canManage)
}

export function diaryEntryAccessWhere(entryId: string, userId: string) {
  return {
    id: entryId,
    OR: [
      {
        authorId: userId,
      },
      {
        shares: {
          some: {
            userId,
          },
        },
      },
    ],
  }
}
