// Runs the API and the web dev server together, and stops both when either exits or on Ctrl-C.
import { spawn } from 'node:child_process';

const workspaces = ['@submission-wizard/server', '@submission-wizard/web'];
const children = workspaces.map((workspace) =>
  spawn('npm', ['run', 'dev', '--workspace', workspace], {
    stdio: 'inherit',
    // npm is a .cmd script on Windows, which needs a shell to start.
    shell: process.platform === 'win32',
  }),
);

let stopping = false;
function stopAll(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
  process.exitCode = code;
}

for (const child of children) child.on('exit', (code) => stopAll(code ?? 0));
process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
