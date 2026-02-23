import { describe, expect, it } from 'vitest';
import { buildArtifactParseDiagnostics } from '../../src/artifact-parse-diagnostics.js';
import {
  buildArtifactParseDiagnostics as buildParseDiagFromIndex,
  buildArtifactStalenessIndicator
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
  'INVALID_STALENESS_INPUT',
  'PARSE_RETRY_LIMIT_REACHED',
  'PARSE_DLQ_REQUIRED',
  'INVALID_PARSE_DIAGNOSTIC_INPUT'
]);

function buildStalenessResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Staleness check OK.',
    diagnostics: {
      artifactsCount: 2,
      staleCount: 0,
      staleRatio: 0,
      maxAgeSeconds: 3600,
      rebuildDurationMs: 500,
      durationMs: 12,
      p95StalenessMs: 5,
      sourceReasonCode: 'OK'
    },
    stalenessBoard: {
      staleButAvailable: true,
      maxAgeSeconds: 3600,
      artifacts: [
        {
          artifactId: 'rollout-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
          artifactType: 'prd',
          updatedAt: '2026-02-23T15:00:00.000Z',
          ageSeconds: 300,
          maxAgeSeconds: 3600,
          isStale: false,
          stalenessLevel: 'fresh'
        },
        {
          artifactId: 'rollout-v2',
          artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v2.md`,
          artifactType: 'prd',
          updatedAt: '2026-02-23T14:00:00.000Z',
          ageSeconds: 3900,
          maxAgeSeconds: 3600,
          isStale: true,
          stalenessLevel: 'warning'
        }
      ],
      summary: {
        artifactsCount: 2,
        staleCount: 1,
        staleRatio: 0.5,
        maxAgeSeconds: 3600,
        highestAgeSeconds: 3900
      }
    },
    decisionFreshness: {
      'DEC-1': [
        {
          artifactId: 'rollout-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
          artifactType: 'prd',
          updatedAt: '2026-02-23T15:00:00.000Z',
          ageSeconds: 300,
          isStale: false,
          stalenessLevel: 'fresh'
        },
        {
          artifactId: 'rollout-v2',
          artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v2.md`,
          artifactType: 'prd',
          updatedAt: '2026-02-23T14:00:00.000Z',
          ageSeconds: 3900,
          isStale: true,
          stalenessLevel: 'warning'
        }
      ]
    },
    correctiveActions: [],
    ...overrides
  };
}

function buildStalenessInput() {
  return {
    evidenceGraphResult: {
      allowed: true,
      reasonCode: 'OK',
      reason: 'graph ok',
      diagnostics: {
        sourceReasonCode: 'OK'
      },
      graph: {
        nodes: [
          {
            nodeId: 'artifact:doc-v1',
            nodeType: 'artifact',
            artifactId: 'doc-v1',
            artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
            artifactType: 'doc',
            updatedAt: '2026-02-23T15:20:00.000Z'
          }
        ],
        edges: [],
        clusters: []
      },
      decisionBacklinks: {
        'DEC-DOC': [
          {
            artifactId: 'doc-v1',
            artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
            artifactType: 'doc',
            updatedAt: '2026-02-23T15:20:00.000Z'
          }
        ]
      },
      orphanEvidence: [],
      correctiveActions: []
    },
    artifactTimestamps: {
      'doc-v1': '2026-02-23T15:20:00.000Z'
    },
    maxAgeSeconds: 3600,
    eventLedger: [10, 11, 12]
  };
}

