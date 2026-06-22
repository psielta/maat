import Link from "next/link"

import { cn } from "@/lib/utils"
import { messages } from "@/lib/messages/pt-br"
import { buttonVariants } from "@/components/ui/button"
import { Icons } from "@/components/icons"

const workflowColumns = [
  {
    title: messages.marketing.workflowColumns.backlog,
    items: [
      messages.marketing.workflowItems.refineAuth,
      messages.marketing.workflowItems.planApi,
    ],
  },
  {
    title: messages.marketing.workflowColumns.building,
    items: [
      messages.marketing.workflowItems.realtimeEvents,
      messages.marketing.workflowItems.reviewMigrations,
    ],
  },
  {
    title: messages.marketing.workflowColumns.review,
    items: [
      messages.marketing.workflowItems.polishEmpty,
      messages.marketing.workflowItems.writeDocs,
    ],
  },
]

const features = [
  messages.marketing.features.developerBoards,
  messages.marketing.features.sharedWorkspaces,
  messages.marketing.features.richCards,
  messages.marketing.features.realtime,
]

export default function IndexPage() {
  return (
    <>
      <section className="border-b">
        <div className="container grid min-h-[calc(100vh-5rem)] gap-10 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-16">
          <div className="max-w-2xl space-y-7">
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm text-muted-foreground">
              <Icons.boards className="mr-2 h-4 w-4 text-primary" />
              {messages.marketing.heroBadge}
            </div>
            <div className="space-y-4">
              <h1 className="font-heading text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                {messages.marketing.heroTitle}
              </h1>
              <p className="max-w-xl text-lg leading-8 text-muted-foreground">
                {messages.marketing.heroSubtitle}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className={cn(buttonVariants({ size: "lg" }))}>
                {messages.marketing.getStarted}
              </Link>
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                {messages.marketing.openWorkspace}
              </Link>
            </div>
          </div>

          <div className="rounded-md border bg-muted/50 p-3 shadow-sm">
            <div className="rounded-md border bg-background">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{messages.marketing.workspaceTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {messages.marketing.workspaceSubtitle}
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  {messages.common.live}
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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