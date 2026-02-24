import { describe, expect, it } from 'vitest';
import { calculateGateVerdict } from '../../src/gate-verdict-calculator.js';
import {
  calculateGateVerdict as calculateGateVerdictFromIndex,
  evaluateG4DualCorrelation
} from '../../src/index.js';

const REASON_CODES = new Set([
  'OK',
  'INVALID_PHASE',
  'TRANSITION_NOT_ALLOWED',
  'PHASE_NOTIFICATION_MISSING',
  'PHASE_NOTIFICATION_SLA_EXCEEDED',
  'PHASE_PREREQUISITES_MISSING',
  'PHASE_PREREQUISITES_INCOMPLETE',
  'INVALID_PHASE_PREREQUISITES',
  'OVERRIDE_NOT_ELIGIBLE',
  'OVERRIDE_REQUEST_MISSING',
  'OVERRIDE_JUSTIFICATION_REQUIRED',
  'OVERRIDE_APPROVER_REQUIRED',
  'OVERRIDE_APPROVER_CONFLICT',
  'DEPENDENCY_STATE_STALE',
  'INVALID_PHASE_DEPENDENCY_INPUT',
  'PHASE_SEQUENCE_GAP_DETECTED',
  'PHASE_SEQUENCE_REGRESSION_DETECTED',
  'REPEATED_BLOCKING_ANOMALY',
  'INVALID_PHASE_PROGRESSION_INPUT',
  'INVALID_GOVERNANCE_DECISION_INPUT',
  'GATE_STATUS_INCOMPLETE',
  'G4_SUBGATE_MISMATCH',
  'INVALID_GATE_CENTER_INPUT',
  'G4_SUBGATES_UNSYNC',
  'G4_DUAL_EVALUATION_FAILED',
  'INVALID_G4_DUAL_INPUT',
  'GATE_VERDICT_CONCERNS',
  'EVIDENCE_CHAIN_INCOMPLETE',
  'INVALID_GATE_VERDICT_INPUT'
]);

function g4DualResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Dual G4 validé.',
    diagnostics: {
      g4tStatus: 'PASS',
      g4uxStatus: 'PASS',
      dualVerdict: 'PASS',
      mismatchCount: 0,
      durationMs: 12,
      p95DualEvalMs: 4,
      sourceReasonCode: 'OK'
    },
    g4DualStatus: {
      g4: {
        status: 'PASS',
        owner: 'owner-g4',
        updatedAt: '2026-02-24T00:00:03.000Z'
      },
      g4t: {
        gateId: 'G4-T',
        status: 'PASS',
        owner: 'owner-g4t',
        updatedAt: '2026-02-24T00:00:05.000Z',
        evidenceCount: 2,
        reasonCode: 'OK',
        sourceReasonCode: 'OK'
      },
      g4ux: {
        gateId: 'G4-UX',
        status: 'PASS',
        owner: 'owner-g4ux',
        updatedAt: '2026-02-24T00:00:06.000Z',
        evidenceCount: 3,
        reasonCode: 'OK',
        sourceReasonCode: 'OK'
      },
      dualVerdict: 'PASS',
      synchronized: true
    },
    correlationMatrix: [],
    correctiveActions: [],
    ...overrides
  };
}

function gateCenterResultForS026(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    diagnostics: {
      sourceReasonCode: 'OK'
    },
    gateCenter: [
      {
        gateId: 'G1',
        status: 'PASS',
        owner: 'owner-g1',
        updatedAt: '2026-02-24T00:00:00.000Z',
        reasonCode: 'OK',
        sourceReasonCode: 'OK'
      },
      {
        gateId: 'G2',
        status: 'PASS',
        owner: 'owner-g2',
        updatedAt: '2026-02-24T00:00:01.000Z',
        reasonCode: 'OK',
        sourceReasonCode: 'OK'
      },
      {
        gateId: 'G3',
        status: 'PASS',
        owner: 'owner-g3',
        updatedAt: '2026-02-24T00:00:02.000Z',
        reasonCode: 'OK',
        sourceReasonCode: 'OK'
      },
      {
        gateId: 'G4',
        status: 'PASS',
        owner: 'owner-g4',
        updatedAt: '2026-02-24T00:00:03.000Z',
        reasonCode: 'OK',
        sourceReasonCode: 'OK'
      },
      {
        gateId: 'G5',
        status: 'PASS',
        owner: 'owner-g5',
        updatedAt: '2026-02-24T00:00:04.000Z',
        reasonCode: 'OK',
        sourceReasonCode: 'OK'
      }
    ],
    subGates: [
      {
        gateId: 'G4-T',
        parentGateId: 'G4',
        status: 'PASS',
        owner: 'owner-g4t',
        updatedAt: '2026-02-24T00:00:05.000Z',
        reasonCode: 'OK',
        sourceReasonCode: 'OK',
        evidenceCount: 2
      },
      {
        gateId: 'G4-UX',
        parentGateId: 'G4',
        status: 'PASS',
        owner: 'owner-g4ux',
        updatedAt: '2026-02-24T00:00:06.000Z',
        reasonCode: 'OK',
        sourceReasonCode: 'OK',
        evidenceCount: 3
      }
    ],
    correctiveActions: [],
    ...overrides
  };
}

