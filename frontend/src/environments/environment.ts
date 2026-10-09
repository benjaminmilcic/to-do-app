// Development build. The dev server proxies /api to the local backend
// (see proxy.conf.json), so the web app always talks to its own origin.
export const environment = {
  production: false,
  // Used by the native (Capacitor) app, which has no proxy in front of it.
  // Point it at your machine's LAN address to test the Android app against a
  // local backend, e.g. 'http://192.168.0.10:3100'.
  nativeApiOrigin: 'https://todo-app.benjamin-milcic.dev',
};
