export type ArchivedListModel = {
  id: string
  title: string
  archivedAt: string
  cardCount: number
}

export function serializeArchivedList(list: {
  id: string
  title: string
  archivedAt: Date | null
  _count: {
    cards: number
  }
}): ArchivedListModel {
  return {
    id: list.id,
    title: list.title,
    archivedAt: (list.archivedAt ?? new Date()).toISOString(),
    cardCount: list._count.cards,
  }
}