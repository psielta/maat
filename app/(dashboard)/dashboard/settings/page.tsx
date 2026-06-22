import Link from "next/link"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { getCurrentUser } from "@/lib/session"
import { siteConfig } from "@/config/site"
import { messages } from "@/lib/messages/pt-br"
import { DashboardHeader } from "@/components/header"
import { Icons } from "@/components/icons"
import { DashboardHeaderActions } from "@/components/dashboard-header-actions"
import { DashboardShell } from "@/components/shell"
import { UserNameForm } from "@/components/user-name-form"

export const metadata = {
  title: messages.settings.title,
  description: messages.settings.description,
}

export default async function SettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect(authOptions?.pages?.signIn || "/login")
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
      <div className="flex-1 overflow-y-auto">
        <DashboardShell className="container max-w-3xl py-8">
          <DashboardHeader
            heading={messages.settings.title}
            text={messages.settings.description}
          />
          <div className="grid gap-10">
            <UserNameForm user={{ id: user.id, name: user.name || "" }} />
          </div>
        </DashboardShell>
      </div>
    </div>
  )
}