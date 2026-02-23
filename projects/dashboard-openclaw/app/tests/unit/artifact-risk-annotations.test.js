import { describe, expect, it } from 'vitest';
import { annotateArtifactRiskContext } from '../../src/artifact-risk-annotations.js';
import {
  annotateArtifactRiskContext as annotateArtifactRiskContextFromIndex,
  buildArtifactParseDiagnostics
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
  'INVALID_PARSE_DIAGNOSTIC_INPUT',
  'RISK_TAGS_MISSING',
  'RISK_ANNOTATION_CONFLICT',
  'INVALID_RISK_ANNOTATION_INPUT'
]);

function buildParseDiagnosticsResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'ARTIFACT_PARSE_FAILED',
    reason: 'Parse errors détectés.',
    diagnostics: {
      sourceReasonCode: 'OK'
    },
    parseIssues: [
      {
        issueId: 'parse-issue-1',
        artifactId: 'rollout-v1',
        artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
        artifactType: 'prd',
        parseStage: 'frontmatter',
        errorType: 'frontmatter',
        errorMessage: 'YAML invalide',
        retryCount: 1,
        maxRetries: 3,
        recommendedFix: 'Corriger le frontmatter',
        stalenessContext: {
          isStale: false,
          ageSeconds: 300,
          stalenessLevel: 'fresh'
        }
      },
      {
        issueId: 'parse-issue-2',
        artifactId: 'rollout-v2',
        artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v2.md`,
        artifactType: 'prd',
        parseStage: 'schema',
        errorType: 'schema',
        errorMessage: 'Schema mismatch',
        retryCount: 3,
        maxRetries: 3,
        recommendedFix: 'Aligner les champs sur le schéma',
        stalenessContext: {
          isStale: true,
          ageSeconds: 5400,
          stalenessLevel: 'critical'
        }
      }
    ],
    recommendations: [
      {
        artifactId: 'rollout-v1',
        action: 'SCHEDULE_PARSE_RETRY'
      },
      {
        artifactId: 'rollout-v2',
        action: 'SCHEDULE_PARSE_RETRY'
      }
    ],
    dlqCandidates: [
      {
        artifactId: 'rollout-v2',
        retryCount: 3,
        maxRetries: 3
      }
    ],
    correctiveActions: ['SCHEDULE_PARSE_RETRY'],
    ...overrides
  };
}

function buildStalenessResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'staleness ok',
    diagnostics: {
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
          updatedAt: '2026-02-23T17:20:00.000Z',
          ageSeconds: 60,
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
        highestAgeSeconds: 60
      }
    },
    decisionFreshness: {
      'DEC-1': [
        {
          artifactId: 'rollout-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
          artifactType: 'prd',
          updatedAt: '2026-02-23T17:20:00.000Z',
          ageSeconds: 60,
          isStale: false,
          stalenessLevel: 'fresh'
        }
      ]
    },
    correctiveActions: [],
    ...overrides
  };
}

describe('artifact-risk-annotations unit', () => {
  it('returns OK on nominal flow with deterministic tags, annotations and diagnostics', () => {
    const result = annotateArtifactRiskContext({
      parseDiagnosticsResult: buildParseDiagnosticsResult()
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        artifactsTaggedCount: 2,
        annotationsCount: 2,
        highRiskCount: 1,
        retryLimitedCount: 1,
        dlqCount: 1,
        sourceReasonCode: 'OK'
      },
      correctiveActions: []
    });

    expect(result.reason).toContain('Annotations risque générées');

    expect(result.taggedArtifacts).toHaveLength(2);
    expect(result.taggedArtifacts.map((entry) => entry.artifactId)).toEqual(['rollout-v1', 'rollout-v2']);

    expect(result.taggedArtifacts[0]).toMatchObject({
      artifactId: 'rollout-v1',
      artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
      artifactType: 'prd',
      sourceIssueIds: ['parse-issue-1'],
      severity: 'medium',
      ownerHint: 'metadata-owner'
    });

    expect(result.taggedArtifacts[0].riskTags).toEqual(['T01', 'T02']);

    expect(result.taggedArtifacts[1]).toMatchObject({
      artifactId: 'rollout-v2',
      artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v2.md`,
      artifactType: 'prd',
      sourceIssueIds: ['parse-issue-2'],
      severity: 'high',
      ownerHint: 'schema-owner'
    });

    expect(result.taggedArtifacts[1].riskTags).toEqual(['NFR016', 'NFR038', 'P02', 'T01', 'T02']);

    expect(result.contextAnnotations).toHaveLength(2);
    expect(result.contextAnnotations[0]).toMatchObject({
      annotationId: 'annotation-parse-issue-1',
      artifactId: 'rollout-v1',
      issueId: 'parse-issue-1',
      parseStage: 'frontmatter',
      errorType: 'frontmatter',
      recommendedFix: 'Corriger le frontmatter',
      severity: 'medium',
      ownerHint: 'metadata-owner',
      riskTags: ['T01', 'T02']
    });
    expect(result.contextAnnotations[0].what).toContain('rollout-v1');
    expect(result.contextAnnotations[0].why).toContain('FR-031');
    expect(result.contextAnnotations[0].nextAction).toContain('Priorité=MEDIUM');

    expect(result.contextAnnotations[1]).toMatchObject({
      annotationId: 'annotation-parse-issue-2',
      artifactId: 'rollout-v2',
      issueId: 'parse-issue-2',
      parseStage: 'schema',
      errorType: 'schema',
      recommendedFix: 'Aligner les champs sur le schéma',
      severity: 'high',
      ownerHint: 'schema-owner',
      riskTags: ['NFR016', 'NFR038', 'P02', 'T01', 'T02']
    });
    expect(result.contextAnnotations[1].nextAction).toContain('Priorité=HIGH');

    expect(result.riskTagCatalog.length).toBeGreaterThan(0);
    expect(result.riskTagCatalog[0]).toMatchObject({
      riskTag: 'T01',
      count: 4,
      highestSeverity: 'high'
    });
    expect(result.riskTagCatalog[1]).toMatchObject({
      riskTag: 'T02',
      count: 4,
      highestSeverity: 'high'
    });

    expect(result.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.diagnostics.p95TaggingMs).toBeGreaterThanOrEqual(0);
  });

  it('prefers parseDiagnosticsResult over parseDiagnosticsInput', () => {
    const result = annotateArtifactRiskContext({
      parseDiagnosticsResult: buildParseDiagnosticsResult({
        parseIssues: [
          {
            issueId: 'preferred-issue',
            artifactId: 'preferred-v1',
            artifactPath: `${ALLOWLIST_ROOT}/reports/preferred-v1.md`,
            artifactType: 'prd',
            parseStage: 'schema',
            errorType: 'schema',
            errorMessage: 'preferred',
            retryCount: 0,
            maxRetries: 3,
            recommendedFix: 'Fix preferred',
            stalenessContext: {
              isStale: false,
              ageSeconds: 20,
              stalenessLevel: 'fresh'
            }
          }
        ],
        recommendations: [],
        dlqCandidates: []
      }),
      parseDiagnosticsInput: {
        stalenessResult: buildStalenessResult(),
        parseEvents: [
          {
            artifactId: 'fallback-v1',
            artifactPath: `${ALLOWLIST_ROOT}/reports/fallback-v1.md`,
            parseStage: 'markdown',
            errorType: 'syntax',
            errorMessage: 'fallback issue',
            retryCount: 1
          }
        ]
      }
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.diagnostics.artifactsTaggedCount).toBe(1);
    expect(result.taggedArtifacts[0].artifactId).toBe('preferred-v1');
  });

  it('delegates to S022 via parseDiagnosticsInput when parseDiagnosticsResult is absent', () => {
    const result = annotateArtifactRiskContext({
      parseDiagnosticsInput: {
        stalenessResult: buildStalenessResult(),
        parseEvents: [
          {
            artifactId: 'rollout-v1',
            artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
            parseStage: 'markdown',
            errorType: 'syntax',
            errorMessage: 'invalid markdown',
            retryCount: 1
          }
        ]
      }
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        artifactsTaggedCount: 1,
        annotationsCount: 1,
        sourceReasonCode: 'OK'
      }
    });

    expect(result.contextAnnotations[0]).toMatchObject({
      artifactId: 'rollout-v1',
      parseStage: 'markdown',
      errorType: 'syntax'
    });
  });

  it('fails closed when delegated parse diagnostics returns issues without artifactPath', () => {
    const result = annotateArtifactRiskContext({
      parseDiagnosticsInput: {
        stalenessResult: buildStalenessResult(),
        parseEvents: [
          {
            artifactId: 'rollout-v1',
            parseStage: 'markdown',
            errorType: 'syntax',
            errorMessage: 'artifactPath absent',
            retryCount: 1
          }
        ]
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_RISK_ANNOTATION_INPUT',
      diagnostics: {
        sourceReasonCode: 'OK',
        artifactsTaggedCount: 0,
        annotationsCount: 0
      },
      taggedArtifacts: [],
      contextAnnotations: [],
      riskTagCatalog: [],
      correctiveActions: ['FIX_RISK_ANNOTATION_INPUT']
    });
    expect(result.reason).toContain('parseIssues[0].artifactPath invalide');
  });

  it('propagates strict upstream blocking reason codes from S022', () => {
    const result = annotateArtifactRiskContext({
      parseDiagnosticsResult: {
        allowed: false,
        reasonCode: 'EVENT_LEDGER_GAP_DETECTED',
        reason: 'Gap ledger détecté.',
        diagnostics: {
          sourceReasonCode: 'EVENT_LEDGER_GAP_DETECTED'
        },
        correctiveActions: ['REPAIR_EVENT_LEDGER_GAP']
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'EVENT_LEDGER_GAP_DETECTED',
      reason: 'Gap ledger détecté.',
      diagnostics: {
        sourceReasonCode: 'EVENT_LEDGER_GAP_DETECTED',
        artifactsTaggedCount: 0,
        annotationsCount: 0
      },
      taggedArtifacts: [],
      contextAnnotations: [],
      riskTagCatalog: [],
      correctiveActions: ['REPAIR_EVENT_LEDGER_GAP']
    });
  });

  it('normalizes and deduplicates injected risk tags with stable sorting and riskTagCatalog aggregation', () => {
    const result = annotateArtifactRiskContext({
      parseDiagnosticsResult: buildParseDiagnosticsResult({
        parseIssues: [
          {
            issueId: 'parse-issue-4',
            artifactId: 'artifact-a',
            artifactPath: `${ALLOWLIST_ROOT}/reports/artifact-a.md`,
            parseStage: 'markdown',
            errorType: 'syntax',
            retryCount: 0,
            recommendedFix: 'fix'
          }
        ],
        recommendations: [],
        dlqCandidates: []
      }),
      taggedArtifacts: [
        {
          artifactId: 'artifact-a',
          artifactPath: `${ALLOWLIST_ROOT}/reports/artifact-a.md`,
          artifactType: 'prd',
          sourceIssueIds: [' parse-issue-4 ', 'parse-issue-4'],
          riskTags: [' P02 ', 'T01', 'T02', 'T01'],
          severity: 'high',
          ownerHint: ' squad-a '
        }
      ],
      contextAnnotations: [
        {
          annotationId: 'ann-1',
          artifactId: 'artifact-a',
          artifactPath: `${ALLOWLIST_ROOT}/reports/artifact-a.md`,
          issueId: 'parse-issue-4',
          parseStage: 'markdown',
          errorType: 'syntax',
          recommendedFix: 'fix',
          what: 'quoi',
          why: 'pourquoi',
          nextAction: 'action',
          severity: 'medium',
          ownerHint: ' squad-a ',
          riskTags: ['T02', 'P02', 'P02', 'T01']
        }
      ]
    });

    expect(result.reasonCode).toBe('OK');

    expect(result.taggedArtifacts[0]).toMatchObject({
      sourceIssueIds: ['parse-issue-4'],
      riskTags: ['P02', 'T01', 'T02'],
      ownerHint: 'squad-a'
    });

    expect(result.contextAnnotations[0]).toMatchObject({
      riskTags: ['P02', 'T01', 'T02'],
      ownerHint: 'squad-a'
    });

    const counts = result.riskTagCatalog.map((entry) => entry.count);
    for (let index = 1; index < counts.length; index += 1) {
      expect(counts[index]).toBeLessThanOrEqual(counts[index - 1]);
    }

    expect(result.riskTagCatalog[0]).toMatchObject({
      riskTag: 'P02',
      count: 2
    });
  });

  it('returns RISK_TAGS_MISSING with explicit corrective action when at least one tagged artifact has no risk tags', () => {
    const result = annotateArtifactRiskContext({
      parseDiagnosticsResult: buildParseDiagnosticsResult({
        parseIssues: [
          {
            issueId: 'critical-issue',
            artifactId: 'critical-v1',
            artifactPath: `${ALLOWLIST_ROOT}/reports/critical-v1.md`,
            parseStage: 'schema',
            errorType: 'schema',
            retryCount: 4,
            recommendedFix: 'Fix critical'
          }
        ],
        recommendations: [],
        dlqCandidates: []
      }),
      taggedArtifacts: [
        {
          artifactId: 'critical-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/critical-v1.md`,
          artifactType: 'prd',
          sourceIssueIds: ['critical-issue'],
          riskTags: [],
          severity: 'critical',
          ownerHint: 'ops-owner'
        }
      ],
      contextAnnotations: []
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'RISK_TAGS_MISSING',
      correctiveActions: ['ADD_RISK_TAGS']
    });
    expect(result.reason).toContain('aucun riskTag');
  });

  it('returns RISK_ANNOTATION_CONFLICT when context annotations contain tags not present on tagged artifact', () => {
    const result = annotateArtifactRiskContext({
      parseDiagnosticsResult: buildParseDiagnosticsResult({
        parseIssues: [
          {
            issueId: 'issue-conflict',
            artifactId: 'conflict-v1',
            artifactPath: `${ALLOWLIST_ROOT}/reports/conflict-v1.md`,
            parseStage: 'markdown',
            errorType: 'syntax',
            retryCount: 1,
            recommendedFix: 'Fix conflict'
          }
        ],
        recommendations: [],
        dlqCandidates: []
      }),
      taggedArtifacts: [
        {
          artifactId: 'conflict-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/conflict-v1.md`,
          artifactType: 'prd',
          sourceIssueIds: ['issue-conflict'],
          riskTags: ['T01'],
          severity: 'high',
          ownerHint: 'owner-a'
        }
      ],
      contextAnnotations: [
        {
          annotationId: 'ann-conflict',
          artifactId: 'conflict-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/conflict-v1.md`,
          issueId: 'issue-conflict',
          parseStage: 'markdown',
          errorType: 'syntax',
          recommendedFix: 'Fix conflict',
          what: 'Conflit',
          why: 'Tag absent côté artefact',
          nextAction: 'Aligner tags',
          severity: 'high',
          ownerHint: 'owner-a',
          riskTags: ['T02']
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'RISK_ANNOTATION_CONFLICT',
      correctiveActions: ['RESOLVE_RISK_ANNOTATION_CONFLICT']
    });
    expect(result.reason).toContain('Conflit de contexte');
  });

  it('fails closed when parseDiagnosticsResult contains issue with invalid artifactPath (reviewer regression)', () => {
    const result = annotateArtifactRiskContext({
      parseDiagnosticsResult: buildParseDiagnosticsResult({
        parseIssues: [
          {
            issueId: 'skip-path',
            artifactId: 'skip-v1',
            artifactPath: 'relative/path.md',
            parseStage: 'markdown',
            errorType: 'syntax',
            retryCount: 0,
            recommendedFix: 'ignored'
          }
        ],
        recommendations: [],
        dlqCandidates: []
      })
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_RISK_ANNOTATION_INPUT',
      diagnostics: {
        artifactsTaggedCount: 0,
        annotationsCount: 0,
        sourceReasonCode: 'OK'
      },
      taggedArtifacts: [],
      contextAnnotations: [],
      riskTagCatalog: [],
      correctiveActions: ['FIX_RISK_ANNOTATION_INPUT']
    });
    expect(result.reason).toContain('parseIssues[0].artifactPath invalide');
  });

  it('merges duplicate artifacts with highest severity and keeps severity tie-break ordering in catalog', () => {
    const mergedResult = annotateArtifactRiskContext({
      parseDiagnosticsResult: buildParseDiagnosticsResult({
        parseIssues: [
          {
            issueId: 'dup-low',
            artifactId: 'dup-v1',
            artifactPath: `${ALLOWLIST_ROOT}/reports/dup-v1.md`,
            artifactType: 'prd',
            parseStage: 'markdown',
            errorType: 'syntax',
            errorMessage: 'first',
            retryCount: 0,
            recommendedFix: '',
            stalenessContext: {
              stalenessLevel: 'fresh'
            }
          },
          {
            issueId: 'dup-high',
            artifactId: 'dup-v1',
            artifactPath: `${ALLOWLIST_ROOT}/reports/dup-v1.md`,
            artifactType: 'prd',
            parseStage: 'schema',
            errorType: 'schema',
            errorMessage: 'second',
            retryCount: 3,
            recommendedFix: 'fix dup',
            stalenessContext: {
              stalenessLevel: 'critical'
            }
          }
        ],
        recommendations: [],
        dlqCandidates: []
      })
    });

    expect(mergedResult.reasonCode).toBe('OK');
    expect(mergedResult.diagnostics.artifactsTaggedCount).toBe(1);
    expect(mergedResult.taggedArtifacts[0]).toMatchObject({
      artifactId: 'dup-v1',
      severity: 'high'
    });
    expect(mergedResult.taggedArtifacts[0].sourceIssueIds).toEqual(['dup-high', 'dup-low']);

    const tieBreakResult = annotateArtifactRiskContext({
      parseDiagnosticsResult: buildParseDiagnosticsResult({
        reasonCode: 'OK',
        parseIssues: [],
        recommendations: [],
        dlqCandidates: []
      }),
      taggedArtifacts: [
        {
          artifactId: 'alpha',
          artifactPath: `${ALLOWLIST_ROOT}/reports/alpha.md`,
          artifactType: 'prd',
          sourceIssueIds: ['a-1'],
          riskTags: ['Z-HIGH'],
          severity: 'high',
          ownerHint: 'owner-a'
        },
        {
          artifactId: 'beta',
          artifactPath: `${ALLOWLIST_ROOT}/reports/beta.md`,
          artifactType: 'prd',
          sourceIssueIds: ['b-1'],
          riskTags: ['A-LOW'],
          severity: 'low',
          ownerHint: 'owner-b'
        }
      ],
      contextAnnotations: [
        {
          annotationId: 'ann-alpha',
          artifactId: 'alpha',
          artifactPath: `${ALLOWLIST_ROOT}/reports/alpha.md`,
          issueId: 'a-1',
          parseStage: 'schema',
          errorType: 'schema',
          what: 'alpha',
          why: 'alpha',
          nextAction: 'alpha',
          severity: 'high',
          ownerHint: 'owner-a',
          riskTags: ['Z-HIGH']
        },
        {
          annotationId: 'ann-beta',
          artifactId: 'beta',
          artifactPath: `${ALLOWLIST_ROOT}/reports/beta.md`,
          issueId: 'b-1',
          parseStage: 'markdown',
          errorType: 'syntax',
          what: 'beta',
          why: 'beta',
          nextAction: 'beta',
          severity: 'low',
          ownerHint: 'owner-b',
          riskTags: ['A-LOW']
        }
      ]
    });

    expect(tieBreakResult.reasonCode).toBe('OK');
    expect(tieBreakResult.riskTagCatalog).toEqual([
      {
        riskTag: 'Z-HIGH',
        label: 'Z-HIGH',
        count: 2,
        highestSeverity: 'high'
      },
      {
        riskTag: 'A-LOW',
        label: 'A-LOW',
        count: 2,
        highestSeverity: 'low'
      }
    ]);
  });

  it('keeps stable contract and public index export', () => {
    const result = annotateArtifactRiskContextFromIndex({
      parseDiagnosticsResult: buildParseDiagnosticsResult({
        reasonCode: 'OK',
        reason: 'Diagnostic parse OK.',
        parseIssues: [],
        recommendations: [],
        dlqCandidates: []
      })
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('taggedArtifacts');
    expect(result).toHaveProperty('contextAnnotations');
    expect(result).toHaveProperty('riskTagCatalog');
    expect(result).toHaveProperty('correctiveActions');

    expect(typeof result.allowed).toBe('boolean');
    expect(REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(typeof result.reason).toBe('string');

    expect(result.diagnostics).toHaveProperty('artifactsTaggedCount');
    expect(result.diagnostics).toHaveProperty('annotationsCount');
    expect(result.diagnostics).toHaveProperty('highRiskCount');
    expect(result.diagnostics).toHaveProperty('retryLimitedCount');
    expect(result.diagnostics).toHaveProperty('dlqCount');
    expect(result.diagnostics).toHaveProperty('durationMs');
    expect(result.diagnostics).toHaveProperty('p95TaggingMs');
    expect(result.diagnostics).toHaveProperty('sourceReasonCode');

    expect(Array.isArray(result.taggedArtifacts)).toBe(true);
    expect(Array.isArray(result.contextAnnotations)).toBe(true);
    expect(Array.isArray(result.riskTagCatalog)).toBe(true);
    expect(Array.isArray(result.correctiveActions)).toBe(true);
  });

  it('meets performance threshold on synthetic corpus of 500 docs', () => {
    const parseIssues = Array.from({ length: 500 }, (_, index) => ({
      issueId: `issue-${index}`,
      artifactId: `artifact-${index}`,
      artifactPath: `${ALLOWLIST_ROOT}/reports/risk-${index}.md`,
      artifactType: 'prd',
      parseStage: index % 2 === 0 ? 'schema' : 'markdown',
      errorType: index % 2 === 0 ? 'schema' : 'syntax',
      errorMessage: `error-${index}`,
      retryCount: index % 5 === 0 ? 3 : 1,
      recommendedFix: `fix-${index}`,
      stalenessContext: {
        isStale: index % 9 === 0,
        ageSeconds: 60 + index,
        stalenessLevel: index % 9 === 0 ? 'critical' : 'fresh'
      }
    }));

    const result = annotateArtifactRiskContext({
      parseDiagnosticsResult: buildParseDiagnosticsResult({
        parseIssues,
        recommendations: parseIssues.map((issue) => ({
          artifactId: issue.artifactId,
          action: 'SCHEDULE_PARSE_RETRY'
        })),
        dlqCandidates: parseIssues.filter((issue) => issue.retryCount >= 3).map((issue) => ({
          artifactId: issue.artifactId,
          retryCount: issue.retryCount,
          maxRetries: 3
        }))
      })
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        artifactsTaggedCount: 500,
        annotationsCount: 500,
        sourceReasonCode: 'OK'
      }
    });

    expect(result.diagnostics.p95TaggingMs).toBeLessThanOrEqual(2000);
    expect(result.diagnostics.durationMs).toBeLessThan(60000);
  });

  it('accepts buildArtifactParseDiagnostics output as direct upstream source (non-régression S022)', () => {
    const parseDiagnosticsResult = buildArtifactParseDiagnostics({
      stalenessResult: buildStalenessResult(),
      parseEvents: []
    });

    const result = annotateArtifactRiskContext({
      parseDiagnosticsResult
    });

    expect(parseDiagnosticsResult.reasonCode).toBe('OK');
    expect(result.reasonCode).toBe('OK');
    expect(result.diagnostics.artifactsTaggedCount).toBe(0);
    expect(result.contextAnnotations).toEqual([]);
  });
});
