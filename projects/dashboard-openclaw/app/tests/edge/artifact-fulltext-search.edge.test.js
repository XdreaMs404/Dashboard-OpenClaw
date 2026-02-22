import { describe, expect, it } from 'vitest';
import { searchArtifactsFullText } from '../../src/artifact-fulltext-search.js';

const ALLOWLIST_ROOT =
  '/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts';

function markdownTable({ headers, rows }) {
  const headerLine = `| ${headers.join(' | ')} |`;
  const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const rowsLines = rows.map((row) => `| ${row.join(' | ')} |`).join('\n');

  return `${headerLine}\n${separatorLine}\n${rowsLines}`;
}

function markdownWithMetadata({ sections = ['## Contexte', '### Details'], tables = [] } = {}) {
  const tablesBlock = tables.map((table) => markdownTable(table)).join('\n\n');

  return `---\nstepsCompleted:\n  - H01\ninputDocuments:\n  - brief.md\n---\n${sections.join('\n')}\n${tablesBlock}`;
}

describe('artifact-fulltext-search edge cases', () => {
  it('fails closed on non-object input payloads', () => {
    const samples = [undefined, null, true, 42, 'S015'];

    for (const sample of samples) {
      const result = searchArtifactsFullText(sample);

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_ARTIFACT_SEARCH_INPUT',
        diagnostics: {
          requestedCount: 0,
          indexedCount: 0,
          matchedCount: 0,
          filteredOutCount: 0
        },
        results: [],
        correctiveActions: []
      });
    }
  });

  it('rejects unsupported filter keys and invalid filter values', () => {
    const unknownFilter = searchArtifactsFullText({
      query: 'gate',
      filters: {
        unknown: 'value'
      },
      searchIndex: []
    });

    expect(unknownFilter.reasonCode).toBe('INVALID_ARTIFACT_SEARCH_INPUT');
    expect(unknownFilter.reason).toContain('clés non supportées');

    const invalidDate = searchArtifactsFullText({
      query: 'gate',
      filters: {
        dateFrom: 'not-a-date'
      },
      searchIndex: []
    });

    expect(invalidDate.reasonCode).toBe('INVALID_ARTIFACT_SEARCH_INPUT');
    expect(invalidDate.reason).toContain('filters.dateFrom invalide');

    const invalidRange = searchArtifactsFullText({
      query: 'gate',
      filters: {
        dateFrom: '2026-02-23T00:00:00.000Z',
        dateTo: '2026-02-20T00:00:00.000Z'
      },
      searchIndex: []
    });

    expect(invalidRange.reasonCode).toBe('INVALID_ARTIFACT_SEARCH_INPUT');
    expect(invalidRange.reason).toContain('antérieure ou égale');
  });

  it('rejects invalid query tokenization constraints', () => {
    const tooManyTokens = searchArtifactsFullText({
      query: Array.from({ length: 40 }, (_, index) => `tok${index}`).join(' '),
      searchIndex: []
    });

    expect(tooManyTokens.reasonCode).toBe('INVALID_ARTIFACT_SEARCH_INPUT');
    expect(tooManyTokens.reason).toContain('maximum');

    const tooLongToken = searchArtifactsFullText({
      query: `ok ${'a'.repeat(80)}`,
      searchIndex: []
    });

    expect(tooLongToken.reasonCode).toBe('INVALID_ARTIFACT_SEARCH_INPUT');
    expect(tooLongToken.reason).toContain('token trop long');
  });

  it('rejects invalid pagination values', () => {
    const invalidType = searchArtifactsFullText({
      query: 'gate',
      pagination: 'bad',
      searchIndex: []
    });

    expect(invalidType.reasonCode).toBe('INVALID_ARTIFACT_SEARCH_INPUT');

    const invalidOffset = searchArtifactsFullText({
      query: 'gate',
      pagination: {
        offset: 1.2,
        limit: 10
      },
      searchIndex: []
    });

    expect(invalidOffset.reasonCode).toBe('INVALID_ARTIFACT_SEARCH_INPUT');
    expect(invalidOffset.reason).toContain('pagination.offset invalide');

    const invalidLimit = searchArtifactsFullText({
      query: 'gate',
      pagination: {
        offset: 0,
        limit: 9999
      },
      searchIndex: []
    });

    expect(invalidLimit.reasonCode).toBe('INVALID_ARTIFACT_SEARCH_INPUT');
    expect(invalidLimit.reason).toContain('pagination.limit invalide');
  });

  it('rejects missing source and invalid searchIndex shapes', () => {
    const missingSource = searchArtifactsFullText({
      query: 'gate'
    });

    expect(missingSource.reasonCode).toBe('INVALID_ARTIFACT_SEARCH_INPUT');
    expect(missingSource.reason).toContain('Aucune source exploitable');

    const invalidSearchIndex = searchArtifactsFullText({
      query: 'gate',
      searchIndex: 'invalid'
    });

    expect(invalidSearchIndex.reasonCode).toBe('INVALID_ARTIFACT_SEARCH_INPUT');
    expect(invalidSearchIndex.reason).toContain('searchIndex invalide');

    const invalidEntry = searchArtifactsFullText({
      query: 'gate',
      searchIndex: [null]
    });

    expect(invalidEntry.reasonCode).toBe('INVALID_ARTIFACT_SEARCH_INPUT');
    expect(invalidEntry.reason).toContain('searchIndex[0] invalide');
  });

  it('accepts searchIndex object payload through entries/documents aliases', () => {
    const resultEntries = searchArtifactsFullText({
      query: 'gate',
      searchIndex: {
        entries: [
          {
            path: `${ALLOWLIST_ROOT}/prd.md`,
            artifactType: 'prd',
            content: 'gate from entries'
          }
        ]
      }
    });

    expect(resultEntries).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 1,
        indexedCount: 1,
        matchedCount: 1
      }
    });

    const resultDocuments = searchArtifactsFullText({
      query: 'gate',
      searchIndex: {
        documents: [
          {
            filePath: `${ALLOWLIST_ROOT}/architecture.md`,
            artifactType: 'architecture',
            content: 'gate from documents'
          }
        ]
      }
    });

    expect(resultDocuments).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 1,
        indexedCount: 1,
        matchedCount: 1
      }
    });
  });

  it('validates searchIndex entry shape for artifactPath/content/sections/tables/date', () => {
    const missingPath = searchArtifactsFullText({
      query: 'gate',
      searchIndex: [
        {
          artifactType: 'prd',
          content: 'gate'
        }
      ]
    });

    expect(missingPath.reasonCode).toBe('INVALID_ARTIFACT_SEARCH_INPUT');

    const invalidContent = searchArtifactsFullText({
      query: 'gate',
      searchIndex: [
        {
          artifactPath: `${ALLOWLIST_ROOT}/prd.md`,
          artifactType: 'prd',
          content: {
            text: 'bad'
          }
        }
      ]
    });

    expect(invalidContent.reasonCode).toBe('INVALID_ARTIFACT_SEARCH_INPUT');
    expect(invalidContent.reason).toContain('content invalide');

    const invalidSections = searchArtifactsFullText({
      query: 'gate',
      searchIndex: [
        {
          artifactPath: `${ALLOWLIST_ROOT}/prd.md`,
          artifactType: 'prd',
          content: 'gate',
          sections: 'bad'
        }
      ]
    });

    expect(invalidSections.reasonCode).toBe('INVALID_ARTIFACT_SEARCH_INPUT');

    const invalidTables = searchArtifactsFullText({
      query: 'gate',
      searchIndex: [
        {
          artifactPath: `${ALLOWLIST_ROOT}/prd.md`,
          artifactType: 'prd',
          content: 'gate',
          tables: 'bad'
        }
      ]
    });

    expect(invalidTables.reasonCode).toBe('INVALID_ARTIFACT_SEARCH_INPUT');

    const invalidDate = searchArtifactsFullText({
      query: 'gate',
      searchIndex: [
        {
          artifactPath: `${ALLOWLIST_ROOT}/prd.md`,
          artifactType: 'prd',
          content: 'gate',
          date: 'invalid-date'
        }
      ]
    });

    expect(invalidDate.reasonCode).toBe('INVALID_ARTIFACT_SEARCH_INPUT');
  });

  it('handles empty/invalid section and table entries gracefully for scoring', () => {
    const result = searchArtifactsFullText({
      query: 'latence',
      searchIndex: [
        {
          artifactPath: `${ALLOWLIST_ROOT}/architecture.md`,
          artifactType: 'architecture',
          content: 'latence principale',
          sections: [null, '', { headingText: 'Latence section' }, { title: 'Perf' }],
          tables: [
            null,
            '',
            {
              headers: ['KPI', 'Valeur'],
              rows: [['latence', '120ms']],
              sectionAnchor: 'mesures'
            }
          ]
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        matchedCount: 1
      }
    });
    expect(result.results[0].snippet).toMatch(/<mark>/i);
  });

  it('returns deterministic order on equal scores using artifactPath tie-breaker', () => {
    const result = searchArtifactsFullText({
      query: 'gate',
      searchIndex: [
        {
          artifactPath: `${ALLOWLIST_ROOT}/z.md`,
          artifactType: 'prd',
          content: 'gate'
        },
        {
          artifactPath: `${ALLOWLIST_ROOT}/a.md`,
          artifactType: 'prd',
          content: 'gate'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        matchedCount: 2
      }
    });

    expect(result.results.map((entry) => entry.artifactPath)).toEqual([
      `${ALLOWLIST_ROOT}/a.md`,
      `${ALLOWLIST_ROOT}/z.md`
    ]);
  });

  it('filters out non-eligible search documents and keeps diagnostics consistent', () => {
    const result = searchArtifactsFullText({
      query: 'gate',
      searchIndex: [
        {
          artifactPath: `${ALLOWLIST_ROOT}/eligible.md`,
          artifactType: 'prd',
          content: 'gate included',
          searchIndexEligible: true
        },
        {
          artifactPath: `${ALLOWLIST_ROOT}/not-eligible.md`,
          artifactType: 'prd',
          content: 'gate excluded',
          searchIndexEligible: false
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 2,
        indexedCount: 1,
        matchedCount: 1,
        filteredOutCount: 0
      }
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].artifactPath).toContain('eligible.md');
  });

  it('excludes documents missing date when date range filter is active', () => {
    const result = searchArtifactsFullText({
      query: 'gate',
      filters: {
        dateFrom: '2026-02-20T00:00:00.000Z'
      },
      searchIndex: [
        {
          artifactPath: `${ALLOWLIST_ROOT}/with-date.md`,
          artifactType: 'prd',
          content: 'gate included',
          date: '2026-02-21T00:00:00.000Z'
        },
        {
          artifactPath: `${ALLOWLIST_ROOT}/without-date.md`,
          artifactType: 'prd',
          content: 'gate excluded'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        matchedCount: 1,
        filteredOutCount: 1
      }
    });
  });

  it('propagates blocked reason codes from delegated S014 table index', () => {
    const result = searchArtifactsFullText({
      query: 'latence',
      tableIndexInput: {
        allowlistRoots: [ALLOWLIST_ROOT],
        artifactDocuments: [
          {
            path: `${ALLOWLIST_ROOT}/prd.md`,
            content: markdownWithMetadata({
              sections: ['## Contexte', '### Détails'],
              tables: []
            })
          }
        ]
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_TABLES_MISSING',
      diagnostics: {
        sourceReasonCode: 'ARTIFACT_TABLES_MISSING'
      }
    });
    expect(result.correctiveActions).toContain('ADD_MARKDOWN_TABLES');
  });

  it('validates tableIndexResult shape and unsupported reason propagation', () => {
    const invalidShape = searchArtifactsFullText({
      query: 'gate',
      tableIndexResult: 'bad'
    });

    expect(invalidShape.reasonCode).toBe('INVALID_ARTIFACT_SEARCH_INPUT');

    const unsupportedReason = searchArtifactsFullText({
      query: 'gate',
      tableIndexResult: {
        allowed: false,
        reasonCode: 'INVALID_TABLE_INDEX_INPUT',
        reason: 'bad upstream'
      }
    });

    expect(unsupportedReason.reasonCode).toBe('INVALID_ARTIFACT_SEARCH_INPUT');
  });

  it('supports tableIndexResult as source and searches table cells', () => {
    const result = searchArtifactsFullText({
      query: 'rollback',
      tableIndexResult: {
        allowed: true,
        reasonCode: 'OK',
        diagnostics: {
          requestedCount: 1,
          indexedCount: 1
        },
        indexedArtifacts: [
          {
            path: `${ALLOWLIST_ROOT}/architecture.md`,
            searchIndexEligible: true,
            tables: [
              {
                headers: ['Plan', 'Action'],
                rows: [['rollback', 'restore snapshot']],
                sectionAnchor: 'strategie'
              }
            ],
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
        indexedCount: 1,
        matchedCount: 1
      }
    });

    expect(result.results[0]).toMatchObject({
      artifactPath: `${ALLOWLIST_ROOT}/architecture.md`,
      artifactType: 'architecture'
    });
    expect(result.results[0].matchedFields).toContain('tables');
  });

  it('accepts non-object runtime options and non-monotonic nowMs without negative diagnostics', () => {
    const nowValues = [100, 90, NaN, 60, 50, 40, 30, 20, 10];

    const result = searchArtifactsFullText(
      {
        query: 'gate',
        searchIndex: [
          {
            artifactPath: `${ALLOWLIST_ROOT}/prd.md`,
            artifactType: 'prd',
            content: 'gate'
          }
        ]
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
    expect(result.diagnostics.p95SearchMs).toBeGreaterThanOrEqual(0);
  });

  it('does not mutate input payload and runtime options', () => {
    const input = {
      query: 'gate',
      filters: {
        artifactTypes: ['prd'],
        phase: ['implementation']
      },
      pagination: {
        offset: 0,
        limit: 10
      },
      searchIndex: [
        {
          artifactPath: `${ALLOWLIST_ROOT}/prd.md`,
          artifactType: 'prd',
          content: 'gate'
        }
      ]
    };

    const options = {
      tableIndexOptions: {
        extractedAt: '2026-02-22T00:00:00.000Z'
      }
    };

    const inputSnapshot = JSON.parse(JSON.stringify(input));
    const optionsSnapshot = JSON.parse(JSON.stringify(options));

    searchArtifactsFullText(input, options);

    expect(input).toEqual(inputSnapshot);
    expect(options).toEqual(optionsSnapshot);
  });

  it('supports tableIndexInput delegation with artifactPaths + documentReader passthrough', () => {
    const docs = new Map([
      [
        `${ALLOWLIST_ROOT}/a.md`,
        markdownWithMetadata({
          tables: [
            {
              headers: ['K', 'V'],
              rows: [['gate', 'ok']]
            }
          ]
        })
      ]
    ]);

    const result = searchArtifactsFullText(
      {
        query: 'gate',
        tableIndexInput: {
          allowlistRoots: [ALLOWLIST_ROOT],
          artifactPaths: [`${ALLOWLIST_ROOT}/a.md`]
        }
      },
      {
        tableIndexOptions: {
          documentReader: (artifactPath) => docs.get(artifactPath)
        }
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 1,
        indexedCount: 1,
        matchedCount: 1
      }
    });
  });

  it('covers extra invalid branches for query/filters/pagination parsing', () => {
    expect(
      searchArtifactsFullText({
        query: '!!!',
        searchIndex: []
      }).reasonCode
    ).toBe('INVALID_ARTIFACT_SEARCH_INPUT');

    expect(
      searchArtifactsFullText({
        query: 'gate',
        filters: 'bad',
        searchIndex: []
      }).reasonCode
    ).toBe('INVALID_ARTIFACT_SEARCH_INPUT');

    expect(
      searchArtifactsFullText({
        query: 'gate',
        filters: {
          artifactTypes: []
        },
        searchIndex: []
      }).reasonCode
    ).toBe('INVALID_ARTIFACT_SEARCH_INPUT');

    expect(
      searchArtifactsFullText({
        query: 'gate',
        filters: {
          phase: [null]
        },
        searchIndex: []
      }).reasonCode
    ).toBe('INVALID_ARTIFACT_SEARCH_INPUT');

    expect(
      searchArtifactsFullText({
        query: 'gate',
        filters: {
          artifactTypes: ['___']
        },
        searchIndex: []
      }).reasonCode
    ).toBe('INVALID_ARTIFACT_SEARCH_INPUT');

    expect(
      searchArtifactsFullText({
        query: 'gate',
        filters: {
          dateTo: ''
        },
        searchIndex: []
      }).reasonCode
    ).toBe('INVALID_ARTIFACT_SEARCH_INPUT');

    const duplicateFilters = searchArtifactsFullText({
      query: 'gate',
      filters: {
        phase: ['implementation', 'implementation']
      },
      searchIndex: [
        {
          artifactPath: `${ALLOWLIST_ROOT}/prd.md`,
          artifactType: 'prd',
          content: 'gate',
          phase: 'implementation'
        }
      ]
    });

    expect(duplicateFilters).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      appliedFilters: {
        phase: ['implementation']
      }
    });
  });

  it('covers default pagination and empty searchable corpus path', () => {
    const result = searchArtifactsFullText({
      query: 'gate',
      pagination: {},
      searchIndex: []
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 0,
        indexedCount: 0,
        matchedCount: 0,
        filteredOutCount: 0,
        p95SearchMs: 0
      },
      appliedFilters: {
        offset: 0,
        limit: 50
      }
    });
  });

  it('covers search index aliases and infer type branches', () => {
    const result = searchArtifactsFullText({
      query: 'fallback',
      searchIndex: [
        {
          filePath: `${ALLOWLIST_ROOT}/notes.markdown`,
          text: 'fallback markdown text source',
          sections: [{ anchor: 'context' }, { content: 'anchor fallback' }],
          tables: [
            'fallback raw table row',
            {
              text: 'fallback object text'
            },
            {
              snippet: 'fallback snippet'
            },
            {
              headers: [null, 'B'],
              rows: [[null, 'fallback']]
            },
            {}
          ]
        },
        {
          path: `${ALLOWLIST_ROOT}/noextension`,
          body: 'fallback from body alias'
        },
        {
          artifactPath: `${ALLOWLIST_ROOT}/empty-content.md`
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 3,
        indexedCount: 3
      }
    });

    expect(result.results.map((entry) => entry.artifactType)).toEqual(
      expect.arrayContaining(['notes', 'noextension'])
    );
  });

  it('rejects artifacts where inferred artifact type is empty', () => {
    const result = searchArtifactsFullText({
      query: 'gate',
      searchIndex: [
        {
          artifactPath: '/',
          artifactType: '',
          content: 'gate'
        }
      ]
    });

    expect(result.reasonCode).toBe('INVALID_ARTIFACT_SEARCH_INPUT');
  });

  it('covers blocked fallback reason/action and tableIndexResult validation branches', () => {
    const blockedFallback = searchArtifactsFullText({
      query: 'gate',
      tableIndexResult: {
        allowed: false,
        reasonCode: 'ARTIFACT_PARSE_FAILED'
      }
    });

    expect(blockedFallback).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_PARSE_FAILED',
      correctiveActions: ['FIX_ARTIFACT_SYNTAX']
    });
    expect(blockedFallback.reason).toContain('Indexation amont bloquée');

    const missingIndexedArtifacts = searchArtifactsFullText({
      query: 'gate',
      tableIndexResult: {
        allowed: true,
        reasonCode: 'OK'
      }
    });

    expect(missingIndexedArtifacts.reasonCode).toBe('INVALID_ARTIFACT_SEARCH_INPUT');

    const invalidIndexedArtifact = searchArtifactsFullText({
      query: 'gate',
      tableIndexResult: {
        allowed: true,
        reasonCode: 'OK',
        indexedArtifacts: [
          {
            path: ''
          }
        ]
      }
    });

    expect(invalidIndexedArtifact.reasonCode).toBe('INVALID_ARTIFACT_SEARCH_INPUT');

    const unknownSourceReason = searchArtifactsFullText({
      query: 'gate',
      tableIndexResult: {
        allowed: true,
        reasonCode: 'UNKNOWN_REASON',
        indexedArtifacts: [
          {
            artifactPath: `${ALLOWLIST_ROOT}/alias.md`,
            content: 'gate from alias branch',
            sections: ['scope'],
            tables: [],
            searchIndexEligible: true
          },
          {
            filePath: `${ALLOWLIST_ROOT}/fallback.md`,
            content: 'gate fallback filePath',
            searchIndexEligible: true
          }
        ]
      }
    });

    expect(unknownSourceReason).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        sourceReasonCode: 'OK'
      }
    });
  });

  it('covers tableIndexInput invalid shape and nowMs override branch', () => {
    const invalidInput = searchArtifactsFullText({
      query: 'gate',
      tableIndexInput: 'bad'
    });

    expect(invalidInput.reasonCode).toBe('INVALID_ARTIFACT_SEARCH_INPUT');

    const docs = new Map([
      [
        `${ALLOWLIST_ROOT}/b.md`,
        markdownWithMetadata({
          tables: [
            {
              headers: ['K', 'V'],
              rows: [['gate', 'ok']]
            }
          ]
        })
      ]
    ]);

    const result = searchArtifactsFullText(
      {
        query: 'gate',
        tableIndexInput: {
          allowlistRoots: [ALLOWLIST_ROOT],
          artifactPaths: [`${ALLOWLIST_ROOT}/b.md`]
        }
      },
      {
        nowMs: () => Date.now(),
        tableIndexOptions: {
          nowMs: () => Date.now(),
          documentReader: (artifactPath) => docs.get(artifactPath)
        }
      }
    );

    expect(result.reasonCode).toBe('OK');
  });

  it('covers filter mismatch branches for agent/gate/owner/risk/date ranges', () => {
    const baseSearchIndex = [
      {
        artifactPath: `${ALLOWLIST_ROOT}/filter.md`,
        artifactType: 'prd',
        content: 'gate reference',
        phase: 'implementation',
        agent: 'dev',
        gate: 'g4-t',
        owner: 'team-a',
        riskLevel: 'medium',
        date: '2026-02-21T10:00:00.000Z'
      }
    ];

    const scenarios = [
      { filters: { agent: 'qa' } },
      { filters: { gate: 'g2' } },
      { filters: { owner: 'team-b' } },
      { filters: { riskLevel: 'high' } },
      { filters: { dateFrom: '2026-02-22T00:00:00.000Z' } },
      { filters: { dateTo: '2026-02-20T00:00:00.000Z' } }
    ];

    for (const scenario of scenarios) {
      const result = searchArtifactsFullText({
        query: 'gate',
        filters: scenario.filters,
        searchIndex: baseSearchIndex
      });

      expect(result).toMatchObject({
        allowed: true,
        reasonCode: 'OK',
        diagnostics: {
          matchedCount: 0,
          filteredOutCount: 1
        }
      });
    }
  });

  it('covers snippet prefix/suffix and non-object runtime options branch', () => {
    const longText = `${'a'.repeat(120)} gate-signal ${'b'.repeat(220)}`;

    const result = searchArtifactsFullText(
      {
        query: 'gate-signal',
        searchIndex: [
          {
            artifactPath: `${ALLOWLIST_ROOT}/long.md`,
            artifactType: 'prd',
            content: longText
          }
        ]
      },
      'invalid-options'
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        matchedCount: 1
      }
    });

    expect(result.results[0].snippet.startsWith('…')).toBe(true);
    expect(result.results[0].snippet.endsWith('…')).toBe(true);
  });
});
