import { DashboardHeader } from "@/components/header"
import { DashboardShell } from "@/components/shell"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <DashboardShell>
      <DashboardHeader heading="Boards" text="Plan work with Kanban boards.">
        <Skeleton className="h-10 w-[104px]" />
      </DashboardHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-[170px] rounded-md" />
        <Skeleton className="h-[170px] rounded-md" />
        <Skeleton className="h-[170px] rounded-md" />
      </div>
    </DashboardShell>
  )
}
