"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { DiaryAccess } from "@/lib/diary-access"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"

export type WorkDiaryShareModel = {
  id: string
  role: "EDITOR" | "VIEWER"
  userId: string
  user: {
    name: string | null
    email: string | null
    image: string | null
  }
}

export type WorkDiaryEntryModel = {
  id: string
  title: string
  content: string | null
  authorId: string
  shares: WorkDiaryShareModel[]
}

export function WorkDiaryEntryView({
  entry,
  access,
}: {
  entry: WorkDiaryEntryModel
  access: DiaryAccess
}) {
  const router = useRouter()
  const [title, setTitle] = React.useState(entry.title)
  const [content, setContent] = React.useState(entry.content ?? "")
  const [shares, setShares] = React.useState(entry.shares)
  const [shareEmail, setShareEmail] = React.useState("")
  const [shareRole, setShareRole] = React.useState<"EDITOR" | "VIEWER">(
    "VIEWER"
  )
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    setTitle(entry.title)
    setContent(entry.content ?? "")
    setShares(entry.shares)
  }, [entry])

  async function saveEntry() {
    if (!access.canEdit) return

    const nextTitle = title.trim()

    if (!nextTitle) {
      setTitle(entry.title)
      return
    }

    setIsSaving(true)

    const response = await fetch(`/api/diary/${entry.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: nextTitle,
        content: content.trim() || null,
      }),
    })

    setIsSaving(false)

    if (!response.ok) {
      return toast({
        title: "Something went wrong.",
        description: "Your work note was not saved. Please try again.",
        variant: "destructive",
      })
    }

    router.refresh()
    return toast({
      description: "Work note saved.",
    })
  }

  async function deleteEntry() {
    if (!access.canManage) return
    if (!window.confirm("Delete this work note?")) return

    const response = await fetch(`/api/diary/${entry.id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      return toast({
        title: "Something went wrong.",
        description: "Your work note was not deleted. Please try again.",
        variant: "destructive",
      })
    }

    router.push("/dashboard/diary")
    router.refresh()
  }

  async function shareEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!access.canManage) return

    const response = await fetch(`/api/diary/${entry.id}/shares`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: shareEmail,
        role: shareRole,
      }),
    })

    if (!response.ok) {
      return toast({
        title: "Something went wrong.",
        description:
          response.status === 404
            ? "That user does not exist in this system."
            : "Work note sharing was not updated. Please try again.",
        variant: "destructive",
      })
    }

    const share = await response.json()
    setShares((current) => {
      const withoutShare = current.filter((item) => item.id !== share.id)
      return [...withoutShare, share]
    })
    setShareEmail("")
    router.refresh()
  }

  async function updateShareRole(shareId: string, role: "EDITOR" | "VIEWER") {
    if (!access.canManage) return

    const response = await fetch(`/api/diary/${entry.id}/shares/${shareId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role }),
    })

    if (!response.ok) {
      return toast({
        title: "Something went wrong.",
        description: "Sharing permissions were not updated. Please try again.",
        variant: "destructive",
      })
    }

    const share = await response.json()
    setShares((current) =>
      current.map((item) => (item.id === share.id ? share : item))
    )
    router.refresh()
  }

  async function removeShare(shareId: string) {
    if (!access.canManage) return

    const response = await fetch(`/api/diary/${entry.id}/shares/${shareId}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      return toast({
        title: "Something went wrong.",
        description: "Shared access was not removed. Please try again.",
        variant: "destructive",
      })
    }

    setShares((current) => current.filter((share) => share.id !== shareId))
    router.refresh()
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="rounded-md border bg-card p-4 text-card-foreground">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/diary"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "w-fit px-2"
            )}
          >
            <Icons.chevronLeft className="mr-2 h-4 w-4" />
            Work Diary
          </Link>
          <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium uppercase text-primary">
            {access.role.toLowerCase()}
          </span>
        </div>

        <div className="grid gap-4">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={saveEntry}
            disabled={!access.canEdit}
            className="h-auto border-none bg-transparent px-0 text-3xl font-semibold shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-default disabled:opacity-100"
          />
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onBlur={saveEntry}
            placeholder="Record what changed, why it matters, and what to revisit later."
            disabled={!access.canEdit}
            className="min-h-[520px] resize-none border-none bg-transparent px-0 text-base leading-7 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-default disabled:opacity-100"
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          {access.canEdit && (
            <Button type="button" variant="outline" onClick={saveEntry}>
              {isSaving && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          )}
          {access.canManage && (
            <Button type="button" variant="destructive" onClick={deleteEntry}>
              <Icons.trash className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </section>

      <aside className="rounded-md border bg-card p-4 text-card-foreground">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Shared access</h2>
          <span className="text-xs text-muted-foreground">{shares.length}</span>
        </div>
        <div className="grid gap-2">
          {shares.length ? (
            shares.map((share) => (
              <div
                key={share.id}
                className="flex items-center gap-2 rounded-md border bg-background p-2"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {(share.user.name || share.user.email || "?")
                    .slice(0, 1)
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {share.user.name || share.user.email}
                  </p>
                  {share.user.email && (
                    <p className="truncate text-xs text-muted-foreground">
                      {share.user.email}
                    </p>
                  )}
                </div>
                {access.canManage ? (
                  <select
                    value={share.role}
                    onChange={(event) =>
                      void updateShareRole(
                        share.id,
                        event.target.value as "EDITOR" | "VIEWER"
                      )
                    }
                    className="h-8 rounded-md border bg-background px-2 text-xs"
                  >
                    <option value="EDITOR">Editor</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                ) : (
                  <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium uppercase text-muted-foreground">
                    {share.role.toLowerCase()}
                  </span>
                )}
                {access.canManage && (
                  <button
                    type="button"
                    className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
                    aria-label="Remove share"
                    onClick={() => void removeShare(share.id)}
                  >
                    <Icons.close className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className="rounded-md border bg-background p-3 text-sm text-muted-foreground">
              This note is private until you share it with another user.
            </p>
          )}
        </div>
        {access.canManage && (
          <form className="mt-3 grid gap-2" onSubmit={shareEntry}>
            <Input
              type="email"
              value={shareEmail}
              onChange={(event) => setShareEmail(event.target.value)}
              placeholder="user@example.com"
            />
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <select
                value={shareRole}
                onChange={(event) =>
                  setShareRole(event.target.value as "EDITOR" | "VIEWER")
                }
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="EDITOR">Editor</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <Button type="submit" disabled={!shareEmail.trim()}>
                Share
              </Button>
            </div>
          </form>
        )}
      </aside>
    </div>
  )
}
