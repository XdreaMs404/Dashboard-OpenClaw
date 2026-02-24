const VERDICTS = Object.freeze(['PASS', 'CONCERNS', 'FAIL']);
const VERDICT_SET = new Set(VERDICTS);
const DIRECTION_SET = new Set(['UP', 'DOWN', 'FLAT']);
const PERIOD_SET = new Set(['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM']);

const REASON_CODES = Object.freeze([
  'OK',
  'INVALID_VERDICT_TRENDS_INPUT',
  'INVALID_VERDICT_TRENDS_ROW',
  'EVIDENCE_CHAIN_INCOMPLETE',
  'REPORT_EXPORT_BLOCKED'
]);

const REASON_CODE_SET = new Set(REASON_CODES);

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_VERDICT_TRENDS_INPUT: ['FIX_VERDICT_TRENDS_INPUT'],
  INVALID_VERDICT_TRENDS_ROW: ['FIX_VERDICT_TRENDS_ROW'],
  EVIDENCE_CHAIN_INCOMPLETE: ['LINK_TREND_EVIDENCE'],
  REPORT_EXPORT_BLOCKED: ['COMPLETE_EXPORT_PREREQUISITES']
});

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneValue(entry));
  }

  if (!isObject(value)) {
    return value;
  }

  const clone = {};

  for (const [key, nested] of Object.entries(value)) {
    clone[key] = cloneValue(nested);
  }

  return clone;
}

function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function normalizeReasonCode(value) {
  const normalized = normalizeText(value);

  if (REASON_CODE_SET.has(normalized)) {
    return normalized;
  }

  return null;
}

function normalizeVerdict(value) {
  const normalized = normalizeText(value).toUpperCase();

  if (!VERDICT_SET.has(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeDirection(value) {
  const normalized = normalizeText(value).toUpperCase();

  if (!DIRECTION_SET.has(normalized)) {
    return null;
  }

  return normalized;
}

function normalizePeriod(value) {
  const normalized = normalizeText(value).toUpperCase();

  if (!PERIOD_SET.has(normalized)) {
    return 'CUSTOM';
  }

  return normalized;
}

function normalizeNonNegativeInteger(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.trunc(parsed);
}

function normalizeArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const output = [];
  const seen = new Set();

  for (const entry of value) {
    const normalized = normalizeText(String(entry ?? ''));

    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(normalized);
  }

  return output;
}

function parseTimestampMs(value) {
  if (value instanceof Date) {
    const parsedDate = value.getTime();
    return Number.isFinite(parsedDate) ? parsedDate : null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }

  if (typeof value === 'string') {
    const normalized = normalizeText(value);

    if (normalized.length === 0) {
      return null;
    }

    const parsedDate = Date.parse(normalized);
    return Number.isFinite(parsedDate) ? parsedDate : null;
  }

  return null;
}

function toIso(valueMs) {
  return new Date(valueMs).toISOString();
}

function safePercent(value, total) {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }

  return Number(((value / total) * 100).toFixed(2));
}

function computePercentile(samples, percentile) {
  if (!Array.isArray(samples) || samples.length === 0) {
    return 0;
  }

  const sorted = samples
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry))
    .sort((left, right) => left - right);

  if (sorted.length === 0) {
    return 0;
  }

  const ratio = Math.min(100, Math.max(0, Number(percentile))) / 100;
  const index = Math.ceil(sorted.length * ratio) - 1;

  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function defaultTrendTable(phase, period) {
  return {
    phase,
    period,
    rows: [],
    totals: {
      passCount: 0,
      concernsCount: 0,
      failCount: 0,
      totalCount: 0,
      dominantVerdict: 'NONE',
      trendDirection: 'FLAT'
    },
    windowStartAt: null,
    windowEndAt: null
  };
}

function defaultReportExport(period, evidenceRefs) {
  const hasEvidence = evidenceRefs.length > 0;

  return {
    requested: false,
    canExport: false,
    blockers: hasEvidence ? ['EMPTY_TRENDS_TABLE'] : ['EMPTY_TRENDS_TABLE', 'MISSING_TREND_EVIDENCE'],
    period,
    requiredSections: ['verdictsByPeriod', 'evidenceRefs', 'openActions']
  };
}

function normalizeInvalidCorrectiveActions(reasonCode, correctiveActions) {
  const normalized = normalizeArray(correctiveActions);

  if (normalized.length > 0) {
    return normalized;
  }

  return cloneValue(DEFAULT_CORRECTIVE_ACTIONS[reasonCode] ?? ['INVESTIGATE_TRENDS_PIPELINE']);
}

