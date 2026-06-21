import { notFound, redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { getBoardAccess } from "@/lib/board-access"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { BoardView } from "@/components/board-view"

interface BoardPageProps {
  params: Promise<{
    boardId: string
  }>
}

export default async function BoardPage({ params }: BoardPageProps) {
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
      description: true,
      authorId: true,
      members: {
        select: {
          id: true,
          role: true,
          userId: true,
          user: {
            select: {
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: [
          {
            role: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
      },
      lists: {
        select: {
          id: true,
          title: true,
          order: true,
          cards: {
            select: {
              id: true,
              title: true,
              description: true,
              order: true,
              listId: true,
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

  return (
    <BoardView board={board} access={access} />
  )
}
