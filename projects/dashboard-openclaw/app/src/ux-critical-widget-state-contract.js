const REQUIRED_STATES = Object.freeze(['empty', 'loading', 'error', 'success']);

const DEFAULT_MIN_UX_SCORE = 85;
const DEFAULT_MAX_BLOCKERS = 0;

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_UX_CRITICAL_WIDGET_STATE_INPUT: ['FIX_UX_CRITICAL_WIDGET_STATE_INPUT_STRUCTURE'],
  UX_CRITICAL_WIDGETS_REQUIRED: ['DECLARE_CRITICAL_WIDGETS_IN_SCOPE'],
  UX_WIDGET_FOUR_STATES_REQUIRED: ['IMPLEMENT_MISSING_WIDGET_STATES'],
  UX_KEYBOARD_NAVIGATION_REQUIRED: ['RESTORE_LOGICAL_KEYBOARD_NAVIGATION'],
  UX_AUDIT_THRESHOLD_NOT_MET: ['RAISE_UX_AUDIT_SCORE_TO_THRESHOLD'],
  UX_AUDIT_BLOCKER_PRESENT: ['RESOLVE_UX_BLOCKERS_BEFORE_PASS']
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

  const output = {};

  for (const [key, nested] of Object.entries(value)) {
    output[key] = cloneValue(nested);
  }

  return output;
}

function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function roundScore(value) {
  return Number(normalizeNumber(value).toFixed(2));
}

function toIso(valueMs) {
  return new Date(valueMs).toISOString();
}

function normalizeActions(actions, reasonCode) {
  const defaults = DEFAULT_CORRECTIVE_ACTIONS[reasonCode] ?? [];

  if (!Array.isArray(actions)) {
    return cloneValue(defaults);
  }

  const output = [];
  const seen = new Set();

  for (const action of actions) {
    const normalized = normalizeText(String(action ?? ''));

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(normalized);
  }

  return output.length > 0 ? output : cloneValue(defaults);
}

function normalizeFocusOrder(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const output = [];
  const seen = new Set();

  for (const item of value) {
    const normalized = normalizeText(String(item ?? ''));

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(normalized);
  }

  return output;
}

function hasStatePayload(statePayload) {
  if (typeof statePayload === 'string') {
    return normalizeText(statePayload).length > 0;
  }

  if (isObject(statePayload)) {
    const copy = normalizeText(String(statePayload.copy ?? statePayload.label ?? statePayload.text ?? ''));

    if (copy) {
      return true;
    }

    return Object.keys(statePayload).length > 0;
  }

  return false;
}

function resolveRules(payload, runtimeOptions) {
  const source =
    (isObject(runtimeOptions.widgetStateRules) && runtimeOptions.widgetStateRules) ||
    (isObject(payload.widgetStateRules) && payload.widgetStateRules) ||
    {};

  return {
    modelVersion:
      normalizeText(String(source.modelVersion ?? payload.widgetStateModelVersion ?? 'S061-v1')) ||
      'S061-v1',
    minUxScore: Math.max(
      0,
      normalizeNumber(source.minUxScore ?? payload.minUxScore ?? runtimeOptions.minUxScore ?? DEFAULT_MIN_UX_SCORE, DEFAULT_MIN_UX_SCORE)
    ),
    maxBlockers: Math.max(
      0,
      Math.trunc(
        normalizeNumber(
          source.maxBlockers ?? payload.maxBlockers ?? runtimeOptions.maxBlockers ?? DEFAULT_MAX_BLOCKERS,
          DEFAULT_MAX_BLOCKERS
        )
      )
    )
  };
}

function resolveUxAudit(payload, runtimeOptions) {
  const source =
    (isObject(runtimeOptions.uxAudit) && runtimeOptions.uxAudit) ||
    (isObject(payload.uxAudit) && payload.uxAudit) ||
    {};

  const score = roundScore(
    normalizeNumber(
      source.score ?? source.designExcellence ?? source.accessibilityScore ?? payload.designExcellence ?? 0,
      0
    )
  );

  const blockerCount = Math.max(
    0,
    Math.trunc(normalizeNumber(source.blockerCount ?? source.blockers ?? payload.uxBlockers ?? 0, 0))
  );

  return {
    score,
    blockerCount,
    wcagLevel: normalizeText(String(source.wcagLevel ?? source.standard ?? 'WCAG-2.2-AA')) || 'WCAG-2.2-AA'
  };
}

