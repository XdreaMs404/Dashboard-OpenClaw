#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = '/root/.openclaw/workspace/bmad-total';
const BMAD_ROOT = '/root/.openclaw/BMAD/_bmad';
const REGISTRY = path.join(PROJECT_ROOT, 'runtime/agent-registry.json');
const OUT_DIR = path.join(PROJECT_ROOT, 'runtime/worker-prompts');

const workers = {
  'bmad-worker-web-research': {
    role: 'WEB_RESEARCH_WORKER',
    mission: 'Collecter vite des sources externes fiables sur un sujet précis, sans dériver du scope.',
    focus: ['requêtes ciblées', 'sources crédibles', 'synthèse factuelle'],
    output: 'note markdown avec sources + points actionnables',
    sources: [
      `${BMAD_ROOT}/bmm/agents/analyst.md`,
      `${BMAD_ROOT}/bmm/workflows/1-analysis/research/workflow.md`
    ],
    checklist: [
      '>= 3 sources crédibles quand possible',
      'date/context de chaque source explicite',
      'distinction faits vs hypothèses'
    ],
    forbidden: ['blog spam non sourcé', 'résumé sans citations']
  },
  'bmad-worker-fact-check': {
    role: 'FACT_CHECK_WORKER',
    mission: 'Vérifier les affirmations, noter le niveau de confiance et signaler les zones incertaines.',
    focus: ['validation croisée', 'niveau de confiance', 'preuves directes'],
    output: 'table claim -> verdict -> preuve -> confiance',
    sources: [
      `${BMAD_ROOT}/bmm/workflows/4-implementation/code-review/checklist.md`,
      `${BMAD_ROOT}/bmm/workflows/4-implementation/code-review/instructions.xml`
    ],
    checklist: [
      'chaque claim a un verdict explicite',
      'preuve primaire priorisée',
      'incertitudes non cachées'
    ],
    forbidden: ['supposer sans preuve', 'verdict binaire sans nuance']
  },
  'bmad-worker-competitive-scan': {
    role: 'COMPETITIVE_SCAN_WORKER',
    mission: 'Comparer alternatives/concurrents de façon utile pour la décision produit.',
    focus: ['différenciateurs', 'risques', 'opportunités'],
    output: 'comparatif structuré avec recommandations',
    sources: [
      `${BMAD_ROOT}/bmm/agents/analyst.md`,
      `${BMAD_ROOT}/bmm/workflows/1-analysis/create-product-brief/workflow.md`
    ],
    checklist: [
      'comparaison basée sur critères explicites',
      'risques de copie/commoditisation notés',
      'recommandation finale actionnable'
    ],
    forbidden: ['tableau marketing sans impact produit']
  },
  'bmad-worker-security-dependency': {
    role: 'SECURITY_DEPENDENCY_WORKER',
    mission: 'Détecter vulnérabilités dépendances et proposer mitigations priorisées.',
    focus: ['vulnérabilités connues', 'versions', 'mitigations'],
    output: 'rapport sécurité avec priorité de correction',
    sources: [
      `${BMAD_ROOT}/bmm/workflows/testarch/ci/checklist.md`,
      `${PROJECT_ROOT}/scripts/security-scan.sh`
    ],
    checklist: [
      'CVSS/criticité indiquée',
      'version cible de correction proposée',
      'impact prod explicité'
    ],
    forbidden: ['ignorer vulnérabilités critiques', 'rapport sans plan de correction']
  },
  'bmad-worker-test-generation': {
    role: 'TEST_GENERATION_WORKER',
    mission: 'Produire des tests utiles et traçables aux AC.',
    focus: ['coverage utile', 'cas critiques', 'non-régression'],
    output: 'set de tests + mapping AC',
    sources: [
      `${BMAD_ROOT}/bmm/agents/dev.md`,
      `${BMAD_ROOT}/bmm/workflows/4-implementation/dev-story/checklist.md`,
      `${BMAD_ROOT}/bmm/workflows/testarch/framework/checklist.md`
    ],
    checklist: [
      'mapping AC -> tests explicite',
      'tests edge cases inclus',
      'priorité tests déterministes (anti-flaky)'
    ],
    forbidden: ['tests décoratifs sans assert utile']
  },
  'bmad-worker-edge-case': {
    role: 'EDGE_CASE_WORKER',
    mission: 'Lister les cas limites oubliés avant que la prod les découvre.',
    focus: ['null/empty/error', 'bornes', 'concurrence'],
    output: 'liste edge cases + tests recommandés',
    sources: [
      `${BMAD_ROOT}/bmm/workflows/testarch/framework/checklist.md`,
      `${BMAD_ROOT}/bmm/workflows/4-implementation/dev-story/checklist.md`
    ],
    checklist: [
      'cas limites par type (input, état, concurrence)',
      'impact métier de chaque edge case',
      'proposition de test associée'
    ],
    forbidden: ['liste générique sans lien feature']
  },
  'bmad-worker-benchmark-perf': {
    role: 'BENCHMARK_PERF_WORKER',
    mission: 'Mesurer performances et signaler régressions avec preuves reproductibles.',
    focus: ['latence', 'throughput', 'hot paths'],
    output: 'résultats benchmark + pistes d’optimisation',
    sources: [
      `${PROJECT_ROOT}/scripts/run-quality-gates.sh`,
      `/root/.openclaw/workspace/docs/BMAD-HYPER-ORCHESTRATION-THEORY.md`
    ],
    checklist: [
      'méthode de mesure documentée',
      'baseline vs actuel comparés',
      'optimisations proposées par ROI'
    ],
    forbidden: ['optimisation prématurée sans mesure']
  },
  'bmad-worker-doc-consistency': {
    role: 'DOC_CONSISTENCY_WORKER',
    mission: 'Assurer cohérence entre code, docs et guide de test.',
    focus: ['incohérences', 'sections manquantes', 'exactitude'],
    output: 'diff doc recommandé + corrections',
    sources: [
      `${BMAD_ROOT}/bmm/agents/tech-writer.md`,
      `${BMAD_ROOT}/bmm/data/documentation-standards.md`
    ],
    checklist: [
      'toutes commandes testables',
      'aucune contradiction avec code réel',
      'sections manquantes listées'
    ],
    forbidden: ['réécriture inutile sans corriger erreurs factuelles']
  },
  'bmad-worker-visual-qa': {
    role: 'VISUAL_QA_WORKER',
    mission: 'Auditer les défauts visuels visibles et la hiérarchie UI.',
    focus: ['alignements', 'espacements', 'hiérarchie visuelle'],
    output: 'rapport visuel avec preuves',
    sources: [
      `${PROJECT_ROOT}/templates/UX_AUDIT_TEMPLATE.json`,
      `/root/.openclaw/workspace/docs/BMAD-HYPER-ORCHESTRATION-THEORY.md`
    ],
    checklist: [
      'au moins 1 preuve par défaut détecté',
      'priorité user-impact first',
      'proposition de fix concrète'
    ],
    forbidden: ['avis esthétique non argumenté']
  },
  'bmad-worker-accessibility-audit': {
    role: 'ACCESSIBILITY_AUDIT_WORKER',
    mission: 'Évaluer l’accessibilité WCAG 2.2 AA sur parcours critiques.',
    focus: ['navigation clavier', 'contrastes', 'annonces SR'],
    output: 'audit accessibilité + fixes obligatoires',
    sources: [
      `${BMAD_ROOT}/bmm/agents/ux-designer.md`,
      `${PROJECT_ROOT}/templates/UX_AUDIT_TEMPLATE.json`
    ],
    checklist: [
      'contraste et focus visibles',
      'ordre tab cohérent',
      'composants critiques compatibles lecteur écran'
    ],
    forbidden: ['validation sans preuves concrètes']
  },
  'bmad-worker-responsive-audit': {
    role: 'RESPONSIVE_AUDIT_WORKER',
    mission: 'Valider l’UX responsive sur mobile/tablette/desktop.',
    focus: ['breakpoints', 'overflow', 'lisibilité'],
    output: 'audit responsive + correctifs prioritaires',
    sources: [
      `${BMAD_ROOT}/bmm/agents/ux-designer.md`,
      `${PROJECT_ROOT}/templates/UX_AUDIT_TEMPLATE.json`
    ],
    checklist: [
      'pas de débordement bloquant',
      'parcours critique utilisable sur 3 tailles',
      'lisibilité texte/actions validée'
    ],
    forbidden: ['validation desktop-only']
  },
  'bmad-worker-design-consistency': {
    role: 'DESIGN_CONSISTENCY_WORKER',
    mission: 'Contrôler la conformité design-system (tokens/composants/patterns).',
    focus: ['tokens', 'composants', 'patterns interaction'],
    output: 'rapport conformité design-system',
    sources: [
      `${BMAD_ROOT}/bmm/agents/ux-designer.md`,
      `${PROJECT_ROOT}/_bmad-output/planning-artifacts/design-system.md`
    ],
    checklist: [
      'usage tokens cohérent',
      'pas de composants divergents non justifiés',
      'écarts priorisés par impact UX'
    ],
    forbidden: ['ignorer les écarts “mineurs” répétés']
  }
};

