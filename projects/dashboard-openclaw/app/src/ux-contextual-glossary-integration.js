import { buildUxDebtReductionLane } from './ux-debt-reduction-lane.js';

const DEFAULT_REQUIRED_VIEWPORTS = Object.freeze(['mobile', 'tablet', 'desktop']);

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_UX_GLOSSARY_INPUT: ['FIX_UX_GLOSSARY_INPUT_STRUCTURE'],
  UX_GLOSSARY_ENTRIES_REQUIRED: ['DECLARE_CONTEXTUAL_BMAD_GLOSSARY_ENTRIES'],
  UX_GLOSSARY_CONTEXT_SLOTS_REQUIRED: ['DECLARE_CONTEXTUAL_GLOSSARY_SLOTS'],
  UX_GLOSSARY_CONTEXT_MAPPING_REQUIRED: ['MAP_ALL_CONTEXT_SLOTS_TO_VALID_BMAD_DEFINITIONS'],
  UX_DESIGN_SYSTEM_CHECKS_REQUIRED: ['DECLARE_DESIGN_SYSTEM_CHECKS_FOR_GLOSSARY_SURFACES'],
  UX_DESIGN_SYSTEM_CONSISTENCY_REQUIRED: ['FIX_SPACING_TYPO_COLOR_INCONSISTENCIES'],
  UX_GLOSSARY_RESPONSIVE_REQUIRED: ['VALIDATE_GLOSSARY_RESPONSIVE_READABILITY_ON_REQUIRED_VIEWPORTS']
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

function roundScore(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Number(numeric.toFixed(2));
}

function toIso(valueMs) {
  return new Date(valueMs).toISOString();
}

function normalizeViewportList(value) {
  if (!Array.isArray(value)) {
    return cloneValue(DEFAULT_REQUIRED_VIEWPORTS);
  }

  const output = [];
  const seen = new Set();

  for (const viewport of value) {
    const normalized = normalizeText(String(viewport ?? '')).toLowerCase();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(normalized);
  }

  return output.length > 0 ? output : cloneValue(DEFAULT_REQUIRED_VIEWPORTS);
}

function resolveRules(payload, runtimeOptions) {
  const source =
    (isObject(runtimeOptions.uxGlossaryRules) && runtimeOptions.uxGlossaryRules) ||
    (isObject(payload.uxGlossaryRules) && payload.uxGlossaryRules) ||
    {};

  return {
    modelVersion:
      normalizeText(String(source.modelVersion ?? payload.uxGlossaryModelVersion ?? 'S067-v1')) ||
      'S067-v1',
    requiredViewports: normalizeViewportList(
      source.requiredViewports ?? payload.requiredViewports ?? runtimeOptions.requiredViewports
    )
  };
}

function resolveGlossaryEntries(payload) {
  const source = Array.isArray(payload.contextualGlossary)
    ? payload.contextualGlossary
    : Array.isArray(payload.bmadDefinitions)
      ? payload.bmadDefinitions
      : [];

  if (source.length === 0) {
    return {
      valid: false,
      reasonCode: 'UX_GLOSSARY_ENTRIES_REQUIRED',
      reason: 'FR-069 non satisfait: entrées de glossaire BMAD contextuel absentes.'
    };
  }

  const entries = [];
  const byId = new Map();

  for (let index = 0; index < source.length; index += 1) {
    const entry = source[index];

    if (!isObject(entry)) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_GLOSSARY_INPUT',
        reason: `contextualGlossary[${index}] invalide: objet requis.`
      };
    }

    const id = normalizeText(String(entry.id ?? entry.code ?? `DEF-${index + 1}`)) || `DEF-${index + 1}`;
    const term = normalizeText(String(entry.term ?? entry.label ?? ''));
    const definition = normalizeText(String(entry.definition ?? entry.description ?? ''));

    if (!term || !definition) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_GLOSSARY_INPUT',
        reason: `${id}: term/definition requis dans le glossaire contextuel.`
      };
    }

    if (byId.has(id)) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_GLOSSARY_INPUT',
        reason: `Glossary entry dupliquée: ${id}.`
      };
    }

    const contexts = Array.isArray(entry.contexts)
      ? entry.contexts
          .map((context) => normalizeText(String(context ?? '')).toLowerCase())
          .filter((context, idx, arr) => context.length > 0 && arr.indexOf(context) === idx)
      : [];

    const normalized = {
      id,
      term,
      definition,
      contexts,
      category: normalizeText(String(entry.category ?? entry.domain ?? '')) || null
    };

    byId.set(id, normalized);
    entries.push(normalized);
  }

  return {
    valid: true,
    entries,
    byId
  };
}

