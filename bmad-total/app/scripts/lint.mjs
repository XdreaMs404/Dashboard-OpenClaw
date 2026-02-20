#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const folders = ['src', 'tests', 'scripts'];
const exts = new Set(['.js', '.mjs']);
const issues = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (exts.has(path.extname(entry.name))) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (/\s+$/.test(line) && line.length > 0) {
          issues.push(`${full}:${i + 1} trailing whitespace`);
        }
        if (!full.endsWith('scripts/lint.mjs') && /TODO|FIXME/.test(line)) {
          issues.push(`${full}:${i + 1} unresolved TODO/FIXME`);
        }
      });
    }
  }
}

for (const f of folders) walk(path.join(root, f));

if (issues.length) {
  console.error('❌ Lint failed');
  for (const i of issues) console.error(' -', i);
  process.exit(1);
}

console.log('✅ Lint OK');
