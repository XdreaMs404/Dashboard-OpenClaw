import { describe, expect, it } from 'vitest';
import { buildGateVerdictTrendsTable } from '../../src/gate-verdict-trends-table.js';

describe('gate-verdict-trends-table edge', () => {
  it('rejects malformed top-level and malformed trendRows payloads', () => {
    const malformedInput = buildGateVerdictTrendsTable('bad-input');

    expect(malformedInput.allowed).toBe(false);
    expect(malformedInput.reasonCode).toBe('INVALID_VERDICT_TRENDS_INPUT');

    const malformedRows = buildGateVerdictTrendsTable({
      phase: 'G4',
      evidenceRefs: ['proof:trend'],
      trendRows: 'bad-rows'
    });

    expect(malformedRows.allowed).toBe(false);
    expect(malformedRows.reasonCode).toBe('INVALID_VERDICT_TRENDS_INPUT');
  });

  it('accepts empty table in non-strict evidence mode and keeps export disabled', () => {
    const result = buildGateVerdictTrendsTable(
      {
        phase: 'G4',
        period: 'custom',
        trendRows: []
      },
      {
        strictEvidence: false
      }
    );

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.trendTable.rows).toHaveLength(0);
    expect(result.reportExport.canExport).toBe(false);
    expect(result.reportExport.blockers).toContain('EMPTY_TRENDS_TABLE');
  });

  it('handles tied dominant verdict as MIXED', () => {
    const result = buildGateVerdictTrendsTable({
      phase: 'g4-ux',
      period: 'weekly',
      evidenceRefs: ['proof:trend:tie'],
      trendRows: [
        {
          periodLabel: '2026-W06',
          passCount: 2,
          concernsCount: 2,
          failCount: 1
        }
      ]
    });

    expect(result.allowed).toBe(true);
    expect(result.trendTable.totals.dominantVerdict).toBe('MIXED');
    expect(result.trendTable.totals.trendDirection).toBe('FLAT');
  });
});
