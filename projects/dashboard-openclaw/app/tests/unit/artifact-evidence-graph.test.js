import { describe, expect, it } from 'vitest';
import { buildArtifactEvidenceGraph } from '../../src/artifact-evidence-graph.js';
import {
  buildArtifactEvidenceGraph as buildEvidenceGraphFromIndex,
  diffArtifactVersions
} from '../../src/index.js';

const ALLOWLIST_ROOT =
  '/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts';

const REASON_CODES = new Set([
  'OK',
  'ARTIFACT_PATH_NOT_ALLOWED',
  'UNSUPPORTED_ARTIFACT_TYPE',
  'ARTIFACT_READ_FAILED',
  'ARTIFACT_PARSE_FAILED',
  'ARTIFACT_METADATA_MISSING',
  'ARTIFACT_METADATA_INVALID',
  'ARTIFACT_SECTIONS_MISSING',
  'ARTIFACT_TABLES_MISSING',
  'INVALID_ARTIFACT_SEARCH_INPUT',
  'INVALID_ARTIFACT_CONTEXT_FILTER_INPUT',
  'ARTIFACT_DIFF_NOT_ELIGIBLE',
  'INVALID_ARTIFACT_DIFF_INPUT',
  'EVIDENCE_LINK_INCOMPLETE',
  'DECISION_NOT_FOUND',
  'INVALID_EVIDENCE_GRAPH_INPUT'
]);

function buildNominalDiffResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Diff exécuté.',
    diagnostics: {
      requestedCandidatesCount: 1,
      comparedPairsCount: 1,
      unresolvedCount: 0,
      durationMs: 11,
      p95DiffMs: 11,
      sourceReasonCode: 'OK'
    },
    diffResults: [
      {
        groupKey: 'prd:rollout',
        leftArtifactId: 'rollout-v1',
        rightArtifactId: 'rollout-v2',
        leftArtifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
        rightArtifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v2.md`,
        artifactType: 'prd'
      }
    ],
    unresolvedCandidates: [],
    provenanceLinks: [
      {
        groupKey: 'prd:rollout',
        leftArtifactId: 'rollout-v1',
        rightArtifactId: 'rollout-v2',
        decisionRefs: ['DEC-100', 'DEC-101'],
        gateRefs: ['G4-T', 'G4-UX'],
        commandRefs: ['CMD-100', 'CMD-200']
      }
    ],
    correctiveActions: [],
    ...overrides
  };
}

function buildDiffInput(overrides = {}) {
  return {
    artifactPairs: [
      {
        groupKey: 'risk:core',
        left: {
          artifactId: 'risk-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/risk-v1.md`,
          artifactType: 'risk-register',
          metadata: {
            owner: 'team-a',
            level: 'high'
          },
          sections: ['Contexte'],
          tables: [],
          contentSummary: 'v1',
          decisionRefs: ['DEC-RISK-1'],
          gateRefs: ['G2'],
          commandRefs: ['CMD-RISK-1']
        },
        right: {
          artifactId: 'risk-v2',
          artifactPath: `${ALLOWLIST_ROOT}/reports/risk-v2.md`,
          artifactType: 'risk-register',
          metadata: {
            owner: 'team-a',
            level: 'critical'
          },
          sections: ['Contexte', 'Mitigation'],
          tables: [],
          contentSummary: 'v2',
          decisionRefs: ['DEC-RISK-1', 'DEC-RISK-2'],
          gateRefs: ['G2'],
          commandRefs: ['CMD-RISK-1', 'CMD-RISK-2']
        }
      }
    ],
    ...overrides
  };
}