function buildInvalidResult({
  reasonCode,
  reason,
  diagnostics,
  phase,
  period,
  evidenceRefs,
  correctiveActions
}) {
  const safeReasonCode = normalizeReasonCode(reasonCode) ?? 'INVALID_VERDICT_TRENDS_INPUT';
  const normalizedEvidenceRefs = normalizeArray(evidenceRefs);

  return {
    allowed: false,
    reasonCode: safeReasonCode,
    reason:
      normalizeText(reason) ||
      'Entrée tableau tendances invalide: vérifiez phase, périodes, comptages et preuves.',
    diagnostics: {
      phase,
      period,
      rowsCount: 0,
      totalVerdicts: 0,
      evidenceRefCount: normalizedEvidenceRefs.length,
      reportCanExport: false,
      sourceReasonCode: safeReasonCode,
      ...(isObject(diagnostics) ? cloneValue(diagnostics) : {})
    },
    trendTable: defaultTrendTable(phase, period),
    reportExport: defaultReportExport(period, normalizedEvidenceRefs),
    correctiveActions: normalizeInvalidCorrectiveActions(safeReasonCode, correctiveActions)
  };
}

function dominantVerdict(passCount, concernsCount, failCount) {
  const tuples = [
    ['PASS', passCount],
    ['CONCERNS', concernsCount],
    ['FAIL', failCount]
  ];

  const maxValue = Math.max(passCount, concernsCount, failCount);

  if (maxValue <= 0) {
    return 'NONE';
  }

  const leaders = tuples.filter(([, value]) => value === maxValue);

  if (leaders.length !== 1) {
    return 'MIXED';
  }

  return leaders[0][0];
}

function toTrendDirection(previousRow, currentRow) {
  if (!isObject(previousRow) || !isObject(currentRow)) {
    return 'FLAT';
  }

  const passDelta = Number(currentRow.passRate) - Number(previousRow.passRate);
  const failDelta = Number(currentRow.failRate) - Number(previousRow.failRate);

  if (passDelta > 0.01 && failDelta <= 0.01) {
    return 'UP';
  }

  if (failDelta > 0.01 && passDelta <= 0.01) {
    return 'DOWN';
  }

  return 'FLAT';
}

function resolveRowsSource(payload) {
  const directRows = payload.trendRows ?? payload.rows ?? payload.periodRows ?? payload.trendTable;

  if (directRows !== undefined) {
    return directRows;
  }

  const trendSnapshot = payload.trendSnapshot;

  if (!isObject(trendSnapshot)) {
    return [];
  }

  return [
    {
      periodLabel: trendSnapshot.period ?? payload.period,
      phase: trendSnapshot.phase ?? payload.phase,
      passCount: trendSnapshot.passCount,
      concernsCount: trendSnapshot.concernsCount,
      failCount: trendSnapshot.failCount,
      windowStartAt: trendSnapshot.windowStartAt,
      windowEndAt: trendSnapshot.windowEndAt
    }
  ];
}

