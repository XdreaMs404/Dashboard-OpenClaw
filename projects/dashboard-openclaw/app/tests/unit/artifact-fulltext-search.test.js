import { describe, expect, it } from 'vitest';
import { searchArtifactsFullText } from '../../src/artifact-fulltext-search.js';
import {
  indexArtifactMarkdownTables,
  searchArtifactsFullText as searchFromIndex
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
  'INVALID_ARTIFACT_SEARCH_INPUT'
]);

function markdownTable({ headers, rows }) {
  const headerLine = `| ${headers.join(' | ')} |`;
  const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const rowsLines = rows.map((row) => `| ${row.join(' | ')} |`).join('\n');

  return `${headerLine}\n${separatorLine}\n${rowsLines}`;
}

function markdownWithMetadata({
  stepsCompleted = ['H01', 'H02'],
  inputDocuments = ['brief.md'],
  sections = ['## Contexte', '### Détails'],
  tables = []
}) {
  const steps = stepsCompleted.map((entry) => `  - ${entry}`).join('\n');
  const inputs = inputDocuments.map((entry) => `  - ${entry}`).join('\n');
  const tablesBlock = tables.map((table) => markdownTable(table)).join('\n\n');

  return `---\nstepsCompleted:\n${steps}\ninputDocuments:\n${inputs}\n---\n${sections.join('\n')}\n${tablesBlock}`;
}

