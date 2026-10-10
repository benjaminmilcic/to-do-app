<p align="center">
  <img src="frontend/src/assets/icon/icon-192.png" width="96" alt="ToDo app icon" />
</p>

<h1 align="center">ToDo</h1>

<p align="center">
  A multi-user todo app that keeps every device in sync in real time —<br />
  as an installable PWA in the browser and as a native Android app.
</p>

<p align="center">
  <a href="https://todo-app.benjamin-milcic.dev">todo-app.benjamin-milcic.dev</a>
  ·
  <a href="https://todo-app.benjamin-milcic.dev/downloads/todo-app.apk">Android APK</a>
</p>

---

## Features

- **Accounts** – register with email and password, or sign in with Google.
  The app cannot be used without signing in.
- **Stay signed in** – sign in once per device; the session is restored on
  every start (rotating refresh tokens, one session per device).
- **Real-time sync** – create, complete, edit, reorder or delete a todo on
  your phone and it shows up on your PC within milliseconds (Socket.IO).
  After being offline, every device catches up automatically.
- **Many devices at once** – any number of browsers, PCs and phones per user.
- **PWA** – installable on the desktop, runs in its own window without
  browser UI, works offline with the last known list.
- **Android app** – the same code base packaged with Capacitor.
- **Update hints** – the PWA offers to reload as soon as a new deployment is
  downloaded; the Android app compares its build number with
  `/downloads/version.json` and offers the new APK.
- Due dates with optional time, notes, drag & drop ordering, undo for
  deletions, dark mode.
