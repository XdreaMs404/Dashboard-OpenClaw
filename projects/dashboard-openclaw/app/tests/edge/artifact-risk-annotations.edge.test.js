import { describe, expect, it } from 'vitest';
import { annotateArtifactRiskContext } from '../../src/artifact-risk-annotations.js';

const ALLOWLIST_ROOT =
  '/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts';

function validParseDiagnosticsResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'ARTIFACT_PARSE_FAILED',
    reason: 'Parse errors détectés.',
    diagnostics: {
      sourceReasonCode: 'OK'
    },
    parseIssues: [
      {
        issueId: 'issue-1',
        artifactId: 'doc-v1',
        artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
        parseStage: 'markdown',
        errorType: 'syntax',
        errorMessage: 'err',
        retryCount: 1,
        recommendedFix: 'Corriger markdown'
      }
    ],
    recommendations: [
      {
        artifactId: 'doc-v1',
        action: 'SCHEDULE_PARSE_RETRY'
      }
    ],
    dlqCandidates: [],
    correctiveActions: ['SCHEDULE_PARSE_RETRY'],
    ...overrides
  };
}

describe('artifact-risk-annotations edge cases', () => {
  it('fails closed on non-object inputs', () => {
    const samples = [undefined, null, true, 42, 'S023', []];

    for (const sample of samples) {
      const result = annotateArtifactRiskContext(sample);

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_RISK_ANNOTATION_INPUT',
        taggedArtifacts: [],
        contextAnnotations: [],
        riskTagCatalog: []
      });
    }
  });

  it('rejects missing source and invalid source payloads', () => {
    const missingSource = annotateArtifactRiskContext({});

    expect(missingSource.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');
    expect(missingSource.reason).toContain('Aucune source exploitable');

    const invalidParseDiagnosticsInput = annotateArtifactRiskContext({
      parseDiagnosticsInput: 'bad'
    });

    expect(invalidParseDiagnosticsInput.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');
    expect(invalidParseDiagnosticsInput.reason).toContain('parseDiagnosticsInput invalide');

    const invalidParseDiagnosticsResult = annotateArtifactRiskContext({
      parseDiagnosticsResult: 'bad'
    });

    expect(invalidParseDiagnosticsResult.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');
    expect(invalidParseDiagnosticsResult.reason).toContain('parseDiagnosticsResult invalide');
  });

  it('rejects invalid parseDiagnosticsResult contracts', () => {
    const missingAllowed = annotateArtifactRiskContext({
      parseDiagnosticsResult: {
        reasonCode: 'OK'
      }
    });

    expect(missingAllowed.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');

    const invalidReasonCode = annotateArtifactRiskContext({
      parseDiagnosticsResult: {
        allowed: true,
        reasonCode: 'NOT_ALLOWED',
        parseIssues: [],
        recommendations: [],
        dlqCandidates: []
      }
    });

    expect(invalidReasonCode.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');
    expect(invalidReasonCode.reason).toContain('reasonCode invalide');

    const emptyReasonCode = annotateArtifactRiskContext({
      parseDiagnosticsResult: {
        allowed: true,
        reasonCode: '',
        parseIssues: [],
        recommendations: [],
        dlqCandidates: []
      }
    });

    expect(emptyReasonCode.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');
    expect(emptyReasonCode.reason).toContain('vide');

    const blockedNotPropagable = annotateArtifactRiskContext({
      parseDiagnosticsResult: {
        allowed: false,
        reasonCode: 'RISK_TAGS_MISSING',
        diagnostics: {
          sourceReasonCode: 'RISK_TAGS_MISSING'
        }
      }
    });

    expect(blockedNotPropagable.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');
    expect(blockedNotPropagable.reason).toContain('non propagable');

    const invalidParseIssuesShape = annotateArtifactRiskContext({
      parseDiagnosticsResult: {
        allowed: true,
        reasonCode: 'OK',
        parseIssues: 'bad',
        recommendations: [],
        dlqCandidates: []
      }
    });

    expect(invalidParseIssuesShape.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');
    expect(invalidParseIssuesShape.reason).toContain('parseIssues invalide');

    const invalidRecommendationsShape = annotateArtifactRiskContext({
      parseDiagnosticsResult: {
        allowed: true,
        reasonCode: 'OK',
        parseIssues: [],
        recommendations: 'bad',
        dlqCandidates: []
      }
    });

    expect(invalidRecommendationsShape.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');
    expect(invalidRecommendationsShape.reason).toContain('recommendations invalide');

    const invalidDlqShape = annotateArtifactRiskContext({
      parseDiagnosticsResult: {
        allowed: true,
        reasonCode: 'OK',
        parseIssues: [],
        recommendations: [],
        dlqCandidates: 'bad'
      }
    });

    expect(invalidDlqShape.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');
    expect(invalidDlqShape.reason).toContain('dlqCandidates invalide');
  });

  it('rejects invalid injected taggedArtifacts/contextAnnotations payloads', () => {
    const invalidTaggedArtifactsShape = annotateArtifactRiskContext({
      parseDiagnosticsResult: validParseDiagnosticsResult(),
      taggedArtifacts: 'bad',
      contextAnnotations: []
    });

    expect(invalidTaggedArtifactsShape.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');
    expect(invalidTaggedArtifactsShape.reason).toContain('taggedArtifacts invalide');

    const invalidContextAnnotationsShape = annotateArtifactRiskContext({
      parseDiagnosticsResult: validParseDiagnosticsResult(),
      taggedArtifacts: [],
      contextAnnotations: 'bad'
    });

    expect(invalidContextAnnotationsShape.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');
    expect(invalidContextAnnotationsShape.reason).toContain('contextAnnotations invalide');

    const invalidTaggedArtifactObject = annotateArtifactRiskContext({
      parseDiagnosticsResult: validParseDiagnosticsResult(),
      taggedArtifacts: [null],
      contextAnnotations: []
    });

    expect(invalidTaggedArtifactObject.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');
    expect(invalidTaggedArtifactObject.reason).toContain('taggedArtifacts[0] invalide');

    const invalidTaggedArtifactId = annotateArtifactRiskContext({
      parseDiagnosticsResult: validParseDiagnosticsResult(),
      taggedArtifacts: [
        {
          artifactId: '',
          artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
          riskTags: ['T01']
        }
      ],
      contextAnnotations: []
    });

    expect(invalidTaggedArtifactId.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');
    expect(invalidTaggedArtifactId.reason).toContain('artifactId invalide');

    const invalidTaggedArtifactPathEmpty = annotateArtifactRiskContext({
      parseDiagnosticsResult: validParseDiagnosticsResult(),
      taggedArtifacts: [
        {
          artifactId: 'doc-v1',
          artifactPath: '   ',
          riskTags: ['T01']
        }
      ],
      contextAnnotations: []
    });

    expect(invalidTaggedArtifactPathEmpty.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');
    expect(invalidTaggedArtifactPathEmpty.reason).toContain('artifactPath vide');

    const invalidTaggedArtifactPath = annotateArtifactRiskContext({
      parseDiagnosticsResult: validParseDiagnosticsResult(),
      taggedArtifacts: [
        {
          artifactId: 'doc-v1',
          artifactPath: 'relative/path.md',
          riskTags: ['T01']
        }
      ],
      contextAnnotations: []
    });

    expect(invalidTaggedArtifactPath.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');
    expect(invalidTaggedArtifactPath.reason).toContain('artifactPath invalide');

    const invalidAnnotationObject = annotateArtifactRiskContext({
      parseDiagnosticsResult: validParseDiagnosticsResult(),
      taggedArtifacts: [
        {
          artifactId: 'doc-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
          riskTags: ['T01']
        }
      ],
      contextAnnotations: [null]
    });

    expect(invalidAnnotationObject.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');
    expect(invalidAnnotationObject.reason).toContain('contextAnnotations[0] invalide');

    const invalidAnnotationArtifactId = annotateArtifactRiskContext({
      parseDiagnosticsResult: validParseDiagnosticsResult(),
      taggedArtifacts: [
        {
          artifactId: 'doc-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
          riskTags: ['T01']
        }
      ],
      contextAnnotations: [
        {
          annotationId: 'ann-0',
          artifactId: '   ',
          artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
          what: 'quoi',
          why: 'pourquoi',
          nextAction: 'action',
          riskTags: ['T01']
        }
      ]
    });

    expect(invalidAnnotationArtifactId.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');
    expect(invalidAnnotationArtifactId.reason).toContain('.artifactId invalide');

    const invalidAnnotationArtifactPath = annotateArtifactRiskContext({
      parseDiagnosticsResult: validParseDiagnosticsResult(),
      taggedArtifacts: [
        {
          artifactId: 'doc-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
          riskTags: ['T01']
        }
      ],
      contextAnnotations: [
        {
          annotationId: 'ann-0b',
          artifactId: 'doc-v1',
          artifactPath: 'relative/path.md',
          what: 'quoi',
          why: 'pourquoi',
          nextAction: 'action',
          riskTags: ['T01']
        }
      ]
    });

    expect(invalidAnnotationArtifactPath.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');
    expect(invalidAnnotationArtifactPath.reason).toContain('.artifactPath invalide');

    const invalidAnnotationField = annotateArtifactRiskContext({
      parseDiagnosticsResult: validParseDiagnosticsResult(),
      taggedArtifacts: [
        {
          artifactId: 'doc-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
          riskTags: ['T01']
        }
      ],
      contextAnnotations: [
        {
          annotationId: 'ann-1',
          artifactId: 'doc-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
          what: '',
          why: 'pourquoi',
          nextAction: 'action',
          riskTags: ['T01']
        }
      ]
    });

    expect(invalidAnnotationField.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');
    expect(invalidAnnotationField.reason).toContain('.what invalide');

    const invalidAnnotationRiskTags = annotateArtifactRiskContext({
      parseDiagnosticsResult: validParseDiagnosticsResult(),
      taggedArtifacts: [
        {
          artifactId: 'doc-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
          riskTags: ['T01']
        }
      ],
      contextAnnotations: [
        {
          annotationId: 'ann-2',
          artifactId: 'doc-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
          what: 'quoi',
          why: 'pourquoi',
          nextAction: 'action',
          riskTags: []
        }
      ]
    });

    expect(invalidAnnotationRiskTags.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');
    expect(invalidAnnotationRiskTags.reason).toContain('riskTags invalide');
  });

  it('rejects malformed riskTagCatalog payload', () => {
    const invalidRiskTagCatalogShape = annotateArtifactRiskContext({
      parseDiagnosticsResult: validParseDiagnosticsResult(),
      taggedArtifacts: [],
      contextAnnotations: [],
      riskTagCatalog: 'bad'
    });

    expect(invalidRiskTagCatalogShape.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');
    expect(invalidRiskTagCatalogShape.reason).toContain('riskTagCatalog invalide');

    const invalidRiskTagCatalogEntry = annotateArtifactRiskContext({
      parseDiagnosticsResult: validParseDiagnosticsResult(),
      taggedArtifacts: [],
      contextAnnotations: [],
      riskTagCatalog: [
        {
          riskTag: 'T01',
          count: 0
        }
      ]
    });

    expect(invalidRiskTagCatalogEntry.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');
    expect(invalidRiskTagCatalogEntry.reason).toContain('.count invalide');

    const invalidRiskTagCatalogEmptyTag = annotateArtifactRiskContext({
      parseDiagnosticsResult: validParseDiagnosticsResult(),
      taggedArtifacts: [],
      contextAnnotations: [],
      riskTagCatalog: [
        {
          riskTag: '   ',
          count: 1
        }
      ]
    });

    expect(invalidRiskTagCatalogEmptyTag.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');
    expect(invalidRiskTagCatalogEmptyTag.reason).toContain('.riskTag invalide');
  });

  it('fails closed when delegated buildArtifactParseDiagnostics throws', () => {
    const result = annotateArtifactRiskContext(
      {
        parseDiagnosticsInput: {
          stalenessInput: {
            evidenceGraphInput: {
              graphEntries: [
                {
                  groupKey: 'x',
                  artifactId: 'doc-x',
                  artifactPath: `${ALLOWLIST_ROOT}/reports/doc-x.md`,
                  artifactType: 'doc',
                  decisionRefs: ['DEC-X'],
                  gateRefs: ['G1'],
                  commandRefs: ['CMD-X']
                }
              ]
            }
          }
        }
      },
      {
        parseDiagnosticsOptions: {
          nowMs: () => {
            throw new Error('boom');
          }
        }
      }
    );

    expect(result.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');
    expect(result.reason).toContain('levé une exception');
    expect(result.reason).toContain('boom');
  });

  it('uses fallback corrective actions for blocked upstream reason when missing or duplicated', () => {
    const fallbackAction = annotateArtifactRiskContext({
      parseDiagnosticsResult: {
        allowed: false,
        reasonCode: 'ARTIFACT_PARSE_FAILED',
        diagnostics: {
          sourceReasonCode: 'ARTIFACT_PARSE_FAILED'
        }
      }
    });

    expect(fallbackAction.reasonCode).toBe('ARTIFACT_PARSE_FAILED');
    expect(fallbackAction.correctiveActions).toEqual(['FIX_ARTIFACT_SYNTAX']);

    const normalizedAction = annotateArtifactRiskContext({
      parseDiagnosticsResult: {
        allowed: false,
        reasonCode: 'ARTIFACT_PARSE_FAILED',
        diagnostics: {
          sourceReasonCode: 'ARTIFACT_PARSE_FAILED'
        },
        correctiveActions: [null, '  FIX_ARTIFACT_SYNTAX ', 'FIX_ARTIFACT_SYNTAX']
      }
    });

    expect(normalizedAction.correctiveActions).toEqual(['FIX_ARTIFACT_SYNTAX']);
  });

  it('returns RISK_ANNOTATION_CONFLICT when annotation references missing artifact id in taggedArtifacts', () => {
    const result = annotateArtifactRiskContext({
      parseDiagnosticsResult: validParseDiagnosticsResult(),
      taggedArtifacts: [
        {
          artifactId: 'doc-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
          artifactType: 'doc',
          sourceIssueIds: ['issue-1'],
          riskTags: ['T01'],
          severity: 'medium',
          ownerHint: 'owner-a'
        }
      ],
      contextAnnotations: [
        {
          annotationId: 'ann-missing-artifact',
          artifactId: 'doc-ghost',
          artifactPath: `${ALLOWLIST_ROOT}/reports/doc-ghost.md`,
          what: 'quoi',
          why: 'pourquoi',
          nextAction: 'action',
          riskTags: ['T01']
        }
      ]
    });

    expect(result.reasonCode).toBe('RISK_ANNOTATION_CONFLICT');
    expect(result.reason).toContain('sans artefact correspondant');
  });

  it('returns RISK_TAGS_MISSING with default corrective action when injected tagged artifact has empty tags', () => {
    const result = annotateArtifactRiskContext({
      parseDiagnosticsResult: validParseDiagnosticsResult(),
      taggedArtifacts: [
        {
          artifactId: 'doc-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
          artifactType: 'doc',
          sourceIssueIds: ['issue-1'],
          riskTags: []
        }
      ],
      contextAnnotations: []
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'RISK_TAGS_MISSING',
      correctiveActions: ['ADD_RISK_TAGS']
    });
  });

  it('keeps user-provided riskTagCatalog when valid and non-empty', () => {
    const result = annotateArtifactRiskContext({
      parseDiagnosticsResult: validParseDiagnosticsResult(),
      taggedArtifacts: [
        {
          artifactId: 'doc-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
          artifactType: 'doc',
          sourceIssueIds: ['issue-1'],
          riskTags: ['T01'],
          severity: 'medium',
          ownerHint: 'owner-a'
        }
      ],
      contextAnnotations: [
        {
          annotationId: 'ann-1',
          artifactId: 'doc-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
          what: 'quoi',
          why: 'pourquoi',
          nextAction: 'action',
          riskTags: ['T01']
        }
      ],
      riskTagCatalog: [
        {
          riskTag: 'CUSTOM-1',
          label: 'Custom label',
          count: 7,
          highestSeverity: 'critical'
        }
      ]
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.riskTagCatalog).toEqual([
      {
        riskTag: 'CUSTOM-1',
        label: 'Custom label',
        count: 7,
        highestSeverity: 'critical'
      }
    ]);
  });

  it('handles non-monotonic nowMs values safely', () => {
    const nowValues = [Number.NaN, 20, 10, 0, Number.NaN, 5, 1];

    const result = annotateArtifactRiskContext(
      {
        parseDiagnosticsResult: validParseDiagnosticsResult()
      },
      {
        nowMs: () => nowValues.shift() ?? Number.NaN
      }
    );

    expect(result.reasonCode).toBe('OK');
    expect(result.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.diagnostics.p95TaggingMs).toBeGreaterThanOrEqual(0);
  });

  it('covers invalid parseDiagnosticsResult booleans/shapes and catalog sorting tie-break', () => {
    const invalidAllowed = annotateArtifactRiskContext({
      parseDiagnosticsResult: {
        allowed: 'true',
        reasonCode: 'OK'
      }
    });

    expect(invalidAllowed.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');
    expect(invalidAllowed.reason).toContain('allowed invalide');

    const invalidCatalogObjectEntry = annotateArtifactRiskContext({
      parseDiagnosticsResult: validParseDiagnosticsResult(),
      taggedArtifacts: [
        {
          artifactId: 'doc-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
          artifactType: 'doc',
          sourceIssueIds: ['issue-1'],
          riskTags: ['T01'],
          severity: 'medium'
        }
      ],
      contextAnnotations: [
        {
          annotationId: 'ann-1',
          artifactId: 'doc-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/doc-v1.md`,
          what: 'quoi',
          why: 'pourquoi',
          nextAction: 'action',
          riskTags: ['T01']
        }
      ],
      riskTagCatalog: [null]
    });

    expect(invalidCatalogObjectEntry.reasonCode).toBe('INVALID_RISK_ANNOTATION_INPUT');
    expect(invalidCatalogObjectEntry.reason).toContain('riskTagCatalog[0] invalide');

    const sortedCatalog = annotateArtifactRiskContext({
      parseDiagnosticsResult: validParseDiagnosticsResult({
        reasonCode: 'OK',
        parseIssues: [],
        recommendations: [],
        dlqCandidates: []
      }),
      taggedArtifacts: [
        {
          artifactId: 'alpha',
          artifactPath: `${ALLOWLIST_ROOT}/reports/alpha.md`,
          artifactType: 'doc',
          sourceIssueIds: ['a-1'],
          riskTags: ['Z-HIGH'],
          severity: 'high',
          ownerHint: 'owner-a'
        },
        {
          artifactId: 'beta',
          artifactPath: `${ALLOWLIST_ROOT}/reports/beta.md`,
          artifactType: 'doc',
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
          what: 'alpha',
          why: 'alpha',
          nextAction: 'alpha',
          severity: 'high',
          riskTags: ['Z-HIGH']
        },
        {
          annotationId: 'ann-beta',
          artifactId: 'beta',
          artifactPath: `${ALLOWLIST_ROOT}/reports/beta.md`,
          what: 'beta',
          why: 'beta',
          nextAction: 'beta',
          severity: 'low',
          riskTags: ['A-LOW']
        }
      ],
      riskTagCatalog: [
        {
          riskTag: 'B-MEDIUM',
          count: 2,
          highestSeverity: 'medium'
        },
        {
          riskTag: 'A-MEDIUM',
          count: 2,
          highestSeverity: 'medium'
        },
        {
          riskTag: 'C-TOP',
          count: 3,
          highestSeverity: 'low'
        }
      ]
    });

    expect(sortedCatalog.reasonCode).toBe('OK');
    expect(sortedCatalog.riskTagCatalog).toEqual([
      {
        riskTag: 'C-TOP',
        label: 'C-TOP',
        count: 3,
        highestSeverity: 'low'
      },
      {
        riskTag: 'A-MEDIUM',
        label: 'A-MEDIUM',
        count: 2,
        highestSeverity: 'medium'
      },
      {
        riskTag: 'B-MEDIUM',
        label: 'B-MEDIUM',
        count: 2,
        highestSeverity: 'medium'
      }
    ]);

    const severityPriorityCatalog = annotateArtifactRiskContext({
      parseDiagnosticsResult: validParseDiagnosticsResult({
        reasonCode: 'OK',
        parseIssues: [],
        recommendations: [],
        dlqCandidates: []
      }),
      taggedArtifacts: [
        {
          artifactId: 'gamma',
          artifactPath: `${ALLOWLIST_ROOT}/reports/gamma.md`,
          riskTags: ['HIGH-TAG']
        }
      ],
      contextAnnotations: [
        {
          artifactId: 'gamma',
          artifactPath: `${ALLOWLIST_ROOT}/reports/gamma.md`,
          what: 'gamma',
          why: 'gamma',
          nextAction: 'gamma',
          riskTags: ['HIGH-TAG']
        }
      ],
      riskTagCatalog: [
        {
          riskTag: 'LOW-TAG',
          count: 2,
          highestSeverity: 'low'
        },
        {
          riskTag: 'HIGH-TAG',
          count: 2,
          highestSeverity: 'high'
        }
      ]
    });

    expect(severityPriorityCatalog.reasonCode).toBe('OK');
    expect(severityPriorityCatalog.riskTagCatalog).toEqual([
      {
        riskTag: 'HIGH-TAG',
        label: 'HIGH-TAG',
        count: 2,
        highestSeverity: 'high'
      },
      {
        riskTag: 'LOW-TAG',
        label: 'LOW-TAG',
        count: 2,
        highestSeverity: 'low'
      }
    ]);
  });

  it('covers reason/source fallback, parse issue skips and conflict branch for missing artifact mapping', () => {
    const fallbackReasonSource = annotateArtifactRiskContext({
      parseDiagnosticsResult: {
        allowed: true,
        reasonCode: 'OK',
        reason: '  ',
        parseIssues: [],
        recommendations: [],
        dlqCandidates: []
      }
    });

    expect(fallbackReasonSource.reasonCode).toBe('OK');
    expect(fallbackReasonSource.reason).toContain('Aucune parse issue');
    expect(fallbackReasonSource.diagnostics.sourceReasonCode).toBe('OK');

    const skipInvalidIssues = annotateArtifactRiskContext({
      parseDiagnosticsResult: validParseDiagnosticsResult({
        parseIssues: [
          null,
          {
            issueId: 'missing-id',
            artifactId: '',
            artifactPath: `${ALLOWLIST_ROOT}/reports/missing-id.md`,
            parseStage: 'markdown',
            errorType: 'syntax',
            retryCount: 0
          },
          {
            issueId: 'bad-path',
            artifactId: 'bad-path',
            artifactPath: 'relative.md',
            parseStage: 'markdown',
            errorType: 'syntax',
            retryCount: 0
          }
        ],
        recommendations: [],
        dlqCandidates: []
      })
    });

    expect(skipInvalidIssues.reasonCode).toBe('OK');
    expect(skipInvalidIssues.taggedArtifacts).toEqual([]);
    expect(skipInvalidIssues.contextAnnotations).toEqual([]);

    const missingArtifactConflict = annotateArtifactRiskContext({
      parseDiagnosticsResult: validParseDiagnosticsResult({
        reasonCode: 'OK',
        parseIssues: [],
        recommendations: [],
        dlqCandidates: []
      }),
      taggedArtifacts: [
        {
          artifactId: 'known-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/known-v1.md`,
          artifactType: 'doc',
          sourceIssueIds: ['k-1'],
          riskTags: ['T01'],
          severity: 'medium'
        }
      ],
      contextAnnotations: [
        {
          annotationId: 'missing-artifact-annotation',
          artifactId: 'ghost-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/ghost-v1.md`,
          what: 'ghost',
          why: 'ghost',
          nextAction: 'ghost',
          riskTags: ['T01']
        }
      ]
    });

    expect(missingArtifactConflict.reasonCode).toBe('RISK_ANNOTATION_CONFLICT');
    expect(missingArtifactConflict.reason).toContain('sans artefact correspondant');
  });

  it('accepts non-object options and does not mutate input payload/options', () => {
    const input = {
      parseDiagnosticsResult: validParseDiagnosticsResult()
    };

    const options = {
      parseDiagnosticsOptions: {
        nowMs: () => Date.now()
      }
    };

    const inputSnapshot = JSON.parse(JSON.stringify(input));

    const result = annotateArtifactRiskContext(input, options);

    expect(result.reasonCode).toBe('OK');
    expect(input).toEqual(inputSnapshot);

    const resultWithInvalidOptions = annotateArtifactRiskContext(input, 'bad-options');
    expect(resultWithInvalidOptions.reasonCode).toBe('OK');
  });
});
