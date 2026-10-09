#!/usr/bin/env bash
#
# One-time server setup for the ToDo app. Run as root from a checkout of the
# repository:   sudo bash deploy/server-setup.sh
#
# Idempotent: running it again changes nothing that already exists - the
# database, its password and the env file are only created once.
#
# What it does:
#   1. creates the system user `todoapp` (runs the backend)
#   2. creates the directories for backend, frontend and APK downloads
#   3. creates the MySQL database + user and the env file with fresh secrets
#   4. installs the systemd unit, the Apache vHost and the sudoers rule
#
# It does not touch any other service, vHost, database or sudoers file.
# Everything here is specific to benjamin-milcic.dev - adapt names, paths and
# the domain before using it on your own server.

set -euo pipefail

DOMAIN=todo-app.benjamin-milcic.dev
API_DIR=/opt/todo-app-api
WEB_DIR=/var/www/todo-app
ENV_DIR=/etc/todo-app
ENV_FILE=$ENV_DIR/todo-app.env
SERVICE=todo-app-api
SUDOERS_FILE=/etc/sudoers.d/92-deploy-todo-app
DB_NAME=todo_app
DB_USER=todo_app
# Google OAuth credentials are shared with the main API; taken from its env
# file if it exists. Leave empty to set them by hand.
GOOGLE_SOURCE_ENV=/etc/nestjs-api/api.env

HERE="$(cd "$(dirname "$0")" && pwd)"

[ "$(id -u)" -eq 0 ] || { echo "Run as root (sudo bash $0)"; exit 1; }
id deploy >/dev/null 2>&1 || { echo "User 'deploy' does not exist"; exit 1; }
for f in "systemd/$SERVICE.service" "apache/$DOMAIN.conf" \
         "sudoers/92-deploy-todo-app" "todo-app.env.example"; do
  [ -f "$HERE/$f" ] || { echo "Missing $HERE/$f"; exit 1; }
done

echo "== 1. system user"
if id todoapp >/dev/null 2>&1; then
  echo "   todoapp exists"
else
  useradd --system --no-create-home --home-dir /nonexistent \
          --shell /usr/sbin/nologin todoapp
  echo "   created todoapp"
fi

echo "== 2. directories"
# Code: written by deploy, only readable for the service user (setgid keeps
# the group on files that rsync creates).
install -d -o deploy -g todoapp  -m 2750 "$API_DIR"
# Static files and APKs: written by deploy, read by Apache.
install -d -o deploy -g www-data -m 2755 "$WEB_DIR"
install -d -o deploy -g www-data -m 2755 "$WEB_DIR/frontend"
install -d -o deploy -g www-data -m 2755 "$WEB_DIR/downloads"
install -d -o root   -g root     -m 0700 "$ENV_DIR"
# Placeholder until the first deploy, so the vHost does not answer 403.
if [ ! -e "$WEB_DIR/frontend/index.html" ]; then
  echo '<!doctype html><title>ToDo</title><p>Coming soon.</p>' \
    > "$WEB_DIR/frontend/index.html"
  chown deploy:www-data "$WEB_DIR/frontend/index.html"
fi

echo "== 3. database + env file"
DB_EXISTS=$(mysql -N -e "SHOW DATABASES LIKE '$DB_NAME'")
if [ -f "$ENV_FILE" ] && [ -n "$DB_EXISTS" ]; then
  echo "   $ENV_FILE and database exist - left untouched"
elif [ -f "$ENV_FILE" ]; then
  # Interrupted earlier run or dropped database: never silently re-create
  # credentials that no longer match.
  echo "   $ENV_FILE exists but database $DB_NAME is missing."
  echo "   Remove $ENV_FILE and run again to recreate both."
  exit 1
else
  DB_PASS=$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | cut -c1-40)
  JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')

  # The app connects via TCP to 127.0.0.1 (also through the SSH tunnel used
  # for local development), hence the host part of the account.
  mysql <<SQL
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASS';
ALTER USER '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASS';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES
  ON \`$DB_NAME\`.* TO '$DB_USER'@'127.0.0.1';
SQL

  GOOGLE_ID=""; GOOGLE_SECRET=""
  if [ -n "$GOOGLE_SOURCE_ENV" ] && [ -r "$GOOGLE_SOURCE_ENV" ]; then
    GOOGLE_ID=$(sed -n 's/^GOOGLE_CLIENT_ID=//p' "$GOOGLE_SOURCE_ENV" | tail -1)
    GOOGLE_SECRET=$(sed -n 's/^GOOGLE_CLIENT_SECRET=//p' "$GOOGLE_SOURCE_ENV" | tail -1)
  fi

  (
    umask 077
    sed -e "s|^DB_PASS=.*|DB_PASS=$DB_PASS|" \
        -e "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" \
        -e "s|^GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=$GOOGLE_ID|" \
        -e "s|^GOOGLE_CLIENT_SECRET=.*|GOOGLE_CLIENT_SECRET=$GOOGLE_SECRET|" \
        "$HERE/todo-app.env.example" > "$ENV_FILE"
  )
  chown root:root "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "   created $ENV_FILE (Google login: ${GOOGLE_ID:+enabled}${GOOGLE_ID:-disabled})"
fi

echo "== 4a. systemd unit"
install -o root -g root -m 644 "$HERE/systemd/$SERVICE.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable "$SERVICE" >/dev/null
echo "   enabled $SERVICE (starts with the first deploy)"

echo "== 4b. Apache vHost"
install -o root -g root -m 644 "$HERE/apache/$DOMAIN.conf" /etc/apache2/sites-available/
a2ensite -q "$DOMAIN"
apache2ctl configtest
systemctl reload apache2

echo "== 4c. sudoers"
visudo -cf "$HERE/sudoers/92-deploy-todo-app"
install -o root -g root -m 440 "$HERE/sudoers/92-deploy-todo-app" "$SUDOERS_FILE"
visudo -c >/dev/null

echo
echo "Done."
echo "Local development needs the database password from $ENV_FILE (DB_PASS)."