function parseWidget(widget, index) {
  if (!isObject(widget)) {
    return {
      valid: false,
      reason: `criticalWidgets[${index}] invalide: objet requis.`
    };
  }

  const id = normalizeText(String(widget.id ?? widget.widgetId ?? `WIDGET-${index + 1}`)) || `WIDGET-${index + 1}`;
  const label = normalizeText(String(widget.label ?? widget.title ?? id)) || id;

  const statesSource = isObject(widget.states) ? widget.states : {};

  const states = {};
  const missingStates = [];

  for (const state of REQUIRED_STATES) {
    const statePayload = statesSource[state];
    const available = hasStatePayload(statePayload);

    if (!available) {
      missingStates.push(state);
    }

    states[state] = {
      available,
      copy:
        typeof statePayload === 'string'
          ? normalizeText(statePayload) || null
          : normalizeText(String(statePayload?.copy ?? statePayload?.label ?? statePayload?.text ?? '')) || null
    };
  }

  const availableStates = REQUIRED_STATES.length - missingStates.length;
  const stateCoveragePct = roundScore((availableStates / REQUIRED_STATES.length) * 100);

  const keyboardSource = isObject(widget.keyboard) ? widget.keyboard : {};
  const focusOrder = normalizeFocusOrder(
    keyboardSource.focusOrder ?? keyboardSource.tabOrder ?? keyboardSource.sequence ?? []
  );
  const focusVisible = keyboardSource.focusVisible === true || keyboardSource.focusRing === true;
  const logicalOrder = keyboardSource.logicalOrder !== false;
  const trapFree = keyboardSource.trapFree !== false;

  const keyboardComplete = focusOrder.length > 0 && focusVisible && logicalOrder && trapFree;

  return {
    valid: true,
    widget: {
      id,
      label,
      states,
      missingStates,
      stateCoveragePct,
      keyboard: {
        focusOrder,
        focusVisible,
        logicalOrder,
        trapFree,
        complete: keyboardComplete
      },
      compliant: missingStates.length === 0 && keyboardComplete
    }
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  uxAudit,
  criticalWidgetStateContract,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode: normalizeText(String(reasonCode || 'INVALID_UX_CRITICAL_WIDGET_STATE_INPUT')),
    reason,
    diagnostics: cloneValue(diagnostics ?? {}),
    uxAudit: cloneValue(uxAudit ?? null),
    criticalWidgetStateContract: cloneValue(criticalWidgetStateContract ?? null),
    correctiveActions: normalizeActions(correctiveActions, reasonCode)
  };
}

