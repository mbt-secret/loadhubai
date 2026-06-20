import { spawn } from 'node:child_process';
import { copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const viteBin = resolve(root, 'node_modules', 'vite', 'bin', 'vite.js');
await copyFile(resolve(root, 'src/client/index.template.html'), resolve(root, 'index.html'));

function startChild(label, command, args) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'development' },
    windowsHide: false
  });

  child.stdout.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr.on('data', (chunk) => process.stderr.write(chunk));
  child.on('error', (error) => {
    console.error(`${label} failed to start:`, error);
    shutdown(1);
  });

  return child;
}

const children = [
  startChild('API server', process.execPath, ['src/server/index.mjs']),
  startChild('Vite', process.execPath, [viteBin, '--host', '127.0.0.1', '--port', '5173', '--strictPort'])
];

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 300);
}

for (const child of children) {
  child.on('exit', (code) => {
    if (!shuttingDown && code && code !== 0) shutdown(code);
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
