import { clamp, normalizeEmail, normalizeUserName, safeDivide } from './core.js';
import { validatePhasePrerequisites } from './phase-prerequisites-validator.js';
import { orchestratePhaseGuards } from './phase-guards-orchestrator.js';
import { buildPhaseStateProjection } from './phase-state-projection.js';
import { ingestBmadArtifacts } from './artifact-ingestion-pipeline.js';
import { validateArtifactMetadataCompliance } from './artifact-metadata-validator.js';
import { extractArtifactSectionsForNavigation } from './artifact-section-extractor.js';
import { indexArtifactMarkdownTables } from './artifact-table-indexer.js';
import { searchArtifactsFullText } from './artifact-fulltext-search.js';
import { applyArtifactContextFilters } from './artifact-context-filter.js';
import { diffArtifactVersions } from './artifact-version-diff.js';
import { buildArtifactEvidenceGraph } from './artifact-evidence-graph.js';
import { buildPhaseDependencyMatrix } from './phase-dependency-matrix.js';
import { evaluatePhaseProgressionAlert } from './phase-progression-alert.js';
import { recordPhaseTransitionHistory } from './phase-transition-history.js';
import { evaluatePhaseSlaAlert } from './phase-sla-alert.js';
import { evaluatePhaseTransitionOverride } from './phase-transition-override.js';
import { BMAD_PHASE_ORDER, validatePhaseTransition } from './phase-transition-validator.js';
import { recordPhaseGateGovernanceDecision } from './phase-gate-governance-journal.js';

export {
  BMAD_PHASE_ORDER,
  applyArtifactContextFilters,
  buildArtifactEvidenceGraph,
  diffArtifactVersions,
  buildPhaseDependencyMatrix,
  buildPhaseStateProjection,
  clamp,
  evaluatePhaseProgressionAlert,
  evaluatePhaseSlaAlert,
  evaluatePhaseTransitionOverride,
  extractArtifactSectionsForNavigation,
  indexArtifactMarkdownTables,
  ingestBmadArtifacts,
  recordPhaseGateGovernanceDecision,
  normalizeEmail,
  normalizeUserName,
  orchestratePhaseGuards,
  recordPhaseTransitionHistory,
  safeDivide,
  searchArtifactsFullText,
  validateArtifactMetadataCompliance,
  validatePhasePrerequisites,
  validatePhaseTransition
};
