import Link from "next/link"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Icons } from "@/components/icons"

const workflowColumns = [
  {
    title: "Backlog",
    items: ["Refine auth flow", "Plan API contracts"],
  },
  {
    title: "Building",
    items: ["Realtime board events", "Review migrations"],
  },
  {
    title: "Review",
    items: ["Polish empty states", "Write agent docs"],
  },
]

const features = [
  {
    title: "Developer-first boards",
    description:
      "Organize tasks, bugs, refactors, experiments, and release work in focused Kanban boards.",
  },
  {
    title: "Shared workspaces",
    description:
      "Invite another user as an editor or viewer and collaborate without duplicating context.",
  },
  {
    title: "Realtime updates",
    description:
      "Board changes are broadcast through Redis and streamed to connected browsers with SSE.",
  },
]

export default function IndexPage() {
  return (
    <>
      <section className="border-b">
        <div className="container grid min-h-[calc(100vh-5rem)] gap-10 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-16">
          <div className="max-w-2xl space-y-7">
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm text-muted-foreground">
              <Icons.boards className="mr-2 h-4 w-4 text-primary" />
              Personal task control for software developers
            </div>
            <div className="space-y-4">
              <h1 className="font-heading text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                Maat keeps your developer work visible, shared, and moving.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-muted-foreground">
                Plan personal projects, client work, bugs, and experiments with
                collaborative Kanban boards built for a real portfolio app.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
                Start with email
              </Link>
              <Link
                href="/dashboard/boards"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                Open workspace
              </Link>
            </div>
          </div>

          <div className="rounded-md border bg-muted/50 p-3 shadow-sm">
            <div className="rounded-md border bg-background">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">Maat workspace</p>
                  <p className="text-xs text-muted-foreground">
                    Portfolio launch board
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  Live
                </span>
              </div>
              <div className="grid gap-3 p-3 md:grid-cols-3">
                {workflowColumns.map((column) => (
                  <div
                    key={column.title}
                    className="min-h-[260px] rounded-md border bg-muted/60"
                  >
                    <div className="flex items-center justify-between border-b px-3 py-2">
                      <h2 className="text-sm font-semibold">{column.title}</h2>
                      <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                        {column.items.length}
                      </span>
                    </div>
                    <div className="space-y-3 p-3">
                      {column.items.map((item, index) => (
                        <div
                          key={item}
                          className="rounded-md border bg-background p-3 shadow-sm"
                        >
                          <p className="text-sm font-medium">{item}</p>
                          <div className="mt-3 flex items-center gap-2">
                            <span
                              className={cn(
                                "h-2 w-12 rounded-full",
                                index % 2 === 0 ? "bg-primary" : "bg-sky-500"
                              )}
                            />
                            <span className="h-2 w-8 rounded-full bg-emerald-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="container py-12 lg:py-20">
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-md border bg-card p-5 text-card-foreground"
            >
              <h2 className="text-base font-semibold">{feature.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
