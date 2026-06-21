"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { toast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"

export type BoardSummary = {
  id: string
  title: string
}

export function BoardSwitcher({
  boards,
  currentBoardId,
}: {
  boards: BoardSummary[]
  currentBoardId: string
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [isCreating, setIsCreating] = React.useState(false)
  const [draft, setDraft] = React.useState("")

  const current = boards.find((board) => board.id === currentBoardId)

  async function createBoard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const title = draft.trim() || "Untitled board"
    setIsCreating(true)

    const response = await fetch("/api/boards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        description: "Plan, prioritize, and move work across the board.",
      }),
    })

    setIsCreating(false)

    if (!response.ok) {
      return toast({
        title: "Something went wrong.",
        description: "Your board was not created. Please try again.",
        variant: "destructive",
      })
    }

    const board = await response.json()
    setDraft("")
    setOpen(false)
    router.push(`/dashboard/boards/${board.id}`)
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex h-9 max-w-[40vw] items-center gap-2 rounded-md bg-white/50 px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <Icons.boards className="h-4 w-4 shrink-0 text-primary" />
          <span className="hidden truncate sm:inline">
            {current ? current.title : "Boards"}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </button>
      </SheetTrigger>
      <SheetContent
        position="left"
        size="sm"
        className="w-80 max-w-[85vw] p-0"
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b p-4 text-left">
            <SheetTitle>Your boards</SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {boards.length === 0 && (
              <p className="px-2 py-4 text-sm text-muted-foreground">
                No boards yet. Create your first one below.
              </p>
            )}
            {boards.map((board) => {
              const isCurrent = board.id === currentBoardId
              return (
                <Link
                  key={board.id}
                  href={`/dashboard/boards/${board.id}`}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent",
                    isCurrent && "bg-accent font-medium"
                  )}
                >
                  <Icons.boards className="h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate">{board.title}</span>
                  {isCurrent && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </Link>
              )
            })}
          </div>

          <form onSubmit={createBoard} className="space-y-2 border-t p-3">
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="New board name"
            />
            <Button type="submit" className="w-full" disabled={isCreating}>
              {isCreating ? (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.add className="mr-2 h-4 w-4" />
              )}
              Create board
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
