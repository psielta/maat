import type { Prisma } from "@prisma/client"

import { db } from "@/lib/db"
import { messages } from "@/lib/messages/pt-br"

const TOKEN_REGEX = /\{(Number(?::(\d+))?|Date|Year|Month|Day)\}/g
const VALID_PATTERN_REGEX = /^[A-Za-z0-9_{}: -]+$/

export const CARD_ID_PATTERN_TOKENS = [
  { token: "{Number}", description: messages.cardIdPattern.numberToken },
  { token: "{Number:3}", description: messages.cardIdPattern.numberPaddedToken },
  { token: "{Date}", description: messages.cardIdPattern.dateToken },
  { token: "{Day}", description: messages.cardIdPattern.dayToken },
  { token: "{Month}", description: messages.cardIdPattern.monthToken },
  { token: "{Year}", description: messages.cardIdPattern.yearToken },
] as const

export function normalizeCardIdPattern(pattern: string | null | undefined) {
  const trimmed = pattern?.trim()
  return trimmed ? trimmed : null
}

export function validateCardIdPattern(pattern: string) {
  if (!pattern.trim()) {
    return messages.validation.patternEmpty
  }

  if (pattern.length > 80) {
    return messages.validation.patternMaxLength
  }

  if (!VALID_PATTERN_REGEX.test(pattern)) {
    return messages.validation.patternInvalidChars
  }

  if (!/\{Number(?::\d+)?\}/.test(pattern)) {
    return messages.validation.patternRequiresNumber
  }

  const unknownTokens = [...pattern.matchAll(/\{([^}]+)\}/g)]
    .map((match) => match[0])
    .filter((token) => !/^\{Number(?::\d+)?\}$/.test(token) && !/^\{(Date|Year|Month|Day)\}$/.test(token))

  if (unknownTokens.length > 0) {
    return `${messages.validation.unknownToken} ${unknownTokens[0]}`
  }

  const paddingMatch = pattern.match(/\{Number:(\d+)\}/)
  if (paddingMatch) {
    const width = Number(paddingMatch[1])
    if (!Number.isInteger(width) || width < 1 || width > 12) {
      return messages.validation.numberPaddingRange
    }
  }

  return null
}

function formatDateParts(date: Date) {
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const year = String(date.getFullYear())

  return {
    Date: `${day}${month}${year}`,
    Day: day,
    Month: month,
    Year: year,
  }
}

export function patternUsesDateTokens(pattern: string) {
  return /\{(Date|Year|Month|Day)\}/.test(pattern)
}

function getSequenceDateKey(pattern: string, date: Date) {
  if (!patternUsesDateTokens(pattern)) {
    return ""
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}${month}${day}`
}

export function formatCardDisplayId(pattern: string, number: number, date = new Date()) {
  const parts = formatDateParts(date)

  return pattern.replace(TOKEN_REGEX, (_match, token: string, width?: string) => {
    switch (token) {
      case "Number":
        return width ? String(number).padStart(Number(width), "0") : String(number)
      case "Date":
        return parts.Date
      case "Day":
        return parts.Day
      case "Month":
        return parts.Month
      case "Year":
        return parts.Year
      default:
        return ""
    }
  })
}

export function previewCardDisplayId(pattern: string, sampleNumber = 1, date = new Date()) {
  const error = validateCardIdPattern(pattern)
  if (error) {
    return null
  }

  return formatCardDisplayId(pattern, sampleNumber, date)
}

type DbClient = Prisma.TransactionClient | typeof db

async function nextSequenceNumber(
  client: DbClient,
  boardId: string,
  dateKey: string
) {
  const sequence = await client.boardCardIdSequence.upsert({
    where: {
      boardId_dateKey: {
        boardId,
        dateKey,
      },
    },
    create: {
      boardId,
      dateKey,
      lastNumber: 1,
    },
    update: {
      lastNumber: {
        increment: 1,
      },
    },
    select: {
      lastNumber: true,
    },
  })

  return sequence.lastNumber
}

async function displayIdExists(
  client: DbClient,
  boardId: string,
  displayId: string
) {
  const count = await client.boardCard.count({
    where: {
      displayId,
      list: {
        boardId,
      },
    },
  })

  return count > 0
}

export async function generateCardDisplayId(
  boardId: string,
  pattern: string,
  client: DbClient = db
) {
  const normalizedPattern = normalizeCardIdPattern(pattern)

  if (!normalizedPattern) {
    return null
  }

  const validationError = validateCardIdPattern(normalizedPattern)
  if (validationError) {
    throw new Error(validationError)
  }

  const now = new Date()
  const dateKey = getSequenceDateKey(normalizedPattern, now)

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const number = await nextSequenceNumber(client, boardId, dateKey)
    const displayId = formatCardDisplayId(normalizedPattern, number, now)

    if (!(await displayIdExists(client, boardId, displayId))) {
      return displayId
    }
  }

  throw new Error(messages.validation.uniqueCardIdFailed)
}