import type { ChecklistItemModel, ChecklistModel } from "@/lib/checklist-display"
import { sortChecklists } from "@/lib/checklist-display"

export function serializeChecklistItem(item: {
  id: string
  text: string
  isComplete: boolean
  order: number
}): ChecklistItemModel {
  return {
    id: item.id,
    text: item.text,
    isComplete: item.isComplete,
    order: item.order,
  }
}

export function serializeChecklist(checklist: {
  id: string
  title: string
  order: number
  items: Array<{
    id: string
    text: string
    isComplete: boolean
    order: number
  }>
}): ChecklistModel {
  return {
    id: checklist.id,
    title: checklist.title,
    order: checklist.order,
    items: checklist.items.map(serializeChecklistItem),
  }
}

export function serializeCardChecklists(
  checklists: Array<{
    id: string
    title: string
    order: number
    items: Array<{
      id: string
      text: string
      isComplete: boolean
      order: number
    }>
  }>
): ChecklistModel[] {
  return sortChecklists(checklists.map(serializeChecklist))
}