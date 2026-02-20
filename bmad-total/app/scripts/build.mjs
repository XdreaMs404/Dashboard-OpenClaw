#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src');
const distDir = path.join(root, 'dist');

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

for (const file of fs.readdirSync(srcDir)) {
  const src = path.join(srcDir, file);
  const dst = path.join(distDir, file);
  if (fs.statSync(src).isFile()) fs.copyFileSync(src, dst);
}

const report = {
  generatedAt: new Date().toISOString(),
  copiedFiles: fs.readdirSync(distDir),
  status: 'ok'
};

fs.writeFileSync(path.join(distDir, 'build-report.json'), JSON.stringify(report, null, 2));
console.log('✅ Build OK');
