import { copyFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = resolve(root, 'src/client/index.template.html');
const indexPath = resolve(root, 'index.html');
const distIndexPath = resolve(root, 'dist/index.html');
const viteBin = resolve(root, 'node_modules', 'vite', 'bin', 'vite.js');

function run(command, args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' },
      windowsHide: false
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolveRun();
      else reject(new Error(`Command failed with exit code ${code}`));
    });
  });
}

await copyFile(templatePath, indexPath);
await run(process.execPath, [viteBin, 'build']);
await copyFile(distIndexPath, indexPath);
