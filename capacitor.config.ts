import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chescode.checkking',
  appName: '등교왕',
  webDir: 'dist',
  server: {
    allowNavigation: ['*'],
  },
};

export default config;
