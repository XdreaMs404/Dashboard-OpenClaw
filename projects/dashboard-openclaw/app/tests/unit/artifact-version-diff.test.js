import { describe, expect, it } from 'vitest';
import { diffArtifactVersions } from '../../src/artifact-version-diff.js';
import {
  applyArtifactContextFilters,
  diffArtifactVersions as diffFromIndex
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
  'INVALID_ARTIFACT_DIFF_INPUT'
]);

function artifact(overrides = {}) {
  return {
    artifactId: 'prd-v1',
    artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
    artifactType: 'prd',
    metadata: {
      owner: 'team-a',
      riskLevel: 'high',
      tags: ['release', 'gate']
    },
    sections: ['Contexte', 'Plan'],
    tables: [
      {
        headers: ['metric', 'value'],
        rows: [['coverage', '95%']]
      }
    ],
    contentSummary: 'Résumé initial de rollout.',
    decisionRefs: ['DEC-100'],
    gateRefs: ['G4-T'],
    commandRefs: ['CMD-100'],
    ...overrides
  };
}

function pair(overrides = {}) {
  return {
    groupKey: 'prd:rollout',
    left: artifact(),
    right: artifact({
      artifactId: 'prd-v2',
      artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v2.md`,
      metadata: {
        owner: 'team-a',
        riskLevel: 'critical',
        tags: ['release', 'gate', 'postmortem']
      },
      sections: ['Contexte', 'Plan', 'Runbook'],
      tables: [
        {
          headers: ['metric', 'value'],
          rows: [
            ['coverage', '98%'],
            ['p95', '1.1s']
          ]
        }
      ],
      contentSummary: 'Résumé enrichi avec runbook.',
      decisionRefs: ['DEC-100', 'DEC-101'],
      gateRefs: ['G4-T', 'G4-UX'],
      commandRefs: ['CMD-100', 'CMD-200']
    }),
    ...overrides
  };
}

function buildContextFilterResult(results) {
  return applyArtifactContextFilters({
    searchResult: {
      allowed: true,
      reasonCode: 'OK',
      reason: 'Recherche full-text exécutée.',
      diagnostics: {
        requestedCount: results.length,
        indexedCount: results.length,
        matchedCount: results.length,
        filteredOutCount: 0,
        sourceReasonCode: 'OK'
      },
      results,
      correctiveActions: []
    }
  });
}

describe('artifact-version-diff unit', () => {
  it('computes deterministic diff on eligible pair with structured changes and provenance links', () => {
    const result = diffArtifactVersions({
      artifactPairs: [pair()]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCandidatesCount: 1,
        comparedPairsCount: 1,
        unresolvedCount: 0,
        sourceReasonCode: 'OK'
      },
      correctiveActions: []
    });

    expect(result.diffResults).toHaveLength(1);

    const diff = result.diffResults[0];

    expect(diff).toMatchObject({
      groupKey: 'prd:rollout',
      leftArtifactId: 'prd-v1',
      rightArtifactId: 'prd-v2',
      changed: true,
      candidateSource: 'artifactPairs'
    });

    expect(diff.changes.metadata.changed.map((entry) => entry.key)).toEqual(
      expect.arrayContaining(['riskLevel', 'tags'])
    );
    expect(diff.changes.sections.added).toContain('Runbook');
    expect(diff.changes.tables.changed).toBe(true);
    expect(diff.changes.contentSummary.changed).toBe(true);

    expect(result.provenanceLinks).toHaveLength(1);
    expect(result.provenanceLinks[0]).toMatchObject({
      groupKey: 'prd:rollout',
      decisionRefs: ['DEC-100', 'DEC-101'],
      gateRefs: ['G4-T', 'G4-UX'],
      commandRefs: ['CMD-100', 'CMD-200']
    });
  });

  it('prefers contextFilterResult over contextFilterInput and artifactPairs', () => {
    const contextFilterResult = buildContextFilterResult([
      {
        artifactId: 'risk-v1',
        artifactPath: `${ALLOWLIST_ROOT}/reports/risk-v1.md`,
        artifactType: 'risk-register',
        score: 90,
        snippet: 'risk register v1',
        groupKey: 'risk-register:core',
        metadata: { severity: 'high' },
        sections: ['Risque'],
        contentSummary: 'baseline',
        decisionRefs: ['DEC-1'],
        gateRefs: ['G2'],
        commandRefs: ['CMD-1']
      },
      {
        artifactId: 'risk-v2',
        artifactPath: `${ALLOWLIST_ROOT}/reports/risk-v2.md`,
        artifactType: 'risk-register',
        score: 80,
        snippet: 'risk register v2',
        groupKey: 'risk-register:core',
        metadata: { severity: 'critical' },
        sections: ['Risque', 'Mitigation'],
        contentSummary: 'updated',
        decisionRefs: ['DEC-1', 'DEC-2'],
        gateRefs: ['G2'],
        commandRefs: ['CMD-1', 'CMD-2']
      }
    ]);

    const result = diffArtifactVersions({
      contextFilterResult,
      contextFilterInput: {
        filters: { phase: 'implementation' }
      },
      artifactPairs: [
        pair({
          groupKey: 'should-not-be-used'
        })
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        comparedPairsCount: 1
      }
    });
    expect(result.diffResults[0].groupKey).toBe('risk-register-core');
  });

  it('delegates to S018 via contextFilterInput when contextFilterResult is not provided', () => {
    const result = diffArtifactVersions({
      contextFilterInput: {
        searchResult: {
          allowed: true,
          reasonCode: 'OK',
          reason: 'Recherche full-text exécutée.',
          diagnostics: {
            requestedCount: 2,
            indexedCount: 2,
            matchedCount: 2,
            filteredOutCount: 0,
            sourceReasonCode: 'OK'
          },
          results: [
            {
              artifactId: 'scope-v1',
              artifactPath: `${ALLOWLIST_ROOT}/reports/scope-v1.md`,
              artifactType: 'scope',
              score: 12,
              groupKey: 'scope:delivery',
              snippet: 'scope v1',
              sections: ['Intro'],
              metadata: { owner: 'pm' },
              decisionRefs: ['DEC-SCOPE-1'],
              gateRefs: ['G3'],
              commandRefs: ['CMD-SCOPE-1']
            },
            {
              artifactId: 'scope-v2',
              artifactPath: `${ALLOWLIST_ROOT}/reports/scope-v2.md`,
              artifactType: 'scope',
              score: 11,
              groupKey: 'scope:delivery',
              snippet: 'scope v2',
              sections: ['Intro', 'Backlog'],
              metadata: { owner: 'pm', risk: 'medium' },
              decisionRefs: ['DEC-SCOPE-1', 'DEC-SCOPE-2'],
              gateRefs: ['G3'],
              commandRefs: ['CMD-SCOPE-1', 'CMD-SCOPE-2']
            }
          ]
        }
      }
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        comparedPairsCount: 1,
        sourceReasonCode: 'OK'
      }
    });
  });

  it('propagates strict upstream blocking reason codes from S018', () => {
    const result = diffArtifactVersions({
      contextFilterResult: {
        allowed: false,
        reasonCode: 'ARTIFACT_TABLES_MISSING',
        reason: 'Aucun tableau markdown exploitable.',
        diagnostics: {
          diffCandidateGroupsCount: 2,
          sourceReasonCode: 'ARTIFACT_TABLES_MISSING'
        },
        correctiveActions: ['ADD_MARKDOWN_TABLES']
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_TABLES_MISSING',
      diagnostics: {
        requestedCandidatesCount: 2,
        comparedPairsCount: 0,
        unresolvedCount: 0,
        sourceReasonCode: 'ARTIFACT_TABLES_MISSING'
      },
      correctiveActions: ['ADD_MARKDOWN_TABLES']
    });
  });

  it('returns ARTIFACT_DIFF_NOT_ELIGIBLE with unresolvedCandidates when candidates cannot be resolved', () => {
    const result = diffArtifactVersions({
      contextFilterResult: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Filtrage contextuel exécuté.',
        diagnostics: {
          requestedCount: 1,
          filteredCount: 1,
          filteredOutCount: 0,
          diffCandidateGroupsCount: 1,
          sourceReasonCode: 'OK'
        },
        filteredResults: [
          {
            artifactId: 'only-v1',
            artifactPath: `${ALLOWLIST_ROOT}/reports/only-v1.md`,
            artifactType: 'prd',
            score: 3,
            snippet: 'single version'
          }
        ],
        diffCandidates: [
          {
            groupKey: 'prd:only',
            artifactIds: ['only-v1']
          }
        ]
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_DIFF_NOT_ELIGIBLE',
      diagnostics: {
        requestedCandidatesCount: 1,
        comparedPairsCount: 0,
        unresolvedCount: 1,
        sourceReasonCode: 'OK'
      },
      correctiveActions: ['REVIEW_DIFF_CANDIDATES']
    });

    expect(result.unresolvedCandidates[0]).toMatchObject({
      groupKey: 'prd:only',
      reasonCode: 'ARTIFACT_DIFF_NOT_ELIGIBLE'
    });
  });

  it('keeps stable output contract and public index export', () => {
    const result = diffFromIndex({
      artifactPairs: [pair()]
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('diffResults');
    expect(result).toHaveProperty('unresolvedCandidates');
    expect(result).toHaveProperty('provenanceLinks');
    expect(result).toHaveProperty('correctiveActions');

    expect(typeof result.allowed).toBe('boolean');
    expect(REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(typeof result.reason).toBe('string');

    expect(result.diagnostics).toHaveProperty('requestedCandidatesCount');
    expect(result.diagnostics).toHaveProperty('comparedPairsCount');
    expect(result.diagnostics).toHaveProperty('unresolvedCount');
    expect(result.diagnostics).toHaveProperty('durationMs');
    expect(result.diagnostics).toHaveProperty('p95DiffMs');
    expect(result.diagnostics).toHaveProperty('sourceReasonCode');

    expect(Array.isArray(result.diffResults)).toBe(true);
    expect(Array.isArray(result.unresolvedCandidates)).toBe(true);
    expect(Array.isArray(result.provenanceLinks)).toBe(true);
    expect(Array.isArray(result.correctiveActions)).toBe(true);
  });

  it('keeps deterministic ordering by groupKey then artifact ids', () => {
    const result = diffArtifactVersions({
      artifactPairs: [
        pair({
          groupKey: 'zeta',
          left: artifact({ artifactId: 'zeta-v1', artifactPath: `${ALLOWLIST_ROOT}/reports/zeta-v1.md` }),
          right: artifact({ artifactId: 'zeta-v2', artifactPath: `${ALLOWLIST_ROOT}/reports/zeta-v2.md` })
        }),
        pair({
          groupKey: 'alpha',
          left: artifact({ artifactId: 'alpha-v1', artifactPath: `${ALLOWLIST_ROOT}/reports/alpha-v1.md` }),
          right: artifact({ artifactId: 'alpha-v2', artifactPath: `${ALLOWLIST_ROOT}/reports/alpha-v2.md` })
        })
      ]
    });

    expect(result.diffResults.map((entry) => entry.groupKey)).toEqual(['alpha', 'zeta']);
  });

  it('meets performance threshold on synthetic corpus of 500 version pairs', () => {
    const pairs = Array.from({ length: 500 }, (_, index) => {
      const logical = `rollout-${Math.floor(index / 2)}`;
      return {
        groupKey: `prd:${logical}`,
        left: artifact({
          artifactId: `${logical}-v1-${index}`,
          artifactPath: `${ALLOWLIST_ROOT}/reports/${logical}-v1-${index}.md`,
          metadata: {
            owner: 'team-a',
            riskLevel: 'medium',
            revision: `1-${index}`
          },
          sections: ['Contexte', 'Plan'],
          tables: [
            {
              headers: ['metric', 'value'],
              rows: [['coverage', `${90 + (index % 10)}%`]]
            }
          ],
          contentSummary: `summary left ${index}`
        }),
        right: artifact({
          artifactId: `${logical}-v2-${index}`,
          artifactPath: `${ALLOWLIST_ROOT}/reports/${logical}-v2-${index}.md`,
          metadata: {
            owner: 'team-a',
            riskLevel: 'high',
            revision: `2-${index}`
          },
          sections: ['Contexte', 'Plan', 'Runbook'],
          tables: [
            {
              headers: ['metric', 'value'],
              rows: [
                ['coverage', `${91 + (index % 9)}%`],
                ['p95', `${1000 + index}ms`]
              ]
            }
          ],
          contentSummary: `summary right ${index}`
        })
      };
    });

    const result = diffArtifactVersions({
      artifactPairs: pairs
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCandidatesCount: 500,
        comparedPairsCount: 500,
        unresolvedCount: 0
      }
    });

    expect(result.diffResults).toHaveLength(500);
    expect(result.diagnostics.p95DiffMs).toBeLessThanOrEqual(2000);
    expect(result.diagnostics.durationMs).toBeLessThan(60000);
  });
});
