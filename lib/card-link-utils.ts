export function normalizeCardLinkPair(cardAId: string, cardBId: string) {
  return cardAId < cardBId
    ? ([cardAId, cardBId] as const)
    : ([cardBId, cardAId] as const)
}