- **German, English, Croatian** – switchable on the sign-in page and in the
  account menu ([Transloco](https://jsverse.github.io/transloco/)); the choice
  is stored in localStorage, the browser language is the default.
  Translations live in `frontend/src/i18n/*.json`.

## Tech stack

| Part      | Technology                                                      |
| --------- | --------------------------------------------------------------- |
| Frontend  | Angular 22, Ionic 9, Capacitor 8 (Android), Angular service worker |
| Backend   | NestJS 12, TypeORM, Socket.IO, Passport (Google OAuth)          |
| Database  | MySQL 8                                                         |
| Hosting   | Apache reverse proxy, systemd, GitHub Actions                   |

```
to-do-app/
├── backend/    NestJS API (REST + WebSocket) – serves /api
├── frontend/   Ionic/Angular app (PWA + Android project in frontend/android)
├── deploy/     Server setup: Apache vHost, systemd unit, sudoers, setup script
└── .github/    Deploy workflows (specific to the author's server, see below)
```

### How it works

- **Auth**: short-lived JWT access tokens (15 min, memory only) plus a
  long-lived refresh token per device (90 days, rotated on every use, stored
  hashed in the database, persisted on the device with Capacitor
  Preferences). Logging out ends only that device's session.
- **Google login**: the backend handles the OAuth flow and redirects back with
  a single-use code (never a token) — to `/auth/callback` in the browser, or to
  the custom URL scheme `dev.benjaminmilcic.todo://auth/callback` in the
  Android app. The OAuth `state` is bound to a cookie to prevent login CSRF.
- **Sync**: every write goes through the REST API. The API then pushes the
  change to all *other* connected devices of the same user over Socket.IO.
  On every (re)connect the client reloads the full list, so nothing is lost.
- **Database**: all tables use the `todo_` prefix; migrations run
  automatically when the backend starts.

## Getting started (local development)

Requirements: Node.js 24, npm, a MySQL 8 database. For the Android app
additionally Android Studio (Android SDK) and a JDK 21. Gradle picks the
JDK 21 itself (see `frontend/android/gradle/gradle-daemon-jvm.properties`),
even if Android Studio bundles a newer Java, which Gradle 8.14 cannot use.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # then fill in the values
npm run start:dev         # http://localhost:3100/api
```

Database options in `backend/.env`:

- **Local MySQL**: create a database and a user, set `DB_HOST=127.0.0.1`,
  `DB_PORT=3306`, `DB_USER`, `DB_PASS`, `DB_NAME`.
- **Remote MySQL through SSH** (how the author develops – MySQL on the server
  only listens on localhost): set `SSH_TUNNEL_HOST=user@your-server` and
  `DB_PORT=3307`, then keep `npm run db:tunnel` running in a second terminal.

`JWT_SECRET` must be at least 32 characters. Google login is optional – leave
the `GOOGLE_*` values empty to hide the Google button. To enable it, create an
OAuth client (type *Web application*) in the Google Cloud console and add
`http://localhost:8100/api/auth/google/callback` as authorized redirect URI.

The tables are created on the first start.

### 2. Frontend (browser)

```bash
cd frontend
npm install
npm start                 # http://localhost:8100
```

The dev server proxies `/api` (including the WebSocket) to the backend on
port 3100, so the app talks to its own origin just like in production.

### 3. Android app

```bash
cd frontend
npm run android:sync      # web build + copy into the Android project
npm run android:open      # opens Android Studio – run it on a device/emulator
npm run android:apk       # or build an APK from the command line -> dist-apk/
```

The Android app talks to the backend configured as `nativeApiOrigin` in
`frontend/src/environments/`. Change it to your own server (or to your
machine's LAN address for testing against a local backend).

Release builds are signed when `frontend/android/keystore.properties` exists:

```properties
storeFile=C:/path/to/release.jks
storePassword=...
keyAlias=...
keyPassword=...
```

Create a keystore with
`keytool -genkeypair -keystore release.jks -alias todo-app -keyalg RSA -keysize 4096 -validity 10000`.
Without it, `npm run android:apk` builds a debug APK. **Keep the keystore and
its passwords safe** – updates of an installed app must be signed with the
same key.

### Icons

The app icon is an SVG (`frontend/resources/icon.svg`). After changing it run
`npm run icons` (web/PWA icons) and `npm run icons:android` (launcher icons
and splash screens).

## Hosting your own instance

Everything server-related is in `deploy/` and was written for the author's
server (Ubuntu, Apache 2.4, MySQL 8, Cloudflare in front). The pieces:

| File                                         | Purpose                                         |
| -------------------------------------------- | ----------------------------------------------- |
| `deploy/server-setup.sh`                     | One-time, idempotent setup (run as root)       |
| `deploy/apache/*.conf`                       | vHost: static PWA, `/api` + WebSocket proxy, APK downloads, cache headers |
| `deploy/systemd/todo-app-api.service`        | Runs the backend as an unprivileged user, restarts it, starts on boot |
| `deploy/sudoers/92-deploy-todo-app`          | Lets the CI user restart exactly this service  |
| `deploy/todo-app.env.example`                | Production environment (copied to `/etc/todo-app/todo-app.env`) |

Production layout: backend in `/opt/todo-app-api` (listening on
`127.0.0.1:3100`), PWA in `/var/www/todo-app/frontend`, APKs in
`/var/www/todo-app/downloads`. Secrets live only in
`/etc/todo-app/todo-app.env` (root, mode 600).

Adapt domain, paths, the TLS certificate and the Apache snippets
(`security-headers.conf`, `cf_combined` log format) to your server before
running the setup script.

## ⚠️ About the GitHub Actions workflows

The workflows in `.github/workflows/` deploy to **the author's server** and
will not work for you as they are. If you fork or clone this repository,
**adapt or delete them**:

| Workflow              | What it does                                                    |
| --------------------- | --------------------------------------------------------------- |
| `deploy-backend.yml`  | Tests, builds and uploads the backend, restarts the service, health check |
| `deploy-frontend.yml` | Builds the PWA, uploads it, purges the Cloudflare cache for unhashed files, verifies the live version |
| `build-apk.yml`       | Builds the signed APK on a GitHub-hosted runner, verifies the signature and uploads it to the download directory |

They expect hard-coded host names and paths plus these secrets/variables:

- Secrets: `DEPLOY_SSH_KEY`, `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_PURGE_TOKEN`,
  `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`
- Variables: `ANDROID_KEY_ALIAS`

`ANDROID_KEYSTORE_BASE64` is the release keystore encoded as base64, e.g.
`base64 -w0 release.jks` (Linux) or
`[Convert]::ToBase64String([IO.File]::ReadAllBytes("release.jks"))` (PowerShell).

## API overview

All endpoints are under `/api`.

| Method | Path                        | Auth | Description                          |
| ------ | --------------------------- | ---- | ------------------------------------ |
| POST   | `/auth/register`            | –    | Create account, returns tokens       |
| POST   | `/auth/login`               | –    | Sign in, returns tokens              |
| POST   | `/auth/refresh`             | –    | Rotate refresh token                 |
| POST   | `/auth/logout`              | –    | End this device's session            |
| GET    | `/auth/me`                  | ✓    | Current user                         |
| GET    | `/auth/google`              | –    | Start Google login (`?platform=native` for the app) |
| POST   | `/auth/google/exchange`     | –    | Exchange the one-time code for tokens |
| GET    | `/todos`                    | ✓    | List todos                           |
| POST   | `/todos`                    | ✓    | Create (client-generated UUID)       |
| PATCH  | `/todos/:id`                | ✓    | Update title, notes, done, due date, position |
| DELETE | `/todos/:id`                | ✓    | Delete                               |
| DELETE | `/todos/completed`          | ✓    | Delete all completed todos           |
| GET    | `/health`, `/config`        | –    | Health check, public client config   |

WebSocket: Socket.IO at path `/api/socket.io`, authenticated with
`auth: { token: <access token> }`; events `todo:upsert` and `todo:delete`.

## Author

Benjamin Milčić – [benjamin-milcic.dev](https://benjamin-milcic.dev)
