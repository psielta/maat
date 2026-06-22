"use client"

import * as React from "react"
import { ListChecks } from "lucide-react"

import type { CustomFieldDefinitionModel } from "@/lib/custom-field-display"
import type { CustomFieldClientValue } from "@/lib/custom-field-values"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"

const EMPTY_CUSTOM_FIELD_VALUES: CustomFieldClientValue[] = []

function getValueForField(
  values: CustomFieldClientValue[] | undefined,
  fieldId: string
): CustomFieldClientValue | null {
  return (values ?? []).find((value) => value.fieldId === fieldId) ?? null
}

function buildDraftValues(
  fields: CustomFieldDefinitionModel[],
  values: CustomFieldClientValue[] | undefined
) {
  return fields.map((field) => {
    const current = getValueForField(values, field.id)
    switch (field.type) {
      case "TEXT":
        return { fieldId: field.id, value: current?.textValue ?? "" }
      case "NUMBER":
        return {
          fieldId: field.id,
          value:
            current?.numberValue === null || current?.numberValue === undefined
              ? ""
              : String(current.numberValue),
        }
      case "CHECKBOX":
        return { fieldId: field.id, value: current?.boolValue === true }
      case "DATE":
        return { fieldId: field.id, value: current?.dateValue ?? "" }
      case "DROPDOWN":
        return { fieldId: field.id, value: current?.optionId ?? "" }
      default:
        return { fieldId: field.id, value: "" }
    }
  })
}

function toApiValue(
  field: CustomFieldDefinitionModel,
  raw: string | boolean
): string | number | boolean | null {
  switch (field.type) {
    case "TEXT": {
      const value = String(raw).trim()
      return value.length > 0 ? value : null
    }
    case "NUMBER": {
      const value = String(raw).trim()
      if (!value) return null
      const parsed = Number(value)
      return Number.isNaN(parsed) ? null : parsed
    }
    case "CHECKBOX":
      return raw === true ? true : null
    case "DATE": {
      const value = String(raw).trim()
      return value.length > 0 ? value : null
    }
    case "DROPDOWN": {
      const value = String(raw).trim()
      return value.length > 0 ? value : null
    }
    default:
      return null
  }
}

export function CardCustomFields({
  boardId,
  cardId,
  fields,
  values,
  canEdit,
  onValuesChange,
}: {
  boardId: string
  cardId: string
  fields: CustomFieldDefinitionModel[]
  values?: CustomFieldClientValue[]
  canEdit: boolean
  onValuesChange: (values: CustomFieldClientValue[]) => void
}) {
  const safeValues = values ?? EMPTY_CUSTOM_FIELD_VALUES
  const [drafts, setDrafts] = React.useState(() =>
    buildDraftValues(fields, safeValues)
  )
  const saveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingSaveRef = React.useRef<
    Array<{ fieldId: string; value: string | number | boolean | null }>
  >([])

  React.useEffect(() => {
    setDrafts(buildDraftValues(fields, values ?? EMPTY_CUSTOM_FIELD_VALUES))
  }, [cardId, fields, values])

  React.useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  async function flushSave(
    payload: Array<{ fieldId: string; value: string | number | boolean | null }>
  ) {
    const response = await fetch(
      `/api/boards/${boardId}/cards/${cardId}/custom-fields`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: payload }),
      }
    )

    if (!response.ok) {
      toast({
        title: "Something went wrong.",
        description: "Custom field values were not saved. Please try again.",
        variant: "destructive",
      })
      return
    }

    onValuesChange(await response.json())
  }

  function scheduleSave(
    nextDrafts: Array<{ fieldId: string; value: string | boolean }>
  ) {
    if (!canEdit) {
      return
    }

    const payload = nextDrafts.map((draft) => {
      const field = fields.find((item) => item.id === draft.fieldId)
      if (!field) {
        return { fieldId: draft.fieldId, value: null }
      }
      return {
        fieldId: draft.fieldId,
        value: toApiValue(field, draft.value),
      }
    })

    pendingSaveRef.current = payload

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      void flushSave(pendingSaveRef.current)
    }, 400)
  }

  function updateDraft(fieldId: string, value: string | boolean) {
    setDrafts((current) => {
      const nextDrafts = current.map((draft) =>
        draft.fieldId === fieldId ? { ...draft, value } : draft
      )
      scheduleSave(nextDrafts)
      return nextDrafts
    })
  }

  if (fields.length === 0) {
    return null
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Custom fields</h3>
      </div>
      <div className="space-y-3 pl-6">
        {fields.map((field) => {
          const draft = drafts.find((item) => item.fieldId === field.id)

          return (
            <div key={field.id} className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{field.name}</Label>
              {field.type === "TEXT" && (
                <Input
                  value={String(draft?.value ?? "")}
                  onChange={(event) => updateDraft(field.id, event.target.value)}
                  disabled={!canEdit}
                  placeholder="Enter text"
                />
              )}
              {field.type === "NUMBER" && (
                <Input
                  type="number"
                  value={String(draft?.value ?? "")}
                  onChange={(event) => updateDraft(field.id, event.target.value)}
                  disabled={!canEdit}
                  placeholder="Enter number"
                />
              )}
              {field.type === "DATE" && (
                <Input
                  type="date"
                  value={String(draft?.value ?? "")}
                  onChange={(event) => updateDraft(field.id, event.target.value)}
                  disabled={!canEdit}
                />
              )}
              {field.type === "CHECKBOX" && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`custom-field-${field.id}`}
                    checked={draft?.value === true}
                    onCheckedChange={(checked) =>
                      updateDraft(field.id, checked === true)
                    }
                    disabled={!canEdit}
                  />
                  <Label
                    htmlFor={`custom-field-${field.id}`}
                    className="text-sm font-normal"
                  >
                    {field.name}
                  </Label>
                </div>
              )}
              {field.type === "DROPDOWN" && (
                <Select
                  value={String(draft?.value ?? "") || undefined}
                  onValueChange={(value) => updateDraft(field.id, value)}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: option.color }}
                          />
                          {option.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}