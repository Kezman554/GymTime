import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cloud.nickyoung.gymtime',
  appName: 'GymTime',
  webDir: 'dist',
  // WebView background before the page paints, so launch never flashes white.
  backgroundColor: '#0b0b0d',
};

export default config;
