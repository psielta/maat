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
  return label.name.trim() || "Unnamed label"
}