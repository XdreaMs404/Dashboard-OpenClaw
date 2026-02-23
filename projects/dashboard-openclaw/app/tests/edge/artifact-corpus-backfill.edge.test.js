import { describe, expect, it } from 'vitest';
import { runArtifactCorpusBackfill } from '../../src/artifact-corpus-backfill.js';

const ALLOWLIST_ROOT =
  '/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts';

function validRiskAnnotationsResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    diagnostics: {
      sourceReasonCode: 'OK'
    },
    taggedArtifacts: [
      {
        artifactId: 'edge-a',
        artifactPath: `${ALLOWLIST_ROOT}/reports/edge-a.md`,
        artifactType: 'prd',
        sourceIssueIds: ['edge-issue-a'],
        riskTags: ['T01'],
        severity: 'medium',
        ownerHint: 'owner-edge-a',
        contentHash: 'edge-hash-a'
      }
    ],
    contextAnnotations: [
      {
        annotationId: 'edge-ann-a',
        artifactId: 'edge-a',
        artifactPath: `${ALLOWLIST_ROOT}/reports/edge-a.md`,
        issueId: 'edge-issue-a',
        parseStage: 'markdown',
        errorType: 'syntax',
        recommendedFix: 'Fix edge-a',
        what: 'What edge-a',
        why: 'Why edge-a',
        nextAction: 'Next edge-a',
        severity: 'medium',
        ownerHint: 'owner-edge-a',
        riskTags: ['T01'],
        contentHash: 'edge-ann-hash-a'
      }
    ],
    ...overrides
  };
}

