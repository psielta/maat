import { messages } from "@/lib/messages/pt-br"

export type BoardLabelModel = {
  id: string
  name: string
  color: string
  order: number
}

export function sortBoardLabels(labels: BoardLabelModel[]) {
  return [...labels].sort((left, right) => left.order - right.order)
}

export function getLabelDisplayName(label: BoardLabelModel) {
  return label.name.trim() || messages.common.unnamedLabel
}