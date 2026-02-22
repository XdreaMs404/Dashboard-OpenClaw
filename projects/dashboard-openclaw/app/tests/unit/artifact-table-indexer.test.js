import { describe, expect, it, vi } from 'vitest';
import { indexArtifactMarkdownTables } from '../../src/artifact-table-indexer.js';
import { indexArtifactMarkdownTables as indexFromIndex } from '../../src/index.js';

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
  'INVALID_TABLE_INDEX_INPUT'
]);

function markdownTable({ headers, rows }) {
  const headerLine = `| ${headers.join(' | ')} |`;
  const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const rowsLines = rows.map((row) => `| ${row.join(' | ')} |`).join('\n');

  return `${headerLine}\n${separatorLine}\n${rowsLines}`;
}

function markdownWithMetadata({
  stepsCompleted = ['H01'],
  inputDocuments = ['brief.md'],
  sections = ['## Section'],
  tables = [],
  body = 'Contenu.'
}) {
  const steps = stepsCompleted.map((entry) => `  - ${entry}`).join('\n');
  const inputs = inputDocuments.map((entry) => `  - ${entry}`).join('\n');

  const tablesBlock = tables.map((table) => markdownTable(table)).join('\n\n');

  return `---\nstepsCompleted:\n${steps}\ninputDocuments:\n${inputs}\n---\n${sections.join('\n')}\n${body}\n${tablesBlock}`;
}

