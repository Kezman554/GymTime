import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'

/**
 * Android back: step back through the app's screens (each one sits on a
 * history entry), and from Home send the app to the background like any other
 * app would. A no-op in the browser, where the browser's own back button
 * already walks the same history.
 */
export function installBackButtonHandler(): void {
  if (!Capacitor.isNativePlatform()) return
  void App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back()
    } else {
      void App.minimizeApp()
    }
  })
}
