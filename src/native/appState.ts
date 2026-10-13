import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'

/**
 * Calls back whenever the app comes back to the foreground. Native uses the
 * App plugin's appStateChange; the browser uses visibilitychange. Returns an
 * unsubscribe function.
 */
export function onReturnToForeground(callback: () => void): () => void {
  if (Capacitor.isNativePlatform()) {
    const handle = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) callback()
    })
    return () => {
      void handle.then((listener) => listener.remove())
    }
  }

  const onVisibility = () => {
    if (document.visibilityState === 'visible') callback()
  }
  document.addEventListener('visibilitychange', onVisibility)
  return () => document.removeEventListener('visibilitychange', onVisibility)
}
