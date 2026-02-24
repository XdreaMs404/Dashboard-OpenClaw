import { describe, expect, it } from 'vitest';
import { buildGateReportExport } from '../../src/gate-report-export.js';
import { buildGateReportExport as buildGateReportExportFromIndex } from '../../src/index.js';

function buildNominalGates() {
  return [
    {
      gateId: 'G1',
      status: 'PASS',
      owner: 'analyst',
      updatedAt: '2026-02-24T10:00:00.000Z'
    },
    {
      gateId: 'G2',
      status: 'PASS',
      owner: 'pm',
      updatedAt: '2026-02-24T10:05:00.000Z'
    },
    {
      gateId: 'G3',
      status: 'PASS',
      owner: 'architect',
      updatedAt: '2026-02-24T10:10:00.000Z'
    },
    {
      gateId: 'G4',
      status: 'CONCERNS',
      owner: 'reviewer',
      updatedAt: '2026-02-24T10:15:00.000Z'
    },
    {
      gateId: 'G5',
      status: 'PASS',
      owner: 'jarvis',
      updatedAt: '2026-02-24T10:20:00.000Z'
    }
  ];
}

describe('gate-report-export unit', () => {
  it('exports gate report with verdict, evidence and open actions (AC-01)', () => {
    const result = buildGateReportExport({
      verdict: 'CONCERNS',
      exportRequest: true,
      format: 'json',
      gates: buildNominalGates(),
      evidenceRefs: ['evidence://g4/review-001', 'evidence://tea/run-story-gates'],
      openActions: [
        {
          id: 'ACT-001',
          title: 'Corriger la dette UX critique',
          status: 'OPEN'
        }
      ],
      latencySamplesMs: [380, 520, 600]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        verdict: 'CONCERNS',
        gateCount: 5,
        evidenceRefCount: 2,
        openActionsCount: 1,
        sourceReasonCode: 'OK'
      },
      gateView: {
        totals: {
          passCount: 4,
          concernsCount: 1,
          failCount: 0,
          totalCount: 5
        }
      },
      reportExport: {
        requested: true,
        canExport: true,
        blockers: [],
        format: 'JSON'
      }
    });

    expect(result.report.gateView).toHaveLength(5);
    expect(result.report.openActions).toHaveLength(1);
  });

  it('blocks incomplete G1→G5 view without bypass (AC-02)', () => {
    const result = buildGateReportExport({
      verdict: 'PASS',
      exportRequest: true,
      gates: buildNominalGates().slice(0, 4),
      evidenceRefs: ['evidence://g4/review-001'],
      openActions: []
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('GATE_VIEW_INCOMPLETE');
    expect(result.correctiveActions).toContain('COMPLETE_GATE_VIEW_G1_TO_G5');
  });

  it('fails closed when evidence chain is missing (AC-03)', () => {
    const result = buildGateReportExport({
      verdict: 'PASS',
      exportRequest: true,
      gates: buildNominalGates(),
      evidenceRefs: [],
      openActions: []
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('EVIDENCE_CHAIN_INCOMPLETE');
    expect(result.correctiveActions).toContain('LINK_PRIMARY_EVIDENCE');
  });

  it('fails when p95 export latency exceeds budget (AC-04)', () => {
    const result = buildGateReportExport({
      verdict: 'PASS',
      exportRequest: true,
      gates: buildNominalGates(),
      evidenceRefs: ['evidence://g4/review-001'],
      openActions: [],
      latencySamplesMs: [2600, 2800, 3000]
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('EXPORT_LATENCY_BUDGET_EXCEEDED');
    expect(result.correctiveActions).toContain('OPTIMIZE_REPORT_EXPORT_PIPELINE');
  });

  it('is exported from index', () => {
    const result = buildGateReportExportFromIndex({
      verdict: 'PASS',
      gates: buildNominalGates(),
      evidenceRefs: ['evidence://g1/report-001'],
      openActions: [],
      exportRequest: false,
      latencySamplesMs: [250]
    });

    expect(result.reasonCode).toBe('OK');
  });
});
