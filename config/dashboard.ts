import { DashboardConfig } from "types"

import { messages } from "@/lib/messages/pt-br"

export const dashboardConfig: DashboardConfig = {
  mainNav: [],
  sidebarNav: [
    {
      title: messages.nav.boards,
      href: "/dashboard",
      icon: "boards",
    },
    {
      title: messages.nav.settings,
      href: "/dashboard/settings",
      icon: "settings",
    },
  ],
}