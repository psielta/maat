"use client"

import * as React from "react"
import {
  ArrowDown,
  ArrowUp,
  Pencil,
  Plus,
  Tags,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"

import {
  LABEL_COLOR_PRESETS,
  LABEL_DEFAULT_COLOR,
} from "@/lib/label-colors"
import { m } from "@/lib/i18n"
import type { BoardLabelModel } from "@/lib/label-display"
import { getLabelDisplayName } from "@/lib/label-display"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

const msg = m()

const COLOR_PRESET_LABELS: Record<string, string> = {
  Blue: "Azul",
  Green: "Verde",
  Yellow: "Amarelo",
  Orange: "Laranja",
  Red: "Vermelho",
  Purple: "Roxo",
  Pink: "Rosa",
  Gray: "Cinza",
}

export function BoardLabelsManager({
  boardId,
  labels,
  open,
  onOpenChange,
  onLabelsChange,
}: {
  boardId: string
  labels: BoardLabelModel[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onLabelsChange: (labels: BoardLabelModel[]) => void
}) {
  const router = useRouter()
  const [localLabels, setLocalLabels] = React.useState(labels)
  const [name, setName] = React.useState("")
  const [color, setColor] = React.useState<string>(LABEL_DEFAULT_COLOR)
  const [editingLabelId, setEditingLabelId] = React.useState<string | null>(null)
  const [deleteLabelId, setDeleteLabelId] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    setLocalLabels(labels)
  }, [labels])

  function resetCreateForm() {
    setName("")
    setColor(LABEL_DEFAULT_COLOR)
    setEditingLabelId(null)
  }

  async function createLabel() {
    setIsSaving(true)
    const response = await fetch(`/api/boards/${boardId}/labels`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: name.trim() || undefined,
        color,
      }),
    })
    setIsSaving(false)

    if (!response.ok) {
      toast({
        title: msg.common.errorTitle,
        description: `A etiqueta não foi criada. ${msg.common.tryAgain}`,
        variant: "destructive",
      })
      return
    }

    const created = await response.json()
    const nextLabels = [...localLabels, created].sort((a, b) => a.order - b.order)
    setLocalLabels(nextLabels)
    onLabelsChange(nextLabels)
    resetCreateForm()
    router.refresh()
  }

  async function updateLabel(
    label: BoardLabelModel,
    patch: { name?: string; color?: string }
  ) {
    const response = await fetch(`/api/boards/${boardId}/labels/${label.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    })

    if (!response.ok) {
      toast({
        title: msg.common.errorTitle,
        description: `A etiqueta não foi atualizada. ${msg.common.tryAgain}`,
        variant: "destructive",
      })
      return
    }

    const updated = await response.json()
    const nextLabels = localLabels
      .map((item) => (item.id === updated.id ? updated : item))
      .sort((a, b) => a.order - b.order)
    setLocalLabels(nextLabels)
    onLabelsChange(nextLabels)
    router.refresh()
  }

  async function deleteLabel(labelId: string) {
    const response = await fetch(`/api/boards/${boardId}/labels/${labelId}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      toast({
        title: msg.common.errorTitle,
        description: `A etiqueta não foi excluída. ${msg.common.tryAgain}`,
        variant: "destructive",
      })
      return
    }

    const nextLabels = localLabels.filter((label) => label.id !== labelId)
    setLocalLabels(nextLabels)
    onLabelsChange(nextLabels)
    setDeleteLabelId(null)
    router.refresh()
  }

  async function moveLabel(labelId: string, direction: "up" | "down") {
    const index = localLabels.findIndex((label) => label.id === labelId)
    if (index < 0) return

    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= localLabels.length) {
      return
    }

    const reordered = [...localLabels]
    const [item] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, item)

    const response = await fetch(`/api/boards/${boardId}/labels/reorder`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        labelIds: reordered.map((label) => label.id),
      }),
    })

    if (!response.ok) {
      toast({
        title: msg.common.errorTitle,
        description: `A ordem das etiquetas não foi salva. ${msg.common.tryAgain}`,
        variant: "destructive",
      })
      return
    }

    const nextLabels = reordered.map((label, order) => ({ ...label, order }))
    setLocalLabels(nextLabels)
    onLabelsChange(nextLabels)
    router.refresh()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tags className="h-4 w-4" />
              Etiquetas do board
            </DialogTitle>
            <DialogDescription>
              Crie etiquetas coloridas para este board. Os nomes são opcionais.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3 rounded-lg border border-dashed p-3">
              <p className="text-sm font-medium">
                {editingLabelId ? "Editar etiqueta" : "Criar etiqueta"}
              </p>
              <div className="space-y-2">
                <Label htmlFor="label-name" className="text-xs text-muted-foreground">
                  Nome (opcional)
                </Label>
                <Input
                  id="label-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="ex.: Backend"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Cor</Label>
                <div className="flex flex-wrap gap-2">
                  {LABEL_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setColor(preset.value)}
                      className={cn(
                        "h-8 w-8 rounded-md border-2 transition-transform hover:scale-105",
                        color === preset.value
                          ? "border-foreground"
                          : "border-transparent"
                      )}
                      style={{ backgroundColor: preset.value }}
                      title={COLOR_PRESET_LABELS[preset.label] ?? preset.label}
                      aria-label={COLOR_PRESET_LABELS[preset.label] ?? preset.label}
                    />
                  ))}
                </div>
              </div>
              <DialogFooter className="gap-2 sm:justify-start">
                {editingLabelId ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      onClick={async () => {
                        const label = localLabels.find(
                          (item) => item.id === editingLabelId
                        )
                        if (!label) return
                        await updateLabel(label, {
                          name: name.trim(),
                          color,
                        })
                        resetCreateForm()
                      }}
                    >
                      Salvar alterações
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={resetCreateForm}
                    >
                      {msg.common.cancel}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={isSaving}
                    onClick={() => void createLabel()}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar etiqueta
                  </Button>
                )}
              </DialogFooter>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Etiquetas neste board</p>
              {localLabels.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma etiqueta ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {localLabels.map((label, index) => (
                    <div
                      key={label.id}
                      className="flex items-center gap-2 rounded-lg border bg-card p-2"
                    >
                      <span
                        className="h-8 w-8 shrink-0 rounded-md"
                        style={{ backgroundColor: label.color }}
                        title={getLabelDisplayName(label)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {label.name.trim() || msg.common.unnamedLabel}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                          aria-label="Mover etiqueta para cima"
                          disabled={index === 0}
                          onClick={() => void moveLabel(label.id, "up")}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                          aria-label="Mover etiqueta para baixo"
                          disabled={index === localLabels.length - 1}
                          onClick={() => void moveLabel(label.id, "down")}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-md p-1 text-muted-foreground hover:bg-accent"
                          aria-label="Editar etiqueta"
                          onClick={() => {
                            setEditingLabelId(label.id)
                            setName(label.name)
                            setColor(label.color)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
                          aria-label="Excluir etiqueta"
                          onClick={() => setDeleteLabelId(label.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteLabelId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleteLabelId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta etiqueta?</AlertDialogTitle>
            <AlertDialogDescription>
              Ela será removida de todos os cards deste board.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{msg.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteLabelId) {
                  void deleteLabel(deleteLabelId)
                }
              }}
            >
              Excluir etiqueta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}