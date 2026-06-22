"use client"

import * as React from "react"
import { LinkNode } from "@lexical/link"
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
  REMOVE_LIST_COMMAND,
} from "@lexical/list"
import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin"
import { ListPlugin } from "@lexical/react/LexicalListPlugin"
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import {
  $createHeadingNode,
  $isHeadingNode,
  HeadingNode,
  QuoteNode,
} from "@lexical/rich-text"
import { $setBlocksType } from "@lexical/selection"
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils"
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  type EditorState,
  FORMAT_TEXT_COMMAND,
  type LexicalEditor,
  SELECTION_CHANGE_COMMAND,
} from "lexical"
import {
  Bold,
  Heading3,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  Strikethrough,
  Underline,
} from "lucide-react"

import {
  ImageEditorProvider,
  type ImageUploadContext,
  useImageEditorContext,
} from "@/components/lexical/image-editor-context"
import { ImagesPlugin } from "@/components/lexical/images-plugin"
import { MentionsPlugin } from "@/components/lexical/mentions-plugin"
import { toast } from "@/components/ui/use-toast"
import type { MentionableUser } from "@/lib/board-mentionable-users"
import {
  $createImageNode,
  $isImageNode,
  ImageNode,
} from "@/lib/lexical/image-node"
import { MentionNode } from "@/lib/lexical/mention-node"
import { m } from "@/lib/i18n"
import { uploadInlineImage } from "@/lib/upload-inline-image"
import { MAX_INLINE_IMAGES_PER_CONTENT } from "@/lib/validations/board"
import { cn } from "@/lib/utils"

const editorTheme = {
  paragraph: "mb-2 last:mb-0",
  heading: {
    h3: "mb-2 mt-1 text-base font-semibold",
  },
  quote: "my-2 border-l-2 border-border pl-3 italic text-muted-foreground",
  list: {
    ul: "mb-2 ml-5 list-disc",
    ol: "mb-2 ml-5 list-decimal",
    listitem: "mb-1",
  },
  link: "text-primary underline underline-offset-2",
  mention:
    "rounded bg-primary/10 px-1 font-medium text-primary",
  text: {
    bold: "font-semibold",
    italic: "italic",
    underline: "underline underline-offset-2",
    strikethrough: "line-through",
  },
}

const editorNodes = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  MentionNode,
  ImageNode,
]

function isSerializedState(value: string) {
  const trimmed = value.trim()
  if (!trimmed.startsWith("{")) return false
  try {
    const parsed = JSON.parse(trimmed)
    return Boolean(parsed && parsed.root)
  } catch {
    return false
  }
}

function buildInitialState(value?: string | null) {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (isSerializedState(trimmed)) return trimmed
  return () => {
    const root = $getRoot()
    if (root.getFirstChild() !== null) return
    const paragraph = $createParagraphNode()
    paragraph.append($createTextNode(value))
    root.append(paragraph)
  }
}

function countImageNodes() {
  let count = 0
  const root = $getRoot()

  const walk = (node: ReturnType<typeof root.getFirstChild>) => {
    if (!node) return
    if ($isImageNode(node)) {
      count += 1
    }
    if ("getChildren" in node && typeof node.getChildren === "function") {
      node.getChildren().forEach((child) => walk(child))
    }
  }

  root.getChildren().forEach((child) => walk(child))
  return count
}

function insertImageNode(editor: LexicalEditor, attachmentId: string) {
  editor.update(() => {
    const imageNode = $createImageNode(attachmentId, "")
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      selection.insertNodes([imageNode])
      return
    }
    $getRoot().append(imageNode)
  })
}

function isEditorContentEmpty() {
  const root = $getRoot()
  if (root.getChildrenSize() === 0) return true
  if (root.getChildrenSize() === 1) {
    const first = root.getFirstChild()
    if ($isImageNode(first)) return false
    return first?.getTextContent().trim() === ""
  }
  return root.getTextContent().trim() === "" && countImageNodes() === 0
}

type BlockType = "paragraph" | "h3" | "bullet" | "number"

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
        active && "bg-accent text-foreground"
      )}
    >
      {children}
    </button>
  )
}

function ImageToolbarButton() {
  const msgs = m()
  const { insertImageFile, isUploading } = useImageEditorContext()
  const inputRef = React.useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            void insertImageFile(file)
          }
          event.target.value = ""
        }}
      />
      <ToolbarButton
        label={msgs.editor.insertImage}
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        <ImageIcon className="h-4 w-4" />
      </ToolbarButton>
    </>
  )
}

