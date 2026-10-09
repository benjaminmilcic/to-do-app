// Opens an SSH tunnel to the MySQL server of the production host so that the
// local backend can use the server database (MySQL itself only listens on the
// server's loopback interface).
//
// Configure in backend/.env:
//   SSH_TUNNEL_HOST=user@your-server   (or a Host alias from ~/.ssh/config)
//   DB_PORT=3307                        (local end of the tunnel)
//
// Usage: npm run db:tunnel   (keep it running while developing)
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const host = process.env.SSH_TUNNEL_HOST;
const localPort = process.env.DB_PORT ?? '3307';
const remotePort = process.env.SSH_TUNNEL_REMOTE_PORT ?? '3306';

if (!host) {
  console.error('SSH_TUNNEL_HOST is not set in backend/.env');
  process.exit(1);
}

console.log(
  `Tunnel 127.0.0.1:${localPort} -> ${host} 127.0.0.1:${remotePort} (Ctrl+C to stop)`,
);

const ssh = spawn(
  'ssh',
  [
    '-N',
    '-o', 'ExitOnForwardFailure=yes',
    '-o', 'ServerAliveInterval=30',
    '-L', `127.0.0.1:${localPort}:127.0.0.1:${remotePort}`,
    host,
  ],
  { stdio: 'inherit' },
);
ssh.on('exit', (code) => process.exit(code ?? 0));
