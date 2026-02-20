#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const folders = ['src', 'tests', 'scripts'];
const files = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (['.js', '.mjs'].includes(path.extname(entry.name))) files.push(full);
  }
}

for (const f of folders) walk(path.join(root, f));

for (const f of files) {
  execSync(`node --check ${JSON.stringify(f)}`, { stdio: 'inherit' });
}

console.log('✅ Typecheck (syntax) OK');
