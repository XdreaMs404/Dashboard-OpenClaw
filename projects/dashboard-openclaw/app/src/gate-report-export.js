const GATE_ORDER = Object.freeze(['G1', 'G2', 'G3', 'G4', 'G5']);
const GATE_SET = new Set(GATE_ORDER);
const STATUS_SET = new Set(['PASS', 'CONCERNS', 'FAIL']);
const VERDICT_SET = new Set(['PASS', 'CONCERNS', 'FAIL']);
const FORMAT_SET = new Set(['JSON', 'MARKDOWN']);

const REASON_CODES = Object.freeze([
  'OK',
  'INVALID_GATE_REPORT_EXPORT_INPUT',
  'INVALID_GATE_REPORT_GATE',
  'GATE_VIEW_INCOMPLETE',
  'EVIDENCE_CHAIN_INCOMPLETE',
  'REPORT_EXPORT_BLOCKED',
  'EXPORT_LATENCY_BUDGET_EXCEEDED'
]);

const REASON_CODE_SET = new Set(REASON_CODES);

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_GATE_REPORT_EXPORT_INPUT: ['FIX_GATE_REPORT_INPUT'],
  INVALID_GATE_REPORT_GATE: ['FIX_GATE_VIEW_FIELDS'],
  GATE_VIEW_INCOMPLETE: ['COMPLETE_GATE_VIEW_G1_TO_G5'],
  EVIDENCE_CHAIN_INCOMPLETE: ['LINK_PRIMARY_EVIDENCE'],
  REPORT_EXPORT_BLOCKED: ['COMPLETE_EXPORT_PREREQUISITES'],
  EXPORT_LATENCY_BUDGET_EXCEEDED: ['OPTIMIZE_REPORT_EXPORT_PIPELINE']
});

const DEFAULT_REQUIRED_SECTIONS = Object.freeze([
  'gateView',
  'verdict',
  'evidenceRefs',
  'openActions',
  'diagnostics'
]);

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

  if (!REASON_CODE_SET.has(normalized)) {
    return null;
  }

  return normalized;
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

