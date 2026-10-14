import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cloud.nickyoung.gymtime',
  appName: 'GymTime',
  webDir: 'dist',
  // WebView background before the page paints, so launch never flashes white.
  backgroundColor: '#15171a',
};

export default config;
