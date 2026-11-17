export type ClientDeviceInfo = {
  device_type: 'Laptop' | 'Desktop' | 'Phone' | 'Tablet'
  browser: string
  os: string
}

export function getClientDeviceInfo(): ClientDeviceInfo {
  if (typeof window === 'undefined' || !navigator) {
    return { device_type: 'Desktop', browser: 'Web Browser', os: 'Desktop' }
  }

  const ua = navigator.userAgent || ''

  // 1. Detect Device Type
  let device_type: 'Laptop' | 'Desktop' | 'Phone' | 'Tablet' = 'Laptop'
  const isMobile = /mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua)
  const isTablet = /ipad|tablet|(android(?!.*mobile))/i.test(ua)

  if (isTablet) {
    device_type = 'Tablet'
  } else if (isMobile) {
    device_type = 'Phone'
  } else if (/windows/i.test(ua)) {
    // If device has touch points, it's often a touch laptop or 2-in-1, else desktop
    device_type = navigator.maxTouchPoints && navigator.maxTouchPoints > 0 ? 'Laptop' : 'Desktop'
  } else if (/macintosh|mac os x/i.test(ua)) {
    device_type = 'Laptop'
  }

  // 2. Detect OS
  let os = 'Desktop'
  if (/windows/i.test(ua)) os = 'Windows'
  else if (/iphone|ipod/i.test(ua)) os = 'iOS'
  else if (/ipad/i.test(ua)) os = 'iPadOS'
  else if (/android/i.test(ua)) os = 'Android'
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS'
  else if (/linux/i.test(ua)) os = 'Linux'

  // 3. Detect Browser Name
  let browser = 'Web Browser'
  if (/edg\//i.test(ua)) {
    browser = 'Microsoft Edge'
  } else if (/opr\/|opera/i.test(ua)) {
    browser = 'Opera'
  } else if (/brave/i.test(ua) || (navigator as unknown as { brave?: unknown }).brave) {
    browser = 'Brave'
  } else if (/crios/i.test(ua)) {
    browser = 'Google Chrome'
  } else if (/chrome/i.test(ua) && /safari/i.test(ua)) {
    browser = 'Google Chrome'
  } else if (/fxios|firefox/i.test(ua)) {
    browser = 'Mozilla Firefox'
  } else if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) {
    browser = 'Apple Safari'
  }

  return { device_type, browser, os }
}
