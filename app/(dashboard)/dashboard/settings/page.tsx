import Link from "next/link"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { getCurrentUser } from "@/lib/session"
import { siteConfig } from "@/config/site"
import { DashboardHeader } from "@/components/header"
import { Icons } from "@/components/icons"
import { NotificationBell } from "@/components/notification-bell"
import { DashboardShell } from "@/components/shell"
import { UserAccountNav } from "@/components/user-account-nav"
import { UserNameForm } from "@/components/user-name-form"

export const metadata = {
  title: "Settings",
  description: "Manage account and website settings.",
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
          <NotificationBell />
          <UserAccountNav
            user={{ name: user.name, image: user.image, email: user.email }}
          />
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">
        <DashboardShell className="container max-w-3xl py-8">
          <DashboardHeader
            heading="Settings"
            text="Manage account and website settings."
          />
          <div className="grid gap-10">
            <UserNameForm user={{ id: user.id, name: user.name || "" }} />
          </div>
        </DashboardShell>
      </div>
    </div>
  )
}
