import { describe, expect, it } from 'vitest';
import { bridgeUxEvidenceToG4 } from '../../src/g4-ux-evidence-bridge.js';
import { bridgeUxEvidenceToG4 as bridgeUxEvidenceToG4FromIndex } from '../../src/index.js';

function buildGateRows() {
  return [
    { gateId: 'G1', status: 'PASS', owner: 'analyst', updatedAt: '2026-02-24T10:00:00.000Z' },
    { gateId: 'G2', status: 'PASS', owner: 'pm', updatedAt: '2026-02-24T10:05:00.000Z' },
    { gateId: 'G3', status: 'PASS', owner: 'architect', updatedAt: '2026-02-24T10:10:00.000Z' },
    { gateId: 'G4', status: 'CONCERNS', owner: 'reviewer', updatedAt: '2026-02-24T10:15:00.000Z' },
    { gateId: 'G5', status: 'PASS', owner: 'jarvis', updatedAt: '2026-02-24T10:20:00.000Z' }
  ];
}

function buildNominalInput() {
  return {
    gates: buildGateRows(),
    g4: {
      correlationId: 'G4-CORR-001',
      tech: {
        status: 'PASS',
        owner: 'tea',
        updatedAt: '2026-02-24T10:15:30.000Z'
      },
      ux: {
        status: 'CONCERNS',
        owner: 'uxqa',
        updatedAt: '2026-02-24T10:16:00.000Z',
        evidenceRefs: ['evidence://ux/g4/snapshot-001']
      }
    },
    uxEvidenceIngestion: [
      {
        evidenceRef: 'evidence://ux/g4/snapshot-001',
        capturedAt: '2026-02-24T10:15:59.000Z',
        ingestedAt: '2026-02-24T10:16:00.200Z'
      },
      {
        evidenceRef: 'evidence://ux/g4/snapshot-002',
        capturedAt: '2026-02-24T10:16:01.000Z',
        ingestedAt: '2026-02-24T10:16:02.100Z'
      }
    ],
    latencySamplesMs: [350, 420, 560]
  };
}

describe('g4-ux-evidence-bridge unit', () => {
  it('bridges UX evidence into G4-UX with unified G1→G5 view (AC-01)', () => {
    const result = bridgeUxEvidenceToG4(buildNominalInput());

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        gateCount: 5,
        evidenceCount: 2,
        sourceReasonCode: 'OK'
      },
      gateView: {
        totals: {
          totalCount: 5,
          concernsCount: 1
        }
      },
      g4Correlation: {
        correlationId: 'G4-CORR-001',
        correlated: true
      }
    });

    expect(result.g4Correlation.uxEvidenceIngestion.withinSla).toBe(true);
  });

  it('fails closed when gate view misses a gate (AC-02/FR-011)', () => {
    const input = buildNominalInput();
    input.gates = input.gates.slice(0, 4);

    const result = bridgeUxEvidenceToG4(input);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('GATE_VIEW_INCOMPLETE');
    expect(result.correctiveActions).toContain('COMPLETE_GATE_VIEW_G1_TO_G5');
  });

  it('fails closed when G4-T/G4-UX correlation is missing (AC-02/FR-012)', () => {
    const input = buildNominalInput();
    input.g4.correlationId = '';

    const result = bridgeUxEvidenceToG4(input);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('G4_CORRELATION_MISSING');
    expect(result.correctiveActions).toContain('LINK_G4_TECH_AND_UX');
  });

  it('fails when UX evidence ingestion p95 exceeds 2s (AC-04/NFR-007)', () => {
    const input = buildNominalInput();
    input.uxEvidenceIngestion = [
      {
        evidenceRef: 'evidence://ux/g4/snapshot-001',
        capturedAt: '2026-02-24T10:15:59.000Z',
        ingestedAt: '2026-02-24T10:16:03.500Z'
      }
    ];

    const result = bridgeUxEvidenceToG4(input);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_EVIDENCE_INGESTION_TOO_SLOW');
    expect(result.correctiveActions).toContain('OPTIMIZE_UX_EVIDENCE_PIPELINE');
  });

  it('fails when gate view latency p95 exceeds 2.5s (AC-03/NFR-002)', () => {
    const input = buildNominalInput();
    input.latencySamplesMs = [2600, 2800, 3000];

    const result = bridgeUxEvidenceToG4(input);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('LATENCY_BUDGET_EXCEEDED');
    expect(result.correctiveActions).toContain('OPTIMIZE_GATE_VIEW_PIPELINE');
  });

  it('is exported from index', () => {
    const result = bridgeUxEvidenceToG4FromIndex(buildNominalInput());

    expect(result.reasonCode).toBe('OK');
  });
});
