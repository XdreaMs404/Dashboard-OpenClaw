import { describe, expect, it } from 'vitest';
import { buildGateReportExport } from '../../src/gate-report-export.js';

const gateMap = {
  G1: { status: 'PASS', owner: 'analyst', updatedAt: '2026-02-24T10:00:00.000Z' },
  G2: { status: 'PASS', owner: 'pm', updatedAt: '2026-02-24T10:05:00.000Z' },
  G3: { status: 'PASS', owner: 'architect', updatedAt: '2026-02-24T10:10:00.000Z' },
  G4: { status: 'FAIL', owner: 'reviewer', updatedAt: '2026-02-24T10:15:00.000Z' },
  G5: { status: 'PASS', owner: 'jarvis', updatedAt: '2026-02-24T10:20:00.000Z' }
};

describe('gate-report-export edge', () => {
  it('rejects malformed top-level payload', () => {
    const result = buildGateReportExport('bad-input');

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_GATE_REPORT_EXPORT_INPUT');
  });

  it('accepts gate map payload and sanitizes duplicated actions/evidence', () => {
    const result = buildGateReportExport({
      verdict: 'FAIL',
      gates: gateMap,
      evidenceRefs: ['evidence://g4/review-001', 'evidence://g4/review-001', '  '],
      openActions: [
        'ACT-001',
        'ACT-001',
        {
          id: 'ACT-002',
          title: 'Escalader au reviewer',
          status: 'OPEN'
        },
        {
          id: 'ACT-003',
          title: 'Clôturer item',
          status: 'CLOSED'
        }
      ],
      exportRequest: true,
      latencySamplesMs: [120, 200, 300]
    });

    expect(result.allowed).toBe(true);
    expect(result.report.evidenceRefs).toEqual(['evidence://g4/review-001']);
    expect(result.report.openActions).toHaveLength(2);
    expect(result.reportExport.canExport).toBe(true);
  });

  it('allows missing evidence when strictEvidence=false and export is not requested', () => {
    const result = buildGateReportExport(
      {
        verdict: 'PASS',
        gates: gateMap,
        evidenceRefs: [],
        openActions: [],
        exportRequest: false,
        latencySamplesMs: [300]
      },
      {
        strictEvidence: false
      }
    );

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.reportExport.requested).toBe(false);
    expect(result.reportExport.canExport).toBe(false);
    expect(result.reportExport.blockers).toContain('MISSING_EVIDENCE');
  });
});
