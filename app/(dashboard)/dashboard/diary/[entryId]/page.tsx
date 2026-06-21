import { notFound, redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { getDiaryEntryAccess } from "@/lib/diary-access"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"
import { WorkDiaryEntryView } from "@/components/work-diary-entry-view"

interface WorkDiaryEntryPageProps {
  params: Promise<{
    entryId: string
  }>
}

export default async function WorkDiaryEntryPage({
  params,
}: WorkDiaryEntryPageProps) {
  const { entryId } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect(authOptions?.pages?.signIn || "/login")
  }

  const access = await getDiaryEntryAccess(entryId, user.id)

  if (!access) {
    notFound()
  }

  const entry = await db.workDiaryEntry.findFirst({
    where: {
      id: entryId,
    },
    select: {
      id: true,
      title: true,
      content: true,
      authorId: true,
      shares: {
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
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  })

  if (!entry) {
    notFound()
  }

  return <WorkDiaryEntryView entry={entry} access={access} />
}
