import { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { cn } from "@/lib/utils"
import { messages } from "@/lib/messages/pt-br"
import { buttonVariants } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import { ModeToggle } from "@/components/mode-toggle"
import { UserAuthForm } from "@/components/user-auth-form"

export const metadata: Metadata = {
  title: messages.legal.loginTitle,
  description: messages.legal.loginMeta,
}

export default function LoginPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "absolute left-4 top-4 md:left-8 md:top-8"
        )}
      >
        <>
          <Icons.chevronLeft className="mr-2 h-4 w-4" />
          {messages.auth.back}
        </>
      </Link>
      <div className="absolute right-4 top-4 md:right-8 md:top-8">
        <ModeToggle />
      </div>
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <Icons.logo className="mx-auto h-6 w-6" />
          <h1 className="text-2xl font-semibold tracking-tight">
            {messages.auth.welcomeBack}
          </h1>
          <p className="text-sm text-muted-foreground">
            {messages.auth.welcomeBackDesc}
          </p>
        </div>
        <Suspense fallback={null}>
          <UserAuthForm />
        </Suspense>
        <p className="px-8 text-center text-sm text-muted-foreground">
          <Link
            href="/register"
            className="hover:text-brand underline underline-offset-4"
          >
            {messages.legal.noAccountSignUp}
          </Link>
        </p>
      </div>
    </div>
  )
}