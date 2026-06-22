import { messages, type Messages } from "@/lib/messages/pt-br"

export function t<K extends keyof Messages>(section: K): Messages[K] {
  return messages[section]
}

export function m() {
  return messages
}