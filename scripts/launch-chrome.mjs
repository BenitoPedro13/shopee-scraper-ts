#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { platform, env } from 'node:process';
import { join, resolve } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

const mode = (process.argv[2] || 'headless').toLowerCase();
if (!['headless', 'headful'].includes(mode)) {
  console.error('Usage: node scripts/launch-chrome.mjs [headless|headful]');
  process.exit(1);
}

function candidatesForPlatform() {
  const p = platform;
  if (p === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      'google-chrome',
      'chromium',
      'chrome'
    ];
  }
  if (p === 'win32') {
    const pf = env['PROGRAMFILES'] || 'C\\\u005c\u005cProgram Files';
    const pf86 = env['PROGRAMFILES(X86)'];
    const la = env['LOCALAPPDATA'];
    const list = [];
    if (pf) list.push(join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    if (pf86) list.push(join(pf86, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    if (la) list.push(join(la, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    list.push('chrome');
    return list;
  }
  // linux and others
  return [
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
    'chrome'
  ];
}

function isExecutable(cmd) {
  try {
    const res = spawnSync(cmd, ['--version'], { stdio: 'ignore' });
    return res.status === 0;
  } catch {
    return false;
  }
}

function findChrome() {
  const list = candidatesForPlatform();
  for (const c of list) {
    if (c.includes('/') || c.includes('\\')) {
      if (existsSync(c)) return c;
    }
    if (isExecutable(c)) return c;
  }
  return null;
}

const chrome = findChrome();
if (!chrome) {
  console.error('Could not locate Chrome/Chromium. Please install Chrome or set it on PATH.');
  process.exit(1);
}

const profileDir = resolve('.cdp-profile');
if (!existsSync(profileDir)) {
  mkdirSync(profileDir, { recursive: true });
}

const commonFlags = [
  '--remote-debugging-port=9222',
  `--user-data-dir=${profileDir}`,
  '--no-first-run',
  '--no-default-browser-check'
];

const extra = mode === 'headless'
  ? ['--headless=new', '--disable-gpu']
  : ['--start-minimized'];

const args = [...commonFlags, ...extra];

console.log(`Launching ${chrome} ${args.join(' ')}`);

const child = spawn(chrome, args, { stdio: 'inherit' });
child.on('exit', (code, signal) => {
  if (signal) {
    console.log(`Chrome exited due to signal ${signal}`);
  }
  process.exit(code ?? 0);
});

