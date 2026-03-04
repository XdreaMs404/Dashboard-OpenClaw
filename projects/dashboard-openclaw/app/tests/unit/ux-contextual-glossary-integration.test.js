import { describe, expect, it } from 'vitest';
import { buildUxContextualGlossaryIntegration } from '../../src/ux-contextual-glossary-integration.js';
import { buildUxContextualGlossaryIntegration as buildFromIndex } from '../../src/index.js';

function buildPayload() {
  return {
    windowRef: 'S067',
    uxAudit: {
      score: 94,
      blockerCount: 0,
      wcagLevel: 'WCAG-2.2-AA'
    },
    criticalWidgets: [
      {
        id: 'ux-glossary-panel',
        states: {
          empty: { copy: 'Aucun terme BMAD contextuel disponible.' },
          loading: { copy: 'Chargement du glossaire BMAD contextuel...' },
          error: { copy: 'Impossible de charger les définitions BMAD.' },
          success: { copy: 'Glossaire BMAD contextuel prêt.' }
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
        definition: 'Sous-gate UX bloquante validant design/accessibilité/responsive avant DONE.'
      },
      {
        id: 'BMAD-CONCERNS',
        term: 'CONCERNS',
        definition: 'Verdict intermédiaire demandant corrections avant progression.'
      },
      {
        id: 'BMAD-HANDOFF',
        term: 'Handoff',
        definition: 'Passage de responsabilité explicite vers l’étape BMAD suivante.'
      }
    ],
    uxDebts: [
      {
        id: 'UXD-101',
        title: 'Clarifier sens de CONCERNS dans la lane UX',
        status: 'OPEN',
        severity: 'BLOCKER',
        riskTags: ['T07'],
        definitionRefs: ['BMAD-CONCERNS'],
        reductionPlan: {
          owner: 'ux-qa-auditor',
          targetDate: '2026-03-23',
          successMetric: 'Aucune ambiguïté détectée en revue UX',
          actions: ['Uniformiser la microcopy', 'Ajouter exemples de verdicts']
        }
      },
      {
        id: 'UXD-102',
        title: 'Réduire surcharge cognitive cockpit',
        status: 'IN_PROGRESS',
        severity: 'MAJOR',
        riskTags: ['U01'],
        definitionRefs: ['BMAD-G4-UX'],
        reductionPlan: {
          owner: 'bmad-pm',
          targetDate: '2026-03-25',
          successMetric: 'Parcours décisionnel < 90s sur vues critiques',
          actions: ['Ajouter bulles contextuelles', 'Réduire ambiguïtés de handoff']
        }
      }
    ],
    contextualSlots: [
      { id: 'slot-verdict', label: 'Aide verdict', context: 'verdict-panel', definitionRef: 'BMAD-CONCERNS' },
      { id: 'slot-gate', label: 'Aide gate', context: 'gate-panel', definitionRef: 'BMAD-G4-UX' },
      { id: 'slot-handoff', label: 'Aide handoff', context: 'handoff-panel', definitionRef: 'BMAD-HANDOFF' }
    ],
    designSystemChecks: [
      { id: 'glossary-header', spacingPass: true, typographyPass: true, colorPass: true },
      { id: 'glossary-cards', spacingPass: true, typographyPass: true, colorPass: true }
    ],
    responsiveChecks: [
      { viewport: 'mobile', readable: true, noHorizontalOverflow: true, pass: true },
      { viewport: 'tablet', readable: true, noHorizontalOverflow: true, pass: true },
      { viewport: 'desktop', readable: true, noHorizontalOverflow: true, pass: true }
    ]
  };
}

describe('ux-contextual-glossary-integration unit', () => {
  it('validates contextual BMAD glossary mapping and design-system coherence (S067/FR-069/FR-070)', () => {
    const result = buildUxContextualGlossaryIntegration(buildPayload(), {
      nowMs: Date.parse('2026-03-19T09:00:00.000Z')
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.contextualGlossaryIntegration).toMatchObject({
      model: 'UX_CONTEXTUAL_GLOSSARY_INTEGRATION',
      modelVersion: 'S067-v1',
      summary: {
        glossaryEntryCount: 3,
        contextualSlotCount: 3,
        mappedSlotCount: 3,
        designSystemCoveragePct: 100,
        responsiveCoveragePct: 100
      }
    });
  });

  it('fails when one contextual slot is not mapped to a valid definition', () => {
    const payload = buildPayload();
    payload.contextualSlots[1].definitionRef = 'UNKNOWN-REF';

    const result = buildUxContextualGlossaryIntegration(payload, {
      nowMs: Date.parse('2026-03-19T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_GLOSSARY_CONTEXT_MAPPING_REQUIRED');
  });

  it('fails when design system checks detect inconsistency', () => {
    const payload = buildPayload();
    payload.designSystemChecks[0].colorPass = false;

    const result = buildUxContextualGlossaryIntegration(payload, {
      nowMs: Date.parse('2026-03-19T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_DESIGN_SYSTEM_CONSISTENCY_REQUIRED');
  });

  it('is exported from index', () => {
    const result = buildFromIndex(buildPayload(), {
      nowMs: Date.parse('2026-03-19T09:00:00.000Z')
    });

    expect(result.reasonCode).toBe('OK');
  });
});
