#!/usr/bin/env bash
set -euo pipefail

ROOT="${BMAD_PROJECT_ROOT:-/root/.openclaw/workspace/bmad-total}"
APP_DIR="$ROOT/app"
FORCE=0
INSTALL_DEPS=1
INSTALL_BROWSER=0

for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    --no-install) INSTALL_DEPS=0 ;;
    --with-browser|--ci) INSTALL_BROWSER=1 ;;
  esac
done

mkdir -p "$APP_DIR" "$APP_DIR/scripts" "$APP_DIR/src" "$APP_DIR/tests/unit" "$APP_DIR/tests/edge" "$APP_DIR/tests/e2e"

write_file() {
  local target="$1"
  local mode="${2:-}"

  if [[ -f "$target" && "$FORCE" -ne 1 ]]; then
    echo "↷ keep $target"
    return 0
  fi

  cat > "$target"
  if [[ "$mode" == "exec" ]]; then
    chmod +x "$target"
  fi
  echo "✓ write $target"
}

write_file "$APP_DIR/package.json" <<'EOF'
{
  "name": "bmad-total-app",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "lint": "node ./scripts/lint.mjs",
    "typecheck": "node ./scripts/typecheck.mjs",
    "test": "vitest run",
    "test:edge": "vitest run tests/edge",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage",
    "build": "node ./scripts/build.mjs",
    "security:deps": "npm audit --audit-level=high"
  },
  "devDependencies": {
    "@playwright/test": "^1.55.0",
    "@vitest/coverage-v8": "^4.0.18",
    "vitest": "^4.0.18"
  }
}
EOF

write_file "$APP_DIR/vitest.config.mjs" <<'EOF'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage'
    }
  }
});
EOF

write_file "$APP_DIR/playwright.config.mjs" <<'EOF'
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    headless: true,
    browserName: 'chromium'
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
});
EOF

write_file "$APP_DIR/.gitignore" <<'EOF'
node_modules/
dist/
coverage/
playwright-report/
test-results/
EOF

write_file "$APP_DIR/README.md" <<'EOF'
# BMAD App Test Stack

Stack bootstrapé automatiquement avec:
- Vitest (unit/intégration + edge + coverage)
- Playwright (E2E)
- npm audit (sécurité dépendances)
- scripts qualité obligatoires

## Scripts
- npm run lint
- npm run typecheck
- npm test
- npm run test:edge
- npm run test:coverage
- npm run test:e2e
- npm run build
- npm run security:deps
EOF

write_file "$APP_DIR/src/core.js" <<'EOF'
export function safeDivide(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new TypeError('safeDivide expects numeric inputs');
  }
  if (b === 0) throw new Error('division by zero');
  return a / b;
}

export function normalizeSlug(input) {
  if (typeof input !== 'string') throw new TypeError('normalizeSlug expects a string');
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
EOF

write_file "$APP_DIR/src/index.js" <<'EOF'
export { safeDivide, normalizeSlug } from './core.js';
EOF

write_file "$APP_DIR/tests/unit/core.test.js" <<'EOF'
import { describe, expect, it } from 'vitest';
import { normalizeSlug, safeDivide } from '../../src/core.js';

describe('safeDivide', () => {
  it('divides numbers', () => {
    expect(safeDivide(10, 2)).toBe(5);
  });

  it('throws on zero divisor', () => {
    expect(() => safeDivide(10, 0)).toThrowError(/division by zero/i);
  });

  it('throws on invalid type', () => {
    expect(() => safeDivide('10', 2)).toThrowError(/numeric inputs/i);
  });
});

describe('normalizeSlug', () => {
  it('normalizes spaces and case', () => {
    expect(normalizeSlug('  Hello BMAD World  ')).toBe('hello-bmad-world');
  });

  it('removes symbols', () => {
    expect(normalizeSlug('Dev@Factory#2026')).toBe('devfactory2026');
  });
});
EOF

write_file "$APP_DIR/tests/edge/core.edge.test.js" <<'EOF'
import { describe, expect, it } from 'vitest';
import { normalizeSlug, safeDivide } from '../../src/core.js';

describe('edge cases', () => {
  it('handles repeated separators', () => {
    expect(normalizeSlug('A   B --- C')).toBe('a-b-c');
  });

  it('handles decimal division', () => {
    expect(safeDivide(1, 4)).toBe(0.25);
  });

  it('throws on non-string slug input', () => {
    expect(() => normalizeSlug(null)).toThrowError(/expects a string/i);
  });
});
EOF

write_file "$APP_DIR/tests/e2e/smoke.spec.js" <<'EOF'
import { expect, test } from '@playwright/test';

test('basic app smoke on data URL', async ({ page }) => {
  await page.goto('data:text/html,<main><h1>BMAD App Smoke</h1><button id="run">Run</button></main>');
  await expect(page.getByRole('heading', { name: 'BMAD App Smoke' })).toBeVisible();
  await expect(page.locator('#run')).toHaveText('Run');
});
EOF

write_file "$APP_DIR/scripts/lint.mjs" exec <<'EOF'
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
EOF

write_file "$APP_DIR/scripts/typecheck.mjs" exec <<'EOF'
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
for (const f of files) execSync(`node --check ${JSON.stringify(f)}`, { stdio: 'inherit' });

console.log('✅ Typecheck (syntax) OK');
EOF

write_file "$APP_DIR/scripts/build.mjs" exec <<'EOF'
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

fs.writeFileSync(
  path.join(distDir, 'build-report.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      copiedFiles: fs.readdirSync(distDir),
      status: 'ok'
    },
    null,
    2
  )
);

console.log('✅ Build OK');
EOF

if [[ "$INSTALL_DEPS" -eq 1 ]]; then
  echo "Installing npm dependencies..."
  (cd "$APP_DIR" && npm install)
fi

if [[ "$INSTALL_BROWSER" -eq 1 ]]; then
  echo "Installing Playwright Chromium..."
  (cd "$APP_DIR" && npx playwright install --with-deps chromium)
fi

echo "✅ Bootstrap test stack complete"
