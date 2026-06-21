import Link from "next/link"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { siteConfig } from "@/config/site"
import { BoardCreateButton } from "@/components/board-create-button"
import { EmptyPlaceholder } from "@/components/empty-placeholder"
import { Icons } from "@/components/icons"
import { DashboardHeaderActions } from "@/components/dashboard-header-actions"

export const metadata = {
  title: "Dashboard",
}

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect(authOptions?.pages?.signIn || "/login")
  }

  const board = await db.board.findFirst({
    where: {
      OR: [
        { authorId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
    },
  })

  if (board) {
    redirect(`/dashboard/boards/${board.id}`)
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 sm:px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-bold"
        >
          <Icons.logo className="h-5 w-5 text-primary" />
          <span className="text-lg">{siteConfig.name}</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <DashboardHeaderActions
            user={{ name: user.name, image: user.image, email: user.email }}
          />
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyPlaceholder className="mx-auto max-w-md">
          <EmptyPlaceholder.Icon name="boards" />
          <EmptyPlaceholder.Title>No boards yet</EmptyPlaceholder.Title>
          <EmptyPlaceholder.Description>
            Create your first board to organize work into lists and cards.
          </EmptyPlaceholder.Description>
          <BoardCreateButton />
        </EmptyPlaceholder>
      </div>
    </div>
  )
}
