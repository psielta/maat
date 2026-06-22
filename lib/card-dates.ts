import { format, isSameDay, isValid, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

import { messages } from "@/lib/messages/pt-br"

export type CardDatesModel = {
  startDate: string | null
  dueAt: string | null
  dueComplete: boolean
}

export type DueStatus = "none" | "complete" | "overdue" | "due-soon" | "upcoming"

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isValidDateOnly(value: string) {
  if (!DATE_ONLY_PATTERN.test(value)) {
    return false
  }

  const parsed = parseISO(value)
  return isValid(parsed)
}

export function parseStartDate(value: string | null | undefined) {
  if (!value) {
    return null
  }

  if (!isValidDateOnly(value)) {
    return null
  }

  return parseISO(value)
}

export function parseDueAt(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const parsed = parseISO(value)
  return isValid(parsed) ? parsed : null
}

export function serializeCardDates(card: {
  startDate: Date | null
  dueAt: Date | null
  dueComplete: boolean
}): CardDatesModel {
  return {
    startDate: card.startDate ? format(card.startDate, "yyyy-MM-dd") : null,
    dueAt: card.dueAt ? card.dueAt.toISOString() : null,
    dueComplete: card.dueComplete,
  }
}

export function getDueStatus(
  dueAt: string | null,
  dueComplete: boolean,
  now = new Date()
): DueStatus {
  if (!dueAt) {
    return "none"
  }

  if (dueComplete) {
    return "complete"
  }

  const dueDate = parseISO(dueAt)
  if (!isValid(dueDate)) {
    return "none"
  }

  if (dueDate.getTime() < now.getTime()) {
    return "overdue"
  }

  const hoursUntilDue =
    (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (hoursUntilDue <= 24) {
    return "due-soon"
  }

  return "upcoming"
}

export function formatDueBadgeLabel(dueAt: string, now = new Date()) {
  const dueDate = parseISO(dueAt)
  if (!isValid(dueDate)) {
    return ""
  }

  const hasTime =
    dueDate.getHours() !== 0 ||
    dueDate.getMinutes() !== 0 ||
    dueDate.getSeconds() !== 0

  if (hasTime) {
    if (isSameDay(dueDate, now)) {
      return `${messages.common.today}, ${format(dueDate, "HH:mm", { locale: ptBR })}`
    }
    return format(dueDate, "d MMM, HH:mm", { locale: ptBR })
  }

  if (isSameDay(dueDate, now)) {
    return messages.common.today
  }

  return format(dueDate, "d MMM", { locale: ptBR })
}

export function formatStartBadgeLabel(startDate: string) {
  const date = parseISO(startDate)
  if (!isValid(date)) {
    return ""
  }

  return format(date, "d MMM", { locale: ptBR })
}

export const dueStatusStyles: Record<
  Exclude<DueStatus, "none">,
  { className: string }
> = {
  complete: {
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  },
  overdue: {
    className:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  },
  "due-soon": {
    className:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  },
  upcoming: {
    className:
      "border-border bg-muted/70 text-muted-foreground",
  },
}