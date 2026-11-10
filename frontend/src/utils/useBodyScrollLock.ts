import { useEffect } from 'react'

let activeLockCount = 0
let originalBodyOverflow = ''
let originalHtmlOverflow = ''
let originalPaddingRight = ''

/**
 * Locks document body & html scroll when a modal or dialog is open,
 * preventing the background page from scrolling.
 * Compensates for scrollbar width to prevent page content layout shift.
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return

    if (activeLockCount === 0) {
      originalBodyOverflow = document.body.style.overflow
      originalHtmlOverflow = document.documentElement.style.overflow
      originalPaddingRight = document.body.style.paddingRight

      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`
      }

      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
      document.body.classList.add('modal-open')
      document.documentElement.classList.add('modal-open')
    }

    activeLockCount++

    return () => {
      activeLockCount--
      if (activeLockCount <= 0) {
        activeLockCount = 0
        document.body.style.overflow = originalBodyOverflow
        document.documentElement.style.overflow = originalHtmlOverflow
        document.body.style.paddingRight = originalPaddingRight
        document.body.classList.remove('modal-open')
        document.documentElement.classList.remove('modal-open')
      }
    }
  }, [isLocked])
}
