"use client"

import * as React from "react"
import { formatDistanceToNow } from "date-fns"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { RichTextEditor } from "@/components/rich-text-editor"

type CommentModel = {
  id: string
  content: string
  createdAt: string
  authorId: string
  author: {
    name: string | null
    email: string | null
    image: string | null
  }
}

function initials(author: CommentModel["author"]) {
  return (author.name || author.email || "?").slice(0, 1).toUpperCase()
}

export function CardComments({
  boardId,
  cardId,
  currentUserId,
  canComment,
  canManage,
  refreshSignal,
}: {
  boardId: string
  cardId: string
  currentUserId: string
  canComment: boolean
  canManage: boolean
  refreshSignal: number
}) {
  const [comments, setComments] = React.useState<CommentModel[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [draft, setDraft] = React.useState("")
  const [composerKey, setComposerKey] = React.useState(0)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const load = React.useCallback(async () => {
    const response = await fetch(
      `/api/boards/${boardId}/cards/${cardId}/comments`
    )
    if (response.ok) {
      setComments(await response.json())
    }
    setIsLoading(false)
  }, [boardId, cardId])

  React.useEffect(() => {
    setIsLoading(true)
    void load()
  }, [load, refreshSignal])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.trim()) return

    setIsSubmitting(true)
    const response = await fetch(
      `/api/boards/${boardId}/cards/${cardId}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      }
    )
    setIsSubmitting(false)

    if (!response.ok) {
      return toast({
        title: "Something went wrong.",
        description: "Your comment was not posted. Please try again.",
        variant: "destructive",
      })
    }

    const comment: CommentModel = await response.json()
    setComments((current) => [...current, comment])
    setDraft("")
    setComposerKey((value) => value + 1)
  }

  async function remove(id: string) {
    const previous = comments
    setComments((current) => current.filter((comment) => comment.id !== id))

    const response = await fetch(
      `/api/boards/${boardId}/cards/${cardId}/comments/${id}`,
      { method: "DELETE" }
    )

    if (!response.ok) {
      setComments(previous)
      toast({
        title: "Something went wrong.",
        description: "The comment was not removed. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      {canComment && (
        <form onSubmit={submit} className="space-y-2">
          <RichTextEditor
            key={composerKey}
            value=""
            editable
            onChange={setDraft}
            placeholder="Write a comment…"
            className="bg-background"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={!draft.trim() || isSubmitting}
            >
              Comment
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => {
            const canRemove = comment.authorId === currentUserId || canManage
            return (
              <li key={comment.id} className="flex gap-2.5">
                <Avatar className="mt-0.5 h-7 w-7 shrink-0">
                  {comment.author.image && (
                    <AvatarImage
                      src={comment.author.image}
                      alt={comment.author.name ?? ""}
                    />
                  )}
                  <AvatarFallback className="bg-primary/15 text-[11px] font-semibold text-primary">
                    {initials(comment.author)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-sm font-medium">
                      {comment.author.name || comment.author.email}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <div className="mt-1 rounded-lg bg-muted px-3 py-2 text-sm">
                    <RichTextEditor value={comment.content} editable={false} />
                  </div>
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => void remove(comment.id)}
                      className="mt-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