function resolveContextSlots(payload, glossaryMap) {
  const source = Array.isArray(payload.contextualSlots)
    ? payload.contextualSlots
    : Array.isArray(payload.uiContexts)
      ? payload.uiContexts
      : [];

  if (source.length === 0) {
    return {
      valid: false,
      reasonCode: 'UX_GLOSSARY_CONTEXT_SLOTS_REQUIRED',
      reason: 'FR-069 non satisfait: emplacements contextuels du glossaire absents.'
    };
  }

  const slots = [];

  for (let index = 0; index < source.length; index += 1) {
    const slot = source[index];

    if (!isObject(slot)) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_GLOSSARY_INPUT',
        reason: `contextualSlots[${index}] invalide: objet requis.`
      };
    }

    const id = normalizeText(String(slot.id ?? slot.slotId ?? `SLOT-${index + 1}`)) || `SLOT-${index + 1}`;
    const label = normalizeText(String(slot.label ?? slot.context ?? id)) || id;
    const definitionRef = normalizeText(String(slot.definitionRef ?? slot.glossaryRef ?? slot.ref ?? ''));

    if (!definitionRef) {
      return {
        valid: false,
        reasonCode: 'UX_GLOSSARY_CONTEXT_MAPPING_REQUIRED',
        reason: `${id}: definitionRef requis pour le contexte UX.`
      };
    }

    const mappedEntry = glossaryMap.get(definitionRef);
    const mapped = Boolean(mappedEntry);

    slots.push({
      id,
      label,
      context: normalizeText(String(slot.context ?? slot.surface ?? '')).toLowerCase() || null,
      definitionRef,
      mapped,
      mappedTerm: mappedEntry?.term ?? null
    });
  }

  return {
    valid: true,
    slots
  };
}

function resolveDesignSystemChecks(payload) {
  const source = Array.isArray(payload.designSystemChecks)
    ? payload.designSystemChecks
    : Array.isArray(payload.designConsistencyChecks)
      ? payload.designConsistencyChecks
      : [];

  if (source.length === 0) {
    return {
      valid: false,
      reasonCode: 'UX_DESIGN_SYSTEM_CHECKS_REQUIRED',
      reason: 'FR-070 non satisfait: checks design system absents.'
    };
  }

  const checks = [];

  for (let index = 0; index < source.length; index += 1) {
    const entry = source[index];

    if (!isObject(entry)) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_GLOSSARY_INPUT',
        reason: `designSystemChecks[${index}] invalide: objet requis.`
      };
    }

    const id = normalizeText(String(entry.id ?? entry.surface ?? `CHECK-${index + 1}`)) || `CHECK-${index + 1}`;

    const spacingPass =
      entry.spacingPass === true ||
      entry.spacing === 'PASS' ||
      entry.spacingStatus === 'PASS';

    const typographyPass =
      entry.typographyPass === true ||
      entry.typography === 'PASS' ||
      entry.typographyStatus === 'PASS';

    const colorPass =
      entry.colorPass === true ||
      entry.color === 'PASS' ||
      entry.colorStatus === 'PASS';

    const pass = spacingPass && typographyPass && colorPass;

    checks.push({
      id,
      spacingPass,
      typographyPass,
      colorPass,
      pass
    });
  }

  return {
    valid: true,
    checks
  };
}

function resolveResponsiveChecks(payload, requiredViewports) {
  const source = Array.isArray(payload.responsiveChecks)
    ? payload.responsiveChecks
    : Array.isArray(payload.responsiveGlossaryChecks)
      ? payload.responsiveGlossaryChecks
      : [];

  const byViewport = new Map();

  for (const entry of source) {
    const viewport = normalizeText(String(entry?.viewport ?? entry?.name ?? '')).toLowerCase();

    if (!viewport) {
      continue;
    }

    const pass =
      entry?.pass === true ||
      (entry?.readable === true && entry?.noHorizontalOverflow === true) ||
      (entry?.status === 'PASS' || entry?.status === 'pass');

    byViewport.set(viewport, {
      viewport,
      readable: entry?.readable !== false,
      noHorizontalOverflow: entry?.noHorizontalOverflow !== false,
      pass
    });
  }

  const checks = requiredViewports.map((viewport) => {
    const existing = byViewport.get(viewport);

    if (existing) {
      return existing;
    }

    return {
      viewport,
      readable: false,
      noHorizontalOverflow: false,
      pass: false
    };
  });

  return {
    checks,
    failing: checks.filter((entry) => entry.pass === false)
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  uxAudit,
  criticalWidgetStateContract,
  uxDebtReductionLane,
  contextualGlossaryIntegration,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode: normalizeText(String(reasonCode || 'INVALID_UX_GLOSSARY_INPUT')),
    reason,
    diagnostics: cloneValue(diagnostics ?? {}),
    uxAudit: cloneValue(uxAudit ?? null),
    criticalWidgetStateContract: cloneValue(criticalWidgetStateContract ?? null),
    uxDebtReductionLane: cloneValue(uxDebtReductionLane ?? null),
    contextualGlossaryIntegration: cloneValue(contextualGlossaryIntegration ?? null),
    correctiveActions: normalizeActions(correctiveActions, reasonCode)
  };
}

