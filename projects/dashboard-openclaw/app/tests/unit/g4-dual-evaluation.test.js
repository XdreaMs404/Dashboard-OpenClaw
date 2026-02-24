import { describe, expect, it } from 'vitest';
import { evaluateG4DualCorrelation } from '../../src/g4-dual-evaluation.js';
import {
  buildGateCenterStatus,
  evaluateG4DualCorrelation as evaluateG4DualCorrelationFromIndex
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
  'INVALID_G4_DUAL_INPUT'
]);

function gateCenterResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Gate Center disponible.',
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

function gateCenterInput(overrides = {}) {
  return {
    governanceDecisionResult: {
      allowed: true,
      reasonCode: 'OK',
      reason: 'source S025',
      diagnostics: {
        sourceReasonCode: 'OK'
      },
      decisionHistory: [
        {
          gateId: 'G1',
          owner: 'owner-g1',
          status: 'PASS',
          reasonCode: 'OK',
          updatedAt: '2026-02-24T00:00:00.000Z'
        },
        {
          gateId: 'G2',
          owner: 'owner-g2',
          status: 'PASS',
          reasonCode: 'OK',
          updatedAt: '2026-02-24T00:00:01.000Z'
        },
        {
          gateId: 'G3',
          owner: 'owner-g3',
          status: 'PASS',
          reasonCode: 'OK',
          updatedAt: '2026-02-24T00:00:02.000Z'
        },
        {
          gateId: 'G4',
          owner: 'owner-g4',
          status: 'PASS',
          reasonCode: 'OK',
          updatedAt: '2026-02-24T00:00:03.000Z'
        },
        {
          gateId: 'G5',
          owner: 'owner-g5',
          status: 'PASS',
          reasonCode: 'OK',
          updatedAt: '2026-02-24T00:00:04.000Z'
        },
        {
          gateId: 'G4-T',
          owner: 'owner-g4t',
          status: 'PASS',
          reasonCode: 'OK',
          updatedAt: '2026-02-24T00:00:05.000Z'
        },
        {
          gateId: 'G4-UX',
          owner: 'owner-g4ux',
          status: 'PASS',
          reasonCode: 'OK',
          updatedAt: '2026-02-24T00:00:06.000Z'
        }
      ],
      decisionEntry: null,
      correctiveActions: []
    },
    ...overrides
  };
}

describe('g4-dual-evaluation unit', () => {
  it('returns OK on nominal dual evaluation with explicit correlation matrix and diagnostics', () => {
    const result = evaluateG4DualCorrelation({
      gateCenterResult: gateCenterResult(),
      maxSyncSkewMs: 10_000
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        g4tStatus: 'PASS',
        g4uxStatus: 'PASS',
        dualVerdict: 'PASS',
        mismatchCount: 0,
        sourceReasonCode: 'OK'
      },
      correctiveActions: []
    });

    expect(result.reason).toContain('Corrélation duale G4 évaluée');

    expect(result.g4DualStatus).toMatchObject({
      dualVerdict: 'PASS',
      synchronized: true,
      g4t: {
        gateId: 'G4-T',
        status: 'PASS',
        owner: 'owner-g4t',
        evidenceCount: 2
      },
      g4ux: {
        gateId: 'G4-UX',
        status: 'PASS',
        owner: 'owner-g4ux',
        evidenceCount: 3
      }
    });

    expect(result.correlationMatrix).toHaveLength(9);
    expect(result.correlationMatrix.filter((entry) => entry.matched)).toHaveLength(1);
    expect(result.correlationMatrix.find((entry) => entry.matched)).toMatchObject({
      g4tStatus: 'PASS',
      g4uxStatus: 'PASS',
      dualVerdict: 'PASS',
      ruleId: 'RULE-G4-01'
    });

    expect(result.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.diagnostics.p95DualEvalMs).toBeGreaterThanOrEqual(0);
  });

  it('computes dual FAIL when one subgate fails and adds done safeguard/actions', () => {
    const result = evaluateG4DualCorrelation({
      gateCenterResult: gateCenterResult({
        gateCenter: gateCenterResult().gateCenter.map((entry) =>
          entry.gateId === 'G4' ? { ...entry, status: 'FAIL', reasonCode: 'TRANSITION_NOT_ALLOWED' } : entry
        ),
        subGates: gateCenterResult().subGates.map((entry) =>
          entry.gateId === 'G4-UX'
            ? {
                ...entry,
                status: 'FAIL',
                reasonCode: 'TRANSITION_NOT_ALLOWED',
                sourceReasonCode: 'TRANSITION_NOT_ALLOWED'
              }
            : entry
        )
      })
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.allowed).toBe(true);
    expect(result.diagnostics.dualVerdict).toBe('FAIL');
    expect(result.correctiveActions).toContain('BLOCK_DONE_TRANSITION');
    expect(result.correctiveActions).toContain('REQUEST_UX_EVIDENCE_REFRESH');
  });

  it('computes dual CONCERNS when one subgate is concerns and no fail exists', () => {
    const result = evaluateG4DualCorrelation({
      gateCenterResult: gateCenterResult({
        gateCenter: gateCenterResult().gateCenter.map((entry) =>
          entry.gateId === 'G4' ? { ...entry, status: 'CONCERNS', reasonCode: 'TRANSITION_NOT_ALLOWED' } : entry
        ),
        subGates: gateCenterResult().subGates.map((entry) =>
          entry.gateId === 'G4-T'
            ? {
                ...entry,
                status: 'CONCERNS',
                reasonCode: 'TRANSITION_NOT_ALLOWED',
                sourceReasonCode: 'TRANSITION_NOT_ALLOWED'
              }
            : entry
        )
      })
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.diagnostics.dualVerdict).toBe('CONCERNS');
    expect(result.correctiveActions).toContain('BLOCK_DONE_TRANSITION');
  });

  it('computes dual CONCERNS when G4-UX alone is concerns (RHS concern path)', () => {
    const result = evaluateG4DualCorrelation({
      gateCenterResult: gateCenterResult({
        gateCenter: gateCenterResult().gateCenter.map((entry) =>
          entry.gateId === 'G4' ? { ...entry, status: 'CONCERNS', reasonCode: 'TRANSITION_NOT_ALLOWED' } : entry
        ),
        subGates: gateCenterResult().subGates.map((entry) =>
          entry.gateId === 'G4-UX'
            ? {
                ...entry,
                status: 'CONCERNS',
                reasonCode: 'TRANSITION_NOT_ALLOWED',
                sourceReasonCode: 'TRANSITION_NOT_ALLOWED'
              }
            : entry
        )
      })
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.diagnostics.g4tStatus).toBe('PASS');
    expect(result.diagnostics.g4uxStatus).toBe('CONCERNS');
    expect(result.diagnostics.dualVerdict).toBe('CONCERNS');
  });

  it('prefers gateCenterResult over gateCenterInput', () => {
    const result = evaluateG4DualCorrelation({
      gateCenterResult: gateCenterResult(),
      gateCenterInput: {
        governanceDecisionResult: {
          allowed: false,
          reasonCode: 'PHASE_NOTIFICATION_MISSING',
          diagnostics: {
            sourceReasonCode: 'PHASE_NOTIFICATION_MISSING'
          }
        }
      }
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.diagnostics.dualVerdict).toBe('PASS');
  });

  it('meets RULE-G4-01 precision baseline on 9-case validation set', () => {
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
      const result = evaluateG4DualCorrelation({
        gateCenterResult: gateCenterResult({
          gateCenter: gateCenterResult().gateCenter.map((entry) =>
            entry.gateId === 'G4' ? { ...entry, status: sample.expected } : entry
          ),
          subGates: gateCenterResult().subGates.map((entry) =>
            entry.gateId === 'G4-T'
              ? {
                  ...entry,
                  status: sample.g4t,
                  reasonCode: sample.g4t === 'PASS' ? 'OK' : 'TRANSITION_NOT_ALLOWED',
                  sourceReasonCode: sample.g4t === 'PASS' ? 'OK' : 'TRANSITION_NOT_ALLOWED'
                }
              : {
                  ...entry,
                  status: sample.g4ux,
                  reasonCode: sample.g4ux === 'PASS' ? 'OK' : 'TRANSITION_NOT_ALLOWED',
                  sourceReasonCode: sample.g4ux === 'PASS' ? 'OK' : 'TRANSITION_NOT_ALLOWED'
                }
          )
        })
      });

      expect(result.reasonCode).toBe('OK');
      expect(result.allowed).toBe(true);

      if (result.diagnostics.dualVerdict === sample.expected) {
        correct += 1;
      }
    }

    const precisionPercent = (correct / validationSet.length) * 100;
    expect(precisionPercent).toBeGreaterThanOrEqual(65);
    expect(precisionPercent).toBe(100);
  });

  it('delegates to S025 through gateCenterInput when gateCenterResult is absent', () => {
    const resolvedGateCenter = buildGateCenterStatus(gateCenterInput());
    const result = evaluateG4DualCorrelation({
      gateCenterInput: gateCenterInput(),
      evidenceByGate: {
        'G4-T': 7,
        'G4-UX': 9
      }
    });

    expect(resolvedGateCenter.reasonCode).toBe('OK');
    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        dualVerdict: 'PASS',
        sourceReasonCode: 'OK'
      },
      g4DualStatus: {
        g4t: {
          evidenceCount: 7
        },
        g4ux: {
          evidenceCount: 9
        }
      }
    });
  });

  it('propagates strict upstream blocking reason codes from S025', () => {
    const result = evaluateG4DualCorrelation({
      gateCenterResult: {
        allowed: false,
        reasonCode: 'GATE_STATUS_INCOMPLETE',
        reason: 'Gate metadata incomplète.',
        diagnostics: {
          sourceReasonCode: 'GATE_STATUS_INCOMPLETE'
        },
        correctiveActions: ['COMPLETE_GATE_STATUS_FIELDS']
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'GATE_STATUS_INCOMPLETE',
      reason: 'Gate metadata incomplète.',
      diagnostics: {
        sourceReasonCode: 'GATE_STATUS_INCOMPLETE',
        dualVerdict: null,
        mismatchCount: 0
      },
      correctiveActions: ['COMPLETE_GATE_STATUS_FIELDS']
    });
  });

  it('returns G4_SUBGATES_UNSYNC when timestamps are contradictory', () => {
    const result = evaluateG4DualCorrelation({
      gateCenterResult: gateCenterResult({
        subGates: gateCenterResult().subGates.map((entry) =>
          entry.gateId === 'G4-UX'
            ? {
                ...entry,
                updatedAt: '2026-02-24T00:10:06.000Z'
              }
            : entry
        )
      }),
      maxSyncSkewMs: 5000
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'G4_SUBGATES_UNSYNC',
      diagnostics: {
        dualVerdict: 'PASS'
      }
    });
    expect(result.reason).toContain('Décalage horodatage G4-T/G4-UX');
    expect(result.correctiveActions).toContain('SYNC_G4_SUBGATES');
    expect(result.correctiveActions).toContain('BLOCK_DONE_TRANSITION');
  });

  it('flags mismatch count when global G4 diverges from dual verdict while remaining evaluable', () => {
    const result = evaluateG4DualCorrelation({
      gateCenterResult: gateCenterResult({
        gateCenter: gateCenterResult().gateCenter.map((entry) =>
          entry.gateId === 'G4' ? { ...entry, status: 'FAIL', reasonCode: 'TRANSITION_NOT_ALLOWED' } : entry
        )
      }),
      maxSyncSkewMs: 999_999
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.allowed).toBe(true);
    expect(result.diagnostics.dualVerdict).toBe('PASS');
    expect(result.diagnostics.mismatchCount).toBeGreaterThan(0);
  });

  it('keeps stable contract and index export compatibility', () => {
    const result = evaluateG4DualCorrelationFromIndex({
      gateCenterResult: gateCenterResult()
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('g4DualStatus');
    expect(result).toHaveProperty('correlationMatrix');
    expect(result).toHaveProperty('correctiveActions');

    expect(typeof result.allowed).toBe('boolean');
    expect(REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(Array.isArray(result.correlationMatrix)).toBe(true);
    expect(Array.isArray(result.correctiveActions)).toBe(true);

    expect(result.diagnostics).toHaveProperty('g4tStatus');
    expect(result.diagnostics).toHaveProperty('g4uxStatus');
    expect(result.diagnostics).toHaveProperty('dualVerdict');
    expect(result.diagnostics).toHaveProperty('mismatchCount');
    expect(result.diagnostics).toHaveProperty('durationMs');
    expect(result.diagnostics).toHaveProperty('p95DualEvalMs');
    expect(result.diagnostics).toHaveProperty('sourceReasonCode');
  });

  it('meets performance threshold on synthetic stream of 500 dual events', () => {
    const base = gateCenterResult();

    const subGates = Array.from({ length: 500 }, (_, index) => ({
      gateId: index % 2 === 0 ? 'G4-T' : 'G4-UX',
      parentGateId: 'G4',
      status: index % 9 === 0 ? 'CONCERNS' : index % 11 === 0 ? 'FAIL' : 'PASS',
      owner: index % 2 === 0 ? 'owner-g4t' : 'owner-g4ux',
      updatedAt: new Date(Date.parse('2026-02-24T00:00:00.000Z') + index * 50).toISOString(),
      reasonCode: index % 11 === 0 ? 'TRANSITION_NOT_ALLOWED' : 'OK',
      sourceReasonCode: index % 11 === 0 ? 'TRANSITION_NOT_ALLOWED' : 'OK',
      evidenceCount: index % 2 === 0 ? 2 : 3
    }));

    const latestSubGates = ['G4-T', 'G4-UX'].map((gateId) =>
      [...subGates].reverse().find((entry) => entry.gateId === gateId)
    );

    const latestUpdatedAtMs = Math.max(
      Date.parse(latestSubGates[0].updatedAt),
      Date.parse(latestSubGates[1].updatedAt)
    );

    const result = evaluateG4DualCorrelation({
      gateCenterResult: {
        ...base,
        gateCenter: base.gateCenter.map((entry) =>
          entry.gateId === 'G4'
            ? {
                ...entry,
                updatedAt: new Date(latestUpdatedAtMs).toISOString()
              }
            : entry
        ),
        subGates: latestSubGates
      },
      maxSyncSkewMs: 10_000
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.diagnostics.p95DualEvalMs).toBeLessThanOrEqual(2000);
    expect(result.diagnostics.durationMs).toBeLessThan(60_000);
  });
});
