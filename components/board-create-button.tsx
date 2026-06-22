"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { m } from "@/lib/i18n"
import { ButtonProps, buttonVariants } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { Icons } from "@/components/icons"

const msg = m()

interface BoardCreateButtonProps extends ButtonProps {}

export function BoardCreateButton({
  className,
  variant,
  ...props
}: BoardCreateButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)

  async function onClick() {
    setIsLoading(true)

    const response = await fetch("/api/boards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Board sem título",
        description: "Planeje, priorize e mova o trabalho pelo board.",
      }),
    })

    setIsLoading(false)

    if (!response?.ok) {
      return toast({
        title: msg.common.errorTitle,
        description:
          response.status === 403
            ? "Sua sessão não é mais válida. Entre novamente e tente outra vez."
            : `O board não foi criado. ${msg.common.tryAgain}`,
        variant: "destructive",
      })
    }

    const board = await response.json()

    router.refresh()
    router.push(`/dashboard/boards/${board.id}`)
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        buttonVariants({ variant }),
        {
          "cursor-not-allowed opacity-60": isLoading,
        },
        className
      )}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Icons.add className="mr-2 h-4 w-4" />
      )}
      Novo board
    </button>
  )
}
