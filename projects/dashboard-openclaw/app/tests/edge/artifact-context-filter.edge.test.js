import { describe, expect, it } from 'vitest';
import { applyArtifactContextFilters } from '../../src/artifact-context-filter.js';

const ALLOWLIST_ROOT =
  '/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts';

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
      durationMs: 4,
      p95SearchMs: 1,
      sourceReasonCode: 'OK'
    },
    results,
    appliedFilters: {},
    correctiveActions: []
  };
}

describe('artifact-context-filter edge cases', () => {
  it('fails closed on non-object inputs', () => {
    const samples = [undefined, null, true, 42, 'S018', []];

    for (const sample of samples) {
      const result = applyArtifactContextFilters(sample);

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_ARTIFACT_CONTEXT_FILTER_INPUT',
        diagnostics: {
          requestedCount: 0,
          filteredCount: 0,
          filteredOutCount: 0,
          diffCandidateGroupsCount: 0
        },
        filteredResults: [],
        diffCandidates: [],
        correctiveActions: []
      });
    }
  });

  it('rejects unknown filters keys and invalid filter payloads', () => {
    const invalidType = applyArtifactContextFilters({
      filters: 'bad',
      searchResult: buildSearchResult([])
    });

    expect(invalidType.reasonCode).toBe('INVALID_ARTIFACT_CONTEXT_FILTER_INPUT');

    const unknownFilter = applyArtifactContextFilters({
      filters: {
        unknown: 'value'
      },
      searchResult: buildSearchResult([])
    });

    expect(unknownFilter.reasonCode).toBe('INVALID_ARTIFACT_CONTEXT_FILTER_INPUT');
    expect(unknownFilter.reason).toContain('clés non supportées');

    const emptyArray = applyArtifactContextFilters({
      filters: {
        phase: []
      },
      searchResult: buildSearchResult([])
    });

    expect(emptyArray.reasonCode).toBe('INVALID_ARTIFACT_CONTEXT_FILTER_INPUT');
    expect(emptyArray.reason).toContain('non vide');

    const invalidAgent = applyArtifactContextFilters({
      filters: {
        agent: [undefined]
      },
      searchResult: buildSearchResult([])
    });

    expect(invalidAgent.reasonCode).toBe('INVALID_ARTIFACT_CONTEXT_FILTER_INPUT');

    const invalidGate = applyArtifactContextFilters({
      filters: {
        gate: ['']
      },
      searchResult: buildSearchResult([])
    });

    expect(invalidGate.reasonCode).toBe('INVALID_ARTIFACT_CONTEXT_FILTER_INPUT');

    const invalidOwner = applyArtifactContextFilters({
      filters: {
        owner: ['  ']
      },
      searchResult: buildSearchResult([])
    });

    expect(invalidOwner.reasonCode).toBe('INVALID_ARTIFACT_CONTEXT_FILTER_INPUT');

    const invalidRiskLevel = applyArtifactContextFilters({
      filters: {
        riskLevel: [null]
      },
      searchResult: buildSearchResult([])
    });

    expect(invalidRiskLevel.reasonCode).toBe('INVALID_ARTIFACT_CONTEXT_FILTER_INPUT');
  });

  it('rejects invalid date filters and invalid date ranges', () => {
    const invalidDateFrom = applyArtifactContextFilters({
      filters: {
        dateFrom: 'not-a-date'
      },
      searchResult: buildSearchResult([])
    });

    expect(invalidDateFrom.reasonCode).toBe('INVALID_ARTIFACT_CONTEXT_FILTER_INPUT');

    const invalidDateTo = applyArtifactContextFilters({
      filters: {
        dateTo: ''
      },
      searchResult: buildSearchResult([])
    });

    expect(invalidDateTo.reasonCode).toBe('INVALID_ARTIFACT_CONTEXT_FILTER_INPUT');

    const invalidRange = applyArtifactContextFilters({
      filters: {
        dateFrom: '2026-02-23T00:00:00.000Z',
        dateTo: '2026-02-22T00:00:00.000Z'
      },
      searchResult: buildSearchResult([])
    });

    expect(invalidRange.reasonCode).toBe('INVALID_ARTIFACT_CONTEXT_FILTER_INPUT');
    expect(invalidRange.reason).toContain('antérieure ou égale');
  });

  it('rejects invalid pagination values', () => {
    const invalidType = applyArtifactContextFilters({
      pagination: 'bad',
      searchResult: buildSearchResult([])
    });

    expect(invalidType.reasonCode).toBe('INVALID_ARTIFACT_CONTEXT_FILTER_INPUT');

    const invalidOffset = applyArtifactContextFilters({
      pagination: {
        offset: -1,
        limit: 10
      },
      searchResult: buildSearchResult([])
    });

    expect(invalidOffset.reasonCode).toBe('INVALID_ARTIFACT_CONTEXT_FILTER_INPUT');

    const invalidLimit = applyArtifactContextFilters({
      pagination: {
        offset: 0,
        limit: 1000
      },
      searchResult: buildSearchResult([])
    });

    expect(invalidLimit.reasonCode).toBe('INVALID_ARTIFACT_CONTEXT_FILTER_INPUT');

    const defaultsFromPartialPagination = applyArtifactContextFilters({
      pagination: {
        offset: 0
      },
      searchResult: buildSearchResult([
        {
          artifactPath: `${ALLOWLIST_ROOT}/partial-pagination.md`,
          score: 1
        }
      ])
    });

    expect(defaultsFromPartialPagination).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      appliedFilters: {
        offset: 0,
        limit: 50
      }
    });

    const defaultsFromOffsetFallback = applyArtifactContextFilters({
      pagination: {
        limit: 1
      },
      searchResult: buildSearchResult([
        {
          artifactPath: `${ALLOWLIST_ROOT}/partial-pagination-2.md`,
          score: 1
        }
      ])
    });

    expect(defaultsFromOffsetFallback.appliedFilters).toMatchObject({
      offset: 0,
      limit: 1
    });
  });

  it('rejects missing source and invalid searchResult payloads', () => {
    const missingSource = applyArtifactContextFilters({
      filters: {
        phase: 'implementation'
      }
    });

    expect(missingSource.reasonCode).toBe('INVALID_ARTIFACT_CONTEXT_FILTER_INPUT');
    expect(missingSource.reason).toContain('Aucune source exploitable');

    const invalidSearchResult = applyArtifactContextFilters({
      searchResult: 'bad'
    });

    expect(invalidSearchResult.reasonCode).toBe('INVALID_ARTIFACT_CONTEXT_FILTER_INPUT');

    const invalidAllowed = applyArtifactContextFilters({
      searchResult: {
        reasonCode: 'OK',
        results: []
      }
    });

    expect(invalidAllowed.reasonCode).toBe('INVALID_ARTIFACT_CONTEXT_FILTER_INPUT');

    const invalidReasonCode = applyArtifactContextFilters({
      searchResult: {
        allowed: true,
        reasonCode: 'NOT_ALLOWED',
        results: []
      }
    });

    expect(invalidReasonCode.reasonCode).toBe('INVALID_ARTIFACT_CONTEXT_FILTER_INPUT');

    const emptyReasonCode = applyArtifactContextFilters({
      searchResult: {
        allowed: true,
        reasonCode: '   ',
        results: []
      }
    });

    expect(emptyReasonCode.reasonCode).toBe('INVALID_ARTIFACT_CONTEXT_FILTER_INPUT');
    expect(emptyReasonCode.reason).toContain('vide');
  });

  it('rejects invalid blocked reason codes and unsupported searchResult shapes', () => {
    const nonPropagableBlocked = applyArtifactContextFilters({
      searchResult: {
        allowed: false,
        reasonCode: 'INVALID_ARTIFACT_CONTEXT_FILTER_INPUT',
        reason: 'bad upstream'
      }
    });

    expect(nonPropagableBlocked.reasonCode).toBe('INVALID_ARTIFACT_CONTEXT_FILTER_INPUT');

    const missingResults = applyArtifactContextFilters({
      searchResult: {
        allowed: true,
        reasonCode: 'OK'
      }
    });

    expect(missingResults.reasonCode).toBe('INVALID_ARTIFACT_CONTEXT_FILTER_INPUT');

    const invalidResultsType = applyArtifactContextFilters({
      searchResult: {
        allowed: true,
        reasonCode: 'OK',
        results: 'bad'
      }
    });

    expect(invalidResultsType.reasonCode).toBe('INVALID_ARTIFACT_CONTEXT_FILTER_INPUT');
  });

  it('validates result entries for artifactPath/score/date', () => {
    const missingPath = applyArtifactContextFilters({
      searchResult: buildSearchResult([
        {
          score: 1
        }
      ])
    });

    expect(missingPath.reasonCode).toBe('INVALID_ARTIFACT_CONTEXT_FILTER_INPUT');

    const invalidScore = applyArtifactContextFilters({
      searchResult: buildSearchResult([
        {
          artifactPath: `${ALLOWLIST_ROOT}/a.md`,
          score: 'bad'
        }
      ])
    });

    expect(invalidScore.reasonCode).toBe('INVALID_ARTIFACT_CONTEXT_FILTER_INPUT');

    const invalidDate = applyArtifactContextFilters({
      searchResult: buildSearchResult([
        {
          artifactPath: `${ALLOWLIST_ROOT}/a.md`,
          score: 1,
          date: 'not-a-date'
        }
      ])
    });

    expect(invalidDate.reasonCode).toBe('INVALID_ARTIFACT_CONTEXT_FILTER_INPUT');
  });

  it('excludes entries without date when date filter is active', () => {
    const result = applyArtifactContextFilters({
      filters: {
        dateFrom: '2026-02-20T00:00:00.000Z'
      },
      searchResult: buildSearchResult([
        {
          artifactPath: `${ALLOWLIST_ROOT}/with-date.md`,
          score: 10,
          date: '2026-02-21T00:00:00.000Z'
        },
        {
          artifactPath: `${ALLOWLIST_ROOT}/without-date.md`,
          score: 9
        }
      ])
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        filteredCount: 1,
        filteredOutCount: 1
      }
    });
  });

  it('covers contextual mismatch branches for agent/gate/owner/risk/dateFrom/dateTo', () => {
    const baseSearchResult = buildSearchResult([
      {
        artifactPath: `${ALLOWLIST_ROOT}/mismatch.md`,
        score: 10,
        phase: 'implementation',
        agent: 'dev',
        gate: 'g4-t',
        owner: 'team-a',
        riskLevel: 'medium',
        date: '2026-02-21T10:00:00.000Z'
      }
    ]);

    const scenarios = [
      { filters: { agent: 'qa' } },
      { filters: { gate: 'g2' } },
      { filters: { owner: 'team-b' } },
      { filters: { riskLevel: 'high' } },
      { filters: { dateFrom: '2026-02-22T00:00:00.000Z' } },
      { filters: { dateTo: '2026-02-20T00:00:00.000Z' } }
    ];

    for (const scenario of scenarios) {
      const result = applyArtifactContextFilters({
        filters: scenario.filters,
        searchResult: baseSearchResult
      });

      expect(result).toMatchObject({
        allowed: true,
        reasonCode: 'OK',
        diagnostics: {
          filteredCount: 0,
          filteredOutCount: 1
        }
      });
    }
  });

  it('normalizes contextual filters and deduplicates values', () => {
    const result = applyArtifactContextFilters({
      filters: {
        phase: ['Implementation', 'implementation'],
        agent: ['DEV', 'dev']
      },
      searchResult: buildSearchResult([
        {
          artifactPath: `${ALLOWLIST_ROOT}/ok.md`,
          score: 10,
          phase: 'implementation',
          agent: 'dev'
        }
      ])
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      appliedFilters: {
        phase: ['implementation'],
        agent: ['dev']
      },
      diagnostics: {
        filteredCount: 1
      }
    });
  });

  it('builds diff candidates from explicit group keys and path/type fallbacks', () => {
    const result = applyArtifactContextFilters({
      searchResult: buildSearchResult([
        {
          artifactPath: `${ALLOWLIST_ROOT}/reports/a-v1.md`,
          artifactType: 'prd',
          score: 5,
          groupKey: 'Group A',
          artifactId: 'doc-a-v1'
        },
        {
          artifactPath: `${ALLOWLIST_ROOT}/reports/a-v2.md`,
          artifactType: 'prd',
          score: 4,
          groupKey: 'group a',
          artifactId: 'doc-a-v2'
        },
        {
          artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
          artifactType: 'epics',
          score: 3
        },
        {
          artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v2.md`,
          artifactType: 'epics',
          score: 2
        },
        {
          artifactPath: `${ALLOWLIST_ROOT}/reports/---.md`,
          artifactType: '',
          score: 1,
          artifactId: 'fallback-1'
        },
        {
          artifactPath: `${ALLOWLIST_ROOT}/reports/___.md`,
          artifactType: '',
          score: 1,
          artifactId: 'fallback-2'
        }
      ])
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        diffCandidateGroupsCount: 3
      },
      correctiveActions: ['RUN_ARTIFACT_DIFF']
    });

    expect(result.diffCandidates.map((entry) => entry.groupKey)).toEqual([
      'artifact:artifact',
      'epics:rollout',
      'group-a'
    ]);
    expect(result.diffCandidates[2].artifactIds).toEqual(['doc-a-v1', 'doc-a-v2']);
  });

  it('uses corrective action normalization and fallback mapping for blocked payloads', () => {
    const normalizedActions = applyArtifactContextFilters({
      searchResult: {
        allowed: false,
        reasonCode: 'ARTIFACT_PARSE_FAILED',
        reason: 'parse ko',
        diagnostics: {
          requestedCount: 3
        },
        correctiveActions: [' ', 'FIX_ARTIFACT_SYNTAX', 'FIX_ARTIFACT_SYNTAX']
      }
    });

    expect(normalizedActions).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_PARSE_FAILED',
      correctiveActions: ['FIX_ARTIFACT_SYNTAX']
    });

    const fallbackActions = applyArtifactContextFilters({
      searchResult: {
        allowed: false,
        reasonCode: 'ARTIFACT_PARSE_FAILED',
        reason: 'parse ko',
        diagnostics: {
          requestedCount: 3
        },
        correctiveActions: [' ', '  ']
      }
    });

    expect(fallbackActions.correctiveActions).toEqual(['FIX_ARTIFACT_SYNTAX']);

    const blockedInvalidSearchInput = applyArtifactContextFilters({
      searchResult: {
        allowed: false,
        reasonCode: 'INVALID_ARTIFACT_SEARCH_INPUT',
        reason: 'bad query',
        diagnostics: {
          requestedCount: 0
        }
      }
    });

    expect(blockedInvalidSearchInput.correctiveActions).toEqual(['FIX_SEARCH_INPUT']);
  });

  it('accepts non-object runtime options and handles non-monotonic/NaN timings safely', () => {
    const nowValues = [NaN, 90, 80, 70, 60, 50, 40, 30, 20, 10];

    const result = applyArtifactContextFilters(
      {
        searchResult: buildSearchResult([
          {
            artifactPath: `${ALLOWLIST_ROOT}/a.md`,
            score: 1
          }
        ])
      },
      {
        nowMs: () => nowValues.shift() ?? NaN
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK'
    });

    expect(result.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.diagnostics.p95FilterMs).toBeGreaterThanOrEqual(0);

    const emptySourceWithNonObjectOptions = applyArtifactContextFilters(
      {
        searchResult: buildSearchResult([])
      },
      'non-object-options'
    );

    expect(emptySourceWithNonObjectOptions).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 0,
        filteredCount: 0,
        filteredOutCount: 0,
        p95FilterMs: 0
      }
    });
  });

  it('does not mutate input payload and runtime options', () => {
    const input = {
      filters: {
        phase: ['implementation'],
        owner: ['team-a']
      },
      pagination: {
        offset: 0,
        limit: 10
      },
      searchResult: buildSearchResult([
        {
          artifactPath: `${ALLOWLIST_ROOT}/a.md`,
          score: 4,
          phase: 'implementation',
          owner: 'team-a'
        }
      ])
    };

    const nowMs = () => Date.now();
    const options = {
      searchOptions: {
        nowMs
      }
    };

    const inputSnapshot = JSON.parse(JSON.stringify(input));
    const optionsSnapshot = {
      searchOptions: {
        nowMs: options.searchOptions.nowMs
      }
    };

    applyArtifactContextFilters(input, options);

    expect(input).toEqual(inputSnapshot);
    expect(options).toEqual(optionsSnapshot);
  });

  it('delegates with searchOptions passthrough and returns success payload', () => {
    const docs = [
      {
        artifactPath: `${ALLOWLIST_ROOT}/delegated.md`,
        artifactType: 'prd',
        content: 'gate and owner team-a',
        phase: 'implementation',
        owner: 'team-a'
      }
    ];

    const result = applyArtifactContextFilters(
      {
        filters: {
          phase: 'implementation',
          owner: 'team-a'
        },
        searchInput: {
          query: 'gate',
          searchIndex: docs
        }
      },
      {
        searchOptions: {
          nowMs: () => Date.now()
        }
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        filteredCount: 1,
        sourceReasonCode: 'OK'
      }
    });
  });
});
