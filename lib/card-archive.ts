export type ArchivedCardModel = {
  id: string
  title: string
  displayId: string | null
  archivedAt: string
  listId: string
  listTitle: string
}

export function serializeArchivedCard(card: {
  id: string
  title: string
  displayId: string | null
  archivedAt: Date | null
  listId: string
  list: {
    title: string
  }
}): ArchivedCardModel {
  return {
    id: card.id,
    title: card.title,
    displayId: card.displayId,
    archivedAt: (card.archivedAt ?? new Date()).toISOString(),
    listId: card.listId,
    listTitle: card.list.title,
  }
}