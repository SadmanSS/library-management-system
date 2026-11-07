import { useEffect, type KeyboardEvent, type RefObject } from 'react'

/**
 * Enables Enter key navigation across form input fields.
 * If Enter is pressed in an input (other than the last input), focus jumps
 * to the next visible, non-disabled input instead of submitting the form.
 * If Enter is pressed on the last input, the form submits normally.
 */
export function handleEnterKeyNavigation(event: KeyboardEvent<HTMLFormElement>) {
  if (event.key !== 'Enter') return

  const target = event.target as HTMLElement
  if (!target || target.tagName !== 'INPUT') return

  const currentInput = target as HTMLInputElement
  const nonNavigableTypes = ['submit', 'button', 'reset', 'checkbox', 'radio', 'file', 'hidden']
  if (nonNavigableTypes.includes(currentInput.type)) return

  const form = event.currentTarget
  // Query all navigable inputs in the form
  const selector =
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="file"]):not([disabled]):not([readonly])'
  const allInputs = Array.from(form.querySelectorAll<HTMLInputElement>(selector)).filter((el) => {
    // Must be visible and interactive
    return el.offsetParent !== null || el.getClientRects().length > 0
  })

  const currentIndex = allInputs.indexOf(currentInput)
  if (currentIndex !== -1 && currentIndex < allInputs.length - 1) {
    event.preventDefault()
    const nextInput = allInputs[currentIndex + 1]
    nextInput.focus()
    if (['text', 'email', 'tel', 'password', 'search', 'url', 'number'].includes(nextInput.type)) {
      try {
        nextInput.select()
      } catch {
        // Fallback if select is not supported
      }
    }
  }
}

/**
 * Traps focus within a container element while active.
 * When Tab or Shift+Tab is pressed, focus wraps around inside the container.
 * Also focuses the first input element when mounted or when dependency changes.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isActive: boolean,
  triggerDependency?: unknown
) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableSelector = [
      'input:not([disabled]):not([type="hidden"])',
      'button:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')

    // Initial focus on first input
    const initialTimer = setTimeout(() => {
      if (!container) return
      const firstInput = container.querySelector<HTMLInputElement>(
        'input:not([disabled]):not([type="hidden"])'
      )
      if (firstInput) {
        firstInput.focus()
      } else {
        const firstFocusable = container.querySelector<HTMLElement>(focusableSelector)
        firstFocusable?.focus()
      }
    }, 50)

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusables = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (el) => el.offsetParent !== null || el.getClientRects().length > 0
      )

      if (focusables.length === 0) return

      const firstElement = focusables[0]
      const lastElement = focusables[focusables.length - 1]

      if (e.shiftKey) {
        // Shift + Tab: if on first element, wrap to last
        if (document.activeElement === firstElement || !container.contains(document.activeElement)) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === lastElement || !container.contains(document.activeElement)) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      clearTimeout(initialTimer)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [containerRef, isActive, triggerDependency])
}
