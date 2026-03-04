import { buildUxCriticalWidgetStateContract } from './ux-critical-widget-state-contract.js';

const DEFAULT_MIN_CONTRAST_RATIO = 4.5;
const DEFAULT_REQUIRED_VIEWPORTS = Object.freeze(['mobile', 'tablet', 'desktop']);

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_UX_KEYBOARD_FOCUS_INPUT: ['FIX_UX_KEYBOARD_FOCUS_INPUT_STRUCTURE'],
  UX_CRITICAL_SURFACES_REQUIRED: ['DECLARE_CRITICAL_SURFACES_WITH_COLORS'],
  UX_SURFACE_CONTRAST_REQUIRED: ['RAISE_SURFACE_CONTRAST_TO_WCAG_AA'],
  UX_RESPONSIVE_VALIDATION_REQUIRED: ['VALIDATE_RESPONSIVE_JOURNEYS_FOR_REQUIRED_VIEWPORTS'],
  UX_KEYBOARD_NAVIGATION_REQUIRED: ['RESTORE_LOGICAL_KEYBOARD_NAVIGATION']
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

function parseHexColor(value) {
  const normalized = normalizeText(String(value ?? '')).replace(/^#/, '');

  if (/^[0-9a-fA-F]{3}$/.test(normalized)) {
    return normalized.split('').map((ch) => Number.parseInt(`${ch}${ch}`, 16));
  }

  if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return [
      Number.parseInt(normalized.slice(0, 2), 16),
      Number.parseInt(normalized.slice(2, 4), 16),
      Number.parseInt(normalized.slice(4, 6), 16)
    ];
  }

  return null;
}

function srgbToLinear(channel) {
  const ratio = channel / 255;

  if (ratio <= 0.03928) {
    return ratio / 12.92;
  }

  return ((ratio + 0.055) / 1.055) ** 2.4;
}

function calculateContrastRatio(foreground, background) {
  const fg = parseHexColor(foreground);
  const bg = parseHexColor(background);

  if (!fg || !bg) {
    return Number.NaN;
  }

  const l1 = 0.2126 * srgbToLinear(fg[0]) + 0.7152 * srgbToLinear(fg[1]) + 0.0722 * srgbToLinear(fg[2]);
  const l2 = 0.2126 * srgbToLinear(bg[0]) + 0.7152 * srgbToLinear(bg[1]) + 0.0722 * srgbToLinear(bg[2]);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

function resolveContrastSurfaces(payload) {
  const source = Array.isArray(payload.criticalSurfaces)
    ? payload.criticalSurfaces
    : Array.isArray(payload.surfaces)
      ? payload.surfaces
      : [];

  const surfaces = [];

  for (let index = 0; index < source.length; index += 1) {
    const surface = source[index];

    if (!isObject(surface)) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_KEYBOARD_FOCUS_INPUT',
        reason: `criticalSurfaces[${index}] invalide: objet requis.`
      };
    }

    const id = normalizeText(String(surface.id ?? `SURFACE-${index + 1}`)) || `SURFACE-${index + 1}`;
    const foreground = normalizeText(String(surface.foreground ?? surface.textColor ?? ''));
    const background = normalizeText(String(surface.background ?? surface.backgroundColor ?? ''));

    const minContrastRatio = Math.max(
      1,
      normalizeNumber(surface.minContrastRatio ?? surface.requiredRatio, DEFAULT_MIN_CONTRAST_RATIO)
    );

    const explicitRatio = Number(surface.contrastRatio ?? surface.ratio);
    const ratioRaw = Number.isFinite(explicitRatio)
      ? explicitRatio
      : calculateContrastRatio(foreground, background);
    const hasRatio = Number.isFinite(ratioRaw);
    const contrastRatio = hasRatio ? roundScore(ratioRaw) : null;

    surfaces.push({
      id,
      foreground: foreground || null,
      background: background || null,
      contrastRatio,
      minContrastRatio: roundScore(minContrastRatio),
      passesContrast: hasRatio && ratioRaw >= minContrastRatio
    });
  }

  return {
    valid: true,
    surfaces
  };
}

function resolveResponsiveCoverage(payload) {
  const source = Array.isArray(payload.responsive?.viewports)
    ? payload.responsive.viewports
    : Array.isArray(payload.responsiveViewports)
      ? payload.responsiveViewports
      : [];

  const map = new Map();

  for (const viewportEntry of source) {
    const viewport = normalizeText(String(viewportEntry?.viewport ?? viewportEntry?.name ?? '')).toLowerCase();

    if (!viewport) {
      continue;
    }

    const pass =
      viewportEntry?.criticalFlowValidated === true &&
      viewportEntry?.keyboardNavigationValidated === true &&
      viewportEntry?.focusVisibleValidated === true &&
      viewportEntry?.noHorizontalOverflow === true;

    map.set(viewport, {
      viewport,
      criticalFlowValidated: viewportEntry?.criticalFlowValidated === true,
      keyboardNavigationValidated: viewportEntry?.keyboardNavigationValidated === true,
      focusVisibleValidated: viewportEntry?.focusVisibleValidated === true,
      noHorizontalOverflow: viewportEntry?.noHorizontalOverflow === true,
      pass
    });
  }

  const checkpoints = DEFAULT_REQUIRED_VIEWPORTS.map((viewport) => {
    const existing = map.get(viewport);

    if (existing) {
      return existing;
    }

    return {
      viewport,
      criticalFlowValidated: false,
      keyboardNavigationValidated: false,
      focusVisibleValidated: false,
      noHorizontalOverflow: false,
      pass: false
    };
  });

  return {
    checkpoints,
    missingViewports: checkpoints.filter((entry) => entry.pass === false).map((entry) => entry.viewport)
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  uxAudit,
  criticalWidgetStateContract,
  keyboardFocusVisibilityContract,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode: normalizeText(String(reasonCode || 'INVALID_UX_KEYBOARD_FOCUS_INPUT')),
    reason,
    diagnostics: cloneValue(diagnostics ?? {}),
    uxAudit: cloneValue(uxAudit ?? null),
    criticalWidgetStateContract: cloneValue(criticalWidgetStateContract ?? null),
    keyboardFocusVisibilityContract: cloneValue(keyboardFocusVisibilityContract ?? null),
    correctiveActions: normalizeActions(correctiveActions, reasonCode)
  };
}

