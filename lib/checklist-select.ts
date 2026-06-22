export const checklistItemSelect = {
  id: true,
  text: true,
  isComplete: true,
  order: true,
} as const

export const checklistSelect = {
  id: true,
  title: true,
  order: true,
  items: {
    select: checklistItemSelect,
    orderBy: {
      order: "asc" as const,
    },
  },
} as const

export const cardChecklistsSelect = {
  checklists: {
    select: {
      id: true,
      title: true,
      order: true,
      items: {
        select: checklistItemSelect,
        orderBy: {
          order: "asc" as const,
        },
      },
    },
    orderBy: {
      order: "asc" as const,
    },
  },
} as const