export function buildUxContextualGlossaryIntegration(payload, runtimeOptions = {}) {
  if (!isObject(payload)) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_UX_GLOSSARY_INPUT',
      reason: 'Entrée S067 invalide: objet requis.'
    });
  }

  const rules = resolveRules(payload, runtimeOptions);

  const baseResult = buildUxDebtReductionLane(payload, runtimeOptions);

  if (!baseResult.allowed) {
    return createResult({
      allowed: false,
      reasonCode: baseResult.reasonCode,
      reason: baseResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        uxGlossaryModelVersion: rules.modelVersion
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: null,
      correctiveActions: baseResult.correctiveActions
    });
  }

  const glossaryResult = resolveGlossaryEntries(payload);

  if (!glossaryResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: glossaryResult.reasonCode,
      reason: glossaryResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        uxGlossaryModelVersion: rules.modelVersion
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: null
    });
  }

  const slotsResult = resolveContextSlots(payload, glossaryResult.byId);

  if (!slotsResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: slotsResult.reasonCode,
      reason: slotsResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        uxGlossaryModelVersion: rules.modelVersion,
        glossaryEntryCount: glossaryResult.entries.length
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: null
    });
  }

  const designResult = resolveDesignSystemChecks(payload);

  if (!designResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: designResult.reasonCode,
      reason: designResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        uxGlossaryModelVersion: rules.modelVersion,
        glossaryEntryCount: glossaryResult.entries.length,
        contextualSlotCount: slotsResult.slots.length
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: null
    });
  }

  const responsiveResult = resolveResponsiveChecks(payload, rules.requiredViewports);

  const unmappedSlots = slotsResult.slots.filter((slot) => slot.mapped === false);
  const failedDesignChecks = designResult.checks.filter((check) => check.pass === false);

  const contextualGlossaryIntegration = {
    model: 'UX_CONTEXTUAL_GLOSSARY_INTEGRATION',
    modelVersion: rules.modelVersion,
    generatedAt: toIso(Number.isFinite(Number(runtimeOptions.nowMs)) ? Number(runtimeOptions.nowMs) : Date.now()),
    thresholds: {
      requiredViewports: cloneValue(rules.requiredViewports)
    },
    glossaryEntries: glossaryResult.entries,
    contextualSlots: slotsResult.slots,
    designSystemChecks: designResult.checks,
    responsiveChecks: responsiveResult.checks,
    summary: {
      glossaryEntryCount: glossaryResult.entries.length,
      contextualSlotCount: slotsResult.slots.length,
      mappedSlotCount: slotsResult.slots.length - unmappedSlots.length,
      designSystemCoveragePct:
        designResult.checks.length === 0
          ? 0
          : roundScore(((designResult.checks.length - failedDesignChecks.length) / designResult.checks.length) * 100),
      responsiveCoveragePct:
        responsiveResult.checks.length === 0
          ? 0
          : roundScore(
              ((responsiveResult.checks.length - responsiveResult.failing.length) / responsiveResult.checks.length) * 100
            )
    }
  };

  const diagnostics = {
    ...baseResult.diagnostics,
    uxGlossaryModelVersion: rules.modelVersion,
    glossaryEntryCount: glossaryResult.entries.length,
    contextualSlotCount: slotsResult.slots.length,
    mappedSlotCount: slotsResult.slots.length - unmappedSlots.length,
    failedDesignCheckCount: failedDesignChecks.length,
    responsiveFailing: responsiveResult.failing.map((entry) => entry.viewport)
  };

  if (unmappedSlots.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_GLOSSARY_CONTEXT_MAPPING_REQUIRED',
      reason:
        'FR-069 non satisfait: tous les contextes UX doivent être liés à des définitions BMAD valides.',
      diagnostics: {
        ...diagnostics,
        unmappedSlots: unmappedSlots.map((slot) => ({ id: slot.id, definitionRef: slot.definitionRef }))
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration
    });
  }

  if (failedDesignChecks.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_DESIGN_SYSTEM_CONSISTENCY_REQUIRED',
      reason:
        'FR-070 non satisfait: incohérences spacing/typo/couleurs détectées dans les surfaces du glossaire.',
      diagnostics: {
        ...diagnostics,
        failedDesignChecks
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration
    });
  }

  if (responsiveResult.failing.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_GLOSSARY_RESPONSIVE_REQUIRED',
      reason:
        'NFR-032 non satisfait: le glossaire contextuel doit rester lisible sur mobile/tablette/desktop.',
      diagnostics,
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason:
      'Glossaire BMAD contextuel intégré avec cohérence design system et couverture responsive validées.',
    diagnostics,
    uxAudit: baseResult.uxAudit,
    criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
    uxDebtReductionLane: baseResult.uxDebtReductionLane,
    contextualGlossaryIntegration,
    correctiveActions: []
  });
}