function mapBaseReasonCode(reasonCode) {
  if (reasonCode === 'INVALID_UX_CRITICAL_WIDGET_STATE_INPUT') {
    return 'INVALID_UX_KEYBOARD_FOCUS_INPUT';
  }

  return reasonCode;
}

export function buildUxKeyboardFocusVisibilityContract(payload, runtimeOptions = {}) {
  if (!isObject(payload)) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_UX_KEYBOARD_FOCUS_INPUT',
      reason: 'Entrée S062 invalide: objet requis.'
    });
  }

  const modelVersion =
    normalizeText(String(payload.keyboardFocusVisibilityModelVersion ?? payload.keyboardFocusModelVersion ?? 'S062-v1')) ||
    'S062-v1';

  const baseResult = buildUxCriticalWidgetStateContract(payload, runtimeOptions);

  if (!baseResult.allowed) {
    return createResult({
      allowed: false,
      reasonCode: mapBaseReasonCode(baseResult.reasonCode),
      reason: baseResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        keyboardFocusModelVersion: modelVersion
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      keyboardFocusVisibilityContract: null,
      correctiveActions: baseResult.correctiveActions
    });
  }

  const surfacesResult = resolveContrastSurfaces(payload);

  if (!surfacesResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: surfacesResult.reasonCode,
      reason: surfacesResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        keyboardFocusModelVersion: modelVersion
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      keyboardFocusVisibilityContract: null
    });
  }

  if (surfacesResult.surfaces.length === 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_CRITICAL_SURFACES_REQUIRED',
      reason: 'FR-065 non satisfait: aucune surface critique déclarée.',
      diagnostics: {
        ...baseResult.diagnostics,
        keyboardFocusModelVersion: modelVersion,
        surfacesContrastGap: []
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      keyboardFocusVisibilityContract: null
    });
  }

  const surfacesContrastGap = surfacesResult.surfaces.filter((surface) => surface.passesContrast === false);
  const responsiveResult = resolveResponsiveCoverage(payload);

  const contrastCoveragePct = roundScore(
    (surfacesResult.surfaces.filter((surface) => surface.passesContrast).length / surfacesResult.surfaces.length) * 100
  );

  const responsiveCoveragePct = roundScore(
    ((DEFAULT_REQUIRED_VIEWPORTS.length - responsiveResult.missingViewports.length) / DEFAULT_REQUIRED_VIEWPORTS.length) *
      100
  );

  const fourStateCoveragePct = roundScore(
    normalizeNumber(
      baseResult.criticalWidgetStateContract?.summary?.fourStateCoveragePct,
      baseResult.diagnostics?.fourStateCoveragePct ?? 0
    )
  );

  const keyboardCoveragePct = roundScore(
    normalizeNumber(
      baseResult.criticalWidgetStateContract?.summary?.keyboardCoveragePct,
      baseResult.diagnostics?.keyboardCoveragePct ?? 0
    )
  );

  const keyboardFocusVisibilityContract = {
    model: 'UX_KEYBOARD_FOCUS_VISIBILITY_CONTRACT',
    modelVersion,
    generatedAt: toIso(Number.isFinite(Number(runtimeOptions.nowMs)) ? Number(runtimeOptions.nowMs) : Date.now()),
    summary: {
      contrastCoveragePct,
      responsiveCoveragePct,
      keyboardCoveragePct,
      fourStateCoveragePct
    },
    surfaces: surfacesResult.surfaces,
    responsiveCheckpoints: responsiveResult.checkpoints
  };

  if (surfacesContrastGap.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_SURFACE_CONTRAST_REQUIRED',
      reason: `FR-065 non satisfait: ${surfacesContrastGap.length} surface(s) sous le seuil de contraste.`,
      diagnostics: {
        ...baseResult.diagnostics,
        keyboardFocusModelVersion: modelVersion,
        surfacesContrastGap
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      keyboardFocusVisibilityContract
    });
  }

  if (responsiveResult.missingViewports.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_RESPONSIVE_VALIDATION_REQUIRED',
      reason: `NFR-032 non satisfait: viewport(s) non validé(s): ${responsiveResult.missingViewports.join(', ')}.`,
      diagnostics: {
        ...baseResult.diagnostics,
        keyboardFocusModelVersion: modelVersion,
        missingResponsiveViewports: responsiveResult.missingViewports
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      keyboardFocusVisibilityContract
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: 'Navigation clavier complète, focus visible, contraste et responsive validés.',
    diagnostics: {
      ...baseResult.diagnostics,
      keyboardFocusModelVersion: modelVersion,
      surfacesContrastGap: [],
      missingResponsiveViewports: []
    },
    uxAudit: baseResult.uxAudit,
    criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
    keyboardFocusVisibilityContract,
    correctiveActions: []
  });
}