describe('artifact-fulltext-search unit', () => {
  it('returns nominal full-text results with deterministic ordering and snippets', () => {
    const result = searchArtifactsFullText({
      query: 'latence gate',
      searchIndex: [
        {
          artifactPath: `${ALLOWLIST_ROOT}/architecture.md`,
          artifactType: 'architecture',
          content: 'Analyse de latence du service et gate G4-T.',
          sections: ['Conception', 'Observabilité'],
          tables: [
            {
              headers: ['Metric', 'Value'],
              rows: [['latence', '120ms']]
            }
          ],
          phase: 'solutioning',
          agent: 'architect',
          gate: 'g4-t',
          owner: 'infra',
          riskLevel: 'medium',
          date: '2026-02-20T10:00:00.000Z'
        },
        {
          artifactPath: `${ALLOWLIST_ROOT}/prd.md`,
          artifactType: 'prd',
          content: 'Gate checklist avec exigences latence et budgets de performance.',
          sections: ['Objectifs'],
          tables: [],
          phase: 'planning',
          agent: 'pm',
          gate: 'g2',
          owner: 'product',
          riskLevel: 'low',
          date: '2026-02-19T10:00:00.000Z'
        },
        {
          artifactPath: `${ALLOWLIST_ROOT}/ux.md`,
          artifactType: 'ux',
          content: 'Règles UI sans token recherché.',
          sections: ['Design'],
          tables: []
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        query: 'latence gate',
        requestedCount: 3,
        indexedCount: 3,
        matchedCount: 2,
        filteredOutCount: 0,
        sourceReasonCode: 'OK'
      },
      correctiveActions: []
    });

    expect(result.results).toHaveLength(2);
    expect(result.results[0].score).toBeGreaterThanOrEqual(result.results[1].score);

    const orderedPaths = result.results.map((entry) => entry.artifactPath);
    expect(orderedPaths).toEqual(
      [...orderedPaths].sort((left, right) => {
        const leftScore = result.results.find((entry) => entry.artifactPath === left).score;
        const rightScore = result.results.find((entry) => entry.artifactPath === right).score;

        if (rightScore !== leftScore) {
          return rightScore - leftScore;
        }

        return left.localeCompare(right);
      })
    );

    for (const entry of result.results) {
      expect(typeof entry.artifactPath).toBe('string');
      expect(entry.artifactPath.length).toBeGreaterThan(0);
      expect(typeof entry.score).toBe('number');
      expect(entry.score).toBeGreaterThan(0);
      expect(typeof entry.snippet).toBe('string');
      expect(entry.snippet.length).toBeGreaterThan(0);
      expect(entry.snippet).toMatch(/<mark>/i);
      expect(Array.isArray(entry.matchedFields)).toBe(true);
    }
  });

  it('applies artifactTypes filter and reports filteredOutCount with appliedFilters', () => {
    const result = searchArtifactsFullText({
      query: 'gate',
      filters: {
        artifactTypes: ['architecture']
      },
      searchIndex: [
        {
          artifactPath: `${ALLOWLIST_ROOT}/architecture.md`,
          artifactType: 'architecture',
          content: 'Gate G4 validé sur architecture.'
        },
        {
          artifactPath: `${ALLOWLIST_ROOT}/prd.md`,
          artifactType: 'prd',
          content: 'Gate G2 validé sur prd.'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        matchedCount: 1,
        filteredOutCount: 1
      },
      appliedFilters: {
        artifactTypes: ['architecture']
      }
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].artifactType).toBe('architecture');
  });

  it('applies contextual filters (phase/agent/date/gate/owner/riskLevel)', () => {
    const result = searchArtifactsFullText({
      query: 'runbook',
      filters: {
        phase: 'implementation',
        agent: 'dev',
        gate: 'g4-t',
        owner: 'team-a',
        riskLevel: 'high',
        dateFrom: '2026-02-20T00:00:00.000Z',
        dateTo: '2026-02-22T23:59:59.999Z'
      },
      searchIndex: [
        {
          artifactPath: `${ALLOWLIST_ROOT}/epics.md`,
          artifactType: 'epics',
          content: 'Runbook rollback détaillé.',
          phase: 'implementation',
          agent: 'dev',
          gate: 'g4-t',
          owner: 'team-a',
          riskLevel: 'high',
          date: '2026-02-21T08:00:00.000Z'
        },
        {
          artifactPath: `${ALLOWLIST_ROOT}/prd.md`,
          artifactType: 'prd',
          content: 'Runbook mais phase planning.',
          phase: 'planning',
          agent: 'pm',
          gate: 'g2',
          owner: 'team-a',
          riskLevel: 'high',
          date: '2026-02-21T08:00:00.000Z'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        matchedCount: 1,
        filteredOutCount: 1
      },
      appliedFilters: {
        phase: ['implementation'],
        agent: ['dev'],
        gate: ['g4-t'],
        owner: ['team-a'],
        riskLevel: ['high'],
        dateFrom: '2026-02-20T00:00:00.000Z',
        dateTo: '2026-02-22T23:59:59.999Z'
      }
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      artifactType: 'epics',
      phase: 'implementation',
      agent: 'dev',
      gate: 'g4-t',
      owner: 'team-a',
      riskLevel: 'high'
    });
  });

  it('returns allowed=true with empty results when query has no match', () => {
    const result = searchArtifactsFullText({
      query: 'token-introuvable',
      searchIndex: [
        {
          artifactPath: `${ALLOWLIST_ROOT}/ux.md`,
          artifactType: 'ux',
          content: 'Composants UI et accessibilité.'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 1,
        indexedCount: 1,
        matchedCount: 0,
        filteredOutCount: 0
      },
      results: []
    });
  });

  it('propagates strict blocking reason codes from tableIndexResult', () => {
    const result = searchArtifactsFullText({
      query: 'latence',
      tableIndexResult: {
        allowed: false,
        reasonCode: 'ARTIFACT_TABLES_MISSING',
        reason: 'Aucun tableau markdown exploitable.',
        diagnostics: {
          requestedCount: 2,
          indexedCount: 0
        },
        correctiveActions: ['ADD_MARKDOWN_TABLES']
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_TABLES_MISSING',
      diagnostics: {
        query: 'latence',
        requestedCount: 2,
        indexedCount: 0,
        matchedCount: 0,
        filteredOutCount: 0,
        sourceReasonCode: 'ARTIFACT_TABLES_MISSING'
      },
      correctiveActions: ['ADD_MARKDOWN_TABLES']
    });

    expect(result.reason).toContain('Recherche full-text bloquée');
  });

  it('resolves source priority: searchIndex > tableIndexResult > tableIndexInput', () => {
    const result = searchArtifactsFullText({
      query: 'priority',
      searchIndex: [
        {
          artifactPath: `${ALLOWLIST_ROOT}/search-index.md`,
          artifactType: 'prd',
          content: 'priority source searchIndex'
        }
      ],
      tableIndexResult: {
        allowed: true,
        reasonCode: 'OK',
        indexedArtifacts: [
          {
            path: `${ALLOWLIST_ROOT}/table-result.md`,
            tables: [
              {
                headers: ['k'],
                rows: [['priority source tableIndexResult']]
              }
            ],
            searchIndexEligible: true
          }
        ]
      },
      tableIndexInput: {
        allowlistRoots: [ALLOWLIST_ROOT],
        artifactDocuments: [
          {
            path: `${ALLOWLIST_ROOT}/table-input.md`,
            content: markdownWithMetadata({
              tables: [
                {
                  headers: ['k'],
                  rows: [['priority source tableIndexInput']]
                }
              ]
            })
          }
        ]
      }
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 1,
        sourceReasonCode: 'OK'
      }
    });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].artifactPath).toContain('search-index.md');
  });

  it('delegates to S014 when tableIndexInput is provided', () => {
    const result = searchArtifactsFullText({
      query: 'lead time',
      tableIndexInput: {
        allowlistRoots: [ALLOWLIST_ROOT],
        artifactDocuments: [
          {
            path: `${ALLOWLIST_ROOT}/prd.md`,
            content: markdownWithMetadata({
              tables: [
                {
                  headers: ['KPI', 'Valeur'],
                  rows: [['Lead time', '24h']]
                }
              ]
            })
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
        matchedCount: 1,
        sourceReasonCode: 'OK'
      }
    });

    expect(result.results[0].artifactPath).toContain('/prd.md');
  });

  it('returns INVALID_ARTIFACT_SEARCH_INPUT on invalid query/filters/pagination', () => {
    const invalidQuery = searchArtifactsFullText({
      query: '   ',
      searchIndex: []
    });

    expect(invalidQuery).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_ARTIFACT_SEARCH_INPUT'
    });

    const invalidFilters = searchArtifactsFullText({
      query: 'ok',
      filters: {
        artifactTypes: 'prd'
      },
      searchIndex: []
    });

    expect(invalidFilters).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_ARTIFACT_SEARCH_INPUT'
    });

    const invalidPagination = searchArtifactsFullText({
      query: 'ok',
      pagination: {
        offset: -1,
        limit: 10
      },
      searchIndex: []
    });

    expect(invalidPagination).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_ARTIFACT_SEARCH_INPUT'
    });
  });

  it('keeps stable output contract and index export', () => {
    const result = searchFromIndex({
      query: 'gate',
      searchIndex: [
        {
          artifactPath: `${ALLOWLIST_ROOT}/prd.md`,
          artifactType: 'prd',
          content: 'Gate G2 validé.'
        }
      ]
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('results');
    expect(result).toHaveProperty('appliedFilters');
    expect(result).toHaveProperty('correctiveActions');

    expect(typeof result.allowed).toBe('boolean');
    expect(REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(typeof result.reason).toBe('string');

    expect(result.diagnostics).toHaveProperty('query');
    expect(result.diagnostics).toHaveProperty('requestedCount');
    expect(result.diagnostics).toHaveProperty('indexedCount');
    expect(result.diagnostics).toHaveProperty('matchedCount');
    expect(result.diagnostics).toHaveProperty('filteredOutCount');
    expect(result.diagnostics).toHaveProperty('durationMs');
    expect(result.diagnostics).toHaveProperty('p95SearchMs');
    expect(result.diagnostics).toHaveProperty('sourceReasonCode');

    expect(Array.isArray(result.results)).toBe(true);
    expect(isObjectLike(result.appliedFilters)).toBe(true);
    expect(Array.isArray(result.correctiveActions)).toBe(true);

    const tableIndexResult = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/architecture.md`,
          content: markdownWithMetadata({
            tables: [
              {
                headers: ['k'],
                rows: [['v']]
              }
            ]
          })
        }
      ]
    });

    expect(tableIndexResult.reasonCode).toBe('OK');
  });

  it('meets performance threshold on synthetic corpus of 500 docs with expected top hit', () => {
    const searchIndex = Array.from({ length: 500 }, (_, index) => ({
      artifactPath: `${ALLOWLIST_ROOT}/artifact-${index}.md`,
      artifactType: index % 2 === 0 ? 'prd' : 'architecture',
      content:
        index === 123
          ? 'alpha signal critique latency gate owner team'
          : `generic content ${index}`,
      sections: index % 3 === 0 ? ['section alpha'] : ['section beta'],
      tables:
        index % 5 === 0
          ? [
              {
                headers: ['Key', 'Value'],
                rows: [[`key-${index}`, `value-${index}`]]
              }
            ]
          : [],
      phase: 'implementation',
      agent: 'dev',
      gate: 'g4-t',
      owner: 'team-a',
      riskLevel: 'medium',
      date: '2026-02-22T00:00:00.000Z'
    }));

    const result = searchArtifactsFullText({
      query: 'alpha signal latency',
      searchIndex
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 500,
        indexedCount: 500,
        matchedCount: expect.any(Number),
        filteredOutCount: 0
      }
    });

    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0].artifactPath).toContain('artifact-123.md');

    expect(result.diagnostics.p95SearchMs).toBeLessThanOrEqual(2000);
    expect(result.diagnostics.durationMs).toBeLessThan(60000);
  });

  it('supports pagination and keeps matchedCount global while limiting returned results', () => {
    const searchIndex = [
      {
        artifactPath: `${ALLOWLIST_ROOT}/a.md`,
        artifactType: 'prd',
        content: 'gate alpha'
      },
      {
        artifactPath: `${ALLOWLIST_ROOT}/b.md`,
        artifactType: 'prd',
        content: 'gate beta'
      },
      {
        artifactPath: `${ALLOWLIST_ROOT}/c.md`,
        artifactType: 'prd',
        content: 'gate gamma'
      }
    ];

    const result = searchArtifactsFullText({
      query: 'gate',
      pagination: {
        offset: 1,
        limit: 1
      },
      searchIndex
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        matchedCount: 3
      },
      appliedFilters: {
        offset: 1,
        limit: 1
      }
    });

    expect(result.results).toHaveLength(1);
  });
});

function isObjectLike(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