function sortCopy(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

describe('artifact-evidence-graph unit', () => {
  it('builds a deterministic decision↔evidence↔gate↔command graph on nominal input', () => {
    const result = buildArtifactEvidenceGraph({
      artifactDiffResult: buildNominalDiffResult()
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        nodesCount: 8,
        edgesCount: 12,
        decisionsCount: 2,
        backlinkedArtifactsCount: 2,
        orphanCount: 0,
        sourceReasonCode: 'OK'
      },
      correctiveActions: []
    });

    expect(result.graph.nodes.map((entry) => entry.nodeId)).toEqual([
      'artifact:rollout-v1',
      'artifact:rollout-v2',
      'command:CMD-100',
      'command:CMD-200',
      'decision:DEC-100',
      'decision:DEC-101',
      'gate:G4-T',
      'gate:G4-UX'
    ]);

    expect(result.graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          relation: 'JUSTIFIES_DECISION',
          fromNodeId: 'artifact:rollout-v1',
          toNodeId: 'decision:DEC-100'
        }),
        expect.objectContaining({
          relation: 'VALIDATED_BY_GATE',
          fromNodeId: 'decision:DEC-100',
          toNodeId: 'gate:G4-T'
        }),
        expect.objectContaining({
          relation: 'EXECUTED_BY_COMMAND',
          fromNodeId: 'decision:DEC-101',
          toNodeId: 'command:CMD-200'
        })
      ])
    );

    expect(Object.keys(result.decisionBacklinks)).toEqual(['DEC-100', 'DEC-101']);
    expect(result.decisionBacklinks['DEC-100']).toEqual([
      {
        artifactId: 'rollout-v1',
        artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
        artifactType: 'prd',
        groupKey: 'prd:rollout'
      },
      {
        artifactId: 'rollout-v2',
        artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v2.md`,
        artifactType: 'prd',
        groupKey: 'prd:rollout'
      }
    ]);
  });

  it('prefers artifactDiffResult over artifactDiffInput and graphEntries', () => {
    const result = buildArtifactEvidenceGraph({
      artifactDiffResult: buildNominalDiffResult({
        provenanceLinks: [
          {
            groupKey: 'prd:rollout',
            leftArtifactId: 'rollout-v1',
            rightArtifactId: 'rollout-v2',
            decisionRefs: ['DEC-PREFERRED'],
            gateRefs: ['G4-T'],
            commandRefs: ['CMD-1']
          }
        ]
      }),
      artifactDiffInput: buildDiffInput(),
      graphEntries: [
        {
          groupKey: 'fallback',
          artifactId: 'fallback-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/fallback-v1.md`,
          artifactType: 'prd',
          decisionRefs: ['DEC-FALLBACK'],
          gateRefs: ['G1'],
          commandRefs: ['CMD-FALLBACK']
        }
      ]
    });

    expect(result.reasonCode).toBe('OK');
    expect(Object.keys(result.decisionBacklinks)).toEqual(['DEC-PREFERRED']);
  });

  it('delegates to S019 via artifactDiffInput when artifactDiffResult is absent', () => {
    const result = buildArtifactEvidenceGraph({
      artifactDiffInput: buildDiffInput()
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        sourceReasonCode: 'OK'
      }
    });

    expect(Object.keys(result.decisionBacklinks)).toEqual(['DEC-RISK-1', 'DEC-RISK-2']);
  });

  it('propagates strict upstream blocking reason codes from S019', () => {
    const result = buildArtifactEvidenceGraph({
      artifactDiffResult: {
        allowed: false,
        reasonCode: 'INVALID_ARTIFACT_CONTEXT_FILTER_INPUT',
        reason: 'Filtrage contextuel invalide.',
        diagnostics: {
          requestedCandidatesCount: 0,
          comparedPairsCount: 0,
          unresolvedCount: 0,
          durationMs: 5,
          p95DiffMs: 0,
          sourceReasonCode: 'INVALID_ARTIFACT_CONTEXT_FILTER_INPUT'
        },
        correctiveActions: ['FIX_CONTEXT_FILTER_INPUT']
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_ARTIFACT_CONTEXT_FILTER_INPUT',
      diagnostics: {
        sourceReasonCode: 'INVALID_ARTIFACT_CONTEXT_FILTER_INPUT',
        nodesCount: 0,
        edgesCount: 0,
        decisionsCount: 0,
        backlinkedArtifactsCount: 0,
        orphanCount: 0
      },
      correctiveActions: ['FIX_CONTEXT_FILTER_INPUT']
    });
  });

  it('returns EVIDENCE_LINK_INCOMPLETE with orphanEvidence when links cannot be chained', () => {
    const result = buildArtifactEvidenceGraph({
      artifactDiffResult: buildNominalDiffResult({
        provenanceLinks: []
      })
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'EVIDENCE_LINK_INCOMPLETE',
      diagnostics: {
        orphanCount: 1
      },
      correctiveActions: ['LINK_OR_RESTORE_EVIDENCE']
    });

    expect(result.orphanEvidence).toHaveLength(1);
    expect(result.orphanEvidence[0]).toMatchObject({
      reasonCode: 'EVIDENCE_LINK_INCOMPLETE',
      candidateSource: 'artifactDiffResult.diffResults'
    });
  });

  it('returns DECISION_NOT_FOUND when a targeted decision id does not exist', () => {
    const result = buildArtifactEvidenceGraph({
      artifactDiffResult: buildNominalDiffResult(),
      decisionId: 'DEC-404'
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'DECISION_NOT_FOUND',
      correctiveActions: ['VERIFY_DECISION_ID']
    });
    expect(result.reason).toContain('DEC-404');
  });

  it('keeps deterministic ordering for nodes, edges and backlinks', () => {
    const result = buildArtifactEvidenceGraph({
      artifactDiffResult: {
        ...buildNominalDiffResult(),
        diffResults: [
          {
            groupKey: 'zeta',
            leftArtifactId: 'zeta-v1',
            rightArtifactId: 'zeta-v2',
            leftArtifactPath: `${ALLOWLIST_ROOT}/reports/zeta-v1.md`,
            rightArtifactPath: `${ALLOWLIST_ROOT}/reports/zeta-v2.md`,
            artifactType: 'prd'
          },
          {
            groupKey: 'alpha',
            leftArtifactId: 'alpha-v1',
            rightArtifactId: 'alpha-v2',
            leftArtifactPath: `${ALLOWLIST_ROOT}/reports/alpha-v1.md`,
            rightArtifactPath: `${ALLOWLIST_ROOT}/reports/alpha-v2.md`,
            artifactType: 'prd'
          }
        ],
        provenanceLinks: [
          {
            groupKey: 'zeta',
            leftArtifactId: 'zeta-v1',
            rightArtifactId: 'zeta-v2',
            decisionRefs: ['DEC-Z2', 'DEC-Z1'],
            gateRefs: ['G-Z'],
            commandRefs: ['CMD-Z']
          },
          {
            groupKey: 'alpha',
            leftArtifactId: 'alpha-v1',
            rightArtifactId: 'alpha-v2',
            decisionRefs: ['DEC-A2', 'DEC-A1'],
            gateRefs: ['G-A'],
            commandRefs: ['CMD-A']
          }
        ]
      }
    });

    const nodeIds = result.graph.nodes.map((entry) => entry.nodeId);
    const edgeIds = result.graph.edges.map((entry) => entry.edgeId);
    const decisionIds = Object.keys(result.decisionBacklinks);

    expect(nodeIds).toEqual(sortCopy(nodeIds));
    expect(edgeIds).toEqual(sortCopy(edgeIds));
    expect(decisionIds).toEqual(sortCopy(decisionIds));

    for (const decisionId of decisionIds) {
      const artifactIds = result.decisionBacklinks[decisionId].map((entry) => entry.artifactId);
      expect(artifactIds).toEqual(sortCopy(artifactIds));
    }
  });

  it('supports direct graphEntries source and deduplicates decision backlinks', () => {
    const result = buildArtifactEvidenceGraph({
      graphEntries: [
        {
          groupKey: 'ops:1',
          artifactId: 'ops-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/ops-v1.md`,
          artifactType: 'runbook',
          decisionRefs: ['DEC-OPS-1'],
          gateRefs: ['G4-T'],
          commandRefs: ['CMD-OPS-1']
        },
        {
          groupKey: 'ops:1',
          artifactId: 'ops-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/ops-v1.md`,
          artifactType: 'runbook',
          decisionRefs: ['DEC-OPS-1'],
          gateRefs: ['G4-T'],
          commandRefs: ['CMD-OPS-1']
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        sourceReasonCode: 'OK',
        decisionsCount: 1,
        backlinkedArtifactsCount: 1,
        orphanCount: 0
      }
    });

    expect(result.decisionBacklinks['DEC-OPS-1']).toHaveLength(1);
  });

  it('keeps stable output contract and public index export', () => {
    const result = buildEvidenceGraphFromIndex({
      artifactDiffResult: buildNominalDiffResult()
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('graph');
    expect(result).toHaveProperty('decisionBacklinks');
    expect(result).toHaveProperty('orphanEvidence');
    expect(result).toHaveProperty('correctiveActions');

    expect(typeof result.allowed).toBe('boolean');
    expect(REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(typeof result.reason).toBe('string');

    expect(result.diagnostics).toHaveProperty('nodesCount');
    expect(result.diagnostics).toHaveProperty('edgesCount');
    expect(result.diagnostics).toHaveProperty('decisionsCount');
    expect(result.diagnostics).toHaveProperty('backlinkedArtifactsCount');
    expect(result.diagnostics).toHaveProperty('orphanCount');
    expect(result.diagnostics).toHaveProperty('durationMs');
    expect(result.diagnostics).toHaveProperty('p95GraphMs');
    expect(result.diagnostics).toHaveProperty('sourceReasonCode');

    expect(result.graph).toHaveProperty('nodes');
    expect(result.graph).toHaveProperty('edges');
    expect(result.graph).toHaveProperty('clusters');
    expect(Array.isArray(result.orphanEvidence)).toBe(true);
    expect(Array.isArray(result.correctiveActions)).toBe(true);
  });

  it('meets performance threshold on synthetic corpus of 500 docs', () => {
    const graphEntries = Array.from({ length: 500 }, (_, index) => ({
      groupKey: `cluster:${index}`,
      artifactId: `artifact-${index}`,
      artifactPath: `${ALLOWLIST_ROOT}/reports/perf-${index}.md`,
      artifactType: 'prd',
      decisionRefs: [`DEC-${index}`],
      gateRefs: [`G-${index % 5}`],
      commandRefs: [`CMD-${index % 7}`]
    }));

    const result = buildArtifactEvidenceGraph({
      graphEntries
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        nodesCount: 1012,
        decisionsCount: 500,
        backlinkedArtifactsCount: 500,
        orphanCount: 0,
        sourceReasonCode: 'OK'
      }
    });

    expect(result.diagnostics.p95GraphMs).toBeLessThanOrEqual(2000);
    expect(result.diagnostics.durationMs).toBeLessThan(60000);
  });

  it('accepts output of diffArtifactVersions as direct upstream input', () => {
    const diffResult = diffArtifactVersions(buildDiffInput());
    const result = buildArtifactEvidenceGraph({
      artifactDiffResult: diffResult
    });

    expect(diffResult.reasonCode).toBe('OK');
    expect(result.reasonCode).toBe('OK');
    expect(result.diagnostics.decisionsCount).toBeGreaterThanOrEqual(1);
  });
});
