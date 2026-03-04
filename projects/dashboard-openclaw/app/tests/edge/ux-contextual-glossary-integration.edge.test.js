import { describe, expect, it } from 'vitest';
import { buildUxContextualGlossaryIntegration } from '../../src/ux-contextual-glossary-integration.js';

function buildPayload() {
  return {
    windowRef: 'S067',
    uxAudit: {
      score: 92,
      blockerCount: 0,
      wcagLevel: 'WCAG-2.2-AA'
    },
    criticalWidgets: [
      {
        id: 'ux-glossary-panel',
        states: {
          empty: { copy: 'Aucun terme.' },
          loading: { copy: 'Chargement...' },
          error: { copy: 'Erreur.' },
          success: { copy: 'Succès.' }
        },
        keyboard: {
          focusOrder: ['glossary-filter', 'glossary-refresh', 'glossary-open-term'],
          focusVisible: true,
          logicalOrder: true,
          trapFree: true
        }
      }
    ],
    bmadDefinitions: [
      {
        id: 'BMAD-G4-UX',
        term: 'G4-UX',
        definition: 'Sous-gate UX bloquante.'
      },
      {
        id: 'BMAD-CONCERNS',
        term: 'CONCERNS',
        definition: 'Verdict intermédiaire.'
      }
    ],
    uxDebts: [
      {
        id: 'UXD-101',
        title: 'Dette ouverte',
        status: 'OPEN',
        severity: 'MAJOR',
        riskTags: ['T07'],
        definitionRefs: ['BMAD-CONCERNS'],
        reductionPlan: {
          owner: 'ux-qa-auditor',
          targetDate: '2026-03-23',
          successMetric: 'Plan ok',
          actions: ['Action 1']
        }
      },
      {
        id: 'UXD-102',
        title: 'Dette in progress',
        status: 'IN_PROGRESS',
        severity: 'MINOR',
        riskTags: ['U01'],
        definitionRefs: ['BMAD-G4-UX'],
        reductionPlan: {
          owner: 'bmad-pm',
          targetDate: '2026-03-25',
          successMetric: 'Plan ok',
          actions: ['Action 2']
        }
      }
    ],
    contextualSlots: [
      { id: 'slot-verdict', definitionRef: 'BMAD-CONCERNS' },
      { id: 'slot-gate', definitionRef: 'BMAD-G4-UX' }
    ],
    designSystemChecks: [
      { id: 'glossary-header', spacingPass: true, typographyPass: true, colorPass: true }
    ],
    responsiveChecks: [
      { viewport: 'mobile', readable: true, noHorizontalOverflow: true, pass: true },
      { viewport: 'tablet', readable: true, noHorizontalOverflow: true, pass: true },
      { viewport: 'desktop', readable: true, noHorizontalOverflow: true, pass: true }
    ]
  };
}

describe('ux-contextual-glossary-integration edge', () => {
  it('rejects malformed payload', () => {
    const result = buildUxContextualGlossaryIntegration('bad-input');

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_UX_GLOSSARY_INPUT');
  });

  it('propagates base S066 failure when required risk coverage is missing', () => {
    const payload = buildPayload();
    payload.uxDebts = payload.uxDebts.map((entry) => ({ ...entry, riskTags: ['T07'] }));

    const result = buildUxContextualGlossaryIntegration(payload, {
      nowMs: Date.parse('2026-03-19T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_DEBT_RISK_COVERAGE_REQUIRED');
  });

  it('fails when contextual slots are missing', () => {
    const payload = buildPayload();
    payload.contextualSlots = [];

    const result = buildUxContextualGlossaryIntegration(payload, {
      nowMs: Date.parse('2026-03-19T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_GLOSSARY_CONTEXT_SLOTS_REQUIRED');
  });

  it('fails when responsive coverage is incomplete for required viewports', () => {
    const payload = buildPayload();
    payload.responsiveChecks = payload.responsiveChecks.slice(0, 2);

    const result = buildUxContextualGlossaryIntegration(payload, {
      nowMs: Date.parse('2026-03-19T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_GLOSSARY_RESPONSIVE_REQUIRED');
    expect(result.diagnostics.responsiveFailing).toEqual(expect.arrayContaining(['desktop']));
  });
});