describe('artifact-table-indexer unit', () => {
  it('returns nominal OK indexing result for valid markdown tables under allowlist', () => {
    const result = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      targetArtifactNames: ['prd.md'],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata({
            sections: ['## Contexte', '### Détails'],
            tables: [
              {
                headers: ['KPI', 'Valeur'],
                rows: [
                  ['Lead time', '24h'],
                  ['Coverage', '99%']
                ]
              },
              {
                headers: ['Risque', 'Mitigation'],
                rows: [['T03', 'Queue monitorée']]
              }
            ]
          })
        },
        {
          path: `${ALLOWLIST_ROOT}/notes.md`,
          content: `## Notes\n### Actions\n${markdownTable({
            headers: ['Action', 'Owner'],
            rows: [['Valider gates', 'TEA']]
          })}`
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 2,
        processedCount: 2,
        indexedCount: 2,
        nonIndexedCount: 0,
        tableCount: 3,
        emptyTableCount: 0,
        allowlistRoots: [ALLOWLIST_ROOT]
      },
      nonIndexedArtifacts: [],
      correctiveActions: []
    });

    expect(result.indexedArtifacts).toHaveLength(2);

    for (const artifact of result.indexedArtifacts) {
      expect(artifact.searchIndexEligible).toBe(true);
      expect(artifact.tableCount).toBeGreaterThan(0);

      for (const table of artifact.tables) {
        expect(table.tableId).toMatch(/^tbl_[0-9a-f]{8}$/);
        expect(typeof table.sectionHeadingId).toBe('string');
        expect(table.sectionHeadingId.length).toBeGreaterThan(0);
        expect(typeof table.sectionAnchor).toBe('string');
        expect(table.sectionAnchor.length).toBeGreaterThan(0);
        expect(Array.isArray(table.headers)).toBe(true);
        expect(Array.isArray(table.rows)).toBe(true);
        expect(table.rowCount).toBeGreaterThan(0);
        expect(table.columnCount).toBeGreaterThan(0);
        expect(table.schemaVersion).toBe('artifact-table-index.v1');
        expect(table.extractedAt).toBe('1970-01-01T00:00:00.000Z');
      }
    }
  });

  it('builds stable deterministic table schema and section attachment across identical runs', () => {
    const input = {
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content:
            '---\nstepsCompleted:\n  - H01\ninputDocuments:\n  - brief.md\n---\n## Contexte\n' +
            markdownTable({
              headers: ['Nom', 'Valeur'],
              rows: [['A', '1']]
            }) +
            '\n### Objectif\n' +
            markdownTable({
              headers: ['Statut', 'Owner'],
              rows: [['Open', 'PM']]
            })
        }
      ]
    };

    const first = indexArtifactMarkdownTables(input, {
      extractedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 'v-custom'
    });
    const second = indexArtifactMarkdownTables(input, {
      extractedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 'v-custom'
    });

    expect(first).toMatchObject({
      allowed: true,
      reasonCode: 'OK'
    });

    const firstTables = first.indexedArtifacts[0].tables;
    const secondTables = second.indexedArtifacts[0].tables;

    expect(firstTables).toHaveLength(2);
    expect(secondTables).toHaveLength(2);

    expect(firstTables).toEqual(secondTables);

    expect(firstTables[0]).toMatchObject({
      sectionAnchor: 'contexte',
      schemaVersion: 'v-custom',
      extractedAt: '2026-01-01T00:00:00.000Z'
    });

    expect(firstTables[1]).toMatchObject({
      sectionAnchor: 'objectif',
      schemaVersion: 'v-custom',
      extractedAt: '2026-01-01T00:00:00.000Z'
    });
  });

  it('returns ARTIFACT_TABLES_MISSING when no markdown table is found', () => {
    const result = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata({
            sections: ['## Contexte', '### Objectif'],
            tables: []
          })
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_TABLES_MISSING',
      diagnostics: {
        requestedCount: 1,
        processedCount: 0,
        indexedCount: 0,
        nonIndexedCount: 1,
        tableCount: 0
      }
    });

    expect(result.nonIndexedArtifacts[0]).toMatchObject({
      reasonCode: 'ARTIFACT_TABLES_MISSING',
      tableErrors: ['Aucun tableau markdown exploitable détecté (header/separator/rows).']
    });
    expect(result.correctiveActions).toContain('ADD_MARKDOWN_TABLES');
  });

  it('propagates ARTIFACT_METADATA_MISSING from S012 guard', () => {
    const result = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: '## Contexte\n### Objectif\n' +
            markdownTable({
              headers: ['A', 'B'],
              rows: [['1', '2']]
            })
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_METADATA_MISSING',
      diagnostics: {
        requestedCount: 1,
        indexedCount: 0,
        nonIndexedCount: 1
      }
    });

    expect(result.nonIndexedArtifacts[0]).toMatchObject({
      reasonCode: 'ARTIFACT_METADATA_MISSING',
      missingFields: ['stepsCompleted', 'inputDocuments']
    });
  });

  it('propagates ARTIFACT_METADATA_INVALID from S012 guard', () => {
    const result = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/architecture.md`,
          content:
            '---\nstepsCompleted: done\ninputDocuments:\n  - prd.md\n---\n## Contexte\n### Scope\n' +
            markdownTable({
              headers: ['A', 'B'],
              rows: [['1', '2']]
            })
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_METADATA_INVALID'
    });
  });

  it('propagates ARTIFACT_SECTIONS_MISSING from S013 guard', () => {
    const result = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata({
            sections: ['# Titre'],
            tables: [
              {
                headers: ['A', 'B'],
                rows: [['1', '2']]
              }
            ]
          })
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_SECTIONS_MISSING',
      diagnostics: {
        requestedCount: 1,
        indexedCount: 0,
        nonIndexedCount: 1
      }
    });
    expect(result.correctiveActions).toContain('ADD_STRUCTURED_HEADINGS');
  });

  it('returns ARTIFACT_PATH_NOT_ALLOWED for artifacts outside allowlist', () => {
    const result = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: '/tmp/forbidden/prd.md',
          content: markdownWithMetadata({
            sections: ['## Contexte'],
            tables: [
              {
                headers: ['A', 'B'],
                rows: [['1', '2']]
              }
            ]
          })
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_PATH_NOT_ALLOWED',
      correctiveActions: ['RESTRICT_TO_ALLOWED_ROOTS']
    });
  });

  it('returns UNSUPPORTED_ARTIFACT_TYPE for unsupported extension', () => {
    const result = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/payload.yaml`,
          content: 'owner: pm\nstatus: draft'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'UNSUPPORTED_ARTIFACT_TYPE',
      correctiveActions: ['REMOVE_UNSUPPORTED_ARTIFACTS']
    });
  });

  it('returns ARTIFACT_PARSE_FAILED for invalid markdown frontmatter', () => {
    const result = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content:
            '---\nstepsCompleted:\n  - H01\ninputDocuments:\n  - brief.md\n## frontmatter missing closing\n' +
            markdownTable({
              headers: ['A', 'B'],
              rows: [['1', '2']]
            })
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_PARSE_FAILED'
    });
  });

  it('supports artifactPaths source with documentReader and tracks ARTIFACT_READ_FAILED entries', () => {
    const documentReader = vi.fn((artifactPath) => {
      if (artifactPath.endsWith('broken.md')) {
        throw new Error('disk timeout');
      }

      if (artifactPath.endsWith('bad-shape.md')) {
        return {
          payload: 'invalid'
        };
      }

      return markdownWithMetadata({
        sections: ['## Contexte'],
        tables: [
          {
            headers: ['A', 'B'],
            rows: [['1', '2']]
          }
        ]
      });
    });

    const result = indexArtifactMarkdownTables(
      {
        allowlistRoots: [ALLOWLIST_ROOT],
        artifactPaths: [
          `${ALLOWLIST_ROOT}/prd.md`,
          `${ALLOWLIST_ROOT}/broken.md`,
          `${ALLOWLIST_ROOT}/bad-shape.md`
        ]
      },
      {
        documentReader
      }
    );

    expect(documentReader).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_READ_FAILED',
      diagnostics: {
        requestedCount: 3,
        processedCount: 1,
        indexedCount: 1,
        nonIndexedCount: 2,
        tableCount: 1
      }
    });
    expect(result.correctiveActions).toContain('RETRY_ARTIFACT_READ');
  });

  it('returns INVALID_TABLE_INDEX_INPUT when source is missing', () => {
    const result = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_TABLE_INDEX_INPUT',
      diagnostics: {
        requestedCount: 0,
        processedCount: 0,
        indexedCount: 0,
        nonIndexedCount: 0,
        tableCount: 0,
        emptyTableCount: 0
      }
    });
    expect(result.reason).toContain('artifactDocuments ou artifactPaths est requis');
  });

  it('meets p95 and total duration constraints on synthetic corpus of 500 docs', () => {
    const artifactDocuments = Array.from({ length: 500 }, (_, index) => ({
      path: `${ALLOWLIST_ROOT}/evidence-${index}.md`,
      content: markdownWithMetadata({
        stepsCompleted: ['H01', 'H02', 'H03'],
        inputDocuments: [`source-${index}.md`],
        sections: ['## Overview', '### Details'],
        tables: [
          {
            headers: ['Key', 'Value'],
            rows: [[`k-${index}`, `v-${index}`]]
          }
        ],
        body: `Evidence ${index}`
      })
    }));

    const result = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      targetArtifactNames: artifactDocuments.map((artifact) => artifact.path.split('/').at(-1)),
      artifactDocuments
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 500,
        processedCount: 500,
        indexedCount: 500,
        nonIndexedCount: 0,
        tableCount: 500,
        emptyTableCount: 0
      }
    });

    expect(result.diagnostics.p95IndexMs).toBeLessThanOrEqual(2000);
    expect(result.diagnostics.durationMs).toBeLessThan(60000);
    expect(result.diagnostics.indexedCount + result.diagnostics.nonIndexedCount).toBe(
      result.diagnostics.requestedCount
    );
  });

  it('keeps stable output contract and index export', () => {
    const result = indexFromIndex({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata({
            sections: ['## Contexte'],
            tables: [
              {
                headers: ['A', 'B'],
                rows: [['1', '2']]
              }
            ]
          })
        }
      ]
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('indexedArtifacts');
    expect(result).toHaveProperty('nonIndexedArtifacts');
    expect(result).toHaveProperty('correctiveActions');

    expect(typeof result.allowed).toBe('boolean');
    expect(REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(typeof result.reason).toBe('string');

    expect(result.diagnostics).toHaveProperty('requestedCount');
    expect(result.diagnostics).toHaveProperty('processedCount');
    expect(result.diagnostics).toHaveProperty('indexedCount');
    expect(result.diagnostics).toHaveProperty('nonIndexedCount');
    expect(result.diagnostics).toHaveProperty('tableCount');
    expect(result.diagnostics).toHaveProperty('emptyTableCount');
    expect(result.diagnostics).toHaveProperty('allowlistRoots');
    expect(result.diagnostics).toHaveProperty('durationMs');
    expect(result.diagnostics).toHaveProperty('p95IndexMs');

    expect(Array.isArray(result.indexedArtifacts)).toBe(true);
    expect(Array.isArray(result.nonIndexedArtifacts)).toBe(true);
    expect(Array.isArray(result.correctiveActions)).toBe(true);
  });
});
