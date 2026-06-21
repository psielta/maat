import { Skeleton } from "@/components/ui/skeleton"

function CardSkeleton({ twoLines = false }: { twoLines?: boolean }) {
  return (
    <div className="rounded-lg border border-black/5 bg-card p-3 shadow-sm dark:border-white/10">
      <Skeleton className="h-3.5 w-3/4 bg-muted-foreground/15" />
      {twoLines && (
        <Skeleton className="mt-2 h-3 w-1/2 bg-muted-foreground/15" />
      )}
    </div>
  )
}

function ColumnSkeleton({
  titleWidth,
  cards,
}: {
  titleWidth: string
  cards: boolean[]
}) {
  return (
    <div className="flex w-[280px] shrink-0 flex-col gap-2 rounded-xl border border-black/5 bg-muted/70 p-2 shadow-sm backdrop-blur-sm dark:border-white/5">
      <div className="flex items-center justify-between px-1 py-1">
        <Skeleton className={`h-4 ${titleWidth}`} />
        <Skeleton className="h-4 w-5 rounded-full" />
      </div>
      {cards.map((twoLines, index) => (
        <CardSkeleton key={index} twoLines={twoLines} />
      ))}
      <Skeleton className="mt-1 h-7 w-28 rounded-md bg-foreground/5" />
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <div className="flex h-full flex-col bg-gradient-to-br from-sky-100 via-sky-50 to-indigo-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      {/* App header skeleton — mirrors the real board header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-black/5 bg-white/50 px-3 py-2.5 backdrop-blur-md dark:border-white/10 dark:bg-black/20">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-6 w-6 rounded-md" />
          <Skeleton className="hidden h-4 w-12 md:block" />
        </div>
        <span className="hidden h-5 w-px bg-border sm:block" />
        <Skeleton className="h-9 w-36 rounded-md" />
        <Skeleton className="h-5 w-40 rounded" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="hidden h-9 w-[88px] rounded-md sm:block" />
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </header>

      {/* Board canvas skeleton */}
      <div className="flex flex-1 items-start gap-3 overflow-hidden p-4">
        <ColumnSkeleton titleWidth="w-16" cards={[true, false, false]} />
        <ColumnSkeleton titleWidth="w-20" cards={[false, true]} />
        <ColumnSkeleton titleWidth="w-14" cards={[false]} />
        <Skeleton className="h-12 w-[280px] shrink-0 rounded-xl bg-foreground/5" />
      </div>
    </div>
  )
}
