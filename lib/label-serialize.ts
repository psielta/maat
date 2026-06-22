import type { BoardLabelModel } from "@/lib/label-display"

export function serializeBoardLabel(label: {
  id: string
  name: string
  color: string
  order: number
}): BoardLabelModel {
  return {
    id: label.id,
    name: label.name,
    color: label.color,
    order: label.order,
  }
}

export function serializeCardLabels(
  rows: Array<{ label: { id: string; name: string; color: string; order: number } }>
): BoardLabelModel[] {
  return rows
    .map((row) => serializeBoardLabel(row.label))
    .sort((left, right) => left.order - right.order)
}