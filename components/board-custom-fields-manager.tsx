"use client"

import * as React from "react"
import {
  ArrowDown,
  ArrowUp,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"

import {
  CUSTOM_FIELD_COLOR_PRESETS,
  CUSTOM_FIELD_DEFAULT_COLOR,
} from "@/lib/custom-field-colors"
import { m } from "@/lib/i18n"
import type { CustomFieldDefinitionModel } from "@/lib/custom-field-display"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
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

type CustomFieldType = CustomFieldDefinitionModel["type"]

type DraftOption = {
  label: string
  color: string
}

const msg = m()

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  TEXT: "Texto",
  NUMBER: "Número",
  CHECKBOX: "Checkbox",
  DATE: "Data",
  DROPDOWN: "Dropdown",
}

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

function emptyOption(): DraftOption {
  return {
    label: "",
    color: CUSTOM_FIELD_DEFAULT_COLOR,
  }
}

export function BoardCustomFieldsManager({
  boardId,
  fields,
  open,
  onOpenChange,
  onFieldsChange,
}: {
  boardId: string
  fields: CustomFieldDefinitionModel[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onFieldsChange: (fields: CustomFieldDefinitionModel[]) => void
}) {
  const router = useRouter()
  const [localFields, setLocalFields] = React.useState(fields)
  const [name, setName] = React.useState("")
  const [type, setType] = React.useState<CustomFieldType>("TEXT")
  const [showOnFront, setShowOnFront] = React.useState(false)
  const [options, setOptions] = React.useState<DraftOption[]>([emptyOption()])
  const [editingFieldId, setEditingFieldId] = React.useState<string | null>(null)
  const [deleteFieldId, setDeleteFieldId] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    setLocalFields(fields)
  }, [fields])

  function resetCreateForm() {
    setName("")
    setType("TEXT")
    setShowOnFront(false)
    setOptions([emptyOption()])
    setEditingFieldId(null)
  }

  async function createField() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      return
    }

    const payload: {
      name: string
      type: CustomFieldType
      showOnFront: boolean
      options?: Array<{ label: string; color: string }>
    } = {
      name: trimmedName,
      type,
      showOnFront,
    }

    if (type === "DROPDOWN") {
      const nextOptions = options
        .map((option) => ({
          label: option.label.trim(),
          color: option.color,
        }))
        .filter((option) => option.label.length > 0)

      if (nextOptions.length === 0) {
        toast({
          title: "O dropdown precisa de opções",
          description: "Adicione pelo menos uma opção antes de criar o campo.",
          variant: "destructive",
        })
        return
      }

      payload.options = nextOptions
    }

    setIsSaving(true)
    const response = await fetch(`/api/boards/${boardId}/custom-fields`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
    setIsSaving(false)

    if (!response.ok) {
      toast({
        title: msg.common.errorTitle,
        description: `O campo personalizado não foi criado. ${msg.common.tryAgain}`,
        variant: "destructive",
      })
      return
    }

    const created = await response.json()
    const nextFields = [...localFields, created].sort((a, b) => a.order - b.order)
    setLocalFields(nextFields)
    onFieldsChange(nextFields)
    resetCreateForm()
    router.refresh()
  }

  async function updateField(
    field: CustomFieldDefinitionModel,
    patch: {
      name?: string
      showOnFront?: boolean
      options?: Array<{ label: string; color: string }>
    }
  ) {
    const response = await fetch(
      `/api/boards/${boardId}/custom-fields/${field.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      }
    )

    if (!response.ok) {
      toast({
        title: msg.common.errorTitle,
        description: `O campo personalizado não foi atualizado. ${msg.common.tryAgain}`,
        variant: "destructive",
      })
      return
    }

    const updated = await response.json()
    const nextFields = localFields
      .map((item) => (item.id === updated.id ? updated : item))
      .sort((a, b) => a.order - b.order)
    setLocalFields(nextFields)
    onFieldsChange(nextFields)
    router.refresh()
  }

  async function deleteField(fieldId: string) {
    const response = await fetch(
      `/api/boards/${boardId}/custom-fields/${fieldId}`,
      { method: "DELETE" }
    )

    if (!response.ok) {
      toast({
        title: msg.common.errorTitle,
        description: `O campo personalizado não foi excluído. ${msg.common.tryAgain}`,
        variant: "destructive",
      })
      return
    }

    const nextFields = localFields.filter((field) => field.id !== fieldId)
    setLocalFields(nextFields)
    onFieldsChange(nextFields)
    setDeleteFieldId(null)
    router.refresh()
  }

  async function moveField(fieldId: string, direction: "up" | "down") {
    const index = localFields.findIndex((field) => field.id === fieldId)
    if (index < 0) return

    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= localFields.length) {
      return
    }

    const reordered = [...localFields]
    const [item] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, item)

    const response = await fetch(`/api/boards/${boardId}/custom-fields/reorder`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fieldIds: reordered.map((field) => field.id),
      }),
    })

    if (!response.ok) {
      toast({
        title: msg.common.errorTitle,
        description: `A ordem dos campos personalizados não foi salva. ${msg.common.tryAgain}`,
        variant: "destructive",
      })
      return
    }

    const nextFields = reordered.map((field, order) => ({ ...field, order }))
    setLocalFields(nextFields)
    onFieldsChange(nextFields)
    router.refresh()
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          onOpenChange(nextOpen)
          if (!nextOpen) {
            resetCreateForm()
          }
        }}
      >
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              {msg.board.customFields}
            </DialogTitle>
            <DialogDescription>
              Defina campos compartilhados por todos os cards deste board.
              Editores podem preencher valores em cada card.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {localFields.length === 0 ? (
              <p className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Nenhum campo personalizado ainda. Adicione o primeiro abaixo.
              </p>
            ) : (
              <div className="space-y-2">
                {localFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="rounded-lg border bg-muted/30 p-3"
                  >
                    {editingFieldId === field.id ? (
                      <FieldEditor
                        initialName={field.name}
                        initialShowOnFront={field.showOnFront}
                        type={field.type}
                        initialOptions={field.options.map((option) => ({
                          label: option.label,
                          color: option.color,
                        }))}
                        onCancel={() => setEditingFieldId(null)}
                        onSave={async (patch) => {
                          await updateField(field, patch)
                          setEditingFieldId(null)
                        }}
                      />
                    ) : (
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{field.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {FIELD_TYPE_LABELS[field.type]}
                            {field.showOnFront ? " · exibido na frente do card" : ""}
                          </p>
                          {field.type === "DROPDOWN" && field.options.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {field.options.map((option) => (
                                <span
                                  key={option.id}
                                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                                  style={{ backgroundColor: option.color }}
                                >
                                  {option.label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 px-0"
                            disabled={index === 0}
                            onClick={() => void moveField(field.id, "up")}
                            aria-label="Mover campo para cima"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 px-0"
                            disabled={index === localFields.length - 1}
                            onClick={() => void moveField(field.id, "down")}
                            aria-label="Mover campo para baixo"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 px-0"
                            onClick={() => setEditingFieldId(field.id)}
                            aria-label="Editar campo"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteFieldId(field.id)}
                            aria-label="Excluir campo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 rounded-lg border border-dashed p-4">
              <p className="text-sm font-medium">Adicionar um campo</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="custom-field-name">Nome</Label>
                  <Input
                    id="custom-field-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Prioridade"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select
                    value={type}
                    onValueChange={(value) =>
                      setType(value as CustomFieldType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Exibir na frente do card</p>
                  <p className="text-xs text-muted-foreground">
                    Mostra este campo como um badge no board.
                  </p>
                </div>
                <Switch checked={showOnFront} onCheckedChange={setShowOnFront} />
              </div>

              {type === "DROPDOWN" && (
                <div className="space-y-2">
                  <Label>Opções</Label>
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={option.label}
                        onChange={(event) =>
                          setOptions((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, label: event.target.value }
                                : item
                            )
                          )
                        }
                        placeholder={`Opção ${index + 1}`}
                      />
                      <Select
                        value={option.color}
                        onValueChange={(value) =>
                          setOptions((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, color: value }
                                : item
                            )
                          )
                        }
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CUSTOM_FIELD_COLOR_PRESETS.map((preset) => (
                            <SelectItem key={preset.value} value={preset.value}>
                              <span className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: preset.value }}
                                />
                                {COLOR_PRESET_LABELS[preset.label] ?? preset.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 px-0"
                        disabled={options.length === 1}
                        onClick={() =>
                          setOptions((current) =>
                            current.filter((_, itemIndex) => itemIndex !== index)
                          )
                        }
                        aria-label="Remover opção"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setOptions((current) => [...current, emptyOption()])}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar opção
                  </Button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => void createField()}
              disabled={isSaving || !name.trim()}
            >
              {isSaving ? "Salvando…" : "Adicionar campo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteFieldId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeleteFieldId(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campo personalizado?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove o campo e todos os valores salvos nos cards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{msg.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteFieldId) {
                  void deleteField(deleteFieldId)
                }
              }}
            >
              Excluir campo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function FieldEditor({
  initialName,
  initialShowOnFront,
  type,
  initialOptions,
  onCancel,
  onSave,
}: {
  initialName: string
  initialShowOnFront: boolean
  type: CustomFieldType
  initialOptions: DraftOption[]
  onCancel: () => void
  onSave: (patch: {
    name?: string
    showOnFront?: boolean
    options?: Array<{ label: string; color: string }>
  }) => Promise<void>
}) {
  const [name, setName] = React.useState(initialName)
  const [showOnFront, setShowOnFront] = React.useState(initialShowOnFront)
  const [options, setOptions] = React.useState(
    initialOptions.length > 0 ? initialOptions : [emptyOption()]
  )
  const [isSaving, setIsSaving] = React.useState(false)

  async function handleSave() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      return
    }

    const patch: {
      name: string
      showOnFront: boolean
      options?: Array<{ label: string; color: string }>
    } = {
      name: trimmedName,
      showOnFront,
    }

    if (type === "DROPDOWN") {
      const nextOptions = options
        .map((option) => ({
          label: option.label.trim(),
          color: option.color,
        }))
        .filter((option) => option.label.length > 0)

      if (nextOptions.length === 0) {
        toast({
          title: "O dropdown precisa de opções",
          description: "Adicione pelo menos uma opção antes de salvar.",
          variant: "destructive",
        })
        return
      }

      patch.options = nextOptions
    }

    setIsSaving(true)
    await onSave(patch)
    setIsSaving(false)
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Nome</Label>
        <Input value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <div>
          <p className="text-sm font-medium">Exibir na frente do card</p>
        </div>
        <Switch checked={showOnFront} onCheckedChange={setShowOnFront} />
      </div>
      {type === "DROPDOWN" && (
        <div className="space-y-2">
          <Label>Opções</Label>
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={option.label}
                onChange={(event) =>
                  setOptions((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, label: event.target.value }
                        : item
                    )
                  )
                }
              />
              <Select
                value={option.color}
                onValueChange={(value) =>
                  setOptions((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, color: value } : item
                    )
                  )
                }
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOM_FIELD_COLOR_PRESETS.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: preset.value }}
                        />
                        {COLOR_PRESET_LABELS[preset.label] ?? preset.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="shrink-0"
                disabled={options.length === 1}
                onClick={() =>
                  setOptions((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index)
                  )
                }
                aria-label="Remover opção"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setOptions((current) => [...current, emptyOption()])}
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar opção
          </Button>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          {msg.common.cancel}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => void handleSave()}
          disabled={isSaving || !name.trim()}
        >
          {isSaving ? "Salvando…" : msg.common.save}
        </Button>
      </div>
    </div>
  )
}