function normalizeRows(payload, phase) {
  const rawRows = resolveRowsSource(payload);

  if (!Array.isArray(rawRows)) {
    return {
      valid: false,
      reasonCode: 'INVALID_VERDICT_TRENDS_INPUT',
      reason: 'trendRows invalide: tableau attendu.',
      diagnostics: {
        rowsType: typeof rawRows
      },
      correctiveActions: ['FIX_VERDICT_TRENDS_INPUT']
    };
  }

  const rows = [];
  let index = 0;

  for (const row of rawRows) {
    if (!isObject(row)) {
      return {
        valid: false,
        reasonCode: 'INVALID_VERDICT_TRENDS_ROW',
        reason: `trendRows[${index}] invalide: objet attendu.`,
        diagnostics: {
          rowIndex: index
        },
        correctiveActions: ['FIX_VERDICT_TRENDS_ROW']
      };
    }

    const periodLabel =
      normalizeText(row.periodLabel) || normalizeText(row.period) || normalizeText(row.label);

    if (periodLabel.length === 0) {
      return {
        valid: false,
        reasonCode: 'INVALID_VERDICT_TRENDS_ROW',
        reason: `trendRows[${index}] invalide: periodLabel requis.`,
        diagnostics: {
          rowIndex: index
        },
        correctiveActions: ['FIX_VERDICT_TRENDS_ROW']
      };
    }

    const passCount = normalizeNonNegativeInteger(
      row.passCount ?? row.pass ?? row.passes ?? row.passTotal
    );
    const concernsCount = normalizeNonNegativeInteger(
      row.concernsCount ?? row.concerns ?? row.concernsTotal
    );
    const failCount = normalizeNonNegativeInteger(row.failCount ?? row.fail ?? row.fails ?? row.failTotal);

    if (passCount === null || concernsCount === null || failCount === null) {
      return {
        valid: false,
        reasonCode: 'INVALID_VERDICT_TRENDS_ROW',
        reason: `trendRows[${index}] invalide: passCount/concernsCount/failCount doivent être >= 0.`,
        diagnostics: {
          rowIndex: index
        },
        correctiveActions: ['FIX_VERDICT_TRENDS_ROW']
      };
    }

    const totalCount = passCount + concernsCount + failCount;
    const expectedTotal = row.totalCount ?? row.total;

    if (expectedTotal !== undefined) {
      const normalizedExpectedTotal = normalizeNonNegativeInteger(expectedTotal);

      if (normalizedExpectedTotal === null || normalizedExpectedTotal !== totalCount) {
        return {
          valid: false,
          reasonCode: 'INVALID_VERDICT_TRENDS_ROW',
          reason: `trendRows[${index}] invalide: totalCount incohérent.`,
          diagnostics: {
            rowIndex: index,
            expectedTotal,
            computedTotal: totalCount
          },
          correctiveActions: ['FIX_VERDICT_TRENDS_ROW']
        };
      }
    }

    const rowPhase = normalizeText(row.phase) || phase;
    const windowStartMs = parseTimestampMs(row.windowStartAt ?? row.startAt ?? row.fromAt);
    const windowEndMs = parseTimestampMs(row.windowEndAt ?? row.endAt ?? row.toAt);

    if (windowStartMs !== null && windowEndMs !== null && windowStartMs > windowEndMs) {
      return {
        valid: false,
        reasonCode: 'INVALID_VERDICT_TRENDS_ROW',
        reason: `trendRows[${index}] invalide: windowStartAt <= windowEndAt requis.`,
        diagnostics: {
          rowIndex: index,
          windowStartAt: toIso(windowStartMs),
          windowEndAt: toIso(windowEndMs)
        },
        correctiveActions: ['FIX_VERDICT_TRENDS_ROW']
      };
    }

    rows.push({
      index,
      phase: rowPhase,
      periodLabel,
      passCount,
      concernsCount,
      failCount,
      totalCount,
      passRate: safePercent(passCount, totalCount),
      concernsRate: safePercent(concernsCount, totalCount),
      failRate: safePercent(failCount, totalCount),
      dominantVerdict: dominantVerdict(passCount, concernsCount, failCount),
      trendDirection: normalizeDirection(row.trendDirection) ?? 'FLAT',
      windowStartAt: windowStartMs === null ? null : toIso(windowStartMs),
      windowEndAt: windowEndMs === null ? null : toIso(windowEndMs)
    });

    index += 1;
  }

  return {
    valid: true,
    rows
  };
}

function aggregateTotals(rows) {
  const totals = {
    passCount: 0,
    concernsCount: 0,
    failCount: 0,
    totalCount: 0
  };

  for (const row of rows) {
    totals.passCount += row.passCount;
    totals.concernsCount += row.concernsCount;
    totals.failCount += row.failCount;
    totals.totalCount += row.totalCount;
  }

  const normalizedRows = [];

  for (let index = 0; index < rows.length; index += 1) {
    const previous = normalizedRows[index - 1];
    const current = rows[index];

    normalizedRows.push({
      ...current,
      trendDirection: index === 0 ? current.trendDirection : toTrendDirection(previous, current)
    });
  }

  const globalDirection =
    normalizedRows.length >= 2
      ? toTrendDirection(normalizedRows[0], normalizedRows[normalizedRows.length - 1])
      : 'FLAT';

  const dominant = dominantVerdict(totals.passCount, totals.concernsCount, totals.failCount);

  return {
    rows: normalizedRows,
    totals: {
      ...totals,
      dominantVerdict: dominant,
      trendDirection: globalDirection
    }
  };
}