describe('artifact-parse-diagnostics unit', () => {
  it('returns OK on nominal input without parse issues', () => {
    const result = buildArtifactParseDiagnostics({
      stalenessResult: buildStalenessResult(),
      parseEvents: []
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        artifactsChecked: 2,
        parseErrorCount: 0,
        retryScheduledCount: 0,
        dlqCount: 0,
        sourceReasonCode: 'OK'
      },
      parseIssues: [],
      recommendations: [],
      dlqCandidates: [],
      correctiveActions: []
    });
  });

  it('returns ARTIFACT_PARSE_FAILED with parse issue details, recommendations and staleness context', () => {
    const result = buildArtifactParseDiagnostics({
      stalenessResult: buildStalenessResult(),
      parseEvents: [
        {
          artifactId: 'rollout-v2',
          artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v2.md`,
          parseStage: 'frontmatter',
          errorType: 'frontmatter',
          errorMessage: 'Frontmatter YAML invalide',
          line: 3,
          column: 2,
          retryCount: 1
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'ARTIFACT_PARSE_FAILED',
      diagnostics: {
        artifactsChecked: 2,
        parseErrorCount: 1,
        retryScheduledCount: 1,
        dlqCount: 0
      },
      correctiveActions: ['SCHEDULE_PARSE_RETRY']
    });

    expect(result.parseIssues).toHaveLength(1);
    expect(result.parseIssues[0]).toMatchObject({
      artifactId: 'rollout-v2',
      parseStage: 'frontmatter',
      errorType: 'frontmatter',
      retryCount: 1,
      maxRetries: 3,
      recommendedFix: 'Corriger le frontmatter YAML (format, clés obligatoires, types) puis relancer.',
      stalenessContext: {
        isStale: true,
        ageSeconds: 3900,
        stalenessLevel: 'warning'
      }
    });
    expect(result.recommendations[0]).toMatchObject({
      artifactId: 'rollout-v2',
      action: 'SCHEDULE_PARSE_RETRY'
    });
  });

  it('prefers stalenessResult over stalenessInput', () => {
    const result = buildArtifactParseDiagnostics({
      stalenessResult: buildStalenessResult({
        stalenessBoard: {
          staleButAvailable: true,
          maxAgeSeconds: 3600,
          artifacts: [
            {
              artifactId: 'preferred-v1',
              artifactPath: `${ALLOWLIST_ROOT}/reports/preferred-v1.md`,
              artifactType: 'prd',
              updatedAt: '2026-02-23T15:00:00.000Z',
              ageSeconds: 30,
              maxAgeSeconds: 3600,
              isStale: false,
              stalenessLevel: 'fresh'
            }
          ],
          summary: {
            artifactsCount: 1,
            staleCount: 0,
            staleRatio: 0,
            maxAgeSeconds: 3600,
            highestAgeSeconds: 30
          }
        }
      }),
      stalenessInput: buildStalenessInput()
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.diagnostics.artifactsChecked).toBe(1);
  });

  it('delegates to S021 via stalenessInput when stalenessResult absent', () => {
    const result = buildArtifactParseDiagnostics({
      stalenessInput: buildStalenessInput(),
      parseEvents: []
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        artifactsChecked: 1,
        sourceReasonCode: 'OK'
      }
    });
  });

  it('propagates strict upstream blocking reason codes from S021', () => {
    const result = buildArtifactParseDiagnostics({
      stalenessResult: {
        allowed: false,
        reasonCode: 'EVENT_LEDGER_GAP_DETECTED',
        reason: 'Gap ledger.',
        diagnostics: {
          sourceReasonCode: 'EVENT_LEDGER_GAP_DETECTED'
        },
        correctiveActions: ['REPAIR_EVENT_LEDGER_GAP']
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'EVENT_LEDGER_GAP_DETECTED',
      diagnostics: {
        sourceReasonCode: 'EVENT_LEDGER_GAP_DETECTED'
      },
      correctiveActions: ['REPAIR_EVENT_LEDGER_GAP']
    });
  });

  it('returns PARSE_RETRY_LIMIT_REACHED when retry count equals maxRetries', () => {
    const result = buildArtifactParseDiagnostics({
      stalenessResult: buildStalenessResult(),
      maxRetries: 3,
      parseEvents: [
        {
          artifactId: 'rollout-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
          parseStage: 'schema',
          errorType: 'schema',
          errorMessage: 'Schema invalide',
          line: 12,
          column: 4,
          retryCount: 3
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'PARSE_RETRY_LIMIT_REACHED',
      diagnostics: {
        parseErrorCount: 1,
        retryScheduledCount: 0,
        dlqCount: 0
      },
      correctiveActions: ['SCHEDULE_PARSE_RETRY']
    });
  });

  it('returns PARSE_DLQ_REQUIRED when retry count exceeds maxRetries', () => {
    const result = buildArtifactParseDiagnostics({
      stalenessResult: buildStalenessResult(),
      maxRetries: 3,
      parseEvents: [
        {
          artifactId: 'rollout-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
          parseStage: 'decode',
          errorType: 'encoding',
          errorMessage: 'Encodage invalide',
          line: 1,
          column: 1,
          retryCount: 4
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PARSE_DLQ_REQUIRED',
      diagnostics: {
        parseErrorCount: 1,
        dlqCount: 1
      },
      correctiveActions: ['MOVE_TO_PARSE_DLQ']
    });

    expect(result.dlqCandidates).toHaveLength(1);
    expect(result.dlqCandidates[0]).toMatchObject({
      artifactId: 'rollout-v1',
      retryCount: 4,
      maxRetries: 3
    });
  });

  it('keeps stable contract and public index export', () => {
    const result = buildParseDiagFromIndex({
      stalenessResult: buildStalenessResult(),
      parseEvents: []
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('parseIssues');
    expect(result).toHaveProperty('recommendations');
    expect(result).toHaveProperty('dlqCandidates');
    expect(result).toHaveProperty('correctiveActions');

    expect(typeof result.allowed).toBe('boolean');
    expect(REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(typeof result.reason).toBe('string');

    expect(result.diagnostics).toHaveProperty('artifactsChecked');
    expect(result.diagnostics).toHaveProperty('parseErrorCount');
    expect(result.diagnostics).toHaveProperty('retryScheduledCount');
    expect(result.diagnostics).toHaveProperty('dlqCount');
    expect(result.diagnostics).toHaveProperty('durationMs');
    expect(result.diagnostics).toHaveProperty('p95ParseDiagMs');
    expect(result.diagnostics).toHaveProperty('sourceReasonCode');

    expect(Array.isArray(result.parseIssues)).toBe(true);
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(Array.isArray(result.dlqCandidates)).toBe(true);
    expect(Array.isArray(result.correctiveActions)).toBe(true);
  });

  it('meets performance threshold on synthetic corpus of 500 docs', () => {
    const stalenessResult = buildStalenessResult({
      stalenessBoard: {
        staleButAvailable: true,
        maxAgeSeconds: 3600,
        artifacts: Array.from({ length: 500 }, (_, index) => ({
          artifactId: `artifact-${index}`,
          artifactPath: `${ALLOWLIST_ROOT}/reports/diag-${index}.md`,
          artifactType: 'prd',
          updatedAt: '2026-02-23T15:00:00.000Z',
          ageSeconds: 300,
          maxAgeSeconds: 3600,
          isStale: false,
          stalenessLevel: 'fresh'
        })),
        summary: {
          artifactsCount: 500,
          staleCount: 0,
          staleRatio: 0,
          maxAgeSeconds: 3600,
          highestAgeSeconds: 300
        }
      }
    });

    const parseEvents = Array.from({ length: 500 }, (_, index) => ({
      artifactId: `artifact-${index}`,
      artifactPath: `${ALLOWLIST_ROOT}/reports/diag-${index}.md`,
      parseStage: 'markdown',
      errorType: 'syntax',
      errorMessage: `error-${index}`,
      line: index + 1,
      column: 1,
      retryCount: 1
    }));

    const result = buildArtifactParseDiagnostics({
      stalenessResult,
      parseEvents,
      maxRetries: 3
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'ARTIFACT_PARSE_FAILED',
      diagnostics: {
        artifactsChecked: 500,
        parseErrorCount: 500,
        retryScheduledCount: 500,
        dlqCount: 0,
        sourceReasonCode: 'OK'
      }
    });

    expect(result.diagnostics.p95ParseDiagMs).toBeLessThanOrEqual(2000);
    expect(result.diagnostics.durationMs).toBeLessThan(60000);
  });

  it('accepts output of buildArtifactStalenessIndicator as direct upstream source', () => {
    const stalenessResult = buildArtifactStalenessIndicator(
      {
        evidenceGraphResult: {
          allowed: true,
          reasonCode: 'OK',
          reason: 'graph ok',
          diagnostics: {
            sourceReasonCode: 'OK'
          },
          graph: {
            nodes: [
              {
                nodeId: 'artifact:doc-v1',
                nodeType: 'artifact',
                artifactId: 'doc-v1',
                artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
                artifactType: 'doc',
                updatedAt: '2026-02-23T15:20:00.000Z'
              }
            ],
            edges: [],
            clusters: []
          },
          decisionBacklinks: {
            'DEC-DOC': [
              {
                artifactId: 'doc-v1',
                artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
                artifactType: 'doc',
                updatedAt: '2026-02-23T15:20:00.000Z'
              }
            ]
          },
          orphanEvidence: [],
          correctiveActions: []
        },
        artifactTimestamps: {
          'doc-v1': '2026-02-23T15:20:00.000Z'
        },
        maxAgeSeconds: 3600,
        eventLedger: [10, 11, 12]
      },
      {
        nowMs: () => Date.parse('2026-02-23T15:30:00.000Z')
      }
    );

    const result = buildArtifactParseDiagnostics({
      stalenessResult,
      parseEvents: []
    });

    expect(stalenessResult.reasonCode).toBe('OK');
    expect(result.reasonCode).toBe('OK');
    expect(result.diagnostics.artifactsChecked).toBe(1);
  });
});
