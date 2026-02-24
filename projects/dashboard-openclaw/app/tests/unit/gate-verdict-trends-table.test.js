import { describe, expect, it } from 'vitest';
import { buildGateVerdictTrendsTable } from '../../src/gate-verdict-trends-table.js';
import { buildGateVerdictTrendsTable as buildGateVerdictTrendsTableFromIndex } from '../../src/index.js';

describe('gate-verdict-trends-table unit', () => {
  it('builds verdict trends table by phase/period with export-ready context (AC-01/AC-02)', () => {
    const result = buildGateVerdictTrendsTable({
      phase: 'G4-UX',
      period: 'weekly',
      exportRequest: true,
      evidenceRefs: ['proof:trend:week-06'],
      trendRows: [
        {
          periodLabel: '2026-W05',
          passCount: 2,
          concernsCount: 2,
          failCount: 1,
          windowStartAt: '2026-02-01T00:00:00.000Z',
          windowEndAt: '2026-02-07T23:59:59.000Z'
        },
        {
          periodLabel: '2026-W06',
          passCount: 4,
          concernsCount: 1,
          failCount: 0,
          windowStartAt: '2026-02-08T00:00:00.000Z',
          windowEndAt: '2026-02-14T23:59:59.000Z'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        phase: 'G4-UX',
        period: 'WEEKLY',
        rowsCount: 2,
        totalVerdicts: 10,
        dominantVerdict: 'PASS',
        reportCanExport: true,
        sourceReasonCode: 'OK'
      },
      trendTable: {
        phase: 'G4-UX',
        period: 'WEEKLY',
        totals: {
          passCount: 6,
          concernsCount: 3,
          failCount: 1,
          totalCount: 10,
          dominantVerdict: 'PASS',
          trendDirection: 'UP'
        }
      },
      reportExport: {
        requested: true,
        canExport: true,
        blockers: []
      }
    });

    expect(result.trendTable.rows[0].periodLabel).toBe('2026-W05');
    expect(result.trendTable.rows[1].periodLabel).toBe('2026-W06');
    expect(result.trendTable.rows[1].trendDirection).toBe('UP');
  });

  it('blocks missing evidence chain in strict mode (AC-03)', () => {
    const result = buildGateVerdictTrendsTable({
      phase: 'G4-T',
      period: 'daily',
      trendRows: [
        {
          periodLabel: '2026-02-24',
          passCount: 1,
          concernsCount: 0,
          failCount: 0
        }
      ]
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('EVIDENCE_CHAIN_INCOMPLETE');
    expect(result.correctiveActions).toContain('LINK_TREND_EVIDENCE');
  });

  it('blocks invalid rows when totalCount is inconsistent', () => {
    const result = buildGateVerdictTrendsTable({
      phase: 'G4',
      period: 'weekly',
      evidenceRefs: ['proof:trend:sample'],
      trendRows: [
        {
          periodLabel: '2026-W06',
          passCount: 2,
          concernsCount: 1,
          failCount: 0,
          totalCount: 99
        }
      ]
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_VERDICT_TRENDS_ROW');
    expect(result.correctiveActions).toContain('FIX_VERDICT_TRENDS_ROW');
  });

  it('blocks export request when trend table is empty', () => {
    const result = buildGateVerdictTrendsTable({
      phase: 'G4',
      period: 'monthly',
      exportRequest: true,
      evidenceRefs: ['proof:trend:month'],
      trendRows: []
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('REPORT_EXPORT_BLOCKED');
    expect(result.diagnostics.exportBlockers).toContain('EMPTY_TRENDS_TABLE');
  });

  it('is exported from index', () => {
    const result = buildGateVerdictTrendsTableFromIndex({
      phase: 'G4',
      period: 'custom',
      evidenceRefs: ['proof:trend:single'],
      trendRows: [
        {
          periodLabel: 'P0',
          passCount: 1,
          concernsCount: 0,
          failCount: 0
        }
      ]
    });

    expect(result.reasonCode).toBe('OK');
  });
});
