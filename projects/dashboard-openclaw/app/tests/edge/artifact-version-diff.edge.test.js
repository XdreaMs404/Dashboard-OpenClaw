import { describe, expect, it } from 'vitest';
import { diffArtifactVersions } from '../../src/artifact-version-diff.js';

const ALLOWLIST_ROOT =
  '/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts';

function artifact(overrides = {}) {
  return {
    artifactId: 'artifact-v1',
    artifactPath: `${ALLOWLIST_ROOT}/reports/artifact-v1.md`,
    artifactType: 'prd',
    metadata: {
      owner: 'team-a'
    },
    sections: ['Contexte'],
    tables: [],
    contentSummary: 'summary',
    decisionRefs: ['DEC-1'],
    gateRefs: ['G4-T'],
    commandRefs: ['CMD-1'],
    ...overrides
  };
}

function pair(overrides = {}) {
  return {
    groupKey: 'prd:artifact',
    left: artifact(),
    right: artifact({
      artifactId: 'artifact-v2',
      artifactPath: `${ALLOWLIST_ROOT}/reports/artifact-v2.md`,
      metadata: {
        owner: 'team-b'
      },
      sections: ['Contexte', 'Runbook'],
      contentSummary: 'summary updated',
      decisionRefs: ['DEC-1', 'DEC-2'],
      gateRefs: ['G4-T', 'G4-UX'],
      commandRefs: ['CMD-1', 'CMD-2']
    }),
    ...overrides
  };
}

