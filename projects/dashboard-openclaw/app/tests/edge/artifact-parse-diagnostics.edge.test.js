import { describe, expect, it } from 'vitest';
import { buildArtifactParseDiagnostics } from '../../src/artifact-parse-diagnostics.js';

const ALLOWLIST_ROOT =
  '/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts';

function validStalenessResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'ok',
    diagnostics: {
      sourceReasonCode: 'OK'
    },
    stalenessBoard: {
      staleButAvailable: true,
      maxAgeSeconds: 3600,
      artifacts: [
        {
          artifactId: 'doc-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
          artifactType: 'doc',
          updatedAt: '2026-02-23T15:00:00.000Z',
          ageSeconds: 120,
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
        highestAgeSeconds: 120
      }
    },
    decisionFreshness: {
      'DEC-1': [
        {
          artifactId: 'doc-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
          artifactType: 'doc',
          updatedAt: '2026-02-23T15:00:00.000Z',
          ageSeconds: 120,
          isStale: false,
          stalenessLevel: 'fresh'
        }
      ]
    },
    correctiveActions: [],
    ...overrides
  };
}

describe('artifact-parse-diagnostics edge cases', () => {
  it('fails closed on non-object inputs', () => {
    const samples = [undefined, null, true, 42, 'S022', []];

    for (const sample of samples) {
      const result = buildArtifactParseDiagnostics(sample);

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_PARSE_DIAGNOSTIC_INPUT',
        parseIssues: [],
        recommendations: [],
        dlqCandidates: []
      });
    }
  });

  it('rejects invalid maxRetries and parseEvents shape', () => {
    const invalidMaxRetries = buildArtifactParseDiagnostics({
      stalenessResult: validStalenessResult(),
      maxRetries: 4
    });

    expect(invalidMaxRetries.reasonCode).toBe('INVALID_PARSE_DIAGNOSTIC_INPUT');
    expect(invalidMaxRetries.reason).toContain('maxRetries invalide');

    const invalidParseEvents = buildArtifactParseDiagnostics({
      stalenessResult: validStalenessResult(),
      parseEvents: 'bad'
    });

    expect(invalidParseEvents.reasonCode).toBe('INVALID_PARSE_DIAGNOSTIC_INPUT');
    expect(invalidParseEvents.reason).toContain('parseEvents invalide');
  });

  it('rejects missing source and invalid source payloads', () => {
    const missingSource = buildArtifactParseDiagnostics({});

    expect(missingSource.reasonCode).toBe('INVALID_PARSE_DIAGNOSTIC_INPUT');
    expect(missingSource.reason).toContain('Aucune source exploitable');

    const invalidStalenessInput = buildArtifactParseDiagnostics({
      stalenessInput: 'bad'
    });

    expect(invalidStalenessInput.reasonCode).toBe('INVALID_PARSE_DIAGNOSTIC_INPUT');
    expect(invalidStalenessInput.reason).toContain('stalenessInput invalide');

    const invalidStalenessResult = buildArtifactParseDiagnostics({
      stalenessResult: 'bad'
    });

    expect(invalidStalenessResult.reasonCode).toBe('INVALID_PARSE_DIAGNOSTIC_INPUT');
    expect(invalidStalenessResult.reason).toContain('stalenessResult invalide');
  });

  it('rejects invalid stalenessResult contracts', () => {
    const invalidAllowed = buildArtifactParseDiagnostics({
      stalenessResult: {
        reasonCode: 'OK'
      }
    });

    expect(invalidAllowed.reasonCode).toBe('INVALID_PARSE_DIAGNOSTIC_INPUT');

    const invalidReasonCode = buildArtifactParseDiagnostics({
      stalenessResult: {
        allowed: true,
        reasonCode: 'NOT_ALLOWED',
        stalenessBoard: {
          artifacts: []
        }
      }
    });

    expect(invalidReasonCode.reasonCode).toBe('INVALID_PARSE_DIAGNOSTIC_INPUT');

    const emptyReasonCode = buildArtifactParseDiagnostics({
      stalenessResult: {
        allowed: true,
        reasonCode: '',
        stalenessBoard: {
          artifacts: []
        },
        decisionFreshness: {}
      }
    });

    expect(emptyReasonCode.reasonCode).toBe('INVALID_PARSE_DIAGNOSTIC_INPUT');
    expect(emptyReasonCode.reason).toContain('vide');

    const invalidBlockedReason = buildArtifactParseDiagnostics({
      stalenessResult: {
        allowed: false,
        reasonCode: 'PARSE_DLQ_REQUIRED',
        reason: 'not propagable',
        diagnostics: {
          sourceReasonCode: 'PARSE_DLQ_REQUIRED'
        }
      }
    });

    expect(invalidBlockedReason.reasonCode).toBe('INVALID_PARSE_DIAGNOSTIC_INPUT');
    expect(invalidBlockedReason.reason).toContain('non propagable');

    const missingStalenessArtifacts = buildArtifactParseDiagnostics({
      stalenessResult: {
        allowed: true,
        reasonCode: 'OK',
        stalenessBoard: {}
      }
    });

    expect(missingStalenessArtifacts.reasonCode).toBe('INVALID_PARSE_DIAGNOSTIC_INPUT');
    expect(missingStalenessArtifacts.reason).toContain('stalenessBoard.artifacts invalide');
  });

  it('rejects malformed parse events', () => {
    const nonObjectEvent = buildArtifactParseDiagnostics({
      stalenessResult: validStalenessResult(),
      parseEvents: [null]
    });

    expect(nonObjectEvent.reasonCode).toBe('INVALID_PARSE_DIAGNOSTIC_INPUT');
    expect(nonObjectEvent.reason).toContain('parseEvents[0] invalide');

    const missingArtifactId = buildArtifactParseDiagnostics({
      stalenessResult: validStalenessResult(),
      parseEvents: [
        {
          artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
          parseStage: 'markdown',
          errorType: 'syntax',
          errorMessage: 'err',
          retryCount: 0
        }
      ]
    });

    expect(missingArtifactId.reasonCode).toBe('INVALID_PARSE_DIAGNOSTIC_INPUT');
    expect(missingArtifactId.reason).toContain('artifactId invalide');

    const invalidRetryCount = buildArtifactParseDiagnostics({
      stalenessResult: validStalenessResult(),
      parseEvents: [
        {
          artifactId: 'doc-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
          parseStage: 'markdown',
          errorType: 'syntax',
          errorMessage: 'err',
          retryCount: -1
        }
      ]
    });

    expect(invalidRetryCount.reasonCode).toBe('INVALID_PARSE_DIAGNOSTIC_INPUT');
    expect(invalidRetryCount.reason).toContain('retryCount invalide');
  });

  it('deduplicates parse issues and keeps highest retryCount for same key', () => {
    const result = buildArtifactParseDiagnostics({
      stalenessResult: validStalenessResult(),
      parseEvents: [
        {
          artifactId: 'doc-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
          parseStage: 'markdown',
          errorType: 'syntax',
          errorMessage: '',
          line: 10,
          column: 2,
          retryCount: 1
        },
        {
          artifactId: 'doc-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
          parseStage: 'markdown',
          errorType: 'syntax',
          errorMessage: 'better message',
          line: 10,
          column: 2,
          retryCount: 2
        }
      ]
    });

    expect(result.reasonCode).toBe('ARTIFACT_PARSE_FAILED');
    expect(result.parseIssues).toHaveLength(1);
    expect(result.parseIssues[0]).toMatchObject({
      retryCount: 2,
      errorMessage: 'better message'
    });
  });

  it('uses default parse stage/error type/recommendation and unknown staleness context fallback', () => {
    const result = buildArtifactParseDiagnostics({
      stalenessResult: validStalenessResult({
        stalenessBoard: {
          staleButAvailable: true,
          maxAgeSeconds: 3600,
          artifacts: [],
          summary: {
            artifactsCount: 0,
            staleCount: 0,
            staleRatio: 0,
            maxAgeSeconds: 3600,
            highestAgeSeconds: 0
          }
        }
      }),
      parseEvents: [
        {
          artifactId: 'ghost-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/ghost-v1.md`,
          parseStage: 'invalid-stage',
          errorType: 'invalid-type',
          retryCount: 0
        }
      ]
    });

    expect(result.reasonCode).toBe('ARTIFACT_PARSE_FAILED');
    expect(result.parseIssues[0]).toMatchObject({
      parseStage: 'markdown',
      errorType: 'unknown',
      stalenessContext: {
        isStale: null,
        ageSeconds: null,
        stalenessLevel: 'unknown'
      }
    });
    expect(result.recommendations[0].recommendedFix).toContain('Analyser les logs parse détaillés');
  });

  it('handles non-monotonic nowMs values safely', () => {
    const nowValues = [Number.NaN, 20, 10, 0, Number.NaN, 5, 1];

    const result = buildArtifactParseDiagnostics(
      {
        stalenessResult: validStalenessResult(),
        parseEvents: [
          {
            artifactId: 'doc-v1',
            parseStage: 'markdown',
            errorType: 'syntax',
            retryCount: 0
          }
        ]
      },
      {
        nowMs: () => nowValues.shift() ?? Number.NaN
      }
    );

    expect(['ARTIFACT_PARSE_FAILED', 'PARSE_RETRY_LIMIT_REACHED', 'PARSE_DLQ_REQUIRED']).toContain(
      result.reasonCode
    );
    expect(result.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.diagnostics.p95ParseDiagMs).toBeGreaterThanOrEqual(0);
  });

  it('accepts non-object options and does not mutate input payload/options', () => {
    const input = {
      stalenessResult: validStalenessResult(),
      parseEvents: [
        {
          artifactId: 'doc-v1',
          parseStage: 'markdown',
          errorType: 'syntax',
          retryCount: 0
        }
      ]
    };

    const options = {
      stalenessOptions: {
        nowMs: () => Date.now()
      }
    };

    const inputSnapshot = JSON.parse(JSON.stringify(input));

    const result = buildArtifactParseDiagnostics(input, options);

    expect(['ARTIFACT_PARSE_FAILED', 'PARSE_RETRY_LIMIT_REACHED', 'PARSE_DLQ_REQUIRED']).toContain(
      result.reasonCode
    );
    expect(input).toEqual(inputSnapshot);

    const resultWithNonObjectOptions = buildArtifactParseDiagnostics(input, 'bad-options');
    expect(['ARTIFACT_PARSE_FAILED', 'PARSE_RETRY_LIMIT_REACHED', 'PARSE_DLQ_REQUIRED']).toContain(
      resultWithNonObjectOptions.reasonCode
    );
  });

  it('fails closed when delegated buildArtifactStalenessIndicator throws', () => {
    const result = buildArtifactParseDiagnostics(
      {
        stalenessInput: {
          evidenceGraphInput: {
            graphEntries: [
              {
                groupKey: 'x',
                artifactId: 'x-v1',
                artifactPath: `${ALLOWLIST_ROOT}/reports/x-v1.md`,
                artifactType: 'doc',
                decisionRefs: ['DEC-X'],
                gateRefs: ['G-X'],
                commandRefs: ['CMD-X']
              }
            ]
          }
        }
      },
      {
        stalenessOptions: {
          nowMs: () => {
            throw new Error('boom');
          }
        }
      }
    );

    expect(result.reasonCode).toBe('INVALID_PARSE_DIAGNOSTIC_INPUT');
    expect(result.reason).toContain('levé une exception');
  });

  it('uses fallback corrective actions on blocked upstream result when missing', () => {
    const result = buildArtifactParseDiagnostics({
      stalenessResult: {
        allowed: false,
        reasonCode: 'ARTIFACT_PARSE_FAILED',
        diagnostics: {
          sourceReasonCode: 'ARTIFACT_PARSE_FAILED'
        }
      }
    });

    expect(result.reasonCode).toBe('ARTIFACT_PARSE_FAILED');
    expect(result.correctiveActions).toEqual(['FIX_ARTIFACT_SYNTAX']);

    const normalizedActions = buildArtifactParseDiagnostics({
      stalenessResult: {
        allowed: false,
        reasonCode: 'ARTIFACT_PARSE_FAILED',
        diagnostics: {
          sourceReasonCode: 'ARTIFACT_PARSE_FAILED'
        },
        correctiveActions: [null, '  FIX_ARTIFACT_SYNTAX  ', 'FIX_ARTIFACT_SYNTAX']
      }
    });

    expect(normalizedActions.reasonCode).toBe('ARTIFACT_PARSE_FAILED');
    expect(normalizedActions.correctiveActions).toEqual(['FIX_ARTIFACT_SYNTAX']);
  });

  it('covers helper fallbacks and branch behavior for sorting/context/retries', () => {
    const result = buildArtifactParseDiagnostics(
      {
        stalenessResult: validStalenessResult({
          stalenessBoard: {
            staleButAvailable: true,
            maxAgeSeconds: 3600,
            artifacts: [
              null,
              {
                artifactId: '',
                ageSeconds: 'NaN',
                stalenessLevel: ''
              },
              {
                artifactId: 'bad-age',
                artifactPath: `${ALLOWLIST_ROOT}/reports/bad-age.md`,
                artifactType: 'doc',
                updatedAt: '2026-02-23T15:00:00.000Z',
                ageSeconds: 'NaN',
                maxAgeSeconds: 3600,
                isStale: false,
                stalenessLevel: ''
              },
              {
                artifactId: 'doc-v1',
                artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
                artifactType: 'doc',
                updatedAt: '2026-02-23T15:00:00.000Z',
                ageSeconds: 120,
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
              highestAgeSeconds: 120
            }
          }
        }),
        parseEvents: [
          {
            artifactId: 'doc-v1',
            artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
            parseStage: 'schema',
            errorType: 'schema',
            errorMessage: '',
            line: 10,
            column: 2,
            retryCount: 1
          },
          {
            artifactId: 'doc-v1',
            artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
            parseStage: 'schema',
            errorType: 'schema',
            errorMessage: 'upgraded message',
            line: 10,
            column: 2,
            retries: 2
          },
          {
            artifactId: 'doc-v1',
            artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
            parseStage: 'schema',
            errorType: 'schema',
            errorMessage: 'should-not-overwrite-existing-message',
            line: 10,
            column: 2,
            retryCount: 1
          },
          {
            artifactId: 'doc-v1',
            artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
            parseStage: 'read',
            errorType: 'encoding',
            errorMessage: 'A',
            line: 20,
            column: 1,
            retry: {
              count: 0
            }
          },
          {
            artifactId: 'doc-v1',
            artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
            parseStage: 'decode',
            errorType: 'encoding',
            errorMessage: 'B',
            line: 20,
            column: 5,
            retryCount: 0
          },
          {
            artifactId: 'bad-age',
            artifactPath: `${ALLOWLIST_ROOT}/reports/bad-age.md`,
            parseStage: 'index',
            errorType: 'encoding',
            errorMessage: 'missing line/column and retry defaults'
          }
        ]
      },
      {
        nowMs: () => Number.NaN
      }
    );

    expect(result.reasonCode).toBe('ARTIFACT_PARSE_FAILED');
    expect(result.parseIssues).toHaveLength(4);

    const dedupedSchemaIssue = result.parseIssues.find(
      (issue) => issue.parseStage === 'schema' && issue.errorLocation.line === 10
    );

    expect(dedupedSchemaIssue).toMatchObject({
      retryCount: 2,
      errorMessage: 'upgraded message',
      stalenessContext: {
        isStale: false,
        ageSeconds: 120,
        stalenessLevel: 'fresh'
      }
    });

    const badAgeIssue = result.parseIssues.find((issue) => issue.artifactId === 'bad-age');
    expect(badAgeIssue).toMatchObject({
      retryCount: 0,
      parseStage: 'index',
      stalenessContext: {
        isStale: false,
        ageSeconds: null,
        stalenessLevel: 'unknown'
      },
      errorLocation: {
        line: null,
        column: null
      }
    });

    const issueIdsInOrder = result.parseIssues.map((issue) => issue.issueId);
    expect(issueIdsInOrder).toEqual(['parse-issue-4', 'parse-issue-3', 'parse-issue-2', 'parse-issue-1']);

    expect(result.diagnostics.durationMs).toBe(0);
    expect(result.diagnostics.p95ParseDiagMs).toBeGreaterThanOrEqual(0);
  });

  it('handles empty blocked reason and string-thrown delegated error paths', () => {
    const blockedNoReason = buildArtifactParseDiagnostics({
      stalenessResult: {
        allowed: false,
        reasonCode: 'ARTIFACT_PARSE_FAILED',
        reason: '   ',
        diagnostics: {
          sourceReasonCode: 'ARTIFACT_PARSE_FAILED'
        }
      }
    });

    expect(blockedNoReason.reasonCode).toBe('ARTIFACT_PARSE_FAILED');
    expect(blockedNoReason.reason).toContain('Source staleness bloquée');

    const delegatedStringThrow = buildArtifactParseDiagnostics(
      {
        stalenessInput: {
          evidenceGraphResult: {
            allowed: true,
            reasonCode: 'OK',
            diagnostics: {
              sourceReasonCode: 'OK'
            },
            graph: {
              nodes: [
                {
                  nodeId: 'artifact:a',
                  nodeType: 'artifact',
                  artifactId: 'a',
                  artifactPath: `${ALLOWLIST_ROOT}/reports/a.md`,
                  artifactType: 'doc'
                }
              ],
              edges: [],
              clusters: []
            },
            decisionBacklinks: {
              'DEC-A': [
                {
                  artifactId: 'a',
                  artifactPath: `${ALLOWLIST_ROOT}/reports/a.md`,
                  artifactType: 'doc'
                }
              ]
            },
            orphanEvidence: [],
            correctiveActions: []
          }
        }
      },
      {
        stalenessOptions: {
          nowMs: () => {
            throw 'boom-string';
          }
        }
      }
    );

    expect(delegatedStringThrow.reasonCode).toBe('INVALID_PARSE_DIAGNOSTIC_INPUT');
    expect(delegatedStringThrow.reason).toContain('boom-string');
  });
});
