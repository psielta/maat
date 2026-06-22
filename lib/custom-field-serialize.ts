import { serializeCustomFieldValue } from "@/lib/custom-field-values"

type CustomFieldRecord = {
  id: string
  name: string
  type: string
  order: number
  showOnFront: boolean
  options: Array<{
    id: string
    label: string
    color: string
    order: number
  }>
}

type CustomFieldValueRecord = {
  fieldId: string
  textValue: string | null
  numberValue: number | null
  dateValue: Date | null
  boolValue: boolean | null
  optionId: string | null
}

export function serializeCustomField(field: CustomFieldRecord) {
  return {
    id: field.id,
    name: field.name,
    type: field.type,
    order: field.order,
    showOnFront: field.showOnFront,
    options: field.options.map((option) => ({
      id: option.id,
      label: option.label,
      color: option.color,
      order: option.order,
    })),
  }
}

export function serializeCustomFieldValueRow(row: CustomFieldValueRecord) {
  return serializeCustomFieldValue(row)
}