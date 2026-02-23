import { describe, expect, it } from 'vitest';
import { buildArtifactStalenessIndicator } from '../../src/artifact-staleness-indicator.js';
import {
  buildArtifactEvidenceGraph,
  buildArtifactStalenessIndicator as buildStalenessFromIndex
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
  'INVALID_EVIDENCE_GRAPH_INPUT',
  'ARTIFACT_STALENESS_DETECTED',
  'PROJECTION_REBUILD_TIMEOUT',
  'EVENT_LEDGER_GAP_DETECTED',
  'INVALID_STALENESS_INPUT'
]);

function buildEvidenceGraphResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Evidence graph construit.',
    diagnostics: {
      nodesCount: 8,
      edgesCount: 12,
      decisionsCount: 2,
      backlinkedArtifactsCount: 2,
      orphanCount: 0,
      durationMs: 10,
      p95GraphMs: 6,
      sourceReasonCode: 'OK'
    },
    graph: {
      nodes: [
        {
          nodeId: 'artifact:rollout-v1',
          nodeType: 'artifact',
          artifactId: 'rollout-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
          artifactType: 'prd',
          updatedAt: '2026-02-23T12:00:00.000Z'
        },
        {
          nodeId: 'artifact:rollout-v2',
          nodeType: 'artifact',
          artifactId: 'rollout-v2',
          artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v2.md`,
          artifactType: 'prd',
          updatedAt: '2026-02-23T12:10:00.000Z'
        }
      ],
      edges: [],
      clusters: []
    },
    decisionBacklinks: {
      'DEC-1': [
        {
          artifactId: 'rollout-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
          artifactType: 'prd',
          updatedAt: '2026-02-23T12:00:00.000Z'
        },
        {
          artifactId: 'rollout-v2',
          artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v2.md`,
          artifactType: 'prd',
          updatedAt: '2026-02-23T12:10:00.000Z'
        }
      ],
      'DEC-2': [
        {
          artifactId: 'rollout-v2',
          artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v2.md`,
          artifactType: 'prd',
          updatedAt: '2026-02-23T12:10:00.000Z'
        }
      ]
    },
    orphanEvidence: [],
    correctiveActions: [],
    ...overrides
  };
}

function toMs(iso) {
  return new Date(iso).getTime();
}

describe('artifact-staleness-indicator unit', () => {
  it('returns OK with fresh artifacts and coherent diagnostics', () => {
    const nowIso = '2026-02-23T12:30:00.000Z';
    const result = buildArtifactStalenessIndicator(
      {
        evidenceGraphResult: buildEvidenceGraphResult(),
        maxAgeSeconds: 3600,
        artifactTimestamps: {
          'rollout-v1': '2026-02-23T12:00:00.000Z',
          'rollout-v2': '2026-02-23T12:10:00.000Z'
        },
        rebuildDurationMs: 500,
        eventLedger: [10, 11, 12]
      },
      {
        nowMs: () => toMs(nowIso)
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        artifactsCount: 2,
        staleCount: 0,
        staleRatio: 0,
        maxAgeSeconds: 3600,
        rebuildDurationMs: 500,
        sourceReasonCode: 'OK'
      },
      stalenessBoard: {
        staleButAvailable: true,
        maxAgeSeconds: 3600,
        summary: {
          artifactsCount: 2,
          staleCount: 0,
          staleRatio: 0
        }
      },
      correctiveActions: []
    });

    expect(result.stalenessBoard.artifacts).toHaveLength(2);
    expect(result.stalenessBoard.artifacts[0]).toMatchObject({
      artifactId: 'rollout-v1',
      isStale: false,
      stalenessLevel: 'fresh'
    });

    expect(Object.keys(result.decisionFreshness)).toEqual(['DEC-1', 'DEC-2']);
    expect(result.decisionFreshness['DEC-1']).toHaveLength(2);
  });

  it('returns ARTIFACT_STALENESS_DETECTED in stale-but-available mode with corrective action', () => {
    const result = buildArtifactStalenessIndicator(
      {
        evidenceGraphResult: buildEvidenceGraphResult(),
        maxAgeSeconds: 1800,
        artifactTimestamps: {
          'rollout-v1': '2026-02-23T10:00:00.000Z',
          'rollout-v2': '2026-02-23T12:10:00.000Z'
        }
      },
      {
        nowMs: () => toMs('2026-02-23T12:30:00.000Z')
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'ARTIFACT_STALENESS_DETECTED',
      diagnostics: {
        artifactsCount: 2,
        staleCount: 1,
        maxAgeSeconds: 1800
      },
      correctiveActions: ['REFRESH_STALE_ARTIFACTS']
    });

    const stale = result.stalenessBoard.artifacts.find((entry) => entry.artifactId === 'rollout-v1');
    expect(stale).toBeDefined();
    expect(stale.isStale).toBe(true);
    expect(['warning', 'critical']).toContain(stale.stalenessLevel);
  });

  it('prefers evidenceGraphResult over evidenceGraphInput delegation', () => {
    const result = buildArtifactStalenessIndicator(
      {
        evidenceGraphResult: buildEvidenceGraphResult({
          decisionBacklinks: {
            'DEC-PRIORITY': [
              {
                artifactId: 'priority-v1',
                artifactPath: `${ALLOWLIST_ROOT}/reports/priority-v1.md`,
                artifactType: 'prd',
                updatedAt: '2026-02-23T12:00:00.000Z'
              }
            ]
          },
          graph: {
            nodes: [
              {
                nodeId: 'artifact:priority-v1',
                nodeType: 'artifact',
                artifactId: 'priority-v1',
                artifactPath: `${ALLOWLIST_ROOT}/reports/priority-v1.md`,
                artifactType: 'prd',
                updatedAt: '2026-02-23T12:00:00.000Z'
              }
            ],
            edges: [],
            clusters: []
          }
        }),
        evidenceGraphInput: {
          graphEntries: [
            {
              groupKey: 'fallback',
              artifactId: 'fallback-v1',
              artifactPath: `${ALLOWLIST_ROOT}/reports/fallback-v1.md`,
              artifactType: 'prd',
              decisionRefs: ['DEC-FALLBACK'],
              gateRefs: ['G1'],
              commandRefs: ['CMD-1']
            }
          ]
        }
      },
      {
        nowMs: () => toMs('2026-02-23T12:30:00.000Z')
      }
    );

    expect(result.reasonCode).toBe('OK');
    expect(Object.keys(result.decisionFreshness)).toEqual(['DEC-PRIORITY']);
  });

  it('delegates to S020 via evidenceGraphInput when evidenceGraphResult is absent', () => {
    const result = buildArtifactStalenessIndicator(
      {
        evidenceGraphInput: {
          graphEntries: [
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
        },
        maxAgeSeconds: 3600,
        artifactTimestamps: {
          'ops-v1': '2026-02-23T12:20:00.000Z'
        }
      },
      {
        nowMs: () => toMs('2026-02-23T12:30:00.000Z')
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        artifactsCount: 1,
        sourceReasonCode: 'OK'
      }
    });
    expect(Object.keys(result.decisionFreshness)).toEqual(['DEC-OPS-1']);
  });

  it('propagates strict upstream blocking reason codes from S020', () => {
    const result = buildArtifactStalenessIndicator({
      evidenceGraphResult: {
        allowed: false,
        reasonCode: 'EVIDENCE_LINK_INCOMPLETE',
        reason: 'Graph incomplet.',
        diagnostics: {
          sourceReasonCode: 'EVIDENCE_LINK_INCOMPLETE'
        },
        correctiveActions: ['LINK_OR_RESTORE_EVIDENCE']
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'EVIDENCE_LINK_INCOMPLETE',
      diagnostics: {
        sourceReasonCode: 'EVIDENCE_LINK_INCOMPLETE',
        artifactsCount: 0,
        staleCount: 0
      },
      correctiveActions: ['LINK_OR_RESTORE_EVIDENCE']
    });
  });

  it('returns EVENT_LEDGER_GAP_DETECTED when ledger sequence contains gaps', () => {
    const result = buildArtifactStalenessIndicator({
      evidenceGraphResult: buildEvidenceGraphResult(),
      eventLedger: [100, 101, 103]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'EVENT_LEDGER_GAP_DETECTED',
      correctiveActions: ['REPAIR_EVENT_LEDGER_GAP']
    });
    expect(result.reason).toContain('Gap ledger');
  });

  it('returns PROJECTION_REBUILD_TIMEOUT when rebuildDurationMs exceeds 60000ms', () => {
    const result = buildArtifactStalenessIndicator({
      evidenceGraphResult: buildEvidenceGraphResult(),
      rebuildDurationMs: 60001
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PROJECTION_REBUILD_TIMEOUT',
      correctiveActions: ['REBUILD_STALENESS_PROJECTION']
    });
    expect(result.reason).toContain('60001');
  });

  it('keeps stable contract and public index export', () => {
    const result = buildStalenessFromIndex({
      evidenceGraphResult: buildEvidenceGraphResult(),
      artifactTimestamps: {
        'rollout-v1': '2026-02-23T12:00:00.000Z',
        'rollout-v2': '2026-02-23T12:10:00.000Z'
      }
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('stalenessBoard');
    expect(result).toHaveProperty('decisionFreshness');
    expect(result).toHaveProperty('correctiveActions');

    expect(typeof result.allowed).toBe('boolean');
    expect(REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(typeof result.reason).toBe('string');

    expect(result.diagnostics).toHaveProperty('artifactsCount');
    expect(result.diagnostics).toHaveProperty('staleCount');
    expect(result.diagnostics).toHaveProperty('staleRatio');
    expect(result.diagnostics).toHaveProperty('maxAgeSeconds');
    expect(result.diagnostics).toHaveProperty('rebuildDurationMs');
    expect(result.diagnostics).toHaveProperty('durationMs');
    expect(result.diagnostics).toHaveProperty('p95StalenessMs');
    expect(result.diagnostics).toHaveProperty('sourceReasonCode');

    expect(result.stalenessBoard).toHaveProperty('staleButAvailable');
    expect(result.stalenessBoard).toHaveProperty('maxAgeSeconds');
    expect(result.stalenessBoard).toHaveProperty('artifacts');
    expect(result.stalenessBoard).toHaveProperty('summary');

    expect(Array.isArray(result.correctiveActions)).toBe(true);
  });

  it('meets performance threshold on synthetic corpus of 500 docs', () => {
    const artifacts = Array.from({ length: 500 }, (_, index) => ({
      nodeId: `artifact:artifact-${index}`,
      nodeType: 'artifact',
      artifactId: `artifact-${index}`,
      artifactPath: `${ALLOWLIST_ROOT}/reports/stale-${index}.md`,
      artifactType: 'prd',
      updatedAt: '2026-02-23T12:00:00.000Z'
    }));

    const decisionBacklinks = Object.fromEntries(
      Array.from({ length: 500 }, (_, index) => [
        `DEC-${index}`,
        [
          {
            artifactId: `artifact-${index}`,
            artifactPath: `${ALLOWLIST_ROOT}/reports/stale-${index}.md`,
            artifactType: 'prd',
            updatedAt: '2026-02-23T12:00:00.000Z'
          }
        ]
      ])
    );

    const result = buildArtifactStalenessIndicator(
      {
        evidenceGraphResult: buildEvidenceGraphResult({
          graph: {
            nodes: artifacts,
            edges: [],
            clusters: []
          },
          decisionBacklinks
        }),
        maxAgeSeconds: 3600,
        artifactTimestamps: Object.fromEntries(
          Array.from({ length: 500 }, (_, index) => [
            `artifact-${index}`,
            '2026-02-23T12:00:00.000Z'
          ])
        ),
        rebuildDurationMs: 1200,
        eventLedger: Array.from({ length: 500 }, (_, index) => index)
      },
      {
        nowMs: () => toMs('2026-02-23T12:30:00.000Z')
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        artifactsCount: 500,
        staleCount: 0,
        maxAgeSeconds: 3600,
        rebuildDurationMs: 1200,
        sourceReasonCode: 'OK'
      }
    });

    expect(result.diagnostics.p95StalenessMs).toBeLessThanOrEqual(2000);
    expect(result.diagnostics.durationMs).toBeLessThan(60000);
  });

  it('accepts buildArtifactEvidenceGraph output as direct upstream source', () => {
    const evidenceGraphResult = buildArtifactEvidenceGraph({
      graphEntries: [
        {
          groupKey: 'doc:1',
          artifactId: 'doc-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
          artifactType: 'doc',
          decisionRefs: ['DEC-DOC-1'],
          gateRefs: ['G4-T'],
          commandRefs: ['CMD-DOC-1']
        }
      ]
    });

    const result = buildArtifactStalenessIndicator(
      {
        evidenceGraphResult,
        artifactTimestamps: {
          'doc-v1': '2026-02-23T12:20:00.000Z'
        }
      },
      {
        nowMs: () => toMs('2026-02-23T12:30:00.000Z')
      }
    );

    expect(evidenceGraphResult.reasonCode).toBe('OK');
    expect(result.reasonCode).toBe('OK');
    expect(result.diagnostics.artifactsCount).toBe(1);
  });
});
