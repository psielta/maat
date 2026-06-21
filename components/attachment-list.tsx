"use client"

import { Download, FileIcon, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatFileSize } from "@/lib/attachment-utils"
import type { AttachmentModel } from "@/lib/upload-attachment"

export function AttachmentList({
  boardId,
  cardId,
  attachments,
  currentUserId,
  canManage,
  onRemove,
  canDeleteAttachment,
}: {
  boardId: string
  cardId: string
  attachments: AttachmentModel[]
  currentUserId: string
  canManage: boolean
  onRemove?: (attachmentId: string) => void | Promise<void>
  canDeleteAttachment?: (attachment: AttachmentModel) => boolean
}) {
  if (attachments.length === 0) {
    return null
  }

  return (
    <ul className="space-y-2">
      {attachments.map((attachment) => {
        const canDelete =
          Boolean(onRemove) &&
          (canDeleteAttachment?.(attachment) ??
            (attachment.uploadedById === currentUserId || canManage))

        return (
          <li
            key={attachment.id}
            className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-2"
          >
            <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {attachment.fileName}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(attachment.sizeBytes)}
              </p>
            </div>
            <a
              href={`/api/boards/${boardId}/cards/${cardId}/attachments/${attachment.id}/download`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Download className="h-4 w-4" />
              <span className="sr-only">Download {attachment.fileName}</span>
            </a>
            {canDelete && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-destructive hover:text-destructive"
                onClick={() => void onRemove?.(attachment.id)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete {attachment.fileName}</span>
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}