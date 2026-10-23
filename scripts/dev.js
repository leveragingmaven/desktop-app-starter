const { spawn } = require('child_process');
const path = require('path');

// Remove ELECTRON_RUN_AS_NODE to allow Electron to run properly
// (VSCode terminal sets this, which breaks electron-vite dev)
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const isWindows = process.platform === 'win32';
const binName = isWindows ? 'electron-vite.cmd' : 'electron-vite';
const electronVite = path.join(__dirname, '..', 'node_modules', '.bin', binName);

const child = spawn(isWindows ? `"${electronVite}"` : electronVite, ['dev'], {
  stdio: 'inherit',
  env,
  cwd: path.join(__dirname, '..'),
  shell: true
});

child.on('exit', (code) => process.exit(code || 0));
