import Link from "next/link"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { formatDate } from "@/lib/utils"
import { DiaryCreateButton } from "@/components/diary-create-button"
import { EmptyPlaceholder } from "@/components/empty-placeholder"
import { DashboardHeader } from "@/components/header"
import { Icons } from "@/components/icons"
import { DashboardShell } from "@/components/shell"

export const metadata = {
  title: "Work Diary",
}

export default async function WorkDiaryPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect(authOptions?.pages?.signIn || "/login")
  }

  const entries = await db.workDiaryEntry.findMany({
    where: {
      OR: [
        {
          authorId: user.id,
        },
        {
          shares: {
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
      content: true,
      updatedAt: true,
      authorId: true,
      shares: {
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
        heading="Work Diary"
        text="Keep private notes about decisions, progress, bugs, and daily work."
      >
        <DiaryCreateButton />
      </DashboardHeader>
      <div>
        {entries.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {entries.map((entry) => {
              const role =
                entry.authorId === user.id ? "OWNER" : entry.shares[0]?.role
              const preview = entry.content?.trim()

              return (
                <Link
                  key={entry.id}
                  href={`/dashboard/diary/${entry.id}`}
                  className="group flex min-h-[170px] flex-col justify-between rounded-md border bg-card p-5 text-card-foreground transition-colors hover:border-primary/60 hover:bg-accent"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <h2 className="line-clamp-2 text-lg font-semibold">
                        {entry.title}
                      </h2>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium uppercase text-primary">
                          {role?.toLowerCase()}
                        </span>
                        <Icons.diary className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    {preview && (
                      <p className="line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">
                        {preview}
                      </p>
                    )}
                  </div>
                  <div className="pt-6 text-xs text-muted-foreground">
                    Updated {formatDate(entry.updatedAt.toDateString())}
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <EmptyPlaceholder>
            <EmptyPlaceholder.Icon name="diary" />
            <EmptyPlaceholder.Title>No work notes yet</EmptyPlaceholder.Title>
            <EmptyPlaceholder.Description>
              Create a diary note to record decisions, progress, or context from
              your development day.
            </EmptyPlaceholder.Description>
            <DiaryCreateButton variant="outline" />
          </EmptyPlaceholder>
        )}
      </div>
    </DashboardShell>
  )
}