function readIfExists(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8').trim();
    }
  } catch {
    // ignore and fallback
  }
  return null;
}

function prompt(label, cfg) {
  const focus = cfg.focus.map(x => `- ${x}`).join('\n');
  const checklist = cfg.checklist.map(x => `- [ ] ${x}`).join('\n');
  const forbidden = cfg.forbidden.map(x => `- ${x}`).join('\n');
  const sources = (cfg.sources || []).map(x => `- ${x}`).join('\n');

  return `# ${cfg.role} — ${label}

## Mission
${cfg.mission}

## Entrées attendues
- storyId / epicId
- contexte (fichiers, AC, contraintes)
- format de sortie demandé par l’orchestrateur

## Focus prioritaire
${focus}

## Sources de référence (obligatoires)
${sources || '- (aucune source fournie)'}

## Routine d'activation
1. Lire la demande exacte de l’orchestrateur (scope strict).
2. Lire ${label}.source.md (copie locale des sources listées ci-dessus).
3. Définir la check-list de sortie avant de produire le résultat.

## Règles d’exécution
1. Ne pas sortir du scope demandé.
2. Toujours citer les preuves (fichier:ligne, url, capture, commande).
3. Si incertitude: marquer explicitement le niveau de confiance.
4. Prioriser les findings à fort impact utilisateur/risque.
5. Retourner une sortie immédiatement exploitable par l’agent suivant.

## Quality Gates worker (bloquants)
${checklist}

## Interdits
${forbidden}

## Format de sortie recommandé
- summary: 3-5 points
- findings: liste priorisée
- risks: impact + probabilité
- nextActions: actions concrètes
- confidence: low|medium|high

## Deliverable attendu
${cfg.output}
`;
}

