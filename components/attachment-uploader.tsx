"use client"

import * as React from "react"
import { Paperclip } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/use-toast"
import { m } from "@/lib/i18n"
import {
  uploadAttachment,
  type AttachmentModel,
} from "@/lib/upload-attachment"

type UploadState = {
  fileName: string
  progress: number
}

export function AttachmentUploader({
  boardId,
  cardId,
  target,
  disabled,
  onUploaded,
  label,
}: {
  boardId: string
  cardId: string
  target: "card" | "comment"
  disabled?: boolean
  onUploaded?: (attachment: AttachmentModel) => void
  label?: string
}) {
  const msgs = m()
  const resolvedLabel = label ?? msgs.common.attachFiles
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [uploads, setUploads] = React.useState<UploadState[]>([])
  const [isUploading, setIsUploading] = React.useState(false)

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length || disabled) {
      return
    }

    const files = Array.from(fileList)
    setIsUploading(true)

    for (const file of files) {
      setUploads((current) => [...current, { fileName: file.name, progress: 0 }])

      try {
        const attachment = await uploadAttachment({
          boardId,
          cardId,
          file,
          target,
          onProgress: (progress) => {
            setUploads((current) =>
              current.map((item) =>
                item.fileName === file.name ? { ...item, progress } : item
              )
            )
          },
        })

        onUploaded?.(attachment)
      } catch (error) {
        toast({
          title: msgs.common.uploadFailed,
          description:
            error instanceof Error
              ? error.message
              : msgs.common.fileNotUploaded,
          variant: "destructive",
        })
      } finally {
        setUploads((current) =>
          current.filter((item) => item.fileName !== file.name)
        )
      }
    }

    setIsUploading(false)

    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => void handleFiles(event.target.files)}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || isUploading}
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip className="mr-2 h-4 w-4" />
        {resolvedLabel}
      </Button>
      {uploads.map((upload) => (
        <div key={upload.fileName} className="space-y-1">
          <p className="truncate text-xs text-muted-foreground">
            {msgs.common.uploading} {upload.fileName}…
          </p>
          <Progress value={upload.progress} className="h-2" />
        </div>
      ))}
    </div>
  )
}