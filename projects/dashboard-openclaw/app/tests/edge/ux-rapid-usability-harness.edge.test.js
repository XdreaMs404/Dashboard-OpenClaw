import { describe, expect, it } from 'vitest';
import { buildUxRapidUsabilityHarness } from '../../src/ux-rapid-usability-harness.js';
import { buildS071Payload } from '../fixtures/ux-s071-payload.js';

describe('ux-rapid-usability-harness edge', () => {
  it('rejects malformed payload', () => {
    const result = buildUxRapidUsabilityHarness('bad-input');

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_UX_USABILITY_HARNESS_INPUT');
  });

  it('propagates base S070 failure when motion profiles are missing', () => {
    const payload = buildS071Payload();
    delete payload.motionProfiles;

    const result = buildUxRapidUsabilityHarness(payload, {
      nowMs: Date.parse('2026-03-23T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_MOTION_PROFILES_REQUIRED');
  });

  it('fails when no suites are provided', () => {
    const payload = buildS071Payload();
    delete payload.usabilitySuites;

    const result = buildUxRapidUsabilityHarness(payload, {
      nowMs: Date.parse('2026-03-23T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_USABILITY_SUITES_REQUIRED');
  });

  it('fails when one suite is missing state metadata', () => {
    const payload = buildS071Payload();
    delete payload.usabilitySuites[0].state;

    const result = buildUxRapidUsabilityHarness(payload, {
      nowMs: Date.parse('2026-03-23T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_UX_USABILITY_HARNESS_INPUT');
  });

  it('fails when contrast checks are below the S071 AA threshold', () => {
    const payload = buildS071Payload();
    payload.contrastChecks = payload.contrastChecks.map((entry, index) =>
      index === 0
        ? {
            ...entry,
            ratio: 4.2,
            aaPass: true
          }
        : entry
    );

    const result = buildUxRapidUsabilityHarness(payload, {
      nowMs: Date.parse('2026-03-23T09:00:00.000Z'),
      motionPreferenceRules: {
        contrastRatioMin: 4,
        scoreMin: 85,
        blockerMax: 0
      }
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_USABILITY_CONTRAST_AA_REQUIRED');
  });

  it('fails when suite runtime exceeds the rapid budget', () => {
    const payload = buildS071Payload();
    payload.usabilitySuites[1].durationMs = 4200;

    const result = buildUxRapidUsabilityHarness(payload, {
      nowMs: Date.parse('2026-03-23T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_USABILITY_SUITE_DURATION_EXCEEDED');
  });

  it('fails when PASS suites have no evidence references', () => {
    const payload = buildS071Payload();
    payload.usabilitySuites = payload.usabilitySuites.map((suite) => ({
      ...suite,
      evidenceRefs: []
    }));

    const result = buildUxRapidUsabilityHarness(payload, {
      nowMs: Date.parse('2026-03-23T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_USABILITY_EVIDENCE_MISSING');
  });

  it('supports alias input quickUsabilityTests/usabilityHarnessRules', () => {
    const payload = buildS071Payload();
    payload.quickUsabilityTests = payload.usabilitySuites.map((suite) => ({
      suiteId: suite.id,
      name: suite.scenario,
      uiState: suite.state,
      device: suite.viewport,
      duration: suite.durationMs,
      result: 'PASS',
      checks: suite.assertions,
      evidenceRef: suite.evidenceRefs[0]
    }));
    delete payload.usabilitySuites;

    const result = buildUxRapidUsabilityHarness(payload, {
      nowMs: Date.parse('2026-03-23T09:00:00.000Z'),
      usabilityHarnessRules: {
        modelVersion: 'S071-runtime',
        requiredStates: ['empty', 'loading', 'error', 'success'],
        requiredViewports: ['mobile', 'tablet', 'desktop'],
        minContrastRatio: 4.5,
        maxSuiteDurationMs: 3200,
        scoreMin: 85,
        blockerMax: 0
      }
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.rapidUsabilityHarness.modelVersion).toBe('S071-runtime');
  });

  it('can fail on S071 score rule while upstream score gates are relaxed', () => {
    const payload = buildS071Payload();
    payload.uxAudit.score = 81;

    const result = buildUxRapidUsabilityHarness(payload, {
      nowMs: Date.parse('2026-03-23T09:00:00.000Z'),
      widgetStateRules: {
        minUxScore: 70,
        maxBlockers: 2
      },
      motionPreferenceRules: {
        scoreMin: 70,
        blockerMax: 2
      }
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_USABILITY_SCORE_LOW');
  });

  it('can fail on S071 blockers rule while upstream blocker gates are relaxed', () => {
    const payload = buildS071Payload();
    payload.uxAudit.blockerCount = 1;

    const result = buildUxRapidUsabilityHarness(payload, {
      nowMs: Date.parse('2026-03-23T09:00:00.000Z'),
      widgetStateRules: {
        minUxScore: 85,
        maxBlockers: 2
      },
      motionPreferenceRules: {
        scoreMin: 85,
        blockerMax: 2
      }
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_USABILITY_BLOCKERS_PRESENT');
  });

  it('supports rapidUsabilitySuites alias with runtime rapid rules and mixed suite field aliases', () => {
    const payload = buildS071Payload();
    payload.rapidUsabilitySuites = [
      {
        uiState: 'empty',
        breakpoint: 'mobile',
        runMs: 720,
        passed: true,
        checks: ['STATE_EMPTY_VISIBLE', undefined],
        capture: 's071-empty-mobile-capture.png'
      },
      {
        suiteId: 'suite-loading-tablet',
        name: 'loading',
        state: 'loading',
        device: 'tablet',
        duration: 930,
        success: true,
        checks: ['STATE_LOADING_VISIBLE'],
        evidence: 's071-loading-tablet-evidence.png'
      },
      {
        id: 'suite-error-desktop',
        scenario: 'error',
        state: 'error',
        viewport: 'desktop',
        durationMs: 1110,
        status: 'PASS',
        assertions: ['STATE_ERROR_VISIBLE'],
        evidenceRef: 's071-error-desktop-evidence.png'
      },
      {
        id: 'suite-success-mobile',
        scenario: 'success',
        state: 'success',
        viewport: 'mobile',
        durationMs: 'not-a-number',
        result: 'PASS',
        evidenceRefs: ['s071-success-mobile-evidence.png']
      }
    ];
    delete payload.usabilitySuites;

    const result = buildUxRapidUsabilityHarness(payload, {
      rapidUsabilityHarnessRules: {
        modelVersion: '   ',
        requiredStates: ['   ', null],
        requiredViewports: [undefined, ' '],
        minContrastRatio: 4.5,
        maxSuiteDurationMs: 3200,
        scoreMin: 85,
        blockerMax: 0
      }
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.rapidUsabilityHarness.modelVersion).toBe('S071-v1');
    expect(result.rapidUsabilityHarness.suites[0].id).toBe('suite-1');
    expect(result.rapidUsabilityHarness.suites[0].scenario).toBe('nominal');
    expect(result.rapidUsabilityHarness.summary.passCount).toBe(4);
  });

  it('supports payload rapidUsabilityHarnessRules source selection', () => {
    const payload = buildS071Payload();
    payload.rapidUsabilityHarnessRules = {
      modelVersion: 'S071-payload-rapid',
      requiredStates: ['empty', 'loading', 'error', 'success'],
      requiredViewports: ['mobile', 'tablet', 'desktop'],
      minContrastRatio: 4.5,
      maxSuiteDurationMs: 3200,
      scoreMin: 85,
      blockerMax: 0
    };

    const result = buildUxRapidUsabilityHarness(payload);

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.rapidUsabilityHarness.modelVersion).toBe('S071-payload-rapid');
  });

  it('supports payload usabilityHarnessRules with nested usabilityHarness.suites alias', () => {
    const payload = buildS071Payload();
    payload.usabilityHarness = {
      suites: payload.usabilitySuites.map((suite) => ({
        suiteId: suite.id,
        name: suite.scenario,
        uiState: suite.state,
        device: suite.viewport,
        duration: suite.durationMs,
        status: 'PASS',
        checks: suite.assertions,
        evidence: suite.evidenceRefs[0]
      }))
    };
    payload.usabilityHarnessRules = {
      modelVersion: 'S071-payload-nested',
      requiredStates: ['empty', 'loading', 'error', 'success'],
      requiredViewports: ['mobile', 'tablet', 'desktop'],
      minContrastRatio: 4.5,
      maxSuiteDurationMs: 3200,
      scoreMin: 85,
      blockerMax: 0
    };
    delete payload.usabilitySuites;

    const result = buildUxRapidUsabilityHarness(payload);

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.rapidUsabilityHarness.modelVersion).toBe('S071-payload-nested');
    expect(result.rapidUsabilityHarness.summary.viewportCoveragePct).toBe(100);
  });
});
