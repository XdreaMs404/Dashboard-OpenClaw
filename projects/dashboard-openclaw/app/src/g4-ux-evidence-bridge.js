const GATE_ORDER = Object.freeze(['G1', 'G2', 'G3', 'G4', 'G5']);
const GATE_SET = new Set(GATE_ORDER);
const STATUS_SET = new Set(['PASS', 'CONCERNS', 'FAIL']);

const REASON_CODES = Object.freeze([
  'OK',
  'INVALID_G4_UX_BRIDGE_INPUT',
  'INVALID_GATE_VIEW_ROW',
  'GATE_VIEW_INCOMPLETE',
  'G4_CORRELATION_MISSING',
  'UX_EVIDENCE_MISSING',
  'UX_EVIDENCE_INGESTION_TOO_SLOW',
  'LATENCY_BUDGET_EXCEEDED'
]);

const REASON_CODE_SET = new Set(REASON_CODES);

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_G4_UX_BRIDGE_INPUT: ['FIX_G4_UX_BRIDGE_INPUT'],
  INVALID_GATE_VIEW_ROW: ['FIX_GATE_VIEW_ROW_FIELDS'],
  GATE_VIEW_INCOMPLETE: ['COMPLETE_GATE_VIEW_G1_TO_G5'],
  G4_CORRELATION_MISSING: ['LINK_G4_TECH_AND_UX'],
  UX_EVIDENCE_MISSING: ['INGEST_G4_UX_EVIDENCE'],
  UX_EVIDENCE_INGESTION_TOO_SLOW: ['OPTIMIZE_UX_EVIDENCE_PIPELINE'],
  LATENCY_BUDGET_EXCEEDED: ['OPTIMIZE_GATE_VIEW_PIPELINE']
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

