import { DashboardConfig } from "types"

export const dashboardConfig: DashboardConfig = {
  mainNav: [],
  sidebarNav: [
    {
      title: "Boards",
      href: "/dashboard/boards",
      icon: "boards",
    },
    {
      title: "Work Diary",
      href: "/dashboard/diary",
      icon: "diary",
    },
    {
      title: "Settings",
      href: "/dashboard/settings",
      icon: "settings",
    },
  ],
}
