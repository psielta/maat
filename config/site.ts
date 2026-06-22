import { SiteConfig } from "types"

import { messages } from "@/lib/messages/pt-br"

export const siteConfig: SiteConfig = {
  name: "Maat",
  description: messages.site.description,
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:14500",
  ogImage: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:14500"}/og.jpg`,
  links: {
    github: "https://github.com/psielta/maat",
  },
}