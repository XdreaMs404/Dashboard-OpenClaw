import { describe, expect, it } from 'vitest';
import { buildGateCenterStatus } from '../../src/gate-center-status.js';
import {
  buildGateCenterStatus as buildGateCenterStatusFromIndex,
  recordPhaseGateGovernanceDecision
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
  'INVALID_GATE_CENTER_INPUT'
]);

function governanceDecisionResult(overrides = {}) {
  const baseDecisionHistory = [
    {
      decisionId: 'dec-g1',
      gateId: 'G1',
      owner: 'owner-g1',
      status: 'PASS',
      reasonCode: 'OK',
      sourceReasonCode: 'OK',
      updatedAt: '2026-02-23T21:00:00.000Z'
    },
    {
      decisionId: 'dec-g2',
      gateId: 'G2',
      owner: 'owner-g2',
      status: 'PASS',
      reasonCode: 'OK',
      sourceReasonCode: 'OK',
      updatedAt: '2026-02-23T21:00:01.000Z'
    },
    {
      decisionId: 'dec-g3',
      gateId: 'G3',
      owner: 'owner-g3',
      status: 'PASS',
      reasonCode: 'OK',
      sourceReasonCode: 'OK',
      updatedAt: '2026-02-23T21:00:02.000Z'
    },
    {
      decisionId: 'dec-g4',
      gateId: 'G4',
      owner: 'owner-g4',
      status: 'PASS',
      reasonCode: 'OK',
      sourceReasonCode: 'OK',
      updatedAt: '2026-02-23T21:00:03.000Z'
    },
    {
      decisionId: 'dec-g5',
      gateId: 'G5',
      owner: 'owner-g5',
      status: 'PASS',
      reasonCode: 'OK',
      sourceReasonCode: 'OK',
      updatedAt: '2026-02-23T21:00:04.000Z'
    },
    {
      decisionId: 'dec-g4-t',
      gateId: 'G4-T',
      parentGateId: 'G4',
      owner: 'owner-g4t',
      status: 'PASS',
      reasonCode: 'OK',
      sourceReasonCode: 'OK',
      updatedAt: '2026-02-23T21:00:05.000Z'
    },
    {
      decisionId: 'dec-g4-ux',
      gateId: 'G4-UX',
      parentGateId: 'G4',
      owner: 'owner-g4ux',
      status: 'PASS',
      reasonCode: 'OK',
      sourceReasonCode: 'OK',
      updatedAt: '2026-02-23T21:00:06.000Z'
    }
  ];

  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Décision de gouvernance disponible.',
    diagnostics: {
      sourceReasonCode: 'OK'
    },
    decisionHistory: baseDecisionHistory,
    decisionEntry: null,
    correctiveActions: [],
    ...overrides
  };
}

function governanceDecisionInput(overrides = {}) {
  return {
    gateId: 'G4-T',
    progressionAlert: {
      allowed: true,
      reasonCode: 'OK',
      reason: 'Progression canonique valide.',
      diagnostics: {
        fromPhase: 'H09',
        toPhase: 'H10',
        owner: 'owner-g4t',
        sourceReasonCode: 'OK'
      },
      correctiveActions: []
    },
    decisionHistory: [
      {
        decisionId: 'hist-g1',
        decisionType: 'phase-gate',
        phaseFrom: 'H08',
        phaseTo: 'H09',
        gateId: 'G1',
        owner: 'owner-g1',
        allowed: true,
        reasonCode: 'OK',
        reason: 'nominal',
        severity: 'info',
        decidedAt: '2026-02-23T20:55:00.000Z',
        sourceReasonCode: 'OK',
        correctiveActions: [],
        evidenceRefs: []
      }
    ],
    ...overrides
  };
}

