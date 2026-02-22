import { describe, expect, it } from 'vitest';
import { applyArtifactContextFilters } from '../../src/artifact-context-filter.js';
import {
  applyArtifactContextFilters as applyFromIndex,
  searchArtifactsFullText
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
  'INVALID_ARTIFACT_CONTEXT_FILTER_INPUT'
]);

function buildSearchResult(results) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Recherche full-text exécutée.',
    diagnostics: {
      requestedCount: results.length,
      indexedCount: results.length,
      matchedCount: results.length,
      filteredOutCount: 0,
      durationMs: 3,
      p95SearchMs: 1,
      sourceReasonCode: 'OK'
    },
    results,
    appliedFilters: {
      artifactTypes: [],
      phase: [],
      agent: [],
      gate: [],
      owner: [],
      riskLevel: [],
      dateFrom: null,
      dateTo: null,
      offset: 0,
      limit: 50
    },
    correctiveActions: []
  };
}

describe('artifact-context-filter unit', () => {
  it('filters nominally with deterministic ordering and coherent diagnostics', () => {
    const result = applyArtifactContextFilters({
      filters: {
        phase: 'implementation',
        owner: 'team-a'
      },
      searchResult: buildSearchResult([
        {
          artifactPath: `${ALLOWLIST_ROOT}/reports/prd-v2.md`,
          artifactType: 'prd',
          score: 20,
          snippet: 'Gate impl v2',
          matchedFields: ['content'],
          phase: 'implementation',
          owner: 'team-a',
          agent: 'dev',
          gate: 'g4-t',
          riskLevel: 'high',
          date: '2026-02-22T10:00:00.000Z'
        },
        {
          artifactPath: `${ALLOWLIST_ROOT}/reports/prd-v1.md`,
          artifactType: 'prd',
          score: 20,
          snippet: 'Gate impl v1',
          matchedFields: ['content'],
          phase: 'implementation',
          owner: 'team-a',
          agent: 'dev',
          gate: 'g4-t',
          riskLevel: 'high',
          date: '2026-02-21T10:00:00.000Z'
        },
        {
          artifactPath: `${ALLOWLIST_ROOT}/reports/architecture.md`,
          artifactType: 'architecture',
          score: 55,
          snippet: 'Planning only',
          matchedFields: ['content'],
          phase: 'planning',
          owner: 'team-a',
          agent: 'pm',
          gate: 'g2',
          riskLevel: 'low',
          date: '2026-02-20T10:00:00.000Z'
        }
      ])
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 3,
        filteredCount: 2,
        filteredOutCount: 1,
        diffCandidateGroupsCount: 1,
        sourceReasonCode: 'OK'
      },
      appliedFilters: {
        phase: ['implementation'],
        owner: ['team-a'],
        offset: 0,
        limit: 50
      },
      correctiveActions: ['RUN_ARTIFACT_DIFF']
    });

    expect(result.filteredResults).toHaveLength(2);
    expect(result.filteredResults.map((entry) => entry.artifactPath)).toEqual([
      `${ALLOWLIST_ROOT}/reports/prd-v1.md`,
      `${ALLOWLIST_ROOT}/reports/prd-v2.md`
    ]);

    expect(result.diffCandidates).toHaveLength(1);
    expect(result.diffCandidates[0]).toMatchObject({
      groupKey: 'prd:prd',
      recommendedAction: 'RUN_ARTIFACT_DIFF'
    });
  });

  it('supports full contextual intersection including date range', () => {
    const result = applyArtifactContextFilters({
      filters: {
        phase: 'implementation',
        agent: 'dev',
        gate: 'g4-t',
        owner: 'team-a',
        riskLevel: 'high',
        dateFrom: '2026-02-21T00:00:00.000Z',
        dateTo: '2026-02-21T23:59:59.999Z'
      },
      searchResult: buildSearchResult([
        {
          artifactPath: `${ALLOWLIST_ROOT}/reports/evidence-1.md`,
          artifactType: 'epics',
          score: 45,
          snippet: 'target',
          matchedFields: ['content'],
          phase: 'implementation',
          agent: 'dev',
          gate: 'g4-t',
          owner: 'team-a',
          riskLevel: 'high',
          date: '2026-02-21T08:00:00.000Z'
        },
        {
          artifactPath: `${ALLOWLIST_ROOT}/reports/evidence-2.md`,
          artifactType: 'epics',
          score: 40,
          snippet: 'excluded by date',
          matchedFields: ['content'],
          phase: 'implementation',
          agent: 'dev',
          gate: 'g4-t',
          owner: 'team-a',
          riskLevel: 'high',
          date: '2026-02-23T08:00:00.000Z'
        }
      ])
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        filteredCount: 1,
        filteredOutCount: 1
      },
      appliedFilters: {
        phase: ['implementation'],
        agent: ['dev'],
        gate: ['g4-t'],
        owner: ['team-a'],
        riskLevel: ['high'],
        dateFrom: '2026-02-21T00:00:00.000Z',
        dateTo: '2026-02-21T23:59:59.999Z'
      }
    });

    expect(result.filteredResults).toHaveLength(1);
    expect(result.filteredResults[0].artifactPath).toContain('evidence-1.md');
  });

  it('returns allowed=true with empty filtered results when filters exclude all entries', () => {
    const result = applyArtifactContextFilters({
      filters: {
        phase: 'analysis'
      },
      searchResult: buildSearchResult([
        {
          artifactPath: `${ALLOWLIST_ROOT}/reports/prd.md`,
          artifactType: 'prd',
          score: 5,
          snippet: 'planning',
          matchedFields: ['content'],
          phase: 'planning',
          agent: 'pm',
          gate: 'g2',
          owner: 'product',
          riskLevel: 'low'
        }
      ])
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 1,
        filteredCount: 0,
        filteredOutCount: 1,
        diffCandidateGroupsCount: 0
      },
      filteredResults: [],
      diffCandidates: [],
      correctiveActions: []
    });
    expect(result.reason).toContain('aucun résultat');
  });

  it('uses searchResult when both searchResult and searchInput are provided', () => {
    const result = applyArtifactContextFilters({
      searchResult: buildSearchResult([
        {
          artifactPath: `${ALLOWLIST_ROOT}/reports/priority.md`,
          artifactType: 'prd',
          score: 12,
          snippet: 'priority source',
          matchedFields: ['content'],
          phase: 'implementation',
          agent: 'dev',
          gate: 'g4-t',
          owner: 'team-a',
          riskLevel: 'medium'
        }
      ]),
      searchInput: {
        query: '   ',
        searchIndex: []
      }
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 1,
        filteredCount: 1,
        sourceReasonCode: 'OK'
      }
    });
    expect(result.filteredResults[0].artifactPath).toContain('priority.md');
  });

  it('delegates to S017 when searchInput is provided', () => {
    const result = applyArtifactContextFilters({
      filters: {
        phase: 'implementation'
      },
      searchInput: {
        query: 'gate',
        searchIndex: [
          {
            artifactPath: `${ALLOWLIST_ROOT}/reports/source-a.md`,
            artifactType: 'prd',
            content: 'gate implementation',
            phase: 'implementation',
            agent: 'dev',
            gate: 'g4-t',
            owner: 'team-a',
            riskLevel: 'high',
            date: '2026-02-22T00:00:00.000Z'
          }
        ]
      }
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 1,
        filteredCount: 1,
        sourceReasonCode: 'OK'
      }
    });
  });

  it('propagates strict blocking reason codes from upstream search result', () => {
    const result = applyArtifactContextFilters({
      searchResult: {
        allowed: false,
        reasonCode: 'ARTIFACT_TABLES_MISSING',
        reason: 'Aucun tableau markdown exploitable.',
        diagnostics: {
          requestedCount: 2,
          sourceReasonCode: 'ARTIFACT_TABLES_MISSING'
        },
        correctiveActions: ['ADD_MARKDOWN_TABLES']
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_TABLES_MISSING',
      reason: 'Aucun tableau markdown exploitable.',
      diagnostics: {
        requestedCount: 2,
        filteredCount: 0,
        filteredOutCount: 0,
        diffCandidateGroupsCount: 0,
        sourceReasonCode: 'ARTIFACT_TABLES_MISSING'
      },
      correctiveActions: ['ADD_MARKDOWN_TABLES']
    });
  });

  it('propagates INVALID_ARTIFACT_SEARCH_INPUT from delegated S017 source', () => {
    const result = applyArtifactContextFilters({
      searchInput: {
        query: '   ',
        searchIndex: []
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_ARTIFACT_SEARCH_INPUT',
      diagnostics: {
        sourceReasonCode: 'INVALID_ARTIFACT_SEARCH_INPUT'
      }
    });
  });

  it('keeps stable output contract and public index export', () => {
    const result = applyFromIndex({
      searchResult: buildSearchResult([
        {
          artifactPath: `${ALLOWLIST_ROOT}/reports/prd.md`,
          artifactType: 'prd',
          score: 12,
          snippet: 'gate',
          matchedFields: ['content'],
          phase: 'implementation',
          agent: 'dev',
          gate: 'g4-t',
          owner: 'team-a',
          riskLevel: 'high',
          date: '2026-02-22T00:00:00.000Z'
        }
      ])
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('filteredResults');
    expect(result).toHaveProperty('appliedFilters');
    expect(result).toHaveProperty('diffCandidates');
    expect(result).toHaveProperty('correctiveActions');

    expect(typeof result.allowed).toBe('boolean');
    expect(REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(typeof result.reason).toBe('string');

    expect(result.diagnostics).toHaveProperty('requestedCount');
    expect(result.diagnostics).toHaveProperty('filteredCount');
    expect(result.diagnostics).toHaveProperty('filteredOutCount');
    expect(result.diagnostics).toHaveProperty('diffCandidateGroupsCount');
    expect(result.diagnostics).toHaveProperty('durationMs');
    expect(result.diagnostics).toHaveProperty('p95FilterMs');
    expect(result.diagnostics).toHaveProperty('sourceReasonCode');

    expect(Array.isArray(result.filteredResults)).toBe(true);
    expect(isObjectLike(result.appliedFilters)).toBe(true);
    expect(Array.isArray(result.diffCandidates)).toBe(true);
    expect(Array.isArray(result.correctiveActions)).toBe(true);

    const rawSearch = searchArtifactsFullText({
      query: 'gate',
      searchIndex: [
        {
          artifactPath: `${ALLOWLIST_ROOT}/reports/check.md`,
          artifactType: 'prd',
          content: 'gate ready'
        }
      ]
    });

    expect(rawSearch.reasonCode).toBe('OK');
  });

  it('meets performance threshold on synthetic corpus of 500 docs', () => {
    const results = Array.from({ length: 500 }, (_, index) => ({
      artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v${index % 4}-${index}.md`,
      artifactType: 'prd',
      score: 1000 - index,
      snippet: `gate ${index}`,
      matchedFields: ['content'],
      phase: 'implementation',
      agent: 'dev',
      gate: 'g4-t',
      owner: index % 2 === 0 ? 'team-a' : 'team-b',
      riskLevel: index % 3 === 0 ? 'high' : 'medium',
      date: '2026-02-22T00:00:00.000Z'
    }));

    const result = applyArtifactContextFilters({
      filters: {
        phase: 'implementation'
      },
      searchResult: buildSearchResult(results)
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 500,
        filteredCount: 500,
        filteredOutCount: 0
      }
    });

    expect(result.filteredResults.length).toBeGreaterThan(0);
    expect(result.diagnostics.p95FilterMs).toBeLessThanOrEqual(5000);
    expect(result.diagnostics.durationMs).toBeLessThan(60000);
  });

  it('supports pagination while keeping filteredCount global', () => {
    const result = applyArtifactContextFilters({
      pagination: {
        offset: 1,
        limit: 1
      },
      searchResult: buildSearchResult([
        {
          artifactPath: `${ALLOWLIST_ROOT}/reports/a.md`,
          artifactType: 'prd',
          score: 30,
          snippet: 'a',
          matchedFields: ['content']
        },
        {
          artifactPath: `${ALLOWLIST_ROOT}/reports/b.md`,
          artifactType: 'prd',
          score: 20,
          snippet: 'b',
          matchedFields: ['content']
        },
        {
          artifactPath: `${ALLOWLIST_ROOT}/reports/c.md`,
          artifactType: 'prd',
          score: 10,
          snippet: 'c',
          matchedFields: ['content']
        }
      ])
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 3,
        filteredCount: 3,
        filteredOutCount: 0
      },
      appliedFilters: {
        offset: 1,
        limit: 1
      }
    });

    expect(result.filteredResults).toHaveLength(1);
    expect(result.filteredResults[0].artifactPath).toContain('/reports/b.md');
  });
});

function isObjectLike(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
