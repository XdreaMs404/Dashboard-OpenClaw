import { describe, expect, it } from 'vitest';
import { simulateGateVerdictBeforeSubmission } from '../../src/gate-pre-submit-simulation.js';
import {
  simulateGateVerdictBeforeSubmission as simulateGateVerdictBeforeSubmissionFromIndex
} from '../../src/index.js';

describe('gate-pre-submit-simulation unit', () => {
  it('runs non-mutative pre-submit simulation with trend + evidence chain (AC-01/AC-03/AC-05/AC-08)', () => {
    const result = simulateGateVerdictBeforeSubmission(
      {
        baseVerdict: 'PASS',
        simulationInput: {
          eligible: true,
          readOnly: true,
          additionalSignals: [{ severity: 'CONCERNS', blocking: false, factorId: 'ux-risk' }]
        },
        trendWindow: {
          startAt: '2026-02-01T00:00:00.000Z',
          endAt: '2026-02-07T23:59:59.000Z',
          period: '2026-W06'
        },
        trendSamples: [
          { verdict: 'PASS', at: '2026-02-02T10:00:00.000Z' },
          { verdict: 'CONCERNS', at: '2026-02-03T10:00:00.000Z' }
        ],
        evidenceChain: {
          primaryEvidenceRefs: ['proof:gate-center'],
          trendEvidenceRefs: ['proof:trend-snapshot']
        }
      },
      {
        nowMs: () => Date.parse('2026-02-07T23:59:59.000Z')
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      simulation: {
        eligible: true,
        nonMutative: true,
        simulatedVerdict: 'CONCERNS'
      },
      trendSnapshot: {
        phase: 'G4',
        period: '2026-W06',
        passCount: 1,
        concernsCount: 1,
        failCount: 0,
        totalCount: 2
      },
      evidenceChain: {
        primaryEvidenceRefs: ['proof:gate-center'],
        trendEvidenceRefs: ['proof:trend-snapshot']
      }
    });
  });

  it('fails invalid simulation payload (AC-02)', () => {
    const result = simulateGateVerdictBeforeSubmission({
      baseVerdict: 'PASS',
      simulationInput: {
        eligible: true,
        readOnly: true,
        additionalSignals: 'bad-input'
      }
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_GATE_SIMULATION_INPUT');
  });

  it('fails invalid trend window (AC-04)', () => {
    const result = simulateGateVerdictBeforeSubmission({
      baseVerdict: 'PASS',
      simulationInput: {
        eligible: true,
        readOnly: true
      },
      trendWindow: {
        startAt: '2026-02-10T00:00:00.000Z',
        endAt: '2026-02-01T00:00:00.000Z'
      }
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('SIMULATION_TREND_WINDOW_INVALID');
    expect(result.correctiveActions).toContain('FIX_TREND_WINDOW_INPUT');
  });

  it('fails explicit incomplete evidence chain (AC-05)', () => {
    const result = simulateGateVerdictBeforeSubmission({
      baseVerdict: 'PASS',
      simulationInput: {
        eligible: true,
        readOnly: true
      },
      evidenceChain: {
        primaryEvidenceRefs: [],
        trendEvidenceRefs: []
      }
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('EVIDENCE_CHAIN_INCOMPLETE');
    expect(result.correctiveActions).toContain('LINK_PRIMARY_EVIDENCE');
  });

  it('propagates blocking policy result and supports policy delegation (AC-06/AC-07)', () => {
    const blockedResult = simulateGateVerdictBeforeSubmission({
      policyVersionResult: {
        allowed: false,
        reasonCode: 'PHASE_NOTIFICATION_MISSING',
        reason: 'Notification absente.',
        diagnostics: {
          sourceReasonCode: 'PHASE_NOTIFICATION_MISSING'
        },
        correctiveActions: ['PUBLISH_PHASE_NOTIFICATION']
      },
      simulationInput: {
        eligible: true,
        readOnly: true
      }
    });

    expect(blockedResult.allowed).toBe(false);
    expect(blockedResult.reasonCode).toBe('PHASE_NOTIFICATION_MISSING');
    expect(blockedResult.correctiveActions).toContain('PUBLISH_PHASE_NOTIFICATION');

    const delegatedResult = simulateGateVerdictBeforeSubmission(
      {
        policyVersionInput: {
          policyScope: 'gate',
          activeVersion: '1.2.0',
          requestedVersion: '1.2.0'
        },
        simulationInput: {
          eligible: true,
          readOnly: true
        }
      },
      {
        versionGatePolicy: () => ({
          allowed: true,
          reasonCode: 'OK',
          diagnostics: {
            verdict: 'PASS',
            sourceReasonCode: 'OK'
          }
        })
      }
    );

    expect(delegatedResult.allowed).toBe(true);
    expect(delegatedResult.reasonCode).toBe('OK');
  });

  it('is exported from index', () => {
    const result = simulateGateVerdictBeforeSubmissionFromIndex({
      baseVerdict: 'PASS',
      simulationInput: {
        eligible: true,
        readOnly: true
      }
    });

    expect(result.reasonCode).toBe('OK');
  });
});
