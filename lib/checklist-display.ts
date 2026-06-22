export type ChecklistItemModel = {
  id: string
  text: string
  isComplete: boolean
  order: number
}

export type ChecklistModel = {
  id: string
  title: string
  order: number
  items: ChecklistItemModel[]
}

export type ChecklistProgress = {
  total: number
  completed: number
  percent: number
}

export function getChecklistProgress(items: ChecklistItemModel[]): ChecklistProgress {
  const total = items.length
  const completed = items.filter((item) => item.isComplete).length
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)

  return { total, completed, percent }
}

export function getCardChecklistSummary(checklists: ChecklistModel[]) {
  const items = checklists.flatMap((checklist) => checklist.items)
  return getChecklistProgress(items)
}

export function sortChecklists(checklists: ChecklistModel[]) {
  return [...checklists]
    .sort((left, right) => left.order - right.order)
    .map((checklist) => ({
      ...checklist,
      items: [...checklist.items].sort((left, right) => left.order - right.order),
    }))
}