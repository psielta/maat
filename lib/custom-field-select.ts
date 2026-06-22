export const customFieldSelect = {
  id: true,
  name: true,
  type: true,
  order: true,
  showOnFront: true,
  options: {
    select: {
      id: true,
      label: true,
      color: true,
      order: true,
    },
    orderBy: {
      order: "asc" as const,
    },
  },
} as const

export const customFieldValueSelect = {
  fieldId: true,
  textValue: true,
  numberValue: true,
  dateValue: true,
  boolValue: true,
  optionId: true,
} as const