function Toolbar({ enableImages }: { enableImages?: boolean }) {
  const msgs = m()
  const [editor] = useLexicalComposerContext()
  const [formats, setFormats] = React.useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
  })
  const [blockType, setBlockType] = React.useState<BlockType>("paragraph")

  const updateToolbar = React.useCallback(() => {
    const selection = $getSelection()
    if (!$isRangeSelection(selection)) return

    setFormats({
      bold: selection.hasFormat("bold"),
      italic: selection.hasFormat("italic"),
      underline: selection.hasFormat("underline"),
      strikethrough: selection.hasFormat("strikethrough"),
    })

    const anchorNode = selection.anchor.getNode()
    const element =
      anchorNode.getKey() === "root"
        ? anchorNode
        : anchorNode.getTopLevelElementOrThrow()

    if ($isListNode(element)) {
      const parentList = $getNearestNodeOfType(anchorNode, ListNode)
      const type = parentList ? parentList.getListType() : element.getListType()
      setBlockType(type === "number" ? "number" : "bullet")
    } else if ($isHeadingNode(element)) {
      setBlockType("h3")
    } else {
      setBlockType("paragraph")
    }
  }, [])

  React.useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(updateToolbar)
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar()
          return false
        },
        1
      )
    )
  }, [editor, updateToolbar])

  function toggleBlock(target: Exclude<BlockType, "paragraph">) {
    if (target === "bullet") {
      editor.dispatchCommand(
        blockType === "bullet"
          ? REMOVE_LIST_COMMAND
          : INSERT_UNORDERED_LIST_COMMAND,
        undefined
      )
      return
    }
    if (target === "number") {
      editor.dispatchCommand(
        blockType === "number"
          ? REMOVE_LIST_COMMAND
          : INSERT_ORDERED_LIST_COMMAND,
        undefined
      )
      return
    }
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () =>
          blockType === "h3" ? $createParagraphNode() : $createHeadingNode("h3")
        )
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 px-1.5 py-1">
      <ToolbarButton
        label={msgs.editor.bold}
        active={formats.bold}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label={msgs.editor.italic}
        active={formats.italic}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label={msgs.editor.underline}
        active={formats.underline}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
      >
        <Underline className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label={msgs.editor.strikethrough}
        active={formats.strikethrough}
        onClick={() =>
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")
        }
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolbarButton
        label={msgs.editor.heading}
        active={blockType === "h3"}
        onClick={() => toggleBlock("h3")}
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label={msgs.editor.bulletedList}
        active={blockType === "bullet"}
        onClick={() => toggleBlock("bullet")}
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label={msgs.editor.numberedList}
        active={blockType === "number"}
        onClick={() => toggleBlock("number")}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      {enableImages && (
        <>
          <span className="mx-1 h-5 w-px bg-border" />
          <ImageToolbarButton />
        </>
      )}
    </div>
  )
}

function ImageEditorShell({
  uploadContext,
  editable,
  children,
}: {
  uploadContext?: ImageUploadContext
  editable: boolean
  children: React.ReactNode
}) {
  const msgs = m()
  const [editor] = useLexicalComposerContext()
  const [previewUrls, setPreviewUrls] = React.useState(
    () => new Map<string, string>()
  )
  const [isUploading, setIsUploading] = React.useState(false)

  const registerPreviewUrl = React.useCallback(
    (attachmentId: string, url: string) => {
      setPreviewUrls((current) => {
        const next = new Map(current)
        next.set(attachmentId, url)
        return next
      })
    },
    []
  )

  const insertImageFile = React.useCallback(
    async (file: File) => {
      if (!uploadContext) return

      const imageCount = editor.getEditorState().read(() => countImageNodes())
      if (imageCount >= MAX_INLINE_IMAGES_PER_CONTENT) {
        toast({
          title: msgs.editor.imageLimitReached,
          description: msgs.editor.imageLimitDescription.replace(
            "{max}",
            String(MAX_INLINE_IMAGES_PER_CONTENT)
          ),
          variant: "destructive",
        })
        return
      }

      setIsUploading(true)
      try {
        const attachment = await uploadInlineImage({
          boardId: uploadContext.boardId,
          cardId: uploadContext.cardId,
          file,
        })
        registerPreviewUrl(attachment.id, URL.createObjectURL(file))
        insertImageNode(editor, attachment.id)
      } catch (error) {
        toast({
          title: msgs.editor.imageUploadFailed,
          description:
            error instanceof Error ? error.message : msgs.common.tryAgain,
          variant: "destructive",
        })
        throw error
      } finally {
        setIsUploading(false)
      }
    },
    [editor, registerPreviewUrl, uploadContext]
  )

  if (!uploadContext) {
    return <>{children}</>
  }

  return (
    <ImageEditorProvider
      value={{
        uploadContext,
        previewUrls,
        registerPreviewUrl,
        insertImageFile: editable ? insertImageFile : async () => undefined,
        isUploading,
      }}
    >
      {children}
    </ImageEditorProvider>
  )
}

export function RichTextEditor({
  value,
  editable = true,
  onChange,
  placeholder,
  className,
  mentionableUsers,
  uploadContext,
}: {
  value?: string | null
  editable?: boolean
  onChange?: (serialized: string) => void
  placeholder?: string
  className?: string
  mentionableUsers?: MentionableUser[]
  uploadContext?: ImageUploadContext
}) {
  const msgs = m()
  const resolvedPlaceholder = placeholder ?? msgs.card.descriptionPlaceholder
  const initialConfig = {
    namespace: "card-description",
    editable,
    theme: editorTheme,
    nodes: editorNodes,
    editorState: buildInitialState(value),
    onError(error: Error) {
      throw error
    },
  }

  function handleChange(editorState: EditorState, editor: LexicalEditor) {
    if (!onChange) return
    editorState.read(() => {
      const isEmpty = isEditorContentEmpty()
      onChange(isEmpty ? "" : JSON.stringify(editor.getEditorState().toJSON()))
    })
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <ImageEditorShell uploadContext={uploadContext} editable={editable}>
        <div
          className={cn(
            "overflow-hidden rounded-md border bg-background",
            !editable && "border-transparent bg-transparent",
            className
          )}
        >
          {editable && <Toolbar enableImages={!!uploadContext} />}
          <div className="relative">
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className={cn(
                    "min-h-[120px] w-full resize-none px-3 py-2 text-sm leading-6 outline-none",
                    !editable && "min-h-0 px-0 py-0"
                  )}
                />
              }
              placeholder={
                <div className="pointer-events-none absolute left-3 top-2 select-none text-sm text-muted-foreground">
                  {editable ? resolvedPlaceholder : msgs.editor.noDescriptionYet}
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        {editable && mentionableUsers !== undefined && (
          <MentionsPlugin mentionableUsers={mentionableUsers} />
        )}
        {editable && uploadContext && <ImagesPlugin />}
        {editable && (
          <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
        )}
      </ImageEditorShell>
    </LexicalComposer>
  )
}