function resolveWindow(rows) {
  const starts = [];
  const ends = [];

  for (const row of rows) {
    const start = parseTimestampMs(row.windowStartAt);
    const end = parseTimestampMs(row.windowEndAt);

    if (start !== null) {
      starts.push(start);
    }

    if (end !== null) {
      ends.push(end);
    }
  }

  return {
    windowStartAt: starts.length === 0 ? null : toIso(Math.min(...starts)),
    windowEndAt: ends.length === 0 ? null : toIso(Math.max(...ends))
  };
}

function resolveReportExport(payload, period, rows, evidenceRefs) {
  const requested = payload.exportRequest === true;
  const blockers = [];

  if (rows.length === 0) {
    blockers.push('EMPTY_TRENDS_TABLE');
  }

  if (evidenceRefs.length === 0) {
    blockers.push('MISSING_TREND_EVIDENCE');
  }

  const canExport = blockers.length === 0;

  return {
    requested,
    canExport,
    blockers,
    period,
    requiredSections: ['verdictsByPeriod', 'evidenceRefs', 'openActions']
  };
}

export function buildGateVerdictTrendsTable(input, options = {}) {
  const startedAt = Date.now();

  if (!isObject(input)) {
    return buildInvalidResult({
      reasonCode: 'INVALID_VERDICT_TRENDS_INPUT',
      reason: 'Entrée invalide: objet attendu.',
      diagnostics: {
        inputType: typeof input
      },
      phase: 'G4',
      period: 'CUSTOM',
      evidenceRefs: []
    });
  }

  const payload = cloneValue(input);
  const runtimeOptions = isObject(options) ? options : {};

  const phase = normalizeText(payload.phase || payload.gatePhase || payload.trendPhase || 'G4');
  const period = normalizePeriod(payload.period || payload.trendPeriod || payload.periodicity || 'CUSTOM');

  const evidenceRefs = normalizeArray(
    payload.evidenceRefs ?? payload.trendEvidenceRefs ?? payload.proofRefs ?? payload.references
  );

  const strictEvidence = runtimeOptions.strictEvidence !== false;

  if (strictEvidence && evidenceRefs.length === 0) {
    return buildInvalidResult({
      reasonCode: 'EVIDENCE_CHAIN_INCOMPLETE',
      reason: 'Chaîne de preuve incomplète: evidenceRefs requis pour la tendance.',
      diagnostics: {
        phase,
        period,
        strictEvidence
      },
      phase,
      period,
      evidenceRefs,
      correctiveActions: ['LINK_TREND_EVIDENCE']
    });
  }

  const rowsResolution = normalizeRows(payload, phase);

  if (!rowsResolution.valid) {
    return buildInvalidResult({
      reasonCode: rowsResolution.reasonCode,
      reason: rowsResolution.reason,
      diagnostics: {
        phase,
        period,
        ...(isObject(rowsResolution.diagnostics) ? rowsResolution.diagnostics : {})
      },
      phase,
      period,
      evidenceRefs,
      correctiveActions: rowsResolution.correctiveActions
    });
  }

  const { rows, totals } = aggregateTotals(rowsResolution.rows);
  const window = resolveWindow(rows);
  const reportExport = resolveReportExport(payload, period, rows, evidenceRefs);

  if (reportExport.requested && !reportExport.canExport) {
    return buildInvalidResult({
      reasonCode: 'REPORT_EXPORT_BLOCKED',
      reason: 'Export rapport bloqué: prérequis tendances/preuves non satisfaits.',
      diagnostics: {
        phase,
        period,
        exportBlockers: reportExport.blockers
      },
      phase,
      period,
      evidenceRefs,
      correctiveActions: ['COMPLETE_EXPORT_PREREQUISITES']
    });
  }

  const durationMs = Math.max(0, Date.now() - startedAt);

  return {
    allowed: true,
    reasonCode: 'OK',
    reason: `Tableau tendances calculé pour ${phase} (${period}).`,
    diagnostics: {
      phase,
      period,
      rowsCount: rows.length,
      totalVerdicts: totals.totalCount,
      dominantVerdict: totals.dominantVerdict,
      trendDirection: totals.trendDirection,
      evidenceRefCount: evidenceRefs.length,
      reportCanExport: reportExport.canExport,
      sourceReasonCode: 'OK',
      durationMs,
      p95ComputationMs: computePercentile([durationMs], 95)
    },
    trendTable: {
      phase,
      period,
      rows,
      totals,
      windowStartAt: window.windowStartAt,
      windowEndAt: window.windowEndAt
    },
    reportExport,
    correctiveActions: []
  };
}