describe('artifact-corpus-backfill edge cases', () => {
  it('fails closed on non-object inputs', () => {
    const samples = [undefined, null, true, 42, 'S024', []];

    for (const sample of samples) {
      const result = runArtifactCorpusBackfill(sample);

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_BACKFILL_INPUT',
        migratedArtifacts: [],
        skippedArtifacts: [],
        failedArtifacts: []
      });
      expect(result.reason).toContain('Aucune source exploitable');
    }
  });

  it('rejects missing source and malformed source payloads', () => {
    const missingSource = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT]
    });

    expect(missingSource.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(missingSource.reason).toContain('Aucune source exploitable');

    const invalidRiskAnnotationsResult = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      riskAnnotationsResult: 'bad'
    });

    expect(invalidRiskAnnotationsResult.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(invalidRiskAnnotationsResult.reason).toContain('riskAnnotationsResult invalide');

    const invalidRiskAnnotationsInput = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      riskAnnotationsInput: 'bad'
    });

    expect(invalidRiskAnnotationsInput.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(invalidRiskAnnotationsInput.reason).toContain('riskAnnotationsInput invalide');

    const invalidLegacyArtifacts = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      legacyArtifacts: 'bad'
    });

    expect(invalidLegacyArtifacts.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(invalidLegacyArtifacts.reason).toContain('legacyArtifacts invalide');
  });

  it('rejects malformed riskAnnotationsResult contracts and non-propagable blocked reason', () => {
    const invalidAllowed = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      riskAnnotationsResult: {
        allowed: 'true',
        reasonCode: 'OK',
        taggedArtifacts: [],
        contextAnnotations: []
      }
    });

    expect(invalidAllowed.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(invalidAllowed.reason).toContain('allowed invalide');

    const invalidReasonCode = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      riskAnnotationsResult: {
        allowed: true,
        reasonCode: 'NOT_ALLOWED',
        taggedArtifacts: [],
        contextAnnotations: []
      }
    });

    expect(invalidReasonCode.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(invalidReasonCode.reason).toContain('reasonCode invalide');

    const blockedNonPropagable = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      riskAnnotationsResult: {
        allowed: false,
        reasonCode: 'BACKFILL_BATCH_FAILED',
        diagnostics: {
          sourceReasonCode: 'BACKFILL_BATCH_FAILED'
        }
      }
    });

    expect(blockedNonPropagable.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(blockedNonPropagable.reason).toContain('non propagable');

    const invalidTaggedArtifactsShape = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      riskAnnotationsResult: {
        allowed: true,
        reasonCode: 'OK',
        taggedArtifacts: 'bad',
        contextAnnotations: []
      }
    });

    expect(invalidTaggedArtifactsShape.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(invalidTaggedArtifactsShape.reason).toContain('taggedArtifacts invalide');

    const invalidContextAnnotationsShape = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      riskAnnotationsResult: {
        allowed: true,
        reasonCode: 'OK',
        taggedArtifacts: [],
        contextAnnotations: 'bad'
      }
    });

    expect(invalidContextAnnotationsShape.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(invalidContextAnnotationsShape.reason).toContain('contextAnnotations invalide');
  });

  it('rejects invalid allowlist, extension, batch, resume token and queue parameters', () => {
    const invalidAllowlistShape = runArtifactCorpusBackfill({
      riskAnnotationsResult: validRiskAnnotationsResult(),
      allowlistRoots: 'bad'
    });

    expect(invalidAllowlistShape.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(invalidAllowlistShape.reason).toContain('allowlistRoots invalide');

    const invalidAllowlistEntry = runArtifactCorpusBackfill({
      riskAnnotationsResult: validRiskAnnotationsResult(),
      allowlistRoots: ['relative/path']
    });

    expect(invalidAllowlistEntry.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(invalidAllowlistEntry.reason).toContain('allowlistRoots[0] invalide');

    const invalidExtensions = runArtifactCorpusBackfill({
      riskAnnotationsResult: validRiskAnnotationsResult(),
      allowlistRoots: [ALLOWLIST_ROOT],
      allowedExtensions: ['md']
    });

    expect(invalidExtensions.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(invalidExtensions.reason).toContain('allowedExtensions[0] invalide');

    const invalidBatchSize = runArtifactCorpusBackfill({
      riskAnnotationsResult: validRiskAnnotationsResult(),
      allowlistRoots: [ALLOWLIST_ROOT],
      batchSize: 0
    });

    expect(invalidBatchSize.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(invalidBatchSize.reason).toContain('batchSize invalide');

    const invalidResumeTokenString = runArtifactCorpusBackfill({
      riskAnnotationsResult: validRiskAnnotationsResult(),
      allowlistRoots: [ALLOWLIST_ROOT],
      resumeToken: '{not-json}'
    });

    expect(invalidResumeTokenString.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(invalidResumeTokenString.reason).toContain('JSON non parsable');

    const invalidResumeTokenShape = runArtifactCorpusBackfill({
      riskAnnotationsResult: validRiskAnnotationsResult(),
      allowlistRoots: [ALLOWLIST_ROOT],
      resumeToken: {
        nextOffset: -1
      }
    });

    expect(invalidResumeTokenShape.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(invalidResumeTokenShape.reason).toContain('resumeToken.nextOffset invalide');

    const invalidQueueDepth = runArtifactCorpusBackfill({
      riskAnnotationsResult: validRiskAnnotationsResult(),
      allowlistRoots: [ALLOWLIST_ROOT],
      queueDepth: -2
    });

    expect(invalidQueueDepth.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(invalidQueueDepth.reason).toContain('queueDepth invalide');

    const invalidMaxQueueDepth = runArtifactCorpusBackfill({
      riskAnnotationsResult: validRiskAnnotationsResult(),
      allowlistRoots: [ALLOWLIST_ROOT],
      maxQueueDepth: 0
    });

    expect(invalidMaxQueueDepth.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(invalidMaxQueueDepth.reason).toContain('maxQueueDepth invalide');

    const invalidBatchFailureAt = runArtifactCorpusBackfill({
      riskAnnotationsResult: validRiskAnnotationsResult(),
      allowlistRoots: [ALLOWLIST_ROOT],
      batchFailureAtBatchIndex: 0
    });

    expect(invalidBatchFailureAt.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(invalidBatchFailureAt.reason).toContain('batchFailureAtBatchIndex invalide');
  });

  it('returns MIGRATION_CORPUS_INCOMPATIBLE when corpus compatibility is incompatible', () => {
    const result = runArtifactCorpusBackfill({
      riskAnnotationsResult: validRiskAnnotationsResult(),
      allowlistRoots: [ALLOWLIST_ROOT],
      corpusCompatibility: 'incompatible'
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'MIGRATION_CORPUS_INCOMPATIBLE',
      diagnostics: {
        requestedCount: 0,
        migratedCount: 0,
        failedCount: 0,
        sourceReasonCode: 'OK'
      },
      correctiveActions: ['ALIGN_MIGRATION_CORPUS']
    });
  });

  it('rejects invalid corpusCompatibility values', () => {
    const result = runArtifactCorpusBackfill({
      riskAnnotationsResult: validRiskAnnotationsResult(),
      allowlistRoots: [ALLOWLIST_ROOT],
      corpusCompatibility: 'unknown-mode'
    });

    expect(result.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(result.reason).toContain('corpusCompatibility invalide');
  });

  it('rejects invalid candidate payloads from risk annotations source', () => {
    const invalidTaggedArtifactObject = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      riskAnnotationsResult: validRiskAnnotationsResult({
        taggedArtifacts: [null],
        contextAnnotations: []
      })
    });

    expect(invalidTaggedArtifactObject.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(invalidTaggedArtifactObject.reason).toContain('taggedArtifacts[0] invalide');

    const invalidTaggedArtifactId = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      riskAnnotationsResult: validRiskAnnotationsResult({
        taggedArtifacts: [
          {
            artifactId: '   ',
            artifactPath: `${ALLOWLIST_ROOT}/reports/x.md`,
            riskTags: ['T01']
          }
        ],
        contextAnnotations: []
      })
    });

    expect(invalidTaggedArtifactId.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(invalidTaggedArtifactId.reason).toContain('.artifactId invalide');

    const invalidTaggedArtifactPath = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      riskAnnotationsResult: validRiskAnnotationsResult({
        taggedArtifacts: [
          {
            artifactId: 'x',
            artifactPath: 'relative/path.md',
            riskTags: ['T01']
          }
        ],
        contextAnnotations: []
      })
    });

    expect(invalidTaggedArtifactPath.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(invalidTaggedArtifactPath.reason).toContain('.artifactPath invalide');

    const invalidContextAnnotationObject = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      riskAnnotationsResult: validRiskAnnotationsResult({
        contextAnnotations: [null]
      })
    });

    expect(invalidContextAnnotationObject.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(invalidContextAnnotationObject.reason).toContain('contextAnnotations[0] invalide');

    const invalidContextAnnotationArtifactPath = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      riskAnnotationsResult: validRiskAnnotationsResult({
        contextAnnotations: [
          {
            annotationId: 'a',
            artifactId: 'x',
            artifactPath: 'relative/path.md',
            issueId: 'i',
            parseStage: 'markdown',
            errorType: 'syntax',
            what: 'w',
            why: 'y',
            nextAction: 'n',
            riskTags: ['T01']
          }
        ]
      })
    });

    expect(invalidContextAnnotationArtifactPath.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(invalidContextAnnotationArtifactPath.reason).toContain('.artifactPath invalide');
  });

  it('rejects malformed legacy artifacts payloads', () => {
    const invalidLegacyObject = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      legacyArtifacts: [null]
    });

    expect(invalidLegacyObject.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(invalidLegacyObject.reason).toContain('legacyArtifacts[0] invalide');

    const invalidLegacyId = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      legacyArtifacts: [
        {
          artifactId: ' ',
          artifactPath: `${ALLOWLIST_ROOT}/reports/legacy.md`
        }
      ]
    });

    expect(invalidLegacyId.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(invalidLegacyId.reason).toContain('artifactId invalide');

    const invalidLegacyPath = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      legacyArtifacts: [
        {
          artifactId: 'legacy-path',
          artifactPath: 'relative/path.md'
        }
      ]
    });

    expect(invalidLegacyPath.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(invalidLegacyPath.reason).toContain('artifactPath invalide');

    const invalidLegacyAnnotationPath = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      legacyArtifacts: [
        {
          artifactId: 'legacy-ann',
          artifactPath: `${ALLOWLIST_ROOT}/reports/legacy-ann.md`,
          contextAnnotations: [
            {
              annotationId: 'legacy-a',
              artifactPath: 'relative/path.md'
            }
          ]
        }
      ]
    });

    expect(invalidLegacyAnnotationPath.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(invalidLegacyAnnotationPath.reason).toContain('contextAnnotations artifactPath invalide');
  });

  it('returns INVALID_BACKFILL_INPUT when delegated risk annotation call raises an exception', () => {
    const result = runArtifactCorpusBackfill(
      {
        allowlistRoots: [ALLOWLIST_ROOT],
        riskAnnotationsInput: {}
      },
      {
        riskAnnotationsOptions: {
          nowMs: () => {
            throw new Error('boom');
          }
        }
      }
    );

    expect(result.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(result.reason).toContain('annotateArtifactRiskContext a levé une exception');
    expect(result.reason).toContain('boom');
  });

  it('uses fallback corrective actions for blocked reason when upstream omits them', () => {
    const result = runArtifactCorpusBackfill({
      riskAnnotationsResult: {
        allowed: false,
        reasonCode: 'ARTIFACT_PARSE_FAILED',
        diagnostics: {
          sourceReasonCode: 'ARTIFACT_PARSE_FAILED'
        }
      }
    });

    expect(result.reasonCode).toBe('ARTIFACT_PARSE_FAILED');
    expect(result.correctiveActions).toEqual(['FIX_ARTIFACT_SYNTAX']);
  });

  it('normalizes custom corrective actions when available', () => {
    const result = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      riskAnnotationsResult: validRiskAnnotationsResult({
        taggedArtifacts: [
          {
            artifactId: 'bad-ext-custom-action',
            artifactPath: `${ALLOWLIST_ROOT}/reports/bad-ext-custom-action.txt`,
            riskTags: ['T01'],
            contentHash: 'h-custom'
          }
        ],
        contextAnnotations: []
      }),
      correctiveActions: [null, '  REMOVE_UNSUPPORTED_ARTIFACTS ', 'REMOVE_UNSUPPORTED_ARTIFACTS']
    });

    expect(result.reasonCode).toBe('UNSUPPORTED_ARTIFACT_TYPE');
    expect(result.correctiveActions).toEqual(['REMOVE_UNSUPPORTED_ARTIFACTS']);
  });

  it('accepts non-object options and handles non-monotonic nowMs values safely', () => {
    const okWithInvalidOptions = runArtifactCorpusBackfill(
      {
        allowlistRoots: [ALLOWLIST_ROOT],
        riskAnnotationsResult: validRiskAnnotationsResult()
      },
      'bad-options'
    );

    expect(okWithInvalidOptions.reasonCode).toBe('OK');

    const nowValues = [10, 9, 8, 7, 6, 5, 4, 3];
    const safeDuration = runArtifactCorpusBackfill(
      {
        allowlistRoots: [ALLOWLIST_ROOT],
        riskAnnotationsResult: validRiskAnnotationsResult()
      },
      {
        nowMs: () => nowValues.shift() ?? 0
      }
    );

    expect(safeDuration.reasonCode).toBe('OK');
    expect(safeDuration.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
    expect(safeDuration.diagnostics.p95BatchMs).toBeGreaterThanOrEqual(0);
  });

  it('covers additional invalid branches: empty reasonCode, non-object resumeToken JSON, empty allowedExtensions and empty artifactPath', () => {
    const emptyReasonCode = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      riskAnnotationsResult: {
        allowed: true,
        reasonCode: '   ',
        taggedArtifacts: [],
        contextAnnotations: []
      }
    });

    expect(emptyReasonCode.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(emptyReasonCode.reason).toContain('reasonCode invalide: vide');

    const nonObjectResumeToken = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      riskAnnotationsResult: validRiskAnnotationsResult(),
      resumeToken: '"not-object"'
    });

    expect(nonObjectResumeToken.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(nonObjectResumeToken.reason).toContain('resumeToken invalide: objet attendu');

    const emptyAllowedExtensions = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      allowedExtensions: [],
      riskAnnotationsResult: validRiskAnnotationsResult()
    });

    expect(emptyAllowedExtensions.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(emptyAllowedExtensions.reason).toContain('allowedExtensions invalide');

    const emptyArtifactPath = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      riskAnnotationsResult: validRiskAnnotationsResult({
        taggedArtifacts: [
          {
            artifactId: 'empty-path',
            artifactPath: '   ',
            riskTags: ['T01']
          }
        ],
        contextAnnotations: []
      })
    });

    expect(emptyArtifactPath.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(emptyArtifactPath.reason).toContain('.artifactPath invalide: artifactPath vide');

    const emptyAnnotationArtifactId = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      riskAnnotationsResult: validRiskAnnotationsResult({
        contextAnnotations: [
          {
            annotationId: 'ann-empty-id',
            artifactId: '  ',
            artifactPath: `${ALLOWLIST_ROOT}/reports/edge-a.md`,
            issueId: 'i',
            parseStage: 'markdown',
            errorType: 'syntax',
            what: 'w',
            why: 'y',
            nextAction: 'n',
            riskTags: ['T01']
          }
        ]
      })
    });

    expect(emptyAnnotationArtifactId.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(emptyAnnotationArtifactId.reason).toContain('.artifactId invalide');
  });

  it('covers delegated non-Error throw path and non-finite timer durations', () => {
    const result = runArtifactCorpusBackfill(
      {
        allowlistRoots: [ALLOWLIST_ROOT],
        riskAnnotationsInput: {}
      },
      {
        nowMs: () => Number.NaN,
        riskAnnotationsOptions: {
          nowMs: () => {
            throw 'boom-string';
          }
        }
      }
    );

    expect(result.reasonCode).toBe('INVALID_BACKFILL_INPUT');
    expect(result.reason).toContain('annotateArtifactRiskContext a levé une exception');
    expect(result.reason).toContain('boom-string');
    expect(result.diagnostics.durationMs).toBe(0);
  });

  it('returns unsupported type with (aucune) extension fallback for extensionless artifacts', () => {
    const result = runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      riskAnnotationsResult: validRiskAnnotationsResult({
        taggedArtifacts: [
          {
            artifactId: 'no-extension',
            artifactPath: `${ALLOWLIST_ROOT}/reports/no-extension`,
            riskTags: ['T01'],
            contentHash: 'h-no-extension'
          }
        ],
        contextAnnotations: []
      })
    });

    expect(result.reasonCode).toBe('UNSUPPORTED_ARTIFACT_TYPE');
    expect(result.reason).toContain('(aucune)');
    expect(result.failedArtifacts[0].reason).toContain('(aucune)');
  });
});
