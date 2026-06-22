export const labelSelect = {
  id: true,
  name: true,
  color: true,
  order: true,
} as const

export const cardLabelSelect = {
  label: {
    select: labelSelect,
  },
} as const