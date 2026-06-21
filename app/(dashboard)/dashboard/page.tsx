import { redirect } from "next/navigation"

export const metadata = {
  title: "Dashboard",
}

export default async function DashboardPage() {
  redirect("/dashboard/boards")
}
