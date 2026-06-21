export const NOTIFICATIONS_CHANGED_EVENT = "maat:notifications-changed"

export function notifyNotificationsChanged() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT))
}