function normalizeStatus(value) {
  const normalized = normalizeText(value).toUpperCase();

  if (!STATUS_SET.has(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeVerdict(value) {
  const normalized = normalizeText(value).toUpperCase();

  if (!VERDICT_SET.has(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeGateId(value) {
  const normalized = normalizeText(value).toUpperCase();

  if (!GATE_SET.has(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeFormat(value) {
  const normalized = normalizeText(value).toUpperCase();

  if (!FORMAT_SET.has(normalized)) {
    return 'JSON';
  }

  return normalized;
}

function normalizeOpenActions(value) {
  if (!Array.isArray(value)) {
    return {
      valid: false,
      reason: 'openActions invalide: tableau attendu.',
      diagnostics: {
        inputType: typeof value
      }
    };
  }

  const output = [];
  const seen = new Set();

  for (const item of value) {
    if (typeof item === 'string' || typeof item === 'number') {
      const normalized = normalizeText(String(item));

      if (normalized.length === 0) {
        continue;
      }

      const key = `OPEN:${normalized}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      output.push({
        id: normalized,
        title: normalized,
        status: 'OPEN'
      });
      continue;
    }

    if (!isObject(item)) {
      return {
        valid: false,
        reason: 'openActions invalide: objets/string uniquement.',
        diagnostics: {
          invalidItemType: typeof item
        }
      };
    }

    const id = normalizeText(String(item.id ?? item.actionId ?? item.code ?? item.title ?? item.label ?? ''));
    const title = normalizeText(String(item.title ?? item.label ?? item.name ?? id));
    const status = normalizeText(String(item.status ?? item.state ?? 'OPEN')).toUpperCase();

    if (title.length === 0) {
      return {
        valid: false,
        reason: 'openActions invalide: title requis.',
        diagnostics: {
          actionId: id || null
        }
      };
    }

    if (status === 'CLOSED' || status === 'DONE') {
      continue;
    }

    const normalizedId = id.length > 0 ? id : title;
    const key = `${normalizedId}:${title}:${status}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push({
      id: normalizedId,
      title,
      status: status.length > 0 ? status : 'OPEN'
    });
  }

  return {
    valid: true,
    actions: output
  };
}

function normalizeGateRows(payload) {
  const candidates =
    payload.gateView?.rows ?? payload.gateViewRows ?? payload.gates ?? payload.gateCenter?.gates ?? null;

  if (Array.isArray(candidates)) {
    const rows = [];
    const seenGateIds = new Set();

    for (const item of candidates) {
      if (!isObject(item)) {
        return {
          valid: false,
          reasonCode: 'INVALID_GATE_REPORT_GATE',
          reason: 'gateView invalide: ligne objet attendue.',
          diagnostics: {
            invalidItemType: typeof item
          }
        };
      }

      const gateId = normalizeGateId(item.gateId ?? item.id ?? item.gate);
      const status = normalizeStatus(item.status ?? item.verdict);
      const owner = normalizeText(String(item.owner ?? item.assignee ?? ''));
      const updatedAtMs = parseTimestampMs(item.updatedAt ?? item.timestamp ?? item.at);

      if (!gateId || !status || owner.length === 0 || updatedAtMs === null) {
        return {
          valid: false,
          reasonCode: 'INVALID_GATE_REPORT_GATE',
          reason: 'gateView invalide: gateId/status/owner/updatedAt requis.',
          diagnostics: {
            gateId: gateId ?? null,
            status: status ?? null,
            owner,
            updatedAtMs
          }
        };
      }

      if (seenGateIds.has(gateId)) {
        return {
          valid: false,
          reasonCode: 'INVALID_GATE_REPORT_GATE',
          reason: `gateView invalide: gate dupliquée (${gateId}).`,
          diagnostics: {
            duplicateGateId: gateId
          }
        };
      }

      seenGateIds.add(gateId);
      rows.push({
        gateId,
        status,
        owner,
        updatedAt: toIso(updatedAtMs)
      });
    }

    const missingGateIds = GATE_ORDER.filter((gateId) => !seenGateIds.has(gateId));

    if (missingGateIds.length > 0) {
      return {
        valid: false,
        reasonCode: 'GATE_VIEW_INCOMPLETE',
        reason: 'Vue gate incomplète: G1→G5 requis avec owner et horodatage.',
        diagnostics: {
          missingGateIds
        }
      };
    }

    rows.sort((left, right) => GATE_ORDER.indexOf(left.gateId) - GATE_ORDER.indexOf(right.gateId));

    return {
      valid: true,
      rows
    };
  }

  if (isObject(candidates)) {
    const rows = [];

    for (const gateId of GATE_ORDER) {
      const gate = candidates[gateId];

      if (!isObject(gate)) {
        return {
          valid: false,
          reasonCode: 'GATE_VIEW_INCOMPLETE',
          reason: 'Vue gate incomplète: G1→G5 requis avec owner et horodatage.',
          diagnostics: {
            missingGateIds: [gateId]
          }
        };
      }

      const status = normalizeStatus(gate.status ?? gate.verdict);
      const owner = normalizeText(String(gate.owner ?? gate.assignee ?? ''));
      const updatedAtMs = parseTimestampMs(gate.updatedAt ?? gate.timestamp ?? gate.at);

      if (!status || owner.length === 0 || updatedAtMs === null) {
        return {
          valid: false,
          reasonCode: 'INVALID_GATE_REPORT_GATE',
          reason: `gate ${gateId} invalide: status/owner/updatedAt requis.`,
          diagnostics: {
            gateId,
            status: status ?? null,
            owner,
            updatedAtMs
          }
        };
      }

      rows.push({
        gateId,
        status,
        owner,
        updatedAt: toIso(updatedAtMs)
      });
    }

    return {
      valid: true,
      rows
    };
  }

  return {
    valid: false,
    reasonCode: 'GATE_VIEW_INCOMPLETE',
    reason: 'Vue gate incomplète: G1→G5 requis avec owner et horodatage.',
    diagnostics: {
      inputType: typeof candidates,
      missingGateIds: cloneValue(GATE_ORDER)
    }
  };
}

function summarizeGateRows(rows) {
  const totals = {
    passCount: 0,
    concernsCount: 0,
    failCount: 0,
    totalCount: rows.length
  };

  for (const row of rows) {
    if (row.status === 'PASS') {
      totals.passCount += 1;
    } else if (row.status === 'CONCERNS') {
      totals.concernsCount += 1;
    } else if (row.status === 'FAIL') {
      totals.failCount += 1;
    }
  }

  return totals;
}

function resolveLatency(payload, runtimeOptions, durationMs) {
  const latencySamples = Array.isArray(payload.latencySamplesMs)
    ? payload.latencySamplesMs
    : Array.isArray(runtimeOptions.latencySamplesMs)
      ? runtimeOptions.latencySamplesMs
      : [durationMs];

  const p95LatencyMs = computePercentile(latencySamples, 95);
  const latencyBudgetMs = Number(payload.latencyBudgetMs ?? runtimeOptions.latencyBudgetMs ?? 2500);

  if (!Number.isFinite(latencyBudgetMs) || latencyBudgetMs <= 0) {
    return {
      valid: false,
      reasonCode: 'INVALID_GATE_REPORT_EXPORT_INPUT',
      reason: 'latencyBudgetMs invalide: nombre > 0 requis.',
      diagnostics: {
        latencyBudgetMs
      }
    };
  }

  if (p95LatencyMs > latencyBudgetMs) {
    return {
      valid: false,
      reasonCode: 'EXPORT_LATENCY_BUDGET_EXCEEDED',
      reason: `Budget latence dépassé: p95=${p95LatencyMs}ms > ${latencyBudgetMs}ms.`,
      diagnostics: {
        p95LatencyMs,
        latencyBudgetMs
      }
    };
  }

  return {
    valid: true,
    p95LatencyMs,
    latencyBudgetMs
  };
}

function normalizeInvalidCorrectiveActions(reasonCode, correctiveActions) {
  const normalized = normalizeArray(correctiveActions);

  if (normalized.length > 0) {
    return normalized;
  }

  return cloneValue(DEFAULT_CORRECTIVE_ACTIONS[reasonCode] ?? ['INVESTIGATE_GATE_EXPORT_PIPELINE']);
}

function defaultReportExport({ requested, format, blockers, generatedAt }) {
  return {
    requested,
    canExport: blockers.length === 0,
    blockers,
    format,
    requiredSections: cloneValue(DEFAULT_REQUIRED_SECTIONS),
    generatedAt
  };
}

function buildInvalidResult({
  reasonCode,
  reason,
  diagnostics,
  verdict,
  format,
  correctiveActions,
  requested,
  blockers,
  nowIso
}) {
  const safeReasonCode = normalizeReasonCode(reasonCode) ?? 'INVALID_GATE_REPORT_EXPORT_INPUT';
  const safeFormat = normalizeFormat(format);
  const safeVerdict = normalizeVerdict(verdict) ?? 'CONCERNS';
  const safeBlockers = normalizeArray(blockers);

  return {
    allowed: false,
    reasonCode: safeReasonCode,
    reason:
      normalizeText(reason) ||
      'Export gate invalide: vérifiez verdict, vue G1→G5, preuves et contraintes de latence.',
    diagnostics: {
      verdict: safeVerdict,
      gateCount: 0,
      evidenceRefCount: 0,
      openActionsCount: 0,
      sourceReasonCode: safeReasonCode,
      ...(isObject(diagnostics) ? cloneValue(diagnostics) : {})
    },
    gateView: {
      rows: [],
      totals: {
        passCount: 0,
        concernsCount: 0,
        failCount: 0,
        totalCount: 0
      }
    },
    reportExport: defaultReportExport({
      requested,
      format: safeFormat,
      blockers: safeBlockers.length > 0 ? safeBlockers : ['EXPORT_NOT_READY'],
      generatedAt: nowIso
    }),
    report: {
      verdict: safeVerdict,
      gateView: [],
      evidenceRefs: [],
      openActions: [],
      generatedAt: nowIso
    },
    correctiveActions: normalizeInvalidCorrectiveActions(safeReasonCode, correctiveActions)
  };
}

export function buildGateReportExport(input, options = {}) {
  const startedAt = Date.now();
  const nowIso = toIso(startedAt);

  if (!isObject(input)) {
    return buildInvalidResult({
      reasonCode: 'INVALID_GATE_REPORT_EXPORT_INPUT',
      reason: 'Entrée invalide: objet attendu.',
      diagnostics: {
        inputType: typeof input
      },
      verdict: 'CONCERNS',
      format: 'JSON',
      requested: false,
      blockers: ['INVALID_INPUT'],
      nowIso
    });
  }

  const payload = cloneValue(input);
  const runtimeOptions = isObject(options) ? options : {};

  const verdict = normalizeVerdict(payload.verdict ?? payload.gateVerdict ?? payload.reportVerdict ?? 'CONCERNS');
  const format = normalizeFormat(payload.format ?? payload.exportFormat ?? 'JSON');
  const requested = payload.exportRequest === true;

  if (!verdict) {
    return buildInvalidResult({
      reasonCode: 'INVALID_GATE_REPORT_EXPORT_INPUT',
      reason: 'verdict invalide: PASS/CONCERNS/FAIL requis.',
      diagnostics: {
        verdict: payload.verdict ?? null
      },
      verdict: 'CONCERNS',
      format,
      requested,
      blockers: ['INVALID_VERDICT'],
      nowIso
    });
  }

  const gateResolution = normalizeGateRows(payload);
  if (!gateResolution.valid) {
    return buildInvalidResult({
      reasonCode: gateResolution.reasonCode,
      reason: gateResolution.reason,
      diagnostics: gateResolution.diagnostics,
      verdict,
      format,
      requested,
      blockers: ['MISSING_GATE_VIEW'],
      nowIso
    });
  }

  const evidenceRefs = normalizeArray(payload.evidenceRefs ?? payload.proofRefs ?? payload.reportEvidenceRefs);
  const strictEvidence = runtimeOptions.strictEvidence !== false;

  if (strictEvidence && evidenceRefs.length === 0) {
    return buildInvalidResult({
      reasonCode: 'EVIDENCE_CHAIN_INCOMPLETE',
      reason: 'Chaîne de preuve incomplète: evidenceRefs requis.',
      diagnostics: {
        strictEvidence,
        evidenceRefCount: evidenceRefs.length
      },
      verdict,
      format,
      requested,
      blockers: ['MISSING_EVIDENCE'],
      nowIso
    });
  }

  const actionsResolution = normalizeOpenActions(
    payload.openActions ?? payload.actions ?? payload.correctiveActions ?? []
  );

  if (!actionsResolution.valid) {
    return buildInvalidResult({
      reasonCode: 'INVALID_GATE_REPORT_EXPORT_INPUT',
      reason: actionsResolution.reason,
      diagnostics: actionsResolution.diagnostics,
      verdict,
      format,
      requested,
      blockers: ['INVALID_OPEN_ACTIONS'],
      nowIso
    });
  }

  const durationMs = Math.max(0, Date.now() - startedAt);
  const latencyResolution = resolveLatency(payload, runtimeOptions, durationMs);

  if (!latencyResolution.valid) {
    return buildInvalidResult({
      reasonCode: latencyResolution.reasonCode,
      reason: latencyResolution.reason,
      diagnostics: latencyResolution.diagnostics,
      verdict,
      format,
      requested,
      blockers: ['LATENCY_BUDGET_EXCEEDED'],
      nowIso
    });
  }

  const blockers = [];

  if (evidenceRefs.length === 0) {
    blockers.push('MISSING_EVIDENCE');
  }

  const reportExport = defaultReportExport({
    requested,
    format,
    blockers,
    generatedAt: nowIso
  });

  if (requested && !reportExport.canExport) {
    return buildInvalidResult({
      reasonCode: 'REPORT_EXPORT_BLOCKED',
      reason: 'Export rapport bloqué: prérequis manquants.',
      diagnostics: {
        exportBlockers: cloneValue(reportExport.blockers)
      },
      verdict,
      format,
      requested,
      blockers: cloneValue(reportExport.blockers),
      nowIso
    });
  }

  const gateTotals = summarizeGateRows(gateResolution.rows);

  return {
    allowed: true,
    reasonCode: 'OK',
    reason: `Rapport gate prêt (${verdict}) avec vue complète G1→G5.`,
    diagnostics: {
      verdict,
      gateCount: gateResolution.rows.length,
      evidenceRefCount: evidenceRefs.length,
      openActionsCount: actionsResolution.actions.length,
      p95LatencyMs: latencyResolution.p95LatencyMs,
      latencyBudgetMs: latencyResolution.latencyBudgetMs,
      sourceReasonCode: 'OK',
      durationMs
    },
    gateView: {
      rows: gateResolution.rows,
      totals: gateTotals
    },
    reportExport,
    report: {
      verdict,
      gateView: gateResolution.rows,
      evidenceRefs,
      openActions: actionsResolution.actions,
      generatedAt: nowIso
    },
    correctiveActions: []
  };
}
