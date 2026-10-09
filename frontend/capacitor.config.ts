import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dev.benjaminmilcic.todo',
  appName: 'ToDo',
  webDir: 'www',
  android: {
    // The WebView origin is https://localhost; the backend allows it via
    // CORS_ORIGINS.
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: '#f3f2fb',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