describe('gate-verdict-calculator unit', () => {
  it('returns PASS with canMarkDone=true on nominal input with complete evidence chain', () => {
    const result = calculateGateVerdict({
      g4DualResult: g4DualResult(),
      evidenceRefs: ['proof-1', 'proof-2'],
      inputGatesCount: 5
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      verdict: 'PASS',
      canMarkDone: true,
      diagnostics: {
        inputGatesCount: 5,
        evidenceCount: 2,
        g4tStatus: 'PASS',
        g4uxStatus: 'PASS',
        sourceReasonCode: 'OK'
      }
    });

    expect(result.reason).toContain('Verdict gate calculé: PASS');
    expect(result.correctiveActions).not.toContain('BLOCK_DONE_TRANSITION');
    expect(result.contributingFactors.length).toBeGreaterThanOrEqual(4);
  });

  it('returns CONCERNS and blocks done when G4-T is concerns (FR-014 safeguard)', () => {
    const result = calculateGateVerdict({
      g4DualResult: g4DualResult({
        g4DualStatus: {
          ...g4DualResult().g4DualStatus,
          g4t: {
            ...g4DualResult().g4DualStatus.g4t,
            status: 'CONCERNS',
            reasonCode: 'TRANSITION_NOT_ALLOWED',
            sourceReasonCode: 'TRANSITION_NOT_ALLOWED'
          },
          dualVerdict: 'CONCERNS'
        },
        diagnostics: {
          ...g4DualResult().diagnostics,
          g4tStatus: 'CONCERNS',
          dualVerdict: 'CONCERNS'
        }
      }),
      evidenceRefs: ['proof-1']
    });

    expect(result.reasonCode).toBe('GATE_VERDICT_CONCERNS');
    expect(result.verdict).toBe('CONCERNS');
    expect(result.canMarkDone).toBe(false);
    expect(result.correctiveActions).toContain('BLOCK_DONE_TRANSITION');
    expect(result.correctiveActions).toContain('REVIEW_GATE_CONCERNS');
  });

  it('returns FAIL and blocks done when G4-UX fails with UX refresh action', () => {
    const result = calculateGateVerdict({
      g4DualResult: g4DualResult({
        g4DualStatus: {
          ...g4DualResult().g4DualStatus,
          g4ux: {
            ...g4DualResult().g4DualStatus.g4ux,
            status: 'FAIL',
            reasonCode: 'TRANSITION_NOT_ALLOWED',
            sourceReasonCode: 'TRANSITION_NOT_ALLOWED'
          },
          dualVerdict: 'FAIL'
        },
        diagnostics: {
          ...g4DualResult().diagnostics,
          g4uxStatus: 'FAIL',
          dualVerdict: 'FAIL'
        }
      }),
      evidenceRefs: ['proof-1']
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('TRANSITION_NOT_ALLOWED');
    expect(result.verdict).toBe('FAIL');
    expect(result.canMarkDone).toBe(false);
    expect(result.correctiveActions).toContain('BLOCK_DONE_TRANSITION');
    expect(result.correctiveActions).toContain('REQUEST_UX_EVIDENCE_REFRESH');
  });

  it('returns CONCERNS when non-blocking additional signal is degraded', () => {
    const result = calculateGateVerdict({
      g4DualResult: g4DualResult(),
      evidenceRefs: ['proof-1'],
      additionalSignals: [
        {
          signalId: 'SIGNAL-LATENCY',
          severity: 'CONCERNS',
          blocking: false,
          detail: 'latence en hausse',
          reasonCode: 'TRANSITION_NOT_ALLOWED'
        }
      ]
    });

    expect(result.reasonCode).toBe('GATE_VERDICT_CONCERNS');
    expect(result.verdict).toBe('CONCERNS');
    expect(result.canMarkDone).toBe(false);
    expect(result.correctiveActions).toContain('REVIEW_GATE_CONCERNS');
  });

  it('returns FAIL when additional blocking signal is present', () => {
    const result = calculateGateVerdict({
      g4DualResult: g4DualResult(),
      evidenceRefs: ['proof-1'],
      additionalSignals: [
        {
          signalId: 'SIGNAL-COMPLIANCE',
          severity: 'FAIL',
          blocking: true,
          detail: 'preuve compliance manquante',
          reasonCode: 'INVALID_PHASE'
        }
      ]
    });

    expect(result.reasonCode).toBe('INVALID_PHASE');
    expect(result.verdict).toBe('FAIL');
    expect(result.canMarkDone).toBe(false);
    expect(result.correctiveActions).toContain('BLOCK_DONE_TRANSITION');
  });

  it('returns EVIDENCE_CHAIN_INCOMPLETE when evidenceRefs are required and missing', () => {
    const result = calculateGateVerdict({
      g4DualResult: g4DualResult()
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'EVIDENCE_CHAIN_INCOMPLETE',
      canMarkDone: false,
      diagnostics: {
        evidenceCount: 0,
        g4tStatus: 'PASS',
        g4uxStatus: 'PASS'
      }
    });

    expect(result.correctiveActions).toContain('LINK_PRIMARY_EVIDENCE');
    expect(result.correctiveActions).toContain('BLOCK_DONE_TRANSITION');
  });

  it('allows empty evidenceRefs when requireEvidenceRefs=false', () => {
    const result = calculateGateVerdict({
      g4DualResult: g4DualResult(),
      requireEvidenceRefs: false
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.verdict).toBe('PASS');
    expect(result.canMarkDone).toBe(true);
  });

  it('prefers g4DualResult over g4DualInput when both are provided', () => {
    const result = calculateGateVerdict({
      g4DualResult: g4DualResult(),
      g4DualInput: {
        gateCenterResult: {
          allowed: false,
          reasonCode: 'G4_SUBGATES_UNSYNC',
          diagnostics: {
            sourceReasonCode: 'G4_SUBGATES_UNSYNC'
          }
        }
      },
      evidenceRefs: ['proof-1']
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.verdict).toBe('PASS');
  });

  it('delegates to S026 through g4DualInput when g4DualResult is absent', () => {
    const delegatedDual = evaluateG4DualCorrelation({
      gateCenterResult: gateCenterResultForS026()
    });

    const result = calculateGateVerdict({
      g4DualInput: {
        gateCenterResult: gateCenterResultForS026()
      },
      evidenceRefs: ['proof-1']
    });

    expect(delegatedDual.reasonCode).toBe('OK');
    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      verdict: 'PASS',
      canMarkDone: true,
      diagnostics: {
        g4tStatus: 'PASS',
        g4uxStatus: 'PASS',
        sourceReasonCode: 'OK'
      }
    });
  });

  it('propagates strict upstream blocking reason codes from S026', () => {
    const result = calculateGateVerdict({
      g4DualResult: {
        allowed: false,
        reasonCode: 'G4_SUBGATES_UNSYNC',
        reason: 'Sous-gates non synchronisées.',
        diagnostics: {
          sourceReasonCode: 'G4_SUBGATES_UNSYNC'
        },
        correctiveActions: ['SYNC_G4_SUBGATES']
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'G4_SUBGATES_UNSYNC',
      reason: 'Sous-gates non synchronisées.',
      verdict: null,
      canMarkDone: false,
      diagnostics: {
        sourceReasonCode: 'G4_SUBGATES_UNSYNC'
      },
      correctiveActions: ['SYNC_G4_SUBGATES']
    });
  });

  it('forces FAIL when mismatchCount indicates desynchronization even if statuses are PASS', () => {
    const result = calculateGateVerdict({
      g4DualResult: g4DualResult({
        diagnostics: {
          ...g4DualResult().diagnostics,
          mismatchCount: 2
        }
      }),
      evidenceRefs: ['proof-1']
    });

    expect(result.reasonCode).not.toBe('OK');
    expect(result.verdict).toBe('FAIL');
    expect(result.canMarkDone).toBe(false);
  });

  it('keeps stable contract and index export compatibility', () => {
    const result = calculateGateVerdictFromIndex({
      g4DualResult: g4DualResult(),
      evidenceRefs: ['proof-1']
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('verdict');
    expect(result).toHaveProperty('canMarkDone');
    expect(result).toHaveProperty('contributingFactors');
    expect(result).toHaveProperty('correctiveActions');

    expect(typeof result.allowed).toBe('boolean');
    expect(REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(Array.isArray(result.contributingFactors)).toBe(true);
    expect(Array.isArray(result.correctiveActions)).toBe(true);

    expect(result.diagnostics).toHaveProperty('inputGatesCount');
    expect(result.diagnostics).toHaveProperty('evidenceCount');
    expect(result.diagnostics).toHaveProperty('g4tStatus');
    expect(result.diagnostics).toHaveProperty('g4uxStatus');
    expect(result.diagnostics).toHaveProperty('durationMs');
    expect(result.diagnostics).toHaveProperty('p95VerdictMs');
    expect(result.diagnostics).toHaveProperty('sourceReasonCode');
  });

  it('meets precision baseline on 9-case validation set', () => {
    const validationSet = [
      { g4t: 'PASS', g4ux: 'PASS', expected: 'PASS' },
      { g4t: 'PASS', g4ux: 'CONCERNS', expected: 'CONCERNS' },
      { g4t: 'PASS', g4ux: 'FAIL', expected: 'FAIL' },
      { g4t: 'CONCERNS', g4ux: 'PASS', expected: 'CONCERNS' },
      { g4t: 'CONCERNS', g4ux: 'CONCERNS', expected: 'CONCERNS' },
      { g4t: 'CONCERNS', g4ux: 'FAIL', expected: 'FAIL' },
      { g4t: 'FAIL', g4ux: 'PASS', expected: 'FAIL' },
      { g4t: 'FAIL', g4ux: 'CONCERNS', expected: 'FAIL' },
      { g4t: 'FAIL', g4ux: 'FAIL', expected: 'FAIL' }
    ];

    let correct = 0;

    for (const sample of validationSet) {
      const result = calculateGateVerdict({
        g4DualResult: g4DualResult({
          g4DualStatus: {
            ...g4DualResult().g4DualStatus,
            g4t: {
              ...g4DualResult().g4DualStatus.g4t,
              status: sample.g4t,
              reasonCode: sample.g4t === 'PASS' ? 'OK' : 'TRANSITION_NOT_ALLOWED',
              sourceReasonCode: sample.g4t === 'PASS' ? 'OK' : 'TRANSITION_NOT_ALLOWED'
            },
            g4ux: {
              ...g4DualResult().g4DualStatus.g4ux,
              status: sample.g4ux,
              reasonCode: sample.g4ux === 'PASS' ? 'OK' : 'TRANSITION_NOT_ALLOWED',
              sourceReasonCode: sample.g4ux === 'PASS' ? 'OK' : 'TRANSITION_NOT_ALLOWED'
            },
            dualVerdict: sample.expected
          },
          diagnostics: {
            ...g4DualResult().diagnostics,
            g4tStatus: sample.g4t,
            g4uxStatus: sample.g4ux,
            dualVerdict: sample.expected
          }
        }),
        evidenceRefs: ['proof-1']
      });

      if (result.verdict === sample.expected) {
        correct += 1;
      }
    }

    const precisionPercent = (correct / validationSet.length) * 100;
    expect(precisionPercent).toBeGreaterThanOrEqual(65);
    expect(precisionPercent).toBe(100);
  });

  it('meets performance threshold on synthetic stream of 500 verdict evaluations', () => {
    const durations = [];
    const p95Samples = [];

    for (let index = 0; index < 500; index += 1) {
      const startedAt = Date.now();

      const result = calculateGateVerdict({
        g4DualResult: g4DualResult({
          g4DualStatus: {
            ...g4DualResult().g4DualStatus,
            g4t: {
              ...g4DualResult().g4DualStatus.g4t,
              status: index % 13 === 0 ? 'CONCERNS' : 'PASS'
            },
            g4ux: {
              ...g4DualResult().g4DualStatus.g4ux,
              status: index % 17 === 0 ? 'FAIL' : 'PASS',
              reasonCode: index % 17 === 0 ? 'TRANSITION_NOT_ALLOWED' : 'OK',
              sourceReasonCode: index % 17 === 0 ? 'TRANSITION_NOT_ALLOWED' : 'OK'
            }
          },
          diagnostics: {
            ...g4DualResult().diagnostics,
            g4tStatus: index % 13 === 0 ? 'CONCERNS' : 'PASS',
            g4uxStatus: index % 17 === 0 ? 'FAIL' : 'PASS',
            dualVerdict: index % 17 === 0 ? 'FAIL' : index % 13 === 0 ? 'CONCERNS' : 'PASS'
          }
        }),
        evidenceRefs: ['proof-1', `proof-${index}`],
        additionalSignals:
          index % 29 === 0
            ? [
                {
                  signalId: 'SIGNAL-RISK',
                  severity: 'CONCERNS',
                  blocking: false,
                  reasonCode: 'TRANSITION_NOT_ALLOWED'
                }
              ]
            : []
      });

      durations.push(Date.now() - startedAt);
      p95Samples.push(result.diagnostics.p95VerdictMs);
      expect(result.diagnostics.durationMs).toBeLessThan(60_000);
    }

    durations.sort((left, right) => left - right);
    p95Samples.sort((left, right) => left - right);
    const p95Duration = durations[Math.ceil(durations.length * 0.95) - 1] ?? 0;
    const p95Internal = p95Samples[Math.ceil(p95Samples.length * 0.95) - 1] ?? 0;

    expect(p95Duration).toBeLessThanOrEqual(2000);
    expect(p95Internal).toBeLessThanOrEqual(2000);
  });
});
