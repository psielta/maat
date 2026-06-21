import Link from "next/link"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { formatDate } from "@/lib/utils"
import { BoardCreateButton } from "@/components/board-create-button"
import { EmptyPlaceholder } from "@/components/empty-placeholder"
import { DashboardHeader } from "@/components/header"
import { Icons } from "@/components/icons"
import { DashboardShell } from "@/components/shell"

export const metadata = {
  title: "Boards",
}

export default async function BoardsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect(authOptions?.pages?.signIn || "/login")
  }

  const boards = await db.board.findMany({
    where: {
      OR: [
        {
          authorId: user.id,
        },
        {
          members: {
            some: {
              userId: user.id,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      updatedAt: true,
      authorId: true,
      lists: {
        select: {
          _count: {
            select: {
              cards: true,
            },
          },
        },
      },
      members: {
        where: {
          userId: user.id,
        },
        select: {
          role: true,
        },
        take: 1,
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Boards"
        text="Plan personal and shared developer work with Kanban boards."
      >
        <BoardCreateButton />
      </DashboardHeader>
      <div>
        {boards.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {boards.map((board) => {
              const cardCount = board.lists.reduce(
                (total, list) => total + list._count.cards,
                0
              )
              const role =
                board.authorId === user.id ? "OWNER" : board.members[0]?.role

              return (
                <Link
                  key={board.id}
                  href={`/dashboard/boards/${board.id}`}
                  className="group flex min-h-[170px] flex-col justify-between rounded-md border bg-card p-5 text-card-foreground transition-colors hover:border-primary/60 hover:bg-accent"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <h2 className="line-clamp-2 text-lg font-semibold">
                        {board.title}
                      </h2>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium uppercase text-primary">
                          {role?.toLowerCase()}
                        </span>
                        <Icons.boards className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    {board.description && (
                      <p className="line-clamp-3 text-sm text-muted-foreground">
                        {board.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-6 text-xs text-muted-foreground">
                    <span>
                      {cardCount} {cardCount === 1 ? "card" : "cards"}
                    </span>
                    <span>Updated {formatDate(board.updatedAt.toDateString())}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <EmptyPlaceholder>
            <EmptyPlaceholder.Icon name="boards" />
            <EmptyPlaceholder.Title>No boards created</EmptyPlaceholder.Title>
            <EmptyPlaceholder.Description>
              Create your first board to organize work into lists and cards.
            </EmptyPlaceholder.Description>
            <BoardCreateButton variant="outline" />
          </EmptyPlaceholder>
        )}
      </div>
    </DashboardShell>
  )
}
