import { MarketingConfig } from "types"

import { messages } from "@/lib/messages/pt-br"

export const marketingConfig: MarketingConfig = {
  mainNav: [
    {
      title: messages.nav.features,
      href: "/#features",
    },
    {
      title: messages.nav.workspace,
      href: "/dashboard",
    },
  ],
}