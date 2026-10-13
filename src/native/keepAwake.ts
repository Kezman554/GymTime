import { KeepAwake } from '@capacitor-community/keep-awake'

/**
 * Screen-on control. On Android this is FLAG_KEEP_SCREEN_ON on the window;
 * in the browser the plugin uses the Screen Wake Lock API where it exists.
 * Failures are logged and swallowed: a screen that dims is a nuisance, a
 * timer that crashes is not acceptable.
 */
export function keepScreenOn(): void {
  KeepAwake.keepAwake().catch((error: unknown) => {
    console.warn('GymTime: keep-awake unavailable', error)
  })
}

export function allowScreenSleep(): void {
  KeepAwake.allowSleep().catch((error: unknown) => {
    console.warn('GymTime: allowSleep failed', error)
  })
}
