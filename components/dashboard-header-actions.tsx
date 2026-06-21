"use client"

import { User } from "next-auth"

import { ModeToggle } from "@/components/mode-toggle"
import { NotificationBell } from "@/components/notification-bell"
import { UserAccountNav } from "@/components/user-account-nav"

interface DashboardHeaderActionsProps {
  user: Pick<User, "name" | "image" | "email">
  variant?: "default" | "board"
}

const boardActionClass =
  "h-9 w-9 bg-white/50 hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10"

export function DashboardHeaderActions({
  user,
  variant = "default",
}: DashboardHeaderActionsProps) {
  const actionClass = variant === "board" ? boardActionClass : undefined

  return (
    <>
      <ModeToggle className={actionClass} />
      <NotificationBell className={actionClass} />
      <span className="hidden h-5 w-px bg-border sm:block" />
      <UserAccountNav user={user} />
    </>
  )
}