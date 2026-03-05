import { describe, expect, it } from 'vitest';
import { buildUxRegressionDashboard } from '../../src/ux-regression-dashboard.js';
import { buildUxRegressionDashboard as buildFromIndex } from '../../src/index.js';
import { buildS072Payload } from '../fixtures/ux-s072-payload.js';

describe('ux-regression-dashboard unit', () => {
  it('builds a valid S072 regression dashboard with G4-UX linkage', () => {
    const result = buildUxRegressionDashboard(buildS072Payload(), {
      nowMs: Date.parse('2026-03-24T09:00:00.000Z')
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.uxRegressionDashboard).toMatchObject({
      model: 'UX_REGRESSION_DASHBOARD',
      modelVersion: 'S072-v1',
      summary: {
        totalRecords: 6,
        stateCoveragePct: 100,
        viewportCoveragePct: 100,
        subgateCoveragePct: 100,
        evidenceCoveragePct: 100,
        openBlockerCount: 0
      }
    });
  });

  it('fails when one required state is missing', () => {
    const payload = buildS072Payload();
    payload.uxRegressionRecords = payload.uxRegressionRecords.filter((entry) => entry.state !== 'error');

    const result = buildUxRegressionDashboard(payload, {
      nowMs: Date.parse('2026-03-24T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_REGRESSION_STATE_COVERAGE_REQUIRED');
  });

  it('fails when one required viewport is missing', () => {
    const payload = buildS072Payload();
    payload.uxRegressionRecords = payload.uxRegressionRecords
      .map((entry) => ({
        ...entry,
        viewport: entry.viewport === 'tablet' ? 'mobile' : entry.viewport
      }))
      .filter((entry) => entry.viewport !== 'tablet');

    const result = buildUxRegressionDashboard(payload, {
      nowMs: Date.parse('2026-03-24T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_REGRESSION_VIEWPORT_COVERAGE_REQUIRED');
  });

  it('fails when one required sub-gate linkage is missing', () => {
    const payload = buildS072Payload();
    payload.uxRegressionRecords = payload.uxRegressionRecords.filter(
      (entry) => entry.subgate !== 'perceivedPerformance'
    );

    const result = buildUxRegressionDashboard(payload, {
      nowMs: Date.parse('2026-03-24T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_REGRESSION_G4_UX_LINKAGE_REQUIRED');
  });

  it('is exported from index', () => {
    const result = buildFromIndex(buildS072Payload(), {
      nowMs: Date.parse('2026-03-24T09:00:00.000Z')
    });

    expect(result.reasonCode).toBe('OK');
  });
});
