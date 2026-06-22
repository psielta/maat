import { messages } from "@/lib/messages/pt-br"

export const CUSTOM_FIELD_COLOR_PRESETS = [
  { label: messages.colors.blue, value: "#579BFC" },
  { label: messages.colors.green, value: "#61BD4F" },
  { label: messages.colors.yellow, value: "#F2D600" },
  { label: messages.colors.orange, value: "#FF9F1A" },
  { label: messages.colors.red, value: "#EB5A46" },
  { label: messages.colors.purple, value: "#C377E0" },
  { label: messages.colors.pink, value: "#FF78CB" },
  { label: messages.colors.gray, value: "#B3BAC5" },
] as const

export const CUSTOM_FIELD_DEFAULT_COLOR = CUSTOM_FIELD_COLOR_PRESETS[0].value

export function isValidCustomFieldColor(color: string) {
  return CUSTOM_FIELD_COLOR_PRESETS.some((preset) => preset.value === color)
}