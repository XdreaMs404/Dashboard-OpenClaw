import { describe, expect, it } from 'vitest';
import { runArtifactCorpusBackfill } from '../../src/artifact-corpus-backfill.js';
import { runArtifactCorpusBackfill as runArtifactCorpusBackfillFromIndex } from '../../src/index.js';

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
  'INVALID_RISK_ANNOTATION_INPUT',
  'BACKFILL_QUEUE_SATURATED',
  'BACKFILL_BATCH_FAILED',
  'MIGRATION_CORPUS_INCOMPATIBLE',
  'INVALID_BACKFILL_INPUT'
]);

function buildRiskAnnotationsResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Annotations risque disponibles.',
    diagnostics: {
      sourceReasonCode: 'OK'
    },
    taggedArtifacts: [
      {
        artifactId: 'artifact-a',
        artifactPath: `${ALLOWLIST_ROOT}/reports/artifact-a.md`,
        artifactType: 'prd',
        sourceIssueIds: ['issue-a'],
        riskTags: ['T01', 'T02'],
        severity: 'medium',
        ownerHint: 'owner-a',
        contentHash: 'hash-a'
      },
      {
        artifactId: 'artifact-b',
        artifactPath: `${ALLOWLIST_ROOT}/reports/artifact-b.yaml`,
        artifactType: 'adr',
        sourceIssueIds: ['issue-b'],
        riskTags: ['T03'],
        severity: 'high',
        ownerHint: 'owner-b',
        contentHash: 'hash-b'
      }
    ],
    contextAnnotations: [
      {
        annotationId: 'annotation-a',
        artifactId: 'artifact-a',
        artifactPath: `${ALLOWLIST_ROOT}/reports/artifact-a.md`,
        issueId: 'issue-a',
        parseStage: 'frontmatter',
        errorType: 'frontmatter',
        recommendedFix: 'Corriger frontmatter',
        what: 'Erreur frontmatter',
        why: 'FR-032 exige une annotation actionnable',
        nextAction: 'Corriger puis relancer ingestion',
        severity: 'medium',
        ownerHint: 'owner-a',
        riskTags: ['T01', 'T02'],
        contentHash: 'ann-hash-a'
      }
    ],
    ...overrides
  };
}

function buildParseDiagnosticsInput(artifactId = 'delegated-artifact') {
  return {
    parseDiagnosticsResult: {
      allowed: true,
      reasonCode: 'ARTIFACT_PARSE_FAILED',
      reason: 'Parse issues détectées.',
      diagnostics: {
        sourceReasonCode: 'OK'
      },
      parseIssues: [
        {
          issueId: `issue-${artifactId}`,
          artifactId,
          artifactPath: `${ALLOWLIST_ROOT}/reports/${artifactId}.md`,
          parseStage: 'markdown',
          errorType: 'syntax',
          retryCount: 1,
          recommendedFix: 'Fix markdown'
        }
      ],
      recommendations: [
        {
          artifactId,
          action: 'SCHEDULE_PARSE_RETRY'
        }
      ],
      dlqCandidates: [],
      correctiveActions: ['SCHEDULE_PARSE_RETRY']
    }
  };
}