export function buildUxCriticalWidgetStateContract(payload, runtimeOptions = {}) {
  if (!isObject(payload)) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_UX_CRITICAL_WIDGET_STATE_INPUT',
      reason: 'Entrée S061 invalide: objet requis.'
    });
  }

  const rules = resolveRules(payload, runtimeOptions);
  const uxAudit = resolveUxAudit(payload, runtimeOptions);

  const widgetsSource = Array.isArray(payload.criticalWidgets)
    ? payload.criticalWidgets
    : Array.isArray(payload.widgets)
      ? payload.widgets
      : [];

  if (widgetsSource.length === 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_CRITICAL_WIDGETS_REQUIRED',
      reason: 'FR-063 non satisfait: aucun widget critique déclaré.',
      diagnostics: {
        widgetStateModelVersion: rules.modelVersion,
        criticalWidgetCount: 0
      },
      uxAudit,
      criticalWidgetStateContract: {
        model: 'UX_CRITICAL_WIDGET_STATE_CONTRACT',
        modelVersion: rules.modelVersion,
        generatedAt: toIso(Date.now()),
        widgets: [],
        summary: {
          criticalWidgetCount: 0,
          fullyCompliantCount: 0,
          fourStateCoveragePct: 0,
          keyboardCoveragePct: 0,
          uxScore: uxAudit.score,
          blockerCount: uxAudit.blockerCount
        }
      }
    });
  }

  const parsedWidgets = [];

  for (let index = 0; index < widgetsSource.length; index += 1) {
    const parsed = parseWidget(widgetsSource[index], index);

    if (!parsed.valid) {
      return createResult({
        allowed: false,
        reasonCode: 'INVALID_UX_CRITICAL_WIDGET_STATE_INPUT',
        reason: parsed.reason,
        diagnostics: {
          widgetStateModelVersion: rules.modelVersion,
          widgetIndex: index
        },
        uxAudit
      });
    }

    parsedWidgets.push(parsed.widget);
  }

  const criticalWidgetCount = parsedWidgets.length;
  const fullyCompliantCount = parsedWidgets.filter((entry) => entry.compliant).length;
  const fourStatesReadyCount = parsedWidgets.filter((entry) => entry.missingStates.length === 0).length;
  const keyboardReadyCount = parsedWidgets.filter((entry) => entry.keyboard.complete).length;

  const fourStateCoveragePct = roundScore((fourStatesReadyCount / criticalWidgetCount) * 100);
  const keyboardCoveragePct = roundScore((keyboardReadyCount / criticalWidgetCount) * 100);

  const summary = {
    criticalWidgetCount,
    fullyCompliantCount,
    fourStateCoveragePct,
    keyboardCoveragePct,
    uxScore: uxAudit.score,
    blockerCount: uxAudit.blockerCount,
    wcagLevel: uxAudit.wcagLevel
  };

  const contract = {
    model: 'UX_CRITICAL_WIDGET_STATE_CONTRACT',
    modelVersion: rules.modelVersion,
    generatedAt: toIso(Number.isFinite(Number(runtimeOptions.nowMs)) ? Number(runtimeOptions.nowMs) : Date.now()),
    thresholds: {
      minUxScore: rules.minUxScore,
      maxBlockers: rules.maxBlockers,
      requiredStates: cloneValue(REQUIRED_STATES)
    },
    widgets: parsedWidgets,
    summary
  };

  const diagnostics = {
    widgetStateModelVersion: rules.modelVersion,
    criticalWidgetCount,
    fullyCompliantCount,
    fourStateCoveragePct,
    keyboardCoveragePct,
    uxScore: uxAudit.score,
    uxMinScore: rules.minUxScore,
    blockerCount: uxAudit.blockerCount,
    blockerLimit: rules.maxBlockers
  };

  if (uxAudit.score < rules.minUxScore) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_AUDIT_THRESHOLD_NOT_MET',
      reason: `NFR-030 non satisfait: score UX ${uxAudit.score} < ${rules.minUxScore}.`,
      diagnostics,
      uxAudit,
      criticalWidgetStateContract: contract
    });
  }

  if (uxAudit.blockerCount > rules.maxBlockers) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_AUDIT_BLOCKER_PRESENT',
      reason: `NFR-030 non satisfait: blockers UX ${uxAudit.blockerCount} > ${rules.maxBlockers}.`,
      diagnostics,
      uxAudit,
      criticalWidgetStateContract: contract
    });
  }

  if (fourStateCoveragePct < 100) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_WIDGET_FOUR_STATES_REQUIRED',
      reason: 'FR-063 non satisfait: tous les widgets critiques doivent couvrir empty/loading/error/success.',
      diagnostics: {
        ...diagnostics,
        widgetsMissingStates: parsedWidgets
          .filter((entry) => entry.missingStates.length > 0)
          .map((entry) => ({ id: entry.id, missingStates: entry.missingStates }))
      },
      uxAudit,
      criticalWidgetStateContract: contract
    });
  }

  if (keyboardCoveragePct < 100) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_KEYBOARD_NAVIGATION_REQUIRED',
      reason: 'FR-064 non satisfait: navigation clavier complète + focus visible requis.',
      diagnostics: {
        ...diagnostics,
        widgetsKeyboardGap: parsedWidgets
          .filter((entry) => entry.keyboard.complete === false)
          .map((entry) => ({
            id: entry.id,
            focusOrderCount: entry.keyboard.focusOrder.length,
            focusVisible: entry.keyboard.focusVisible,
            logicalOrder: entry.keyboard.logicalOrder,
            trapFree: entry.keyboard.trapFree
          }))
      },
      uxAudit,
      criticalWidgetStateContract: contract
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: 'Contrat 4 états validé sur 100% des widgets critiques avec navigation clavier complète.',
    diagnostics,
    uxAudit,
    criticalWidgetStateContract: contract,
    correctiveActions: []
  });
}
