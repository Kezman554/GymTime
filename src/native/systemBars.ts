import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core'
import type { Theme } from '../storage'

/**
 * Status and navigation bar icon tint. The bars themselves are transparent
 * (MainActivity draws edge-to-edge), so the page's ground shows through and
 * only the icons need to follow the theme: dark icons on the light ground,
 * light icons on the dark. A no-op in the browser.
 */
export function setSystemBarIcons(theme: Theme): void {
  if (!Capacitor.isNativePlatform()) return
  // SystemBarsStyle names the background the icons sit on, not the icons.
  const style = theme === 'light' ? SystemBarsStyle.Light : SystemBarsStyle.Dark
  SystemBars.setStyle({ style }).catch((error: unknown) => {
    console.warn('GymTime: system bar style unavailable', error)
  })
}
