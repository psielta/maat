import type { BoardCustomFieldType } from "@prisma/client"

import { messages } from "@/lib/messages/pt-br"

export type CustomFieldDefinition = {
  id: string
  type: BoardCustomFieldType
  options?: Array<{ id: string }>
}

export type CustomFieldValueRow = {
  fieldId: string
  textValue: string | null
  numberValue: number | null
  dateValue: Date | null
  boolValue: boolean | null
  optionId: string | null
}

export type CustomFieldClientValue = {
  fieldId: string
  textValue: string | null
  numberValue: number | null
  dateValue: string | null
  boolValue: boolean | null
  optionId: string | null
}

export class CustomFieldValueError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CustomFieldValueError"
  }
}

function isEmptyText(value: string) {
  return value.trim().length === 0
}

export function normalizeCustomFieldValue(
  field: CustomFieldDefinition,
  raw: string | number | boolean | null
): {
  textValue: string | null
  numberValue: number | null
  dateValue: Date | null
  boolValue: boolean | null
  optionId: string | null
} | null {
  if (raw === null) {
    return null
  }

  switch (field.type) {
    case "TEXT": {
      if (typeof raw !== "string") {
        throw new CustomFieldValueError(messages.validation.textRequiresString)
      }
      const textValue = raw.trim()
      if (isEmptyText(textValue)) {
        return null
      }
      if (textValue.length > 500) {
        throw new CustomFieldValueError(messages.validation.textMaxLength)
      }
      return {
        textValue,
        numberValue: null,
        dateValue: null,
        boolValue: null,
        optionId: null,
      }
    }
    case "NUMBER": {
      if (typeof raw !== "number" || Number.isNaN(raw)) {
        throw new CustomFieldValueError(messages.validation.numberRequiresNumeric)
      }
      return {
        textValue: null,
        numberValue: raw,
        dateValue: null,
        boolValue: null,
        optionId: null,
      }
    }
    case "CHECKBOX": {
      if (typeof raw !== "boolean") {
        throw new CustomFieldValueError(messages.validation.checkboxRequiresBoolean)
      }
      if (!raw) {
        return null
      }
      return {
        textValue: null,
        numberValue: null,
        dateValue: null,
        boolValue: true,
        optionId: null,
      }
    }
    case "DATE": {
      if (typeof raw !== "string") {
        throw new CustomFieldValueError(messages.validation.dateRequiresIso)
      }
      const dateValue = new Date(`${raw}T00:00:00.000Z`)
      if (Number.isNaN(dateValue.getTime())) {
        throw new CustomFieldValueError(messages.validation.dateRequiresValid)
      }
      return {
        textValue: null,
        numberValue: null,
        dateValue,
        boolValue: null,
        optionId: null,
      }
    }
    case "DROPDOWN": {
      if (typeof raw !== "string") {
        throw new CustomFieldValueError(messages.validation.dropdownRequiresOptionId)
      }
      const optionId = raw.trim()
      if (!optionId) {
        return null
      }
      const optionExists = field.options?.some((option) => option.id === optionId)
      if (!optionExists) {
        throw new CustomFieldValueError(messages.validation.dropdownOptionMustExist)
      }
      return {
        textValue: null,
        numberValue: null,
        dateValue: null,
        boolValue: null,
        optionId,
      }
    }
    default:
      throw new CustomFieldValueError(messages.validation.unsupportedFieldType)
  }
}

export function serializeCustomFieldValue(
  row: CustomFieldValueRow
): CustomFieldClientValue {
  return {
    fieldId: row.fieldId,
    textValue: row.textValue,
    numberValue: row.numberValue,
    dateValue: row.dateValue ? row.dateValue.toISOString().slice(0, 10) : null,
    boolValue: row.boolValue,
    optionId: row.optionId,
  }
}

export function customFieldValueHasContent(
  type: BoardCustomFieldType,
  value: CustomFieldClientValue
) {
  switch (type) {
    case "TEXT":
      return Boolean(value.textValue?.trim())
    case "NUMBER":
      return value.numberValue !== null
    case "CHECKBOX":
      return value.boolValue === true
    case "DATE":
      return Boolean(value.dateValue)
    case "DROPDOWN":
      return Boolean(value.optionId)
    default:
      return false
  }
}