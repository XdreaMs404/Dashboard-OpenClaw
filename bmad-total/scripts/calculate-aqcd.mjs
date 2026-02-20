#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const metricsPath = process.argv[2];
const configPath = process.argv[3] || '/root/.openclaw/workspace/bmad-total/config/hyper-orchestration.config.json';

if (!metricsPath) {
  console.error('Usage: node scripts/calculate-aqcd.mjs <metrics.json> [config.json]');
  process.exit(1);
}

const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const avgWeighted = (values, weights) => {
  let score = 0;
  for (const [k, w] of Object.entries(weights)) {
    const v = Number(values?.[k] ?? 0);
    score += v * Number(w);
  }
  return Number(score.toFixed(2));
};

const autonomy = avgWeighted(metrics.autonomy, cfg.autonomyWeights);
const qualityTech = avgWeighted(metrics.qualityTech, cfg.qualityTechWeights);
const costEfficiency = avgWeighted(metrics.costEfficiency, cfg.costEfficiencyWeights);
const designExcellence = avgWeighted(metrics.design, cfg.designWeights);

const global = Number((
  qualityTech * cfg.scoreWeights.qualityTech +
  designExcellence * cfg.scoreWeights.designExcellence +
  autonomy * cfg.scoreWeights.autonomy +
  costEfficiency * cfg.scoreWeights.costEfficiency
).toFixed(2));

let band = 'NON_ACCEPTABLE';
if (global >= 85) band = 'INDUSTRIAL';
else if (global >= 70) band = 'STABLE';
else if (global >= 55) band = 'FRAGILE';

const costWastePct = Number(metrics.costWastePct ?? NaN);
const killSwitch = {
  qualityTechLow: qualityTech < Number(cfg.thresholds.qualityTechKillSwitchMin),
  designLow: designExcellence < Number(cfg.thresholds.designKillSwitchMin),
  costWasteHigh: Number.isFinite(costWastePct)
    ? costWastePct > Number(cfg.thresholds.costWasteMaxPct)
    : false
};

const out = {
  model: cfg.model,
  window: metrics.window || 'story',
  windowRef: metrics.windowRef || 'N/A',
  updatedAt: new Date().toISOString(),
  scores: {
    autonomy,
    qualityTech,
    costEfficiency,
    designExcellence,
    global
  },
  band,
  thresholds: cfg.thresholds,
  killSwitch,
  inputs: {
    metricsPath: path.resolve(metricsPath),
    configPath: path.resolve(configPath)
  }
};

process.stdout.write(JSON.stringify(out, null, 2));
process.stdout.write('\n');