function normalizeReasonCode(value) {
  const normalized = normalizeText(value);

  if (!REASON_CODE_SET.has(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeStatus(value) {
  const normalized = normalizeText(value).toUpperCase();

  if (!STATUS_SET.has(normalized)) {
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

function normalizeGateRows(payload) {
  const candidates = payload.gateView?.rows ?? payload.gates ?? payload.gateViewRows ?? null;

  if (Array.isArray(candidates)) {
    const rows = [];
    const seenGateIds = new Set();

    for (const item of candidates) {
      if (!isObject(item)) {
        return {
          valid: false,
          reasonCode: 'INVALID_GATE_VIEW_ROW',
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
          reasonCode: 'INVALID_GATE_VIEW_ROW',
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
          reasonCode: 'INVALID_GATE_VIEW_ROW',
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
        reason: 'Vue gate incomplète: G1→G5 requis avec status/owner/updatedAt.',
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
          reason: 'Vue gate incomplète: G1→G5 requis avec status/owner/updatedAt.',
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
          reasonCode: 'INVALID_GATE_VIEW_ROW',
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
    reason: 'Vue gate incomplète: G1→G5 requis avec status/owner/updatedAt.',
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

function normalizeG4Node(node, kind) {
  if (!isObject(node)) {
    return {
      valid: false,
      reason: `Noeud ${kind} manquant: status/owner/updatedAt requis.`,
      diagnostics: {
        nodeType: typeof node,
        kind
      }
    };
  }

  const status = normalizeStatus(node.status ?? node.verdict);
  const owner = normalizeText(String(node.owner ?? node.assignee ?? ''));
  const updatedAtMs = parseTimestampMs(node.updatedAt ?? node.timestamp ?? node.at);

  if (!status || owner.length === 0 || updatedAtMs === null) {
    return {
      valid: false,
      reason: `Noeud ${kind} invalide: status/owner/updatedAt requis.`,
      diagnostics: {
        kind,
        status: status ?? null,
        owner,
        updatedAtMs
      }
    };
  }

  return {
    valid: true,
    node: {
      gateId: kind,
      status,
      owner,
      updatedAt: toIso(updatedAtMs)
    }
  };
}

function resolveG4Correlation(payload) {
  const g4 = payload.g4 ?? {};
  const techRaw = g4.tech ?? payload.g4Tech ?? null;
  const uxRaw = g4.ux ?? payload.g4Ux ?? null;

  const tech = normalizeG4Node(techRaw, 'G4-T');
  if (!tech.valid) {
    return {
      valid: false,
      reasonCode: 'G4_CORRELATION_MISSING',
      reason: tech.reason,
      diagnostics: tech.diagnostics
    };
  }

  const ux = normalizeG4Node(uxRaw, 'G4-UX');
  if (!ux.valid) {
    return {
      valid: false,
      reasonCode: 'G4_CORRELATION_MISSING',
      reason: ux.reason,
      diagnostics: ux.diagnostics
    };
  }

  const correlationId = normalizeText(String(g4.correlationId ?? payload.correlationId ?? ''));
  if (correlationId.length === 0) {
    return {
      valid: false,
      reasonCode: 'G4_CORRELATION_MISSING',
      reason: 'Corrélation G4-T/G4-UX manquante: correlationId requis.',
      diagnostics: {
        correlationId: null
      }
    };
  }

  return {
    valid: true,
    node: {
      correlationId,
      g4Tech: tech.node,
      g4Ux: {
        ...ux.node,
        evidenceRefs: normalizeArray(uxRaw.evidenceRefs ?? uxRaw.proofRefs ?? g4.uxEvidenceRefs ?? [])
      },
      correlated: true
    }
  };
}

function resolveUxEvidence(payload, options) {
  const strictEvidence = options.strictEvidence !== false;
  const entries = Array.isArray(payload.uxEvidenceIngestion)
    ? payload.uxEvidenceIngestion
    : Array.isArray(payload.uxEvidence)
      ? payload.uxEvidence
      : [];

  const normalizedEntries = [];
  const delays = [];
  const evidenceRefs = [];
  const seenRefs = new Set();

  for (const entry of entries) {
    if (!isObject(entry)) {
      continue;
    }

    const evidenceRef = normalizeText(String(entry.evidenceRef ?? entry.ref ?? entry.id ?? ''));
    const capturedAtMs = parseTimestampMs(entry.capturedAt ?? entry.proofAt ?? entry.createdAt);
    const ingestedAtMs = parseTimestampMs(entry.ingestedAt ?? entry.updatedAt ?? entry.processedAt);

    if (evidenceRef.length === 0 || capturedAtMs === null || ingestedAtMs === null) {
      continue;
    }

    const ingestionDelayMs = Math.max(0, ingestedAtMs - capturedAtMs);
    delays.push(ingestionDelayMs);

    if (!seenRefs.has(evidenceRef)) {
      seenRefs.add(evidenceRef);
      evidenceRefs.push(evidenceRef);
    }

    normalizedEntries.push({
      evidenceRef,
      capturedAt: toIso(capturedAtMs),
      ingestedAt: toIso(ingestedAtMs),
      ingestionDelayMs
    });
  }

  if (strictEvidence && normalizedEntries.length === 0) {
    return {
      valid: false,
      reasonCode: 'UX_EVIDENCE_MISSING',
      reason: 'Preuves UX manquantes: uxEvidenceIngestion requis pour G4-UX.',
      diagnostics: {
        strictEvidence,
        evidenceCount: normalizedEntries.length
      }
    };
  }

  const ingestionBudgetMs = Number(payload.ingestionBudgetMs ?? options.ingestionBudgetMs ?? 2000);
  if (!Number.isFinite(ingestionBudgetMs) || ingestionBudgetMs <= 0) {
    return {
      valid: false,
      reasonCode: 'INVALID_G4_UX_BRIDGE_INPUT',
      reason: 'ingestionBudgetMs invalide: nombre > 0 requis.',
      diagnostics: {
        ingestionBudgetMs
      }
    };
  }

  const p95IngestionMs = computePercentile(delays, 95);
  if (p95IngestionMs > ingestionBudgetMs) {
    return {
      valid: false,
      reasonCode: 'UX_EVIDENCE_INGESTION_TOO_SLOW',
      reason: `Pipeline UX trop lent: p95=${p95IngestionMs}ms > ${ingestionBudgetMs}ms.`,
      diagnostics: {
        p95IngestionMs,
        ingestionBudgetMs
      }
    };
  }

  return {
    valid: true,
    entries: normalizedEntries,
    evidenceRefs,
    p95IngestionMs,
    ingestionBudgetMs
  };
}

function resolveLatency(payload, options) {
  const latencySamples = Array.isArray(payload.latencySamplesMs)
    ? payload.latencySamplesMs
    : Array.isArray(options.latencySamplesMs)
      ? options.latencySamplesMs
      : [];

  const latencyBudgetMs = Number(payload.latencyBudgetMs ?? options.latencyBudgetMs ?? 2500);
  if (!Number.isFinite(latencyBudgetMs) || latencyBudgetMs <= 0) {
    return {
      valid: false,
      reasonCode: 'INVALID_G4_UX_BRIDGE_INPUT',
      reason: 'latencyBudgetMs invalide: nombre > 0 requis.',
      diagnostics: {
        latencyBudgetMs
      }
    };
  }

  const p95LatencyMs = computePercentile(latencySamples, 95);
  if (p95LatencyMs > latencyBudgetMs) {
    return {
      valid: false,
      reasonCode: 'LATENCY_BUDGET_EXCEEDED',
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

  return cloneValue(DEFAULT_CORRECTIVE_ACTIONS[reasonCode] ?? ['INVESTIGATE_G4_UX_PIPELINE']);
}

function buildInvalidResult({ reasonCode, reason, diagnostics, correctiveActions }) {
  const safeReasonCode = normalizeReasonCode(reasonCode) ?? 'INVALID_G4_UX_BRIDGE_INPUT';

  return {
    allowed: false,
    reasonCode: safeReasonCode,
    reason:
      normalizeText(reason) ||
      'Entrée pont UX G4 invalide: vérifiez gateView, corrélation G4-T/G4-UX et ingestions de preuves.',
    diagnostics: {
      gateCount: 0,
      evidenceCount: 0,
      p95LatencyMs: 0,
      p95IngestionMs: 0,
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
    g4Correlation: {
      correlationId: null,
      g4Tech: null,
      g4Ux: null,
      correlated: false,
      uxEvidenceIngestion: {
        evidenceRefs: [],
        entries: [],
        p95IngestionMs: 0,
        ingestionBudgetMs: 2000,
        withinSla: false
      }
    },
    correctiveActions: normalizeInvalidCorrectiveActions(safeReasonCode, correctiveActions)
  };
}

export function bridgeUxEvidenceToG4(input, options = {}) {
  if (!isObject(input)) {
    return buildInvalidResult({
      reasonCode: 'INVALID_G4_UX_BRIDGE_INPUT',
      reason: 'Entrée invalide: objet attendu.',
      diagnostics: {
        inputType: typeof input
      }
    });
  }

  const payload = cloneValue(input);
  const runtimeOptions = isObject(options) ? options : {};

  const gateResolution = normalizeGateRows(payload);
  if (!gateResolution.valid) {
    return buildInvalidResult({
      reasonCode: gateResolution.reasonCode,
      reason: gateResolution.reason,
      diagnostics: gateResolution.diagnostics
    });
  }

  const g4Resolution = resolveG4Correlation(payload);
  if (!g4Resolution.valid) {
    return buildInvalidResult({
      reasonCode: g4Resolution.reasonCode,
      reason: g4Resolution.reason,
      diagnostics: g4Resolution.diagnostics
    });
  }

  const evidenceResolution = resolveUxEvidence(payload, runtimeOptions);
  if (!evidenceResolution.valid) {
    return buildInvalidResult({
      reasonCode: evidenceResolution.reasonCode,
      reason: evidenceResolution.reason,
      diagnostics: evidenceResolution.diagnostics
    });
  }

  const latencyResolution = resolveLatency(payload, runtimeOptions);
  if (!latencyResolution.valid) {
    return buildInvalidResult({
      reasonCode: latencyResolution.reasonCode,
      reason: latencyResolution.reason,
      diagnostics: latencyResolution.diagnostics
    });
  }

  const gateTotals = summarizeGateRows(gateResolution.rows);

  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Pont UX→G4-UX prêt: vue G1→G5 complète et corrélation G4-T/G4-UX valide.',
    diagnostics: {
      gateCount: gateResolution.rows.length,
      evidenceCount: evidenceResolution.entries.length,
      p95LatencyMs: latencyResolution.p95LatencyMs,
      latencyBudgetMs: latencyResolution.latencyBudgetMs,
      p95IngestionMs: evidenceResolution.p95IngestionMs,
      ingestionBudgetMs: evidenceResolution.ingestionBudgetMs,
      sourceReasonCode: 'OK'
    },
    gateView: {
      rows: gateResolution.rows,
      totals: gateTotals
    },
    g4Correlation: {
      ...g4Resolution.node,
      uxEvidenceIngestion: {
        evidenceRefs: evidenceResolution.evidenceRefs,
        entries: evidenceResolution.entries,
        p95IngestionMs: evidenceResolution.p95IngestionMs,
        ingestionBudgetMs: evidenceResolution.ingestionBudgetMs,
        withinSla: evidenceResolution.p95IngestionMs <= evidenceResolution.ingestionBudgetMs
      }
    },
    correctiveActions: []
  };
}
