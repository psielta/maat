export type LinkedCardModel = {
  id: string
  title: string
  displayId: string | null
  listId: string
  listTitle: string
}

export type CardLinkModel = {
  id: string
  card: LinkedCardModel
}