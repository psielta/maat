type DismissableEvent = {
  preventDefault: () => void
  target: EventTarget | null
}

let lightboxOpen = false

export function setInlineImageLightboxOpen(open: boolean) {
  lightboxOpen = open
}

export function isInlineImageLightboxOpen() {
  return lightboxOpen
}

export function isInlineImageLightboxTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest("[data-inline-image-lightbox]"))
  )
}

export function shouldIgnoreCardDialogDismiss() {
  return isInlineImageLightboxOpen()
}

export function preventCardDialogDismissOnLightbox(event: DismissableEvent) {
  if (
    isInlineImageLightboxOpen() ||
    isInlineImageLightboxTarget(event.target)
  ) {
    event.preventDefault()
  }
}