describe('artifact-version-diff edge cases', () => {
  it('fails closed on non-object inputs', () => {
    const samples = [undefined, null, true, 42, 'S019', []];

    for (const sample of samples) {
      const result = diffArtifactVersions(sample);

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_ARTIFACT_DIFF_INPUT',
        diffResults: [],
        unresolvedCandidates: [],
        provenanceLinks: []
      });
    }
  });

  it('rejects missing source and invalid source payloads', () => {
    const missingSource = diffArtifactVersions({});

    expect(missingSource.reasonCode).toBe('INVALID_ARTIFACT_DIFF_INPUT');
    expect(missingSource.reason).toContain('Aucune source exploitable');

    const invalidContextFilterInput = diffArtifactVersions({
      contextFilterInput: 'bad'
    });

    expect(invalidContextFilterInput.reasonCode).toBe('INVALID_ARTIFACT_DIFF_INPUT');
    expect(invalidContextFilterInput.reason).toContain('contextFilterInput invalide');

    const invalidContextFilterResult = diffArtifactVersions({
      contextFilterResult: 'bad'
    });

    expect(invalidContextFilterResult.reasonCode).toBe('INVALID_ARTIFACT_DIFF_INPUT');
    expect(invalidContextFilterResult.reason).toContain('contextFilterResult invalide');

    const invalidArtifactPairs = diffArtifactVersions({
      artifactPairs: 'bad'
    });

    expect(invalidArtifactPairs.reasonCode).toBe('INVALID_ARTIFACT_DIFF_INPUT');
    expect(invalidArtifactPairs.reason).toContain('artifactPairs invalide');
  });

  it('rejects invalid contextFilterResult contracts', () => {
    const invalidAllowed = diffArtifactVersions({
      contextFilterResult: {
        reasonCode: 'OK',
        diffCandidates: []
      }
    });

    expect(invalidAllowed.reasonCode).toBe('INVALID_ARTIFACT_DIFF_INPUT');

    const invalidReasonCode = diffArtifactVersions({
      contextFilterResult: {
        allowed: true,
        reasonCode: 'NOT_ALLOWED',
        diffCandidates: []
      }
    });

    expect(invalidReasonCode.reasonCode).toBe('INVALID_ARTIFACT_DIFF_INPUT');

    const invalidBlockedReason = diffArtifactVersions({
      contextFilterResult: {
        allowed: false,
        reasonCode: 'ARTIFACT_DIFF_NOT_ELIGIBLE',
        reason: 'not propagable'
      }
    });

    expect(invalidBlockedReason.reasonCode).toBe('INVALID_ARTIFACT_DIFF_INPUT');
    expect(invalidBlockedReason.reason).toContain('non propagable');

    const missingDiffCandidates = diffArtifactVersions({
      contextFilterResult: {
        allowed: true,
        reasonCode: 'OK'
      }
    });

    expect(missingDiffCandidates.reasonCode).toBe('INVALID_ARTIFACT_DIFF_INPUT');
    expect(missingDiffCandidates.reason).toContain('diffCandidates invalide');
  });

  it('rejects invalid artifact pair contracts', () => {
    const invalidPairObject = diffArtifactVersions({
      artifactPairs: [null]
    });

    expect(invalidPairObject.reasonCode).toBe('INVALID_ARTIFACT_DIFF_INPUT');

    const invalidLeftArtifact = diffArtifactVersions({
      artifactPairs: [
        {
          groupKey: 'x',
          left: { artifactPath: `${ALLOWLIST_ROOT}/a.md` },
          right: artifact({ artifactId: 'x-v2', artifactPath: `${ALLOWLIST_ROOT}/b.md` })
        }
      ]
    });

    expect(invalidLeftArtifact.reasonCode).toBe('INVALID_ARTIFACT_DIFF_INPUT');
    expect(invalidLeftArtifact.reason).toContain('artifactId invalide');

    const invalidRightMetadata = diffArtifactVersions({
      artifactPairs: [
        {
          groupKey: 'x',
          left: artifact(),
          right: artifact({ artifactId: 'x-v2', artifactPath: `${ALLOWLIST_ROOT}/b.md`, metadata: 'bad' })
        }
      ]
    });

    expect(invalidRightMetadata.reasonCode).toBe('INVALID_ARTIFACT_DIFF_INPUT');
    expect(invalidRightMetadata.reason).toContain('metadata invalide');
  });

  it('returns ARTIFACT_DIFF_NOT_ELIGIBLE when no pair can be resolved from candidates', () => {
    const result = diffArtifactVersions({
      contextFilterResult: {
        allowed: true,
        reasonCode: 'OK',
        filteredResults: [
          {
            artifactId: 'v1',
            artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
            artifactType: 'prd',
            score: 10,
            snippet: 'rollout v1'
          }
        ],
        diffCandidates: [
          null,
          {
            groupKey: 'invalid-ids',
            artifactIds: ['v1']
          },
          {
            groupKey: 'missing-results',
            artifactIds: ['v1', 'v2']
          }
        ]
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_DIFF_NOT_ELIGIBLE',
      diagnostics: {
        requestedCandidatesCount: 3,
        comparedPairsCount: 0,
        unresolvedCount: 3
      },
      correctiveActions: ['REVIEW_DIFF_CANDIDATES']
    });

    expect(result.unresolvedCandidates).toHaveLength(3);
  });

  it('keeps unresolved candidates while returning success when at least one pair is resolved', () => {
    const result = diffArtifactVersions({
      contextFilterResult: {
        allowed: true,
        reasonCode: 'OK',
        diagnostics: {
          sourceReasonCode: 'OK'
        },
        filteredResults: [
          {
            artifactId: 'v1',
            artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
            artifactType: 'prd',
            score: 10,
            snippet: 'rollout v1',
            sections: ['A'],
            metadata: {
              owner: 'team-a'
            }
          },
          {
            artifactId: 'v2',
            artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v2.md`,
            artifactType: 'prd',
            score: 9,
            snippet: 'rollout v2',
            sections: ['A', 'B'],
            metadata: {
              owner: 'team-b'
            }
          }
        ],
        diffCandidates: [
          {
            groupKey: 'prd:rollout',
            artifactIds: ['v1', 'v2']
          },
          {
            groupKey: 'prd:missing',
            artifactIds: ['v1', 'v3']
          }
        ]
      }
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCandidatesCount: 2,
        comparedPairsCount: 1,
        unresolvedCount: 1
      },
      correctiveActions: ['REVIEW_DIFF_CANDIDATES']
    });

    expect(result.diffResults).toHaveLength(1);
    expect(result.unresolvedCandidates).toHaveLength(1);
  });

  it('handles non-monotonic or invalid nowMs values safely', () => {
    const nowValues = [Number.NaN, 20, 10, 0, Number.NaN, 5, 1];

    const result = diffArtifactVersions(
      {
        artifactPairs: [pair()]
      },
      {
        nowMs: () => nowValues.shift() ?? Number.NaN
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK'
    });

    expect(result.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.diagnostics.p95DiffMs).toBeGreaterThanOrEqual(0);
  });

  it('accepts non-object options and does not mutate input payload/options', () => {
    const input = {
      artifactPairs: [pair()]
    };

    const options = {
      contextFilterOptions: {
        limit: 10
      }
    };

    const inputSnapshot = JSON.parse(JSON.stringify(input));
    const optionsSnapshot = JSON.parse(JSON.stringify(options));

    const result = diffArtifactVersions(input, options);

    expect(result.reasonCode).toBe('OK');
    expect(input).toEqual(inputSnapshot);
    expect(options).toEqual(optionsSnapshot);

    const resultWithNonObjectOptions = diffArtifactVersions(input, 'bad-options');
    expect(resultWithNonObjectOptions.reasonCode).toBe('OK');
  });

  it('propagates fallback corrective actions on blocked payloads', () => {
    const result = diffArtifactVersions({
      contextFilterResult: {
        allowed: false,
        reasonCode: 'INVALID_ARTIFACT_SEARCH_INPUT',
        reason: 'bad query',
        diagnostics: {
          filteredCount: 0
        },
        correctiveActions: [' ', '']
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_ARTIFACT_SEARCH_INPUT',
      correctiveActions: ['FIX_SEARCH_INPUT']
    });
  });

  it('covers empty content summaries and unchanged diff branches', () => {
    const result = diffArtifactVersions({
      artifactPairs: [
        {
          groupKey: 'prd:stable',
          left: artifact({
            artifactId: 'stable-v1',
            artifactPath: `${ALLOWLIST_ROOT}/reports/stable-v1.md`,
            sections: ['Stable'],
            tables: ['a | b'],
            contentSummary: ''
          }),
          right: artifact({
            artifactId: 'stable-v2',
            artifactPath: `${ALLOWLIST_ROOT}/reports/stable-v2.md`,
            sections: ['Stable'],
            tables: ['a | b'],
            contentSummary: ''
          })
        }
      ]
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.diffResults[0].changes.contentSummary).toMatchObject({
      changed: false,
      left: '',
      right: ''
    });
    expect(result.diffResults[0].changes.sections.changed).toBe(false);
    expect(result.diffResults[0].changes.tables.changed).toBe(false);
  });
});
