import { describe, expect, it } from 'vitest';
import { buildUxRegressionDashboard } from '../../src/ux-regression-dashboard.js';
import { buildS072Payload } from '../fixtures/ux-s072-payload.js';

describe('ux-regression-dashboard edge', () => {
  it('rejects malformed payload', () => {
    const result = buildUxRegressionDashboard('bad-input');

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_UX_REGRESSION_INPUT');
  });

  it('propagates upstream S071 failure when usability suites are missing', () => {
    const payload = buildS072Payload();
    delete payload.usabilitySuites;

    const result = buildUxRegressionDashboard(payload, {
      nowMs: Date.parse('2026-03-24T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_USABILITY_SUITES_REQUIRED');
  });

  it('fails when no regression records are provided', () => {
    const payload = buildS072Payload();
    delete payload.uxRegressionRecords;

    const result = buildUxRegressionDashboard(payload, {
      nowMs: Date.parse('2026-03-24T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_REGRESSION_RECORDS_REQUIRED');
  });

  it('fails when one record is not an object', () => {
    const payload = buildS072Payload();
    payload.uxRegressionRecords = ['broken-entry'];

    const result = buildUxRegressionDashboard(payload, {
      nowMs: Date.parse('2026-03-24T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_UX_REGRESSION_INPUT');
  });

  it('fails when verdict is invalid', () => {
    const payload = buildS072Payload();
    payload.uxRegressionRecords[0].verdict = 'UNKNOWN';

    const result = buildUxRegressionDashboard(payload, {
      nowMs: Date.parse('2026-03-24T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_UX_REGRESSION_INPUT');
  });

  it('fails when status is invalid', () => {
    const payload = buildS072Payload();
    payload.uxRegressionRecords[0].status = 'IN_PROGRESS';

    const result = buildUxRegressionDashboard(payload, {
      nowMs: Date.parse('2026-03-24T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_UX_REGRESSION_INPUT');
  });

  it('fails when severity is invalid', () => {
    const payload = buildS072Payload();
    payload.uxRegressionRecords[0].severity = 'CRITICAL';

    const result = buildUxRegressionDashboard(payload, {
      nowMs: Date.parse('2026-03-24T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_UX_REGRESSION_INPUT');
  });

  it('fails when evidence linkage is required but missing', () => {
    const payload = buildS072Payload();
    payload.uxRegressionRecords[0].evidenceRefs = [];

    const result = buildUxRegressionDashboard(payload, {
      nowMs: Date.parse('2026-03-24T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_REGRESSION_EVIDENCE_LINK_REQUIRED');
  });

  it('fails when blocker regressions exceed threshold', () => {
    const payload = buildS072Payload();
    payload.uxRegressionRecords[1].severity = 'BLOCKER';

    const result = buildUxRegressionDashboard(payload, {
      nowMs: Date.parse('2026-03-24T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_REGRESSION_BLOCKERS_PRESENT');
  });

  it('supports regressionDashboard alias with runtime rules and field aliases', () => {
    const payload = buildS072Payload();
    payload.regressionDashboard = {
      records: [
        {
          id: 'REG-EMPTY-MOBILE',
          uiState: 'empty',
          device: 'mobile',
          verdict: 'PASS',
          g4Subgate: 'designSystemCompliance',
          lifecycle: 'CLOSED',
          level: 'MINOR',
          evidenceRef: 'reg-empty-mobile.png'
        },
        {
          id: 'REG-LOADING-TABLET',
          state: 'loading',
          viewport: 'tablet',
          verdict: 'CONCERNS',
          subgate: 'accessibilityAA',
          status: 'OPEN',
          severity: 'MAJOR',
          captureRef: 'reg-loading-tablet.png'
        },
        {
          id: 'REG-ERROR-DESKTOP',
          state: 'error',
          viewport: 'desktop',
          verdict: 'FAIL',
          subgate: 'responsiveCoverage',
          status: 'OPEN',
          severity: 'MAJOR',
          capture: 'reg-error-desktop.png'
        },
        {
          id: 'REG-SUCCESS-MOBILE',
          state: 'success',
          viewport: 'mobile',
          verdict: 'PASS',
          subgate: 'interactionStates',
          status: 'RESOLVED',
          severity: 'MINOR',
          evidenceRefs: ['reg-success-mobile.png']
        },
        {
          id: 'REG-LOADING-DESKTOP',
          state: 'loading',
          viewport: 'desktop',
          verdict: 'CONCERNS',
          subgate: 'visualHierarchy',
          status: 'OPEN',
          severity: 'MAJOR',
          evidenceRefs: ['reg-loading-desktop.png']
        },
        {
          id: 'REG-SUCCESS-TABLET',
          state: 'success',
          viewport: 'tablet',
          verdict: 'PASS',
          subgate: 'perceivedPerformance',
          status: 'RESOLVED',
          severity: 'MINOR',
          evidenceRefs: ['reg-success-tablet.png']
        }
      ]
    };
    delete payload.uxRegressionRecords;

    const result = buildUxRegressionDashboard(payload, {
      nowMs: Date.parse('2026-03-24T09:00:00.000Z'),
      uxRegressionRules: {
        modelVersion: 'S072-runtime',
        requiredStates: ['empty', 'loading', 'error', 'success'],
        requiredViewports: ['mobile', 'tablet', 'desktop'],
        requiredSubgates: [
          'designSystemCompliance',
          'accessibilityAA',
          'responsiveCoverage',
          'interactionStates',
          'visualHierarchy',
          'perceivedPerformance'
        ],
        blockerOpenMax: 1
      }
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.uxRegressionDashboard.modelVersion).toBe('S072-runtime');
  });

  it('supports uxRegressionDashboard alias and payload rules fallback', () => {
    const payload = buildS072Payload();
    payload.uxRegressionDashboard = {
      records: payload.uxRegressionRecords
    };
    payload.uxRegressionRules = {
      modelVersion: 'S072-payload-rules',
      requiredStates: ['empty', 'loading', 'error', 'success'],
      requiredViewports: ['mobile', 'tablet', 'desktop'],
      requiredSubgates: [
        'designSystemCompliance',
        'accessibilityAA',
        'responsiveCoverage',
        'interactionStates',
        'visualHierarchy',
        'perceivedPerformance'
      ],
      requireEvidence: false,
      blockerOpenMax: 1
    };
    delete payload.uxRegressionRecords;

    const result = buildUxRegressionDashboard(payload, {
      nowMs: Date.parse('2026-03-24T09:00:00.000Z')
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.uxRegressionDashboard.modelVersion).toBe('S072-payload-rules');
  });
});
