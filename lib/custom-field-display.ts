import type { BoardCustomFieldType } from "@prisma/client"

import {
  type CustomFieldClientValue,
  customFieldValueHasContent,
} from "@/lib/custom-field-values"

export type CustomFieldOptionModel = {
  id: string
  label: string
  color: string
}

export type CustomFieldDefinitionModel = {
  id: string
  name: string
  type: BoardCustomFieldType
  showOnFront: boolean
  options: CustomFieldOptionModel[]
}

export function getCustomFieldValueForCard(
  values: CustomFieldClientValue[] | undefined,
  fieldId: string
): CustomFieldClientValue | null {
  return (values ?? []).find((value) => value.fieldId === fieldId) ?? null
}

export function formatCustomFieldDisplayValue(
  field: CustomFieldDefinitionModel,
  value: CustomFieldClientValue | null
) {
  if (!value || !customFieldValueHasContent(field.type, value)) {
    return null
  }

  switch (field.type) {
    case "TEXT":
      return value.textValue
    case "NUMBER":
      return value.numberValue?.toString() ?? null
    case "CHECKBOX":
      return field.name
    case "DATE":
      return value.dateValue
        ? new Date(`${value.dateValue}T00:00:00`).toLocaleDateString("pt-BR")
        : null
    case "DROPDOWN": {
      const option = field.options.find((item) => item.id === value.optionId)
      return option?.label ?? null
    }
    default:
      return null
  }
}

export function getDropdownOption(
  field: CustomFieldDefinitionModel,
  optionId: string | null
) {
  if (!optionId) {
    return null
  }
  return field.options.find((option) => option.id === optionId) ?? null
}

export function getFrontCustomFieldBadges(
  fields: CustomFieldDefinitionModel[],
  values: CustomFieldClientValue[] | undefined
) {
  return fields
    .filter((field) => field.showOnFront)
    .map((field) => {
      const value = getCustomFieldValueForCard(values, field.id)
      const displayValue = formatCustomFieldDisplayValue(field, value)
      if (!displayValue) {
        return null
      }
      return {
        field,
        value,
        displayValue,
        option: getDropdownOption(field, value?.optionId ?? null),
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
}