describe('gate-center-status unit', () => {
  it('returns OK on nominal gate center with G1→G5 and dual G4 subgates', () => {
    const result = buildGateCenterStatus(
      {
        governanceDecisionResult: governanceDecisionResult(),
        staleAfterMs: 60_000
      },
      {
        nowMs: () => Date.parse('2026-02-23T21:00:06.500Z')
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        gatesCount: 5,
        subGatesCount: 2,
        staleCount: 0,
        sourceReasonCode: 'OK'
      },
      correctiveActions: []
    });

    expect(result.reason).toContain('Gate Center prêt');
    expect(result.gateCenter.map((entry) => entry.gateId)).toEqual(['G1', 'G2', 'G3', 'G4', 'G5']);
    expect(result.subGates.map((entry) => entry.gateId)).toEqual(['G4-T', 'G4-UX']);

    expect(result.gateCenter[3]).toMatchObject({
      gateId: 'G4',
      status: 'PASS',
      owner: 'owner-g4',
      linkedSubGates: ['G4-T', 'G4-UX']
    });

    expect(result.subGates[0]).toMatchObject({
      gateId: 'G4-T',
      parentGateId: 'G4',
      status: 'PASS',
      owner: 'owner-g4t'
    });
    expect(result.subGates[1]).toMatchObject({
      gateId: 'G4-UX',
      parentGateId: 'G4',
      status: 'PASS',
      owner: 'owner-g4ux'
    });

    expect(result.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.diagnostics.p95BuildMs).toBeGreaterThanOrEqual(0);
  });

  it('prefers governanceDecisionResult over governanceDecisionInput', () => {
    const result = buildGateCenterStatus({
      governanceDecisionResult: governanceDecisionResult(),
      governanceDecisionInput: governanceDecisionInput({
        progressionAlert: {
          allowed: false,
          reasonCode: 'PHASE_NOTIFICATION_MISSING',
          reason: 'should not be used',
          diagnostics: {
            fromPhase: 'H09',
            toPhase: 'H10',
            owner: 'ops',
            sourceReasonCode: 'PHASE_NOTIFICATION_MISSING'
          },
          correctiveActions: ['PUBLISH_PHASE_NOTIFICATION']
        }
      })
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.gateCenter[0].gateId).toBe('G1');
  });

  it('delegates to S012 when governanceDecisionResult is absent', () => {
    const delegatedResult = recordPhaseGateGovernanceDecision(governanceDecisionInput());

    const result = buildGateCenterStatus({
      governanceDecisionInput: governanceDecisionInput(),
      gateSnapshots: [
        {
          gateId: 'G2',
          owner: 'owner-g2',
          status: 'PASS',
          reasonCode: 'OK',
          updatedAt: '2026-02-23T21:00:01.000Z'
        },
        {
          gateId: 'G3',
          owner: 'owner-g3',
          status: 'PASS',
          reasonCode: 'OK',
          updatedAt: '2026-02-23T21:00:02.000Z'
        },
        {
          gateId: 'G4',
          owner: 'owner-g4',
          status: 'PASS',
          reasonCode: 'OK',
          updatedAt: '2026-02-23T21:00:03.000Z'
        },
        {
          gateId: 'G5',
          owner: 'owner-g5',
          status: 'PASS',
          reasonCode: 'OK',
          updatedAt: '2026-02-23T21:00:04.000Z'
        },
        {
          gateId: 'G4-UX',
          owner: 'owner-g4ux',
          status: 'PASS',
          reasonCode: 'OK',
          updatedAt: '2026-02-23T21:00:05.000Z'
        }
      ]
    });

    expect(delegatedResult.reasonCode).toBe('OK');
    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        gatesCount: 5,
        subGatesCount: 2,
        sourceReasonCode: 'OK'
      }
    });

    const g4t = result.subGates.find((entry) => entry.gateId === 'G4-T');
    expect(g4t).toMatchObject({
      status: 'PASS',
      owner: 'owner-g4t'
    });
  });

  it('propagates strict upstream blocking reason codes from S012', () => {
    const result = buildGateCenterStatus({
      governanceDecisionResult: {
        allowed: false,
        reasonCode: 'PHASE_NOTIFICATION_MISSING',
        reason: 'Notification manquante.',
        diagnostics: {
          sourceReasonCode: 'PHASE_NOTIFICATION_MISSING'
        },
        correctiveActions: ['PUBLISH_PHASE_NOTIFICATION']
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_NOTIFICATION_MISSING',
      reason: 'Notification manquante.',
      diagnostics: {
        gatesCount: 0,
        subGatesCount: 0,
        sourceReasonCode: 'PHASE_NOTIFICATION_MISSING'
      },
      gateCenter: [],
      subGates: [],
      correctiveActions: ['PUBLISH_PHASE_NOTIFICATION']
    });
  });

  it('returns GATE_STATUS_INCOMPLETE when owner/status/updatedAt fields are missing', () => {
    const result = buildGateCenterStatus({
      governanceDecisionResult: governanceDecisionResult({
        decisionHistory: [
          {
            gateId: 'G1',
            owner: 'owner-g1',
            status: 'PASS',
            updatedAt: '2026-02-23T21:00:00.000Z',
            reasonCode: 'OK'
          },
          {
            gateId: 'G2',
            owner: 'owner-g2',
            status: 'PASS',
            updatedAt: '2026-02-23T21:00:01.000Z',
            reasonCode: 'OK'
          },
          {
            gateId: 'G3',
            owner: 'owner-g3',
            status: 'PASS',
            updatedAt: '2026-02-23T21:00:02.000Z',
            reasonCode: 'OK'
          },
          {
            gateId: 'G4',
            owner: null,
            status: 'PASS',
            updatedAt: '2026-02-23T21:00:03.000Z',
            reasonCode: 'OK'
          },
          {
            gateId: 'G5',
            owner: 'owner-g5',
            status: 'PASS',
            updatedAt: '2026-02-23T21:00:04.000Z',
            reasonCode: 'OK'
          },
          {
            gateId: 'G4-T',
            owner: 'owner-g4t',
            status: null,
            updatedAt: '2026-02-23T21:00:05.000Z'
          },
          {
            gateId: 'G4-UX',
            owner: 'owner-g4ux',
            status: 'PASS',
            updatedAt: null,
            reasonCode: 'OK'
          }
        ]
      })
    });

    expect(result.reasonCode).toBe('GATE_STATUS_INCOMPLETE');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('G4.owner');
    expect(result.reason).toContain('G4-T.status');
    expect(result.reason).toContain('G4-UX.updatedAt');
    expect(result.correctiveActions).toContain('COMPLETE_GATE_STATUS_FIELDS');
    expect(result.correctiveActions).toContain('BLOCK_DONE_TRANSITION');
  });

  it('returns G4_SUBGATE_MISMATCH when G4 status is not aligned with subgates', () => {
    const result = buildGateCenterStatus({
      governanceDecisionResult: governanceDecisionResult({
        decisionHistory: [
          {
            gateId: 'G1',
            owner: 'owner-g1',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:00.000Z'
          },
          {
            gateId: 'G2',
            owner: 'owner-g2',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:01.000Z'
          },
          {
            gateId: 'G3',
            owner: 'owner-g3',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:02.000Z'
          },
          {
            gateId: 'G4',
            owner: 'owner-g4',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:03.000Z'
          },
          {
            gateId: 'G5',
            owner: 'owner-g5',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:04.000Z'
          },
          {
            gateId: 'G4-T',
            owner: 'owner-g4t',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:05.000Z'
          },
          {
            gateId: 'G4-UX',
            owner: 'owner-g4ux',
            status: 'FAIL',
            reasonCode: 'TRANSITION_NOT_ALLOWED',
            updatedAt: '2026-02-23T21:00:06.000Z'
          }
        ]
      })
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'G4_SUBGATE_MISMATCH',
      correctiveActions: ['ALIGN_G4_SUBGATES', 'BLOCK_DONE_TRANSITION']
    });
    expect(result.reason).toContain('Incohérence G4');
  });

  it('adds BLOCK_DONE_TRANSITION when subgates are not PASS even on allowed result', () => {
    const result = buildGateCenterStatus({
      governanceDecisionResult: governanceDecisionResult({
        decisionHistory: [
          {
            gateId: 'G1',
            owner: 'owner-g1',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:00.000Z'
          },
          {
            gateId: 'G2',
            owner: 'owner-g2',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:01.000Z'
          },
          {
            gateId: 'G3',
            owner: 'owner-g3',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:02.000Z'
          },
          {
            gateId: 'G4',
            owner: 'owner-g4',
            status: 'CONCERNS',
            reasonCode: 'TRANSITION_NOT_ALLOWED',
            updatedAt: '2026-02-23T21:00:03.000Z'
          },
          {
            gateId: 'G5',
            owner: 'owner-g5',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:04.000Z'
          },
          {
            gateId: 'G4-T',
            owner: 'owner-g4t',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:05.000Z'
          },
          {
            gateId: 'G4-UX',
            owner: 'owner-g4ux',
            status: 'CONCERNS',
            reasonCode: 'TRANSITION_NOT_ALLOWED',
            updatedAt: '2026-02-23T21:00:06.000Z'
          }
        ]
      })
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK'
    });
    expect(result.correctiveActions).toContain('BLOCK_DONE_TRANSITION');
  });

  it('keeps freshest snapshot per gate and computes stale count from staleAfterMs', () => {
    const result = buildGateCenterStatus(
      {
        governanceDecisionResult: governanceDecisionResult({
          decisionHistory: [
            {
              gateId: 'G1',
              owner: 'owner-old',
              status: 'FAIL',
              reasonCode: 'TRANSITION_NOT_ALLOWED',
              updatedAt: '2026-02-23T20:00:00.000Z'
            },
            {
              gateId: 'G1',
              owner: 'owner-new',
              status: 'PASS',
              reasonCode: 'OK',
              updatedAt: '2026-02-23T21:00:00.000Z'
            },
            ...governanceDecisionResult().decisionHistory.filter((entry) => entry.gateId !== 'G1')
          ]
        }),
        staleAfterMs: 1
      },
      {
        nowMs: () => Date.parse('2026-02-23T21:10:00.000Z')
      }
    );

    expect(result.reasonCode).toBe('OK');
    expect(result.gateCenter.find((entry) => entry.gateId === 'G1')).toMatchObject({
      owner: 'owner-new',
      status: 'PASS'
    });
    expect(result.diagnostics.staleCount).toBe(7);
  });

  it('keeps stable output contract and index export', () => {
    const result = buildGateCenterStatusFromIndex({
      governanceDecisionResult: governanceDecisionResult()
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('gateCenter');
    expect(result).toHaveProperty('subGates');
    expect(result).toHaveProperty('correctiveActions');

    expect(typeof result.allowed).toBe('boolean');
    expect(REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(Array.isArray(result.gateCenter)).toBe(true);
    expect(Array.isArray(result.subGates)).toBe(true);
    expect(Array.isArray(result.correctiveActions)).toBe(true);

    expect(result.diagnostics).toHaveProperty('gatesCount');
    expect(result.diagnostics).toHaveProperty('subGatesCount');
    expect(result.diagnostics).toHaveProperty('staleCount');
    expect(result.diagnostics).toHaveProperty('durationMs');
    expect(result.diagnostics).toHaveProperty('p95BuildMs');
    expect(result.diagnostics).toHaveProperty('sourceReasonCode');
  });

  it('normalizes Date/invalid timestamps from gateSnapshots and guards non-finite clocks', () => {
    const result = buildGateCenterStatus(
      {
        governanceDecisionResult: governanceDecisionResult(),
        gateSnapshots: [
          {
            gateId: 'G1',
            owner: 'owner-g1-date',
            status: 'PASS',
            updatedAt: new Date('2026-02-23T21:00:07.000Z')
          },
          {
            gateId: 'G2',
            owner: 'owner-g2-invalid-date',
            status: 'PASS',
            updatedAt: new Date('invalid-date')
          },
          {
            gateId: 'G3',
            owner: 'owner-g3-invalid-string',
            status: 'PASS',
            updatedAt: 'not-a-date'
          }
        ]
      },
      {
        nowMs: () => Number.NaN
      }
    );

    expect(result.reasonCode).toBe('OK');
    expect(result.gateCenter.find((entry) => entry.gateId === 'G1')).toMatchObject({
      owner: 'owner-g1-date'
    });
    expect(result.gateCenter.find((entry) => entry.gateId === 'G2')).toMatchObject({
      owner: 'owner-g2'
    });
    expect(result.gateCenter.find((entry) => entry.gateId === 'G3')).toMatchObject({
      owner: 'owner-g3'
    });
    expect(result.diagnostics.durationMs).toBe(0);
    expect(result.diagnostics.p95BuildMs).toBe(0);
  });

  it('consumes decisionEntry when decisionHistory is omitted', () => {
    const result = buildGateCenterStatus({
      governanceDecisionResult: governanceDecisionResult({
        decisionHistory: undefined,
        decisionEntry: {
          gateId: 'G1',
          owner: 'owner-from-entry',
          status: 'PASS',
          reasonCode: 'OK',
          updatedAt: '2026-02-23T21:00:00.000Z'
        }
      })
    });

    expect(result.reasonCode).toBe('GATE_STATUS_INCOMPLETE');
    expect(result.gateCenter.find((entry) => entry.gateId === 'G1')).toMatchObject({
      owner: 'owner-from-entry',
      status: 'PASS'
    });
  });

  it('covers merge precedence for older and timestamp-missing snapshots', () => {
    const carryOver = governanceDecisionResult().decisionHistory.filter(
      (entry) => !['G1', 'G2', 'G3'].includes(entry.gateId)
    );

    const result = buildGateCenterStatus({
      governanceDecisionResult: governanceDecisionResult({
        decisionHistory: [
          {
            gateId: 'G1',
            owner: 'owner-g1-old',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T20:00:00.000Z'
          },
          {
            gateId: 'G1',
            owner: 'owner-g1-new',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:00.000Z'
          },
          {
            gateId: 'G1',
            owner: 'owner-g1-older',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T19:00:00.000Z'
          },
          {
            gateId: 'G2',
            owner: 'owner-g2-no-ts-start',
            status: 'PASS',
            reasonCode: 'OK'
          },
          {
            gateId: 'G2',
            owner: 'owner-g2-with-ts',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:01.000Z'
          },
          {
            gateId: 'G2',
            owner: 'owner-g2-no-ts-late',
            status: 'PASS',
            reasonCode: 'OK'
          },
          {
            gateId: 'G3',
            owner: 'owner-g3-no-ts-a',
            status: 'PASS',
            reasonCode: 'OK'
          },
          {
            gateId: 'G3',
            owner: 'owner-g3-no-ts-b',
            status: 'PASS',
            reasonCode: 'OK'
          },
          {
            gateId: 'G3',
            owner: 'owner-g3-with-ts-final',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:02.000Z'
          },
          ...carryOver
        ]
      })
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.gateCenter.find((entry) => entry.gateId === 'G1')).toMatchObject({
      owner: 'owner-g1-new'
    });
    expect(result.gateCenter.find((entry) => entry.gateId === 'G2')).toMatchObject({
      owner: 'owner-g2-with-ts'
    });
    expect(result.gateCenter.find((entry) => entry.gateId === 'G3')).toMatchObject({
      owner: 'owner-g3-with-ts-final'
    });
  });

  it('falls back to OK reason codes when PASS snapshots omit them', () => {
    const decisionHistory = governanceDecisionResult().decisionHistory.map((entry) => {
      if (entry.gateId !== 'G1') {
        return entry;
      }

      return {
        ...entry,
        reasonCode: undefined,
        sourceReasonCode: undefined
      };
    });

    const result = buildGateCenterStatus({
      governanceDecisionResult: governanceDecisionResult({
        decisionHistory
      })
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.gateCenter.find((entry) => entry.gateId === 'G1')).toMatchObject({
      reasonCode: 'OK',
      sourceReasonCode: 'OK'
    });
  });

  it('reports invalid reasonCode as vide when governanceDecisionResult.reasonCode is blank', () => {
    const result = buildGateCenterStatus({
      governanceDecisionResult: {
        allowed: true,
        reasonCode: '   ',
        diagnostics: {
          sourceReasonCode: 'OK'
        }
      }
    });

    expect(result.reasonCode).toBe('INVALID_GATE_CENTER_INPUT');
    expect(result.reason).toContain('vide');
  });

  it('keeps BLOCK_DONE_TRANSITION unique when already provided for G4 mismatch', () => {
    const result = buildGateCenterStatus({
      governanceDecisionResult: governanceDecisionResult({
        decisionHistory: [
          {
            gateId: 'G1',
            owner: 'owner-g1',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:00.000Z'
          },
          {
            gateId: 'G2',
            owner: 'owner-g2',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:01.000Z'
          },
          {
            gateId: 'G3',
            owner: 'owner-g3',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:02.000Z'
          },
          {
            gateId: 'G4',
            owner: 'owner-g4',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:03.000Z'
          },
          {
            gateId: 'G5',
            owner: 'owner-g5',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:04.000Z'
          },
          {
            gateId: 'G4-T',
            owner: 'owner-g4t',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:05.000Z'
          },
          {
            gateId: 'G4-UX',
            owner: 'owner-g4ux',
            status: 'FAIL',
            reasonCode: 'TRANSITION_NOT_ALLOWED',
            updatedAt: '2026-02-23T21:00:06.000Z'
          }
        ]
      }),
      correctiveActions: ['ALIGN_G4_SUBGATES', 'BLOCK_DONE_TRANSITION']
    });

    expect(result.reasonCode).toBe('G4_SUBGATE_MISMATCH');
    expect(result.correctiveActions.filter((action) => action === 'BLOCK_DONE_TRANSITION')).toHaveLength(1);
  });

  it('meets performance thresholds on synthetic stream of 500 snapshots', () => {
    const gateIds = ['G1', 'G2', 'G3', 'G4', 'G5', 'G4-T', 'G4-UX'];

    const decisionHistory = Array.from({ length: 500 }, (_, index) => {
      const gateId = gateIds[index % gateIds.length];
      return {
        decisionId: `dec-${index}`,
        gateId,
        parentGateId: gateId.startsWith('G4-') ? 'G4' : null,
        owner: `owner-${gateId.toLowerCase()}`,
        status: gateId === 'G4' || gateId.startsWith('G4-') ? 'PASS' : index % 5 === 0 ? 'CONCERNS' : 'PASS',
        reasonCode:
          gateId === 'G4' || gateId.startsWith('G4-')
            ? 'OK'
            : index % 5 === 0
              ? 'TRANSITION_NOT_ALLOWED'
              : 'OK',
        sourceReasonCode: index % 5 === 0 ? 'TRANSITION_NOT_ALLOWED' : 'OK',
        updatedAt: new Date(Date.parse('2026-02-23T20:00:00.000Z') + index * 250).toISOString()
      };
    });

    const result = buildGateCenterStatus({
      governanceDecisionResult: governanceDecisionResult({
        decisionHistory
      })
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        gatesCount: 5,
        subGatesCount: 2,
        sourceReasonCode: 'OK'
      }
    });

    expect(result.diagnostics.p95BuildMs).toBeLessThanOrEqual(2500);
    expect(result.diagnostics.durationMs).toBeLessThanOrEqual(2000);
  });
});
