import Link from "next/link"
import { Suspense } from "react"

import { cn } from "@/lib/utils"
import { messages } from "@/lib/messages/pt-br"
import { buttonVariants } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import { ModeToggle } from "@/components/mode-toggle"
import { UserAuthForm } from "@/components/user-auth-form"

export const metadata = {
  title: messages.legal.createAccountTitle,
  description: messages.legal.createAccountMeta,
}

export default function RegisterPage() {
  return (
    <div className="container grid h-screen w-screen flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="absolute right-4 top-4 flex items-center gap-2 md:right-8 md:top-8">
        <ModeToggle />
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "ghost" }))}
        >
          {messages.auth.login}
        </Link>
      </div>
      <div className="hidden h-full bg-muted lg:block" />
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <Icons.logo className="mx-auto h-6 w-6" />
            <h1 className="text-2xl font-semibold tracking-tight">
              {messages.auth.createAccount}
            </h1>
            <p className="text-sm text-muted-foreground">
              {messages.auth.createAccountDesc}
            </p>
          </div>
          <Suspense fallback={null}>
            <UserAuthForm />
          </Suspense>
          <p className="px-8 text-center text-sm text-muted-foreground">
            {messages.legal.agreePrefix}{" "}
            <Link
              href="/terms"
              className="hover:text-brand underline underline-offset-4"
            >
              {messages.legal.termsOfService}
            </Link>{" "}
            {messages.legal.and}{" "}
            <Link
              href="/privacy"
              className="hover:text-brand underline underline-offset-4"
            >
              {messages.legal.privacyPolicy}
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}