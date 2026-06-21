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
      cardIdPattern: true,
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
              displayId: true,
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

  const boards = await db.board.findMany({
    where: {
      OR: [
        { authorId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
    select: {
      id: true,
      title: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  return (
    <BoardView
      board={board}
      access={access}
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      }}
      boards={boards}
    />
  )
}
