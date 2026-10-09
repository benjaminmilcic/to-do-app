// Builds the Android APK: web build -> Capacitor sync -> Gradle.
//
// Usage: npm run android:apk [-- --debug]
//
// Release builds are signed when android/keystore.properties exists (or the
// ANDROID_KEYSTORE_* environment variables are set); see README. Without
// signing data a debug APK is built instead.
//
// Output: dist-apk/todo-app.apk
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const isWindows = process.platform === 'win32';
const wantDebug = process.argv.includes('--debug');
const canSign =
  existsSync('android/keystore.properties') ||
  Boolean(process.env.ANDROID_KEYSTORE_FILE);
const variant = wantDebug || !canSign ? 'debug' : 'release';

// Android Studio ships its own JDK; use it when JAVA_HOME is not set or
// points to a JDK that no longer exists.
const env = { ...process.env };
if (!env.JAVA_HOME || !existsSync(env.JAVA_HOME)) {
  const candidates = isWindows
    ? ['C:\\Program Files\\Android\\Android Studio\\jbr']
    : [
        '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
        '/opt/android-studio/jbr',
        join(homedir(), 'android-studio', 'jbr'),
      ];
  const found = candidates.find((dir) => existsSync(dir));
  if (found) {
    env.JAVA_HOME = found;
  }
}
if (!env.ANDROID_HOME && !env.ANDROID_SDK_ROOT) {
  const sdk = isWindows
    ? join(env.LOCALAPPDATA ?? '', 'Android', 'Sdk')
    : join(homedir(), 'Android', 'Sdk');
  if (existsSync(sdk)) {
    env.ANDROID_HOME = sdk;
  }
}

function run(command, args, options = {}) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  execFileSync(command, args, {
    stdio: 'inherit',
    env,
    shell: isWindows,
    ...options,
  });
}

if (!wantDebug && !canSign) {
  console.warn('No signing data found - building a DEBUG apk.');
}

run('npx', ['ng', 'build']);
run('npx', ['cap', 'sync', 'android']);
const gradlew = resolve('android', isWindows ? 'gradlew.bat' : 'gradlew');
run(isWindows ? `"${gradlew}"` : gradlew, [
  variant === 'release' ? 'assembleRelease' : 'assembleDebug',
  '--no-daemon',
], { cwd: resolve('android') });

const apk = resolve(
  'android/app/build/outputs/apk',
  variant,
  `app-${variant}.apk`,
);
mkdirSync('dist-apk', { recursive: true });
copyFileSync(apk, 'dist-apk/todo-app.apk');
console.log(`\nAPK (${variant}): dist-apk/todo-app.apk`);
