import { describe, expect, it } from 'vitest';
import { buildUxRapidUsabilityHarness } from '../../src/ux-rapid-usability-harness.js';
import { buildUxRapidUsabilityHarness as buildFromIndex } from '../../src/index.js';
import { buildS071Payload } from '../fixtures/ux-s071-payload.js';

describe('ux-rapid-usability-harness unit', () => {
  it('validates the rapid usability harness for S071', () => {
    const result = buildUxRapidUsabilityHarness(buildS071Payload(), {
      nowMs: Date.parse('2026-03-23T09:00:00.000Z')
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.rapidUsabilityHarness).toMatchObject({
      model: 'UX_RAPID_USABILITY_HARNESS',
      modelVersion: 'S071-v1',
      summary: {
        totalSuites: 4,
        passCount: 4,
        failCount: 0,
        stateCoveragePct: 100,
        viewportCoveragePct: 100,
        contrastFailureCount: 0,
        uxScore: 92,
        blockerCount: 0
      }
    });
  });

  it('fails when one required state is not covered by passing suites', () => {
    const payload = buildS071Payload();
    payload.usabilitySuites = payload.usabilitySuites.filter((suite) => suite.state !== 'error');

    const result = buildUxRapidUsabilityHarness(payload, {
      nowMs: Date.parse('2026-03-23T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_USABILITY_REQUIRED_STATE_MISSING');
  });

  it('fails when one required viewport is missing', () => {
    const payload = buildS071Payload();
    payload.usabilitySuites = payload.usabilitySuites.map((suite) => ({
      ...suite,
      viewport: suite.state === 'loading' ? 'mobile' : suite.viewport
    }));
    payload.usabilitySuites = payload.usabilitySuites.filter((suite) => suite.viewport !== 'tablet');

    const result = buildUxRapidUsabilityHarness(payload, {
      nowMs: Date.parse('2026-03-23T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_USABILITY_REQUIRED_VIEWPORT_MISSING');
  });

  it('fails when one suite is marked as failed', () => {
    const payload = buildS071Payload();
    payload.usabilitySuites[2].pass = false;
    payload.usabilitySuites.push({
      ...payload.usabilitySuites[2],
      id: 'suite-error-desktop-pass-backup',
      pass: true,
      evidenceRefs: ['s071-error-desktop-backup.png']
    });

    const result = buildUxRapidUsabilityHarness(payload, {
      nowMs: Date.parse('2026-03-23T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_USABILITY_SUITE_FAILURE_PRESENT');
  });

  it('is exported from index', () => {
    const result = buildFromIndex(buildS071Payload(), {
      nowMs: Date.parse('2026-03-23T09:00:00.000Z')
    });

    expect(result.reasonCode).toBe('OK');
  });
});
