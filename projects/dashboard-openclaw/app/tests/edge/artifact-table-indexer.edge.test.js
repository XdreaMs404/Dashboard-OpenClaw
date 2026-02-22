import { afterEach, describe, expect, it, vi } from 'vitest';
import { indexArtifactMarkdownTables } from '../../src/artifact-table-indexer.js';

const ALLOWLIST_ROOT =
  '/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts';

function markdownWithMetadata({
  stepsCompleted = ['H01'],
  inputDocuments = ['brief.md'],
  sections = ['## Section'],
  body = 'Contenu',
  table = '| A | B |\n| --- | --- |\n| 1 | 2 |'
} = {}) {
  const steps = stepsCompleted.map((entry) => `  - ${entry}`).join('\n');
  const inputs = inputDocuments.map((entry) => `  - ${entry}`).join('\n');

  return `---\nstepsCompleted:\n${steps}\ninputDocuments:\n${inputs}\n---\n${sections.join('\n')}\n${body}\n${table}`;
}

afterEach(() => {
  vi.resetModules();
  vi.unmock('../../src/artifact-section-extractor.js');
});

describe('artifact-table-indexer edge cases', () => {
  it('fails closed on non-object input payloads', () => {
    const samples = [undefined, null, true, 42, 'S014'];

    for (const sample of samples) {
      const result = indexArtifactMarkdownTables(sample);

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_TABLE_INDEX_INPUT',
        diagnostics: {
          requestedCount: 0,
          processedCount: 0,
          indexedCount: 0,
          nonIndexedCount: 0,
          tableCount: 0,
          emptyTableCount: 0,
          allowlistRoots: []
        },
        indexedArtifacts: [],
        nonIndexedArtifacts: [],
        correctiveActions: []
      });
    }
  });

  it('rejects invalid allowlistRoots values', () => {
    const missing = indexArtifactMarkdownTables({
      artifactDocuments: []
    });

    expect(missing).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_TABLE_INDEX_INPUT'
    });
    expect(missing.reason).toContain('allowlistRoots est requis');

    const blankRoot = indexArtifactMarkdownTables({
      allowlistRoots: ['   '],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata()
        }
      ]
    });

    expect(blankRoot).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_TABLE_INDEX_INPUT'
    });
    expect(blankRoot.reason).toContain('allowlistRoots[0] invalide');
  });

  it('rejects invalid allowedExtensions values and unsupported indexing extensions', () => {
    const invalidType = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      allowedExtensions: '.md',
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata()
        }
      ]
    });

    expect(invalidType.reasonCode).toBe('INVALID_TABLE_INDEX_INPUT');
    expect(invalidType.reason).toContain('allowedExtensions invalide');

    const invalidFormat = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      allowedExtensions: ['md'],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata()
        }
      ]
    });

    expect(invalidFormat.reasonCode).toBe('INVALID_TABLE_INDEX_INPUT');
    expect(invalidFormat.reason).toContain('allowedExtensions[0] invalide');

    const unsupported = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      allowedExtensions: ['.yaml'],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata()
        }
      ]
    });

    expect(unsupported.reasonCode).toBe('INVALID_TABLE_INDEX_INPUT');
    expect(unsupported.reason).toContain('seules les extensions .md et .markdown');
  });

  it('rejects invalid targetArtifactNames values', () => {
    const invalidType = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      targetArtifactNames: 'prd.md',
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata()
        }
      ]
    });

    expect(invalidType.reasonCode).toBe('INVALID_TABLE_INDEX_INPUT');
    expect(invalidType.reason).toContain('targetArtifactNames invalide');

    const invalidEntry = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      targetArtifactNames: [''],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata()
        }
      ]
    });

    expect(invalidEntry.reasonCode).toBe('INVALID_TABLE_INDEX_INPUT');
    expect(invalidEntry.reason).toContain('targetArtifactNames[0] invalide');
  });

  it('validates artifactDocuments shape strictly', () => {
    const invalidType = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: 'not-array'
    });

    expect(invalidType.reasonCode).toBe('INVALID_TABLE_INDEX_INPUT');

    const emptyArray = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: []
    });

    expect(emptyArray.reasonCode).toBe('INVALID_TABLE_INDEX_INPUT');

    const invalidEntry = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [null]
    });

    expect(invalidEntry.reasonCode).toBe('INVALID_TABLE_INDEX_INPUT');
    expect(invalidEntry.reason).toContain('artifactDocuments[0] doit être un objet');

    const missingPath = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          content: markdownWithMetadata()
        }
      ]
    });

    expect(missingPath.reasonCode).toBe('INVALID_TABLE_INDEX_INPUT');
    expect(missingPath.reason).toContain('artifactDocuments[0].path doit être une chaîne non vide');

    const invalidContent = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: {
            payload: 'invalid'
          }
        }
      ]
    });

    expect(invalidContent.reasonCode).toBe('INVALID_TABLE_INDEX_INPUT');
    expect(invalidContent.reason).toContain('artifactDocuments[0].content doit être une chaîne');
  });

  it('validates artifactPaths source and documentReader contract strictly', () => {
    const invalidPathsType = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactPaths: 'not-array'
    });

    expect(invalidPathsType.reasonCode).toBe('INVALID_TABLE_INDEX_INPUT');

    const emptyPaths = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactPaths: []
    });

    expect(emptyPaths.reasonCode).toBe('INVALID_TABLE_INDEX_INPUT');

    const missingReader = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactPaths: [`${ALLOWLIST_ROOT}/prd.md`]
    });

    expect(missingReader.reasonCode).toBe('INVALID_TABLE_INDEX_INPUT');
    expect(missingReader.reason).toContain('options.documentReader est requis');

    const invalidPathValue = indexArtifactMarkdownTables(
      {
        allowlistRoots: [ALLOWLIST_ROOT],
        artifactPaths: ['   ']
      },
      {
        documentReader: () => markdownWithMetadata()
      }
    );

    expect(invalidPathValue.reasonCode).toBe('INVALID_TABLE_INDEX_INPUT');
    expect(invalidPathValue.reason).toContain('artifactPaths[0] doit être une chaîne non vide');
  });

  it('accepts documentReader object payload shape { content } and majorArtifactNames alias', () => {
    const result = indexArtifactMarkdownTables(
      {
        allowlistRoots: [ALLOWLIST_ROOT],
        artifactPaths: [`${ALLOWLIST_ROOT}/custom.md`]
      },
      {
        majorArtifactNames: ['custom.md'],
        documentReader: () => ({
          content: markdownWithMetadata({ sections: ['## One', '### Two'] })
        })
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 1,
        processedCount: 1,
        indexedCount: 1,
        nonIndexedCount: 0,
        tableCount: 1
      }
    });

    expect(result.indexedArtifacts[0]).toMatchObject({
      searchIndexEligible: true
    });
  });

  it('indexes escaped-pipe tables and normalizes row width to headers count', () => {
    const result = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      targetArtifactNames: ['other.md'],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/notes.md`,
          content:
            '## Table\n| Key | Value |\n| --- | --- |\n| x\\|y | z |\n| only-one-cell |\n| too | many | cells | here |'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        tableCount: 1
      }
    });

    const table = result.indexedArtifacts[0].tables[0];

    expect(table.headers).toEqual(['Key', 'Value']);
    expect(table.rows).toEqual([
      ['x|y', 'z'],
      ['only-one-cell', ''],
      ['too', 'many']
    ]);
    expect(table.rowCount).toBe(3);
    expect(table.columnCount).toBe(2);
  });

  it('counts empty markdown tables and marks artifact as ARTIFACT_TABLES_MISSING when only header/separator exists', () => {
    const result = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      targetArtifactNames: ['other.md'],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/notes.md`,
          content: '## Tableau\n| A | B |\n| --- | --- |\n\nAucun row'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_TABLES_MISSING',
      diagnostics: {
        emptyTableCount: 1,
        tableCount: 0,
        indexedCount: 0,
        nonIndexedCount: 1
      }
    });
  });

  it('deduplicates allowlist roots and accepts non-object runtime options without crashing', () => {
    const result = indexArtifactMarkdownTables(
      {
        allowlistRoots: [ALLOWLIST_ROOT, ALLOWLIST_ROOT],
        targetArtifactNames: ['other.md'],
        artifactDocuments: [
          {
            path: `${ALLOWLIST_ROOT}/notes.md`,
            content: '## One\n| A | B |\n| --- | --- |\n| 1 | 2 |'
          }
        ]
      },
      'invalid-runtime-options'
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        allowlistRoots: [ALLOWLIST_ROOT]
      }
    });
  });

  it('uses rejection priority deterministically and deduplicates corrective actions', () => {
    const result = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: '/external/forbidden/prd.md',
          content: markdownWithMetadata()
        },
        {
          path: `${ALLOWLIST_ROOT}/unsupported.yaml`,
          content: 'a: b'
        },
        {
          path: `${ALLOWLIST_ROOT}/notes.md`,
          content: '## Section\nAucun tableau'
        }
      ],
      targetArtifactNames: ['other.md']
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_PATH_NOT_ALLOWED'
    });

    expect(result.correctiveActions).toEqual(
      expect.arrayContaining([
        'RESTRICT_TO_ALLOWED_ROOTS',
        'REMOVE_UNSUPPORTED_ARTIFACTS',
        'ADD_MARKDOWN_TABLES'
      ])
    );

    expect(result.diagnostics.indexedCount + result.diagnostics.nonIndexedCount).toBe(
      result.diagnostics.requestedCount
    );
  });

  it('counts read failures in nonIndexedCount and supports thrown-string reader errors', () => {
    const result = indexArtifactMarkdownTables(
      {
        allowlistRoots: [ALLOWLIST_ROOT],
        artifactPaths: [`${ALLOWLIST_ROOT}/broken.md`]
      },
      {
        documentReader: () => {
          throw 'raw-reader-error';
        }
      }
    );

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_READ_FAILED',
      diagnostics: {
        requestedCount: 1,
        indexedCount: 0,
        nonIndexedCount: 1
      }
    });
    expect(result.reason).toContain('raw-reader-error');
  });

  it('handles monotonic/non-finite nowMs values and keeps diagnostics non-negative', () => {
    const nowValues = [100, 95, NaN, 80, 70, 60, 50, 40, 30, 20, 10];

    const result = indexArtifactMarkdownTables(
      {
        allowlistRoots: [ALLOWLIST_ROOT],
        targetArtifactNames: ['other.md'],
        artifactDocuments: [
          {
            path: `${ALLOWLIST_ROOT}/notes.md`,
            content: '## One\n| A | B |\n| --- | --- |\n| 1 | 2 |'
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
    expect(result.diagnostics.p95IndexMs).toBeGreaterThanOrEqual(0);
  });

  it('maps unexpected section extractor outputs to INVALID_TABLE_INDEX_INPUT deterministically', async () => {
    vi.resetModules();

    vi.doMock('../../src/artifact-section-extractor.js', () => ({
      extractArtifactSectionsForNavigation: () => ({
        allowed: false,
        reasonCode: 'OK',
        reason: 'mock',
        diagnostics: {
          requestedCount: 1,
          processedCount: 0,
          extractedCount: 0,
          nonExtractedCount: 1,
          sectionCount: 0,
          h2Count: 0,
          h3Count: 0,
          missingSectionsCount: 0,
          allowlistRoots: [ALLOWLIST_ROOT],
          durationMs: 0,
          p95ExtractionMs: 0
        },
        extractedArtifacts: [
          {
            path: ''
          }
        ],
        nonExtractedArtifacts: [
          {
            path: '',
            reasonCode: 'INVALID_SECTION_EXTRACTION_INPUT',
            reason: 'invalid input'
          },
          {
            path: '',
            reasonCode: 'UNKNOWN_REASON',
            reason: 'unknown'
          }
        ],
        correctiveActions: []
      })
    }));

    const { indexArtifactMarkdownTables: indexWithMock } = await import(
      '../../src/artifact-table-indexer.js'
    );

    const result = indexWithMock({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/notes.md`,
          content: '## One\n| A | B |\n| --- | --- |\n| 1 | 2 |'
        }
      ],
      targetArtifactNames: ['other.md']
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_TABLE_INDEX_INPUT',
      diagnostics: {
        requestedCount: 1,
        indexedCount: 0,
        nonIndexedCount: 3
      }
    });
  });

  it('handles defensive parse-failed branch when section extractor wrongly reports malformed markdown as extracted', async () => {
    vi.resetModules();

    vi.doMock('../../src/artifact-section-extractor.js', () => ({
      extractArtifactSectionsForNavigation: () => ({
        allowed: true,
        reasonCode: 'OK',
        reason: 'mock',
        diagnostics: {
          requestedCount: 1,
          processedCount: 1,
          extractedCount: 1,
          nonExtractedCount: 0,
          sectionCount: 1,
          h2Count: 1,
          h3Count: 0,
          missingSectionsCount: 0,
          allowlistRoots: [ALLOWLIST_ROOT],
          durationMs: 0,
          p95ExtractionMs: 0
        },
        extractedArtifacts: [
          {
            path: `${ALLOWLIST_ROOT}/mock.md`,
            sections: [
              {
                headingId: 's1',
                anchor: 'a1',
                startLine: 1,
                endLine: 100
              }
            ]
          }
        ],
        nonExtractedArtifacts: [],
        correctiveActions: []
      })
    }));

    const { indexArtifactMarkdownTables: indexWithMock } = await import(
      '../../src/artifact-table-indexer.js'
    );

    const result = indexWithMock({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/mock.md`,
          content: '---\nfrontmatter without closing\n## Heading\n| A | B |\n| --- | --- |\n| 1 | 2 |'
        }
      ],
      targetArtifactNames: ['other.md']
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_PARSE_FAILED',
      diagnostics: {
        requestedCount: 1,
        indexedCount: 0,
        nonIndexedCount: 1
      }
    });
  });

  it('indexes pipe-less markdown tables and skips malformed separator candidates', () => {
    const result = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      targetArtifactNames: ['other.md'],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/notes.md`,
          content:
            '## Table\nA | B\n--- | ---\n1 | 2\n\nX | Y\n--- | invalid\n\nA | B | C\n--- | ---\n'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        tableCount: 1,
        indexedCount: 1,
        nonIndexedCount: 0
      }
    });

    expect(result.indexedArtifacts[0].tables[0]).toMatchObject({
      headers: ['A', 'B'],
      rows: [['1', '2']]
    });
  });

  it('ignores dangling header rows at EOF and keeps valid preceding tables', () => {
    const result = indexArtifactMarkdownTables({
      allowlistRoots: [ALLOWLIST_ROOT],
      targetArtifactNames: ['other.md'],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/notes.md`,
          content:
            '## Table\n| A | B |\n| --- | --- |\n| 1 | 2 |\n| dangling | header |'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        tableCount: 1,
        indexedCount: 1,
        nonIndexedCount: 0
      }
    });
  });

  it('handles sections map fallback paths (null/previous) and missing sections payload from extractor', async () => {
    vi.resetModules();

    vi.doMock('../../src/artifact-section-extractor.js', () => ({
      extractArtifactSectionsForNavigation: () => ({
        allowed: true,
        reasonCode: 'OK',
        reason: 'mock',
        diagnostics: {
          requestedCount: 3,
          processedCount: 3,
          extractedCount: 3,
          nonExtractedCount: 0,
          sectionCount: 3,
          h2Count: 3,
          h3Count: 0,
          missingSectionsCount: 0,
          allowlistRoots: [ALLOWLIST_ROOT],
          durationMs: 0,
          p95ExtractionMs: 0
        },
        extractedArtifacts: [
          {
            path: `${ALLOWLIST_ROOT}/first.md`,
            sections: [
              {
                headingId: 's-late',
                anchor: 'late',
                startLine: 50,
                endLine: 60
              }
            ]
          },
          {
            path: `${ALLOWLIST_ROOT}/second.md`,
            sections: [
              {
                headingId: 's-prev',
                anchor: 'prev',
                startLine: 1,
                endLine: 1
              },
              {
                headingId: 's-future',
                anchor: 'future',
                startLine: 100,
                endLine: 120
              }
            ]
          },
          {
            path: `${ALLOWLIST_ROOT}/third.md`
          }
        ],
        nonExtractedArtifacts: [],
        correctiveActions: []
      })
    }));

    const { indexArtifactMarkdownTables: indexWithMock } = await import(
      '../../src/artifact-table-indexer.js'
    );

    const result = indexWithMock({
      allowlistRoots: [ALLOWLIST_ROOT],
      targetArtifactNames: ['other.md'],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/first.md`,
          content: '| A | B |\n| --- | --- |\n| 1 | 2 |'
        },
        {
          path: `${ALLOWLIST_ROOT}/second.md`,
          content: '| C | D |\n| --- | --- |\n| 3 | 4 |'
        },
        {
          path: `${ALLOWLIST_ROOT}/third.md`,
          content: '| E | F |\n| --- | --- |\n| 5 | 6 |'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_SECTIONS_MISSING',
      diagnostics: {
        requestedCount: 3,
        indexedCount: 2,
        nonIndexedCount: 1,
        tableCount: 2
      }
    });

    expect(result.indexedArtifacts[0].tables[0]).toMatchObject({
      sectionHeadingId: 's-late',
      sectionAnchor: 'late'
    });

    expect(result.indexedArtifacts[1].tables[0]).toMatchObject({
      sectionHeadingId: 's-prev',
      sectionAnchor: 'prev'
    });
  });

  it('does not mutate input payloads', () => {
    const input = {
      allowlistRoots: [ALLOWLIST_ROOT],
      targetArtifactNames: ['prd.md'],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata(),
          nested: {
            tags: ['x', 'y']
          }
        }
      ]
    };

    const options = {
      majorArtifactNames: ['override.md'],
      allowedExtensions: ['.md'],
      extractedAt: '2026-02-22T00:00:00.000Z'
    };

    const inputSnapshot = JSON.parse(JSON.stringify(input));
    const optionsSnapshot = JSON.parse(JSON.stringify(options));

    indexArtifactMarkdownTables(input, options);

    expect(input).toEqual(inputSnapshot);
    expect(options).toEqual(optionsSnapshot);
  });
});