function sourcePack(label, cfg) {
  const blocks = [];
  blocks.push(`# ${cfg.role} — Source Pack (${label})`);
  blocks.push('');
  blocks.push('Ce fichier contient les sources BMAD/locales à relire avant exécution du worker.');
  blocks.push('');

  (cfg.sources || []).forEach((src, i) => {
    const raw = readIfExists(src);
    blocks.push(`## Source ${i + 1}: ${src}`);
    blocks.push('');
    if (raw) {
      blocks.push(raw);
    } else {
      blocks.push('⚠ Source introuvable au moment de la génération.');
    }
    blocks.push('');
  });

  return blocks.join('\n').trimEnd() + '\n';
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const files = [];
for (const [label, cfg] of Object.entries(workers)) {
  const promptPath = path.join(OUT_DIR, `${label}.md`);
  const sourcePath = path.join(OUT_DIR, `${label}.source.md`);
  fs.writeFileSync(promptPath, prompt(label, cfg).trimEnd() + '\n', 'utf8');
  fs.writeFileSync(sourcePath, sourcePack(label, cfg), 'utf8');
  files.push(promptPath, sourcePath);
}

if (fs.existsSync(REGISTRY)) {
  const reg = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
  if (Array.isArray(reg.runtimeWorkers)) {
    reg.runtimeWorkers = reg.runtimeWorkers.map((w) => {
      const label = w.label;
      if (workers[label]) {
        return {
          ...w,
          promptPath: `${PROJECT_ROOT}/runtime/worker-prompts/${label}.md`,
          sourcePath: `${PROJECT_ROOT}/runtime/worker-prompts/${label}.source.md`
        };
      }
      return w;
    });
    fs.writeFileSync(REGISTRY, JSON.stringify(reg, null, 2) + '\n', 'utf8');
  }
}

console.log(`✅ Generated ${files.length} worker prompt files in ${OUT_DIR}`);
console.log(`✅ Updated registry promptPath/sourcePath fields (if runtimeWorkers found)`);