describe('artifact-corpus-backfill unit', () => {
  it('returns OK on nominal backfill with stable diagnostics and contract', () => {
    const result = runArtifactCorpusBackfill({
      riskAnnotationsResult: buildRiskAnnotationsResult(),
      allowlistRoots: [ALLOWLIST_ROOT],
      batchSize: 50
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 2,
        migratedCount: 2,
        skippedCount: 0,
        failedCount: 0,
        batchCount: 1,
        sourceReasonCode: 'OK'
      },
      correctiveActions: []
    });

    expect(result.reason).toContain('Backfill terminé');
    expect(result.migratedArtifacts).toHaveLength(2);
    expect(result.failedArtifacts).toEqual([]);
    expect(result.migrationReport.resumeToken).toMatchObject({
      nextOffset: 2,
      completed: true
    });
    expect(result.migrationReport.resumeToken.processedDedupKeys).toHaveLength(2);
    expect(result.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.diagnostics.p95BatchMs).toBeGreaterThanOrEqual(0);
  });

  it('resolves source with strict priority: riskAnnotationsResult > riskAnnotationsInput > legacyArtifacts', () => {
    const result = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      riskAnnotationsResult: buildRiskAnnotationsResult({
        taggedArtifacts: [
          {
            artifactId: 'from-result',
            artifactPath: `${ALLOWLIST_ROOT}/reports/from-result.md`,
            artifactType: 'prd',
            sourceIssueIds: ['issue-result'],
            riskTags: ['T01'],
            contentHash: 'h-result'
          }
        ],
        contextAnnotations: []
      }),
      riskAnnotationsInput: buildParseDiagnosticsInput('from-input'),
      legacyArtifacts: [
        {
          artifactId: 'from-legacy',
          artifactPath: `${ALLOWLIST_ROOT}/reports/from-legacy.md`,
          riskTags: ['T99']
        }
      ]
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.diagnostics.requestedCount).toBe(1);
    expect(result.migratedArtifacts[0]).toMatchObject({
      artifactId: 'from-result',
      artifactPath: `${ALLOWLIST_ROOT}/reports/from-result.md`
    });
  });

  it('delegates to S023 via riskAnnotationsInput when riskAnnotationsResult is absent', () => {
    const result = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      riskAnnotationsInput: buildParseDiagnosticsInput('delegated-via-s023')
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 1,
        migratedCount: 1,
        failedCount: 0,
        sourceReasonCode: 'OK'
      }
    });

    expect(result.migratedArtifacts[0]).toMatchObject({
      artifactId: 'delegated-via-s023',
      artifactPath: `${ALLOWLIST_ROOT}/reports/delegated-via-s023.md`
    });
  });

  it('uses legacyArtifacts as fallback source when risk annotations inputs are absent', () => {
    const result = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      legacyArtifacts: [
        {
          artifactId: 'legacy-01',
          artifactPath: `${ALLOWLIST_ROOT}/reports/legacy-01.md`,
          artifactType: 'report',
          sourceIssueIds: ['legacy-issue-1'],
          riskTags: ['T01', 'T02'],
          severity: 'high',
          ownerHint: 'legacy-owner',
          contentHash: 'legacy-hash-01',
          contextAnnotations: [
            {
              annotationId: 'legacy-ann-01',
              issueId: 'legacy-issue-1',
              parseStage: 'legacy',
              errorType: 'legacy',
              what: 'Contexte migré',
              why: 'Conserver FR-032',
              nextAction: 'Valider cohérence',
              severity: 'high',
              ownerHint: 'legacy-owner',
              riskTags: ['T01', 'T02']
            }
          ]
        }
      ]
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.diagnostics.sourceReasonCode).toBe('OK');
    expect(result.migratedArtifacts).toHaveLength(1);
    expect(result.migratedArtifacts[0]).toMatchObject({
      artifactId: 'legacy-01',
      artifactPath: `${ALLOWLIST_ROOT}/reports/legacy-01.md`,
      riskTags: ['T01', 'T02']
    });
    expect(result.migratedArtifacts[0].contextAnnotations).toHaveLength(1);
  });

  it('propagates strict upstream blocking reason codes from S023', () => {
    const result = runArtifactCorpusBackfill({
      riskAnnotationsResult: {
        allowed: false,
        reasonCode: 'RISK_TAGS_MISSING',
        reason: 'Tags manquants en amont.',
        diagnostics: {
          sourceReasonCode: 'RISK_TAGS_MISSING'
        },
        correctiveActions: ['ADD_RISK_TAGS']
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'RISK_TAGS_MISSING',
      diagnostics: {
        sourceReasonCode: 'RISK_TAGS_MISSING',
        requestedCount: 0,
        migratedCount: 0,
        failedCount: 0
      },
      migratedArtifacts: [],
      skippedArtifacts: [],
      failedArtifacts: [],
      correctiveActions: ['ADD_RISK_TAGS']
    });
  });

  it('blocks ingestion when at least one candidate path is outside allowlist roots', () => {
    const result = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      riskAnnotationsResult: buildRiskAnnotationsResult({
        taggedArtifacts: [
          {
            artifactId: 'outside-root',
            artifactPath: '/tmp/outside-root.md',
            artifactType: 'prd',
            sourceIssueIds: ['issue-outside'],
            riskTags: ['T02'],
            contentHash: 'outside-hash'
          }
        ],
        contextAnnotations: []
      })
    });

    expect(result.reasonCode).toBe('ARTIFACT_PATH_NOT_ALLOWED');
    expect(result.allowed).toBe(false);
    expect(result.migratedArtifacts).toEqual([]);
    expect(result.failedArtifacts).toHaveLength(1);
    expect(result.correctiveActions).toEqual(['RESTRICT_TO_ALLOWED_ROOTS']);
  });

  it('rejects unsupported artifact extension with explicit reason code', () => {
    const result = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      riskAnnotationsResult: buildRiskAnnotationsResult({
        taggedArtifacts: [
          {
            artifactId: 'bad-ext',
            artifactPath: `${ALLOWLIST_ROOT}/reports/bad-ext.txt`,
            artifactType: 'text',
            sourceIssueIds: ['issue-bad-ext'],
            riskTags: ['T01'],
            contentHash: 'hash-bad-ext'
          }
        ],
        contextAnnotations: []
      })
    });

    expect(result.reasonCode).toBe('UNSUPPORTED_ARTIFACT_TYPE');
    expect(result.allowed).toBe(false);
    expect(result.failedArtifacts).toHaveLength(1);
    expect(result.correctiveActions).toEqual(['REMOVE_UNSUPPORTED_ARTIFACTS']);
  });

  it('returns BACKFILL_QUEUE_SATURATED when queue depth exceeds configured ceiling', () => {
    const result = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      queueDepth: 12,
      maxQueueDepth: 10,
      riskAnnotationsResult: buildRiskAnnotationsResult({
        taggedArtifacts: [],
        contextAnnotations: []
      })
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'BACKFILL_QUEUE_SATURATED',
      diagnostics: {
        requestedCount: 0,
        migratedCount: 0,
        failedCount: 0,
        sourceReasonCode: 'OK'
      },
      correctiveActions: ['THROTTLE_BACKFILL_QUEUE']
    });
  });

  it('returns INVALID_BACKFILL_INPUT when no source is provided', () => {
    const result = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_BACKFILL_INPUT',
      diagnostics: {
        requestedCount: 0,
        migratedCount: 0,
        failedCount: 0
      },
      correctiveActions: ['FIX_BACKFILL_INPUT']
    });
    expect(result.reason).toContain('Aucune source exploitable');
  });

  it('ensures idempotence by skipping duplicates sharing the same path+hash dedup key', () => {
    const duplicatePath = `${ALLOWLIST_ROOT}/reports/duplicate.md`;

    const result = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      riskAnnotationsResult: buildRiskAnnotationsResult({
        taggedArtifacts: [
          {
            artifactId: 'duplicate-a',
            artifactPath: duplicatePath,
            artifactType: 'prd',
            sourceIssueIds: ['issue-a'],
            riskTags: ['T01'],
            contentHash: 'same-hash'
          },
          {
            artifactId: 'duplicate-b',
            artifactPath: duplicatePath,
            artifactType: 'prd',
            sourceIssueIds: ['issue-b'],
            riskTags: ['T02'],
            contentHash: 'same-hash'
          }
        ],
        contextAnnotations: []
      })
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.diagnostics.requestedCount).toBe(2);
    expect(result.diagnostics.migratedCount).toBe(1);
    expect(result.diagnostics.skippedCount).toBe(1);
    expect(result.skippedArtifacts).toHaveLength(1);
    expect(result.skippedArtifacts[0].reasonCode).toBe('DUPLICATE_ARTIFACT');
  });

  it('resumes from resumeToken offset without reprocessing validated artifacts', () => {
    const taggedArtifacts = Array.from({ length: 4 }, (_, index) => ({
      artifactId: `resume-${index}`,
      artifactPath: `${ALLOWLIST_ROOT}/reports/resume-${index}.md`,
      artifactType: 'prd',
      sourceIssueIds: [`issue-resume-${index}`],
      riskTags: ['T01'],
      contentHash: `resume-hash-${index}`
    }));

    const result = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      batchSize: 2,
      resumeToken: {
        nextOffset: 2,
        processedDedupKeys: [
          `${ALLOWLIST_ROOT}/reports/resume-0.md::resume-hash-0`,
          `${ALLOWLIST_ROOT}/reports/resume-1.md::resume-hash-1`
        ]
      },
      riskAnnotationsResult: buildRiskAnnotationsResult({
        taggedArtifacts,
        contextAnnotations: []
      })
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.diagnostics).toMatchObject({
      requestedCount: 4,
      migratedCount: 2,
      skippedCount: 2,
      failedCount: 0,
      batchCount: 1
    });

    expect(result.skippedArtifacts.map((entry) => entry.reasonCode)).toEqual([
      'RESUME_TOKEN_ALREADY_PROCESSED',
      'RESUME_TOKEN_ALREADY_PROCESSED'
    ]);
    expect(result.migrationReport.resumeToken).toMatchObject({
      nextOffset: 4,
      completed: true
    });
  });

  it('returns BACKFILL_BATCH_FAILED with resumable token and partial success details', () => {
    const taggedArtifacts = Array.from({ length: 5 }, (_, index) => ({
      artifactId: `batch-${index}`,
      artifactPath: `${ALLOWLIST_ROOT}/reports/batch-${index}.md`,
      artifactType: 'prd',
      sourceIssueIds: [`issue-batch-${index}`],
      riskTags: ['T01'],
      contentHash: `batch-hash-${index}`
    }));

    const result = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      batchSize: 2,
      batchFailureAtBatchIndex: 2,
      riskAnnotationsResult: buildRiskAnnotationsResult({
        taggedArtifacts,
        contextAnnotations: []
      })
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'BACKFILL_BATCH_FAILED',
      diagnostics: {
        requestedCount: 5,
        migratedCount: 2,
        failedCount: 2,
        batchCount: 2,
        sourceReasonCode: 'OK'
      },
      correctiveActions: ['RETRY_BACKFILL_BATCH']
    });

    expect(result.migrationReport.resumeToken).toMatchObject({
      nextOffset: 2,
      completed: false
    });
    expect(result.failedArtifacts).toHaveLength(2);
    expect(result.failedArtifacts.every((entry) => entry.reasonCode === 'BACKFILL_BATCH_FAILED')).toBe(true);
  });

  it('keeps stable public contract and index export', () => {
    const result = runArtifactCorpusBackfillFromIndex({
      allowlistRoots: [ALLOWLIST_ROOT],
      riskAnnotationsResult: buildRiskAnnotationsResult()
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('migratedArtifacts');
    expect(result).toHaveProperty('skippedArtifacts');
    expect(result).toHaveProperty('failedArtifacts');
    expect(result).toHaveProperty('migrationReport');
    expect(result).toHaveProperty('correctiveActions');

    expect(typeof result.allowed).toBe('boolean');
    expect(REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(Array.isArray(result.migratedArtifacts)).toBe(true);
    expect(Array.isArray(result.skippedArtifacts)).toBe(true);
    expect(Array.isArray(result.failedArtifacts)).toBe(true);
    expect(Array.isArray(result.correctiveActions)).toBe(true);

    expect(result.migrationReport).toHaveProperty('batches');
    expect(result.migrationReport).toHaveProperty('resumeToken');
    expect(result.diagnostics).toHaveProperty('requestedCount');
    expect(result.diagnostics).toHaveProperty('migratedCount');
    expect(result.diagnostics).toHaveProperty('skippedCount');
    expect(result.diagnostics).toHaveProperty('failedCount');
    expect(result.diagnostics).toHaveProperty('batchCount');
    expect(result.diagnostics).toHaveProperty('durationMs');
    expect(result.diagnostics).toHaveProperty('p95BatchMs');
    expect(result.diagnostics).toHaveProperty('sourceReasonCode');
  });

  it('supports runtime option roots/extensions and full resume tokens without new batches', () => {
    const result = runArtifactCorpusBackfill(
      {
        riskAnnotationsResult: buildRiskAnnotationsResult({
          taggedArtifacts: [
            {
              artifactId: 'resume-full',
              artifactPath: `${ALLOWLIST_ROOT}/reports/resume-full.md`,
              artifactType: 'prd',
              sourceIssueIds: ['issue-resume-full'],
              riskTags: ['T01'],
              contentHash: 'resume-full-hash'
            }
          ],
          contextAnnotations: []
        }),
        resumeToken: {
          nextOffset: 99,
          processedDedupKeys: [`${ALLOWLIST_ROOT}/reports/resume-full.md::resume-full-hash`]
        }
      },
      {
        allowlistRoots: [`${ALLOWLIST_ROOT}/zzz`, ALLOWLIST_ROOT, ALLOWLIST_ROOT],
        allowedExtensions: ['.yaml', '.md']
      }
    );

    expect(result.reasonCode).toBe('OK');
    expect(result.diagnostics).toMatchObject({
      requestedCount: 1,
      migratedCount: 0,
      skippedCount: 1,
      failedCount: 0,
      batchCount: 0,
      p95BatchMs: 0
    });
    expect(result.skippedArtifacts[0].reasonCode).toBe('RESUME_TOKEN_ALREADY_PROCESSED');
    expect(result.migrationReport.resumeToken).toMatchObject({
      nextOffset: 1,
      completed: true
    });
  });

  it('normalizes legacy artifacts defaults, path fallback and deterministic sorting with repeated annotations', () => {
    const result = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      legacyArtifacts: [
        {
          artifactId: 'legacy-z',
          artifactPath: `${ALLOWLIST_ROOT}/reports/legacy-z.md`,
          riskTags: ['T02'],
          contextAnnotations: [
            {
              annotationId: 'dup-ann',
              issueId: 'legacy-z-1',
              riskTags: []
            },
            {
              annotationId: 'dup-ann',
              issueId: 'legacy-z-2',
              riskTags: []
            }
          ]
        },
        {
          artifactId: 'legacy-a',
          path: `${ALLOWLIST_ROOT}/reports/legacy-a.md`,
          riskTags: ['T01'],
          contextAnnotations: [
            {
              annotationId: 'ann-a',
              issueId: 'legacy-a-1',
              riskTags: []
            }
          ]
        }
      ]
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.diagnostics).toMatchObject({
      requestedCount: 2,
      migratedCount: 2,
      failedCount: 0
    });

    expect(result.migratedArtifacts[0].artifactId).toBe('legacy-a');
    expect(result.migratedArtifacts[1].artifactId).toBe('legacy-z');
    expect(result.migratedArtifacts[1].contextAnnotations).toHaveLength(2);
    expect(result.migratedArtifacts[1].contextAnnotations[0]).toMatchObject({
      parseStage: 'legacy',
      errorType: 'legacy',
      severity: 'low',
      ownerHint: 'artifact-maintainer',
      riskTags: ['T02']
    });
  });

  it('meets performance thresholds on synthetic corpus of 500 artifacts', () => {
    const taggedArtifacts = Array.from({ length: 500 }, (_, index) => ({
      artifactId: `perf-${index}`,
      artifactPath: `${ALLOWLIST_ROOT}/reports/perf-${index}.md`,
      artifactType: index % 2 === 0 ? 'prd' : 'adr',
      sourceIssueIds: [`perf-issue-${index}`],
      riskTags: index % 3 === 0 ? ['T01', 'T02'] : ['T01'],
      severity: index % 9 === 0 ? 'high' : 'medium',
      ownerHint: 'perf-owner',
      contentHash: `perf-hash-${index}`
    }));

    const result = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      batchSize: 50,
      riskAnnotationsResult: buildRiskAnnotationsResult({
        taggedArtifacts,
        contextAnnotations: []
      })
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 500,
        migratedCount: 500,
        skippedCount: 0,
        failedCount: 0,
        sourceReasonCode: 'OK'
      }
    });

    expect(result.diagnostics.p95BatchMs).toBeLessThanOrEqual(5000);
    expect(result.diagnostics.durationMs).toBeLessThan(60000);
  });
});
