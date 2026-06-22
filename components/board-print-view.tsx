"use client"

import * as React from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowLeft, Check, Copy, Printer } from "lucide-react"

import {
  dueStatusStyles,
  formatDueBadgeLabel,
  formatStartBadgeLabel,
  getDueStatus,
} from "@/lib/card-dates"
import {
  getCardTypeMeta,
  shouldShowCardTypeBadge,
  type BoardCardTypeValue,
} from "@/lib/card-type-display"
import {
  getCardChecklistSummary,
  type ChecklistModel,
} from "@/lib/checklist-display"
import type { CustomFieldDefinitionModel } from "@/lib/custom-field-display"
import type { CustomFieldClientValue } from "@/lib/custom-field-values"
import { getLabelDisplayName, type BoardLabelModel } from "@/lib/label-display"
import { lexicalToPlainText } from "@/lib/lexical-text"
import { m } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { CustomFieldBadges } from "@/components/custom-field-badges"

const msg = m()

export type PrintCard = {
  id: string
  displayId: string | null
  title: string
  description: string | null
  cardType: BoardCardTypeValue
  startDate: string | null
  dueAt: string | null
  dueComplete: boolean
  customFieldValues: CustomFieldClientValue[]
  labels: BoardLabelModel[]
  checklists: ChecklistModel[]
}

export function BoardPrintView({
  boardId,
  boardTitle,
  customFields,
  cards,
  generatedBy,
}: {
  boardId: string
  boardTitle: string
  customFields: CustomFieldDefinitionModel[]
  cards: PrintCard[]
  generatedBy: string | null
}) {
  const [notes, setNotes] = React.useState("")
  const [copied, setCopied] = React.useState(false)
  // Date-derived text is deferred to the client to avoid SSR/locale/timezone
  // hydration mismatches; null until mounted.
  const [now, setNow] = React.useState<Date | null>(null)

  const storageKey = `maat:report-notes:${boardId}`

  const cardCodes = React.useMemo(
    () =>
      cards
        .map((card) => card.displayId?.trim())
        .filter((code): code is string => Boolean(code)),
    [cards]
  )

  const handleCopyCodes = React.useCallback(async () => {
    if (cardCodes.length === 0) {
      toast({ description: msg.report.noCodes })
      return
    }

    try {
      await navigator.clipboard.writeText(cardCodes.join(", "))
      setCopied(true)
      toast({ description: msg.report.copied })
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({
        title: msg.common.errorTitle,
        description: msg.report.copyFailed,
        variant: "destructive",
      })
    }
  }, [cardCodes])

  React.useEffect(() => {
    setNow(new Date())
    const saved = window.localStorage.getItem(storageKey)
    if (saved) {
      setNotes(saved)
    }
  }, [storageKey])

  React.useEffect(() => {
    window.localStorage.setItem(storageKey, notes)
  }, [storageKey, notes])

  const cardCountLabel =
    cards.length === 1
      ? msg.report.cardCountOne
      : msg.report.cardCountMany.replace("{count}", String(cards.length))

  return (
    <div className="min-h-screen overflow-y-auto bg-muted/30 print:min-h-0 print:overflow-visible print:bg-white">
      <div className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
          <Link
            href={`/dashboard/boards/${boardId}`}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}
          >
            <ArrowLeft className="h-4 w-4" />
            {msg.report.back}
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleCopyCodes}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {msg.report.copyCodes}
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              {msg.report.print}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto my-6 max-w-3xl bg-white p-8 text-black shadow-sm print:my-0 print:max-w-none print:p-0 print:shadow-none">
        <header className="mb-6 border-b border-black/10 pb-4">
          <h1 className="text-2xl font-semibold">{boardTitle}</h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-black/60">
            {generatedBy ? (
              <span>
                {msg.report.generatedBy}: {generatedBy}
              </span>
            ) : null}
            {now ? (
              <span>
                {msg.report.generatedAt}:{" "}
                {format(now, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            ) : null}
            <span>{cardCountLabel}</span>
          </div>
        </header>

        <section className="mb-6">
          <h2 className="mb-1.5 text-sm font-semibold uppercase tracking-wide text-black/60">
            {msg.report.observations}
          </h2>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={msg.report.observationsPlaceholder}
            className="min-h-[80px] w-full resize-y rounded-md border border-black/15 bg-white p-3 text-sm text-black outline-none focus:border-black/40 print:hidden"
          />
          {notes.trim() ? (
            <p className="hidden whitespace-pre-wrap text-sm text-black print:block">
              {notes}
            </p>
          ) : null}
        </section>

        {cards.length === 0 ? (
          <p className="text-sm text-black/60">{msg.report.noCards}</p>
        ) : (
          <ol className="space-y-3">
            {cards.map((card) => (
              <PrintCardRow
                key={card.id}
                card={card}
                customFields={customFields}
                now={now}
              />
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

function PrintCardRow({
  card,
  customFields,
  now,
}: {
  card: PrintCard
  customFields: CustomFieldDefinitionModel[]
  now: Date | null
}) {
  const typeMeta = getCardTypeMeta(card.cardType)
  const showType = shouldShowCardTypeBadge(card.cardType)
  const TypeIcon = typeMeta.icon
  const descriptionText = lexicalToPlainText(card.description)
  const dueStatus = now ? getDueStatus(card.dueAt, card.dueComplete, now) : "none"
  const checklist = getCardChecklistSummary(card.checklists)

  return (
    <li className="break-inside-avoid rounded-lg border border-black/15 p-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {card.displayId ? (
          <span className="font-mono text-xs font-semibold uppercase tracking-wide text-black/50">
            {card.displayId}
          </span>
        ) : null}
        {showType && TypeIcon ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              typeMeta.className
            )}
          >
            <TypeIcon className="h-3.5 w-3.5" />
            {typeMeta.label}
          </span>
        ) : null}
      </div>

      <h3 className="mt-0.5 text-sm font-semibold text-black">{card.title}</h3>

      {descriptionText ? (
        <p className="mt-1 whitespace-pre-wrap text-sm text-black/70">
          {descriptionText}
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {card.startDate ? (
          <span className="rounded border border-black/15 px-1.5 py-0.5 text-[11px] text-black/70">
            {msg.report.start}: {formatStartBadgeLabel(card.startDate)}
          </span>
        ) : null}
        {card.dueAt && now ? (
          <span
            className={cn(
              "rounded border px-1.5 py-0.5 text-[11px]",
              dueStatus !== "none"
                ? dueStatusStyles[dueStatus].className
                : "border-black/15 text-black/70"
            )}
          >
            {msg.report.due}: {formatDueBadgeLabel(card.dueAt, now)}
            {card.dueComplete ? " ✓" : ""}
          </span>
        ) : null}
        {checklist.total > 0 ? (
          <span className="rounded border border-black/15 px-1.5 py-0.5 text-[11px] text-black/70">
            {msg.report.checklist}: {checklist.completed}/{checklist.total}
          </span>
        ) : null}
        {card.labels.map((label) => (
          <span
            key={label.id}
            className="rounded px-1.5 py-0.5 text-[11px] font-medium text-white"
            style={{ backgroundColor: label.color }}
          >
            {getLabelDisplayName(label)}
          </span>
        ))}
      </div>

      <CustomFieldBadges fields={customFields} values={card.customFieldValues} />
    </li>
  )
}
