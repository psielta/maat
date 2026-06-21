"use client"

import * as React from "react"
import { Paperclip } from "lucide-react"

import { AttachmentList } from "@/components/attachment-list"
import { AttachmentUploader } from "@/components/attachment-uploader"
import { toast } from "@/components/ui/use-toast"
import type { AttachmentModel } from "@/lib/upload-attachment"

export function CardAttachments({
  boardId,
  cardId,
  currentUserId,
  canUpload,
  canManage,
  refreshSignal,
}: {
  boardId: string
  cardId: string
  currentUserId: string
  canUpload: boolean
  canManage: boolean
  refreshSignal: number
}) {
  const [attachments, setAttachments] = React.useState<AttachmentModel[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const load = React.useCallback(async () => {
    const response = await fetch(
      `/api/boards/${boardId}/cards/${cardId}/attachments`
    )

    if (response.ok) {
      setAttachments(await response.json())
    }

    setIsLoading(false)
  }, [boardId, cardId])

  React.useEffect(() => {
    setIsLoading(true)
    void load()
  }, [load, refreshSignal])

  async function remove(attachmentId: string) {
    const previous = attachments
    setAttachments((current) =>
      current.filter((attachment) => attachment.id !== attachmentId)
    )

    const response = await fetch(
      `/api/boards/${boardId}/cards/${cardId}/attachments/${attachmentId}`,
      { method: "DELETE" }
    )

    if (!response.ok) {
      setAttachments(previous)
      toast({
        title: "Something went wrong.",
        description: "The attachment was not removed. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Attachments</h3>
      </div>
      <div className="pl-6">
        {canUpload && (
          <AttachmentUploader
            boardId={boardId}
            cardId={cardId}
            target="card"
            onUploaded={(attachment) =>
              setAttachments((current) => [...current, attachment])
            }
          />
        )}
        {isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Loading attachments…
          </p>
        ) : attachments.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No attachments yet.</p>
        ) : (
          <div className="mt-3">
            <AttachmentList
              boardId={boardId}
              cardId={cardId}
              attachments={attachments}
              currentUserId={currentUserId}
              canManage={canManage}
              onRemove={canUpload ? remove : undefined}
            />
          </div>
        )}
      </div>
    </section>
  )
}