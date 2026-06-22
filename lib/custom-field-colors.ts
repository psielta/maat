export const CUSTOM_FIELD_COLOR_PRESETS = [
  { label: "Blue", value: "#579BFC" },
  { label: "Green", value: "#61BD4F" },
  { label: "Yellow", value: "#F2D600" },
  { label: "Orange", value: "#FF9F1A" },
  { label: "Red", value: "#EB5A46" },
  { label: "Purple", value: "#C377E0" },
  { label: "Pink", value: "#FF78CB" },
  { label: "Gray", value: "#B3BAC5" },
] as const

export const CUSTOM_FIELD_DEFAULT_COLOR = CUSTOM_FIELD_COLOR_PRESETS[0].value

export function isValidCustomFieldColor(color: string) {
  return CUSTOM_FIELD_COLOR_PRESETS.some((preset) => preset.value === color)
}