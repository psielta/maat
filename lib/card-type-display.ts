import type { LucideIcon } from "lucide-react"
import { Bug, CheckSquare, Layers, Sparkles } from "lucide-react"

import { messages } from "@/lib/messages/pt-br"

export const BOARD_CARD_TYPES = [
  "DEFAULT",
  "TASK",
  "BUG",
  "FEATURE",
  "EPIC",
] as const

export type BoardCardTypeValue = (typeof BOARD_CARD_TYPES)[number]

type CardTypeMeta = {
  label: string
  icon: LucideIcon | null
  className: string
}

const CARD_TYPE_META: Record<BoardCardTypeValue, CardTypeMeta> = {
  DEFAULT: {
    label: messages.common.noType,
    icon: null,
    className: "",
  },
  TASK: {
    label: messages.cardTypes.task,
    icon: CheckSquare,
    className: "text-blue-600 dark:text-blue-400",
  },
  BUG: {
    label: messages.cardTypes.bug,
    icon: Bug,
    className: "text-red-600 dark:text-red-400",
  },
  FEATURE: {
    label: messages.cardTypes.feature,
    icon: Sparkles,
    className: "text-violet-600 dark:text-violet-400",
  },
  EPIC: {
    label: messages.cardTypes.epic,
    icon: Layers,
    className: "text-amber-600 dark:text-amber-400",
  },
}

export function isBoardCardType(value: string): value is BoardCardTypeValue {
  return (BOARD_CARD_TYPES as readonly string[]).includes(value)
}

export function getCardTypeMeta(cardType: BoardCardTypeValue) {
  return CARD_TYPE_META[cardType]
}

export function shouldShowCardTypeBadge(cardType: BoardCardTypeValue) {
  return cardType !== "DEFAULT"
}