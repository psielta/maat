"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { CalendarClock, Check, X } from "lucide-react"

import type { CardDatesModel } from "@/lib/card-dates"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

type DateDraft = {
  startDate: string
  dueDate: string
  dueTime: string
  dueComplete: boolean
}

function buildDraft(dates: CardDatesModel): DateDraft {
  const dueDate = dates.dueAt ? parseISO(dates.dueAt) : null

  return {
    startDate: dates.startDate ?? "",
    dueDate: dueDate ? format(dueDate, "yyyy-MM-dd") : "",
    dueTime: dueDate ? format(dueDate, "HH:mm") : "17:00",
    dueComplete: dates.dueComplete,
  }
}

function draftToPayload(draft: DateDraft) {
  let dueAt: string | null = null

  if (draft.dueDate) {
    const [hours, minutes] = draft.dueTime.split(":").map(Number)
    const due = parseISO(draft.dueDate)
    due.setHours(hours || 0, minutes || 0, 0, 0)
    dueAt = due.toISOString()
  }

  return {
    startDate: draft.startDate || null,
    dueAt,
    dueComplete: draft.dueComplete,
  }
}

export function CardDates({
  boardId,
  cardId,
  dates,
  canEdit,
  onDatesChange,
}: {
  boardId: string
  cardId: string
  dates: CardDatesModel
  canEdit: boolean
  onDatesChange: (dates: CardDatesModel) => void
}) {
  const [draft, setDraft] = React.useState(() => buildDraft(dates))
  const [isOpen, setIsOpen] = React.useState(false)
  const saveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingDraftRef = React.useRef(draft)

  React.useEffect(() => {
    setDraft(buildDraft(dates))
  }, [cardId, dates])

  React.useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  async function flushSave(nextDraft: DateDraft) {
    const response = await fetch(`/api/boards/${boardId}/cards/${cardId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(draftToPayload(nextDraft)),
    })

    if (!response.ok) {
      toast({
        title: "Something went wrong.",
        description: "Card dates were not saved. Please try again.",
        variant: "destructive",
      })
      setDraft(buildDraft(dates))
      return
    }

    const card = await response.json()
    onDatesChange({
      startDate: card.startDate ?? null,
      dueAt: card.dueAt ?? null,
      dueComplete: card.dueComplete ?? false,
    })
  }

  function scheduleSave(nextDraft: DateDraft) {
    if (!canEdit) {
      return
    }

    pendingDraftRef.current = nextDraft

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      void flushSave(pendingDraftRef.current)
    }, 400)
  }

  function updateDraft(patch: Partial<DateDraft>) {
    setDraft((current) => {
      const nextDraft = { ...current, ...patch }
      scheduleSave(nextDraft)
      return nextDraft
    })
  }

  function clearDates() {
    const nextDraft: DateDraft = {
      startDate: "",
      dueDate: "",
      dueTime: "17:00",
      dueComplete: false,
    }
    setDraft(nextDraft)
    scheduleSave(nextDraft)
    setIsOpen(false)
  }

  const startSelected = draft.startDate ? parseISO(draft.startDate) : undefined
  const dueSelected = draft.dueDate ? parseISO(draft.dueDate) : undefined
  const hasAnyDate = Boolean(draft.startDate || draft.dueDate)

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Dates</h3>
      </div>

      <div className="pl-6">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canEdit}
              className={cn(
                "h-8 justify-start gap-2 text-xs font-normal",
                !hasAnyDate && "text-muted-foreground"
              )}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              {hasAnyDate ? "Edit dates" : "Add dates"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="space-y-3 p-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Start date
                </Label>
                <Calendar
                  mode="single"
                  selected={startSelected}
                  onSelect={(date) =>
                    updateDraft({
                      startDate: date ? format(date, "yyyy-MM-dd") : "",
                    })
                  }
                  initialFocus
                />
                {draft.startDate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => updateDraft({ startDate: "" })}
                  >
                    <X className="mr-1 h-3 w-3" />
                    Remove start date
                  </Button>
                )}
              </div>

              <div className="space-y-2 border-t pt-3">
                <Label className="text-xs text-muted-foreground">Due date</Label>
                <Calendar
                  mode="single"
                  selected={dueSelected}
                  onSelect={(date) =>
                    updateDraft({
                      dueDate: date ? format(date, "yyyy-MM-dd") : "",
                      dueComplete: date ? draft.dueComplete : false,
                    })
                  }
                />
                {draft.dueDate && (
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`due-time-${cardId}`}
                      className="text-xs text-muted-foreground"
                    >
                      Time
                    </Label>
                    <Input
                      id={`due-time-${cardId}`}
                      type="time"
                      value={draft.dueTime}
                      onChange={(event) =>
                        updateDraft({ dueTime: event.target.value })
                      }
                      className="h-8 w-[120px] text-xs"
                    />
                  </div>
                )}
                {draft.dueDate && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`due-complete-${cardId}`}
                      checked={draft.dueComplete}
                      onCheckedChange={(checked) =>
                        updateDraft({ dueComplete: checked === true })
                      }
                    />
                    <Label
                      htmlFor={`due-complete-${cardId}`}
                      className="flex items-center gap-1 text-sm font-normal"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Mark complete
                    </Label>
                  </div>
                )}
                {draft.dueDate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() =>
                      updateDraft({ dueDate: "", dueComplete: false })
                    }
                  >
                    <X className="mr-1 h-3 w-3" />
                    Remove due date
                  </Button>
                )}
              </div>

              {hasAnyDate && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-full text-xs text-destructive hover:text-destructive"
                  onClick={clearDates}
                >
                  Remove all dates
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {hasAnyDate && (
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            {draft.startDate && (
              <p>Starts {format(parseISO(draft.startDate), "MMM d, yyyy")}</p>
            )}
            {draft.dueDate && (
              <p>
                Due {format(parseISO(draft.dueDate), "MMM d, yyyy")}
                {draft.dueTime ? ` at ${draft.dueTime}` : ""}
                {draft.dueComplete ? " (complete)" : ""}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}