#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const appDir = '/root/.openclaw/workspace/bmad-total/app';
const threshold = Number(process.env.COVERAGE_THRESHOLD_PCT || 85);

const candidates = [
  path.join(appDir, 'coverage/coverage-summary.json'),
  path.join(appDir, 'coverage-summary.json')
];

const file = candidates.find(p => fs.existsSync(p));
if (!file) {
  console.error('❌ Coverage file not found. Expected coverage/coverage-summary.json');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const total = data.total || {};

const keys = ['lines', 'statements', 'functions', 'branches'];
let failed = false;
for (const k of keys) {
  const pct = Number(total?.[k]?.pct ?? 0);
  if (pct < threshold) {
    console.error(`❌ Coverage ${k}: ${pct}% < ${threshold}%`);
    failed = true;
  } else {
    console.log(`✅ Coverage ${k}: ${pct}% >= ${threshold}%`);
  }
}

if (failed) process.exit(1);
console.log('✅ COVERAGE_THRESHOLD_OK');
