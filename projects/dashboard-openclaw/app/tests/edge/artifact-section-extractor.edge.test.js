import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractArtifactSectionsForNavigation } from '../../src/artifact-section-extractor.js';

const ALLOWLIST_ROOT =
  '/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts';

function markdownWithMetadata({
  stepsCompleted = ['H01'],
  inputDocuments = ['brief.md'],
  headings = ['## Section'],
  body = 'Contenu'
} = {}) {
  const steps = stepsCompleted.map((entry) => `  - ${entry}`).join('\n');
  const inputs = inputDocuments.map((entry) => `  - ${entry}`).join('\n');

  return `---\nstepsCompleted:\n${steps}\ninputDocuments:\n${inputs}\n---\n${headings.join('\n')}\n${body}`;
}

afterEach(() => {
  vi.resetModules();
  vi.unmock('../../src/artifact-metadata-validator.js');
});

describe('artifact-section-extractor edge cases', () => {
  it('fails closed on non-object input payloads', () => {
    const samples = [undefined, null, true, 42, 'S013'];

    for (const sample of samples) {
      const result = extractArtifactSectionsForNavigation(sample);

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_SECTION_EXTRACTION_INPUT',
        diagnostics: {
          requestedCount: 0,
          processedCount: 0,
          extractedCount: 0,
          nonExtractedCount: 0,
          sectionCount: 0,
          h2Count: 0,
          h3Count: 0,
          missingSectionsCount: 0,
          allowlistRoots: []
        },
        extractedArtifacts: [],
        nonExtractedArtifacts: [],
        correctiveActions: []
      });
    }
  });

  it('rejects invalid allowlistRoots values', () => {
    const missing = extractArtifactSectionsForNavigation({
      artifactDocuments: []
    });

    expect(missing).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_SECTION_EXTRACTION_INPUT'
    });
    expect(missing.reason).toContain('allowlistRoots est requis');

    const blankRoot = extractArtifactSectionsForNavigation({
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
      reasonCode: 'INVALID_SECTION_EXTRACTION_INPUT'
    });
    expect(blankRoot.reason).toContain('allowlistRoots[0] invalide');
  });

  it('rejects invalid allowedExtensions values and unsupported extraction extensions', () => {
    const invalidType = extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      allowedExtensions: '.md',
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata()
        }
      ]
    });

    expect(invalidType.reasonCode).toBe('INVALID_SECTION_EXTRACTION_INPUT');
    expect(invalidType.reason).toContain('allowedExtensions invalide');

    const invalidFormat = extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      allowedExtensions: ['md'],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata()
        }
      ]
    });

    expect(invalidFormat.reasonCode).toBe('INVALID_SECTION_EXTRACTION_INPUT');
    expect(invalidFormat.reason).toContain('allowedExtensions[0] invalide');

    const unsupported = extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      allowedExtensions: ['.yaml'],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata()
        }
      ]
    });

    expect(unsupported.reasonCode).toBe('INVALID_SECTION_EXTRACTION_INPUT');
    expect(unsupported.reason).toContain('seules les extensions .md et .markdown');
  });

  it('rejects invalid targetArtifactNames values', () => {
    const invalidType = extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      targetArtifactNames: 'prd.md',
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata()
        }
      ]
    });

    expect(invalidType.reasonCode).toBe('INVALID_SECTION_EXTRACTION_INPUT');
    expect(invalidType.reason).toContain('targetArtifactNames invalide');

    const invalidEntry = extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      targetArtifactNames: [''],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata()
        }
      ]
    });

    expect(invalidEntry.reasonCode).toBe('INVALID_SECTION_EXTRACTION_INPUT');
    expect(invalidEntry.reason).toContain('targetArtifactNames[0] invalide');
  });

  it('validates artifactDocuments shape strictly', () => {
    const invalidType = extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: 'not-array'
    });

    expect(invalidType.reasonCode).toBe('INVALID_SECTION_EXTRACTION_INPUT');

    const emptyArray = extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: []
    });

    expect(emptyArray.reasonCode).toBe('INVALID_SECTION_EXTRACTION_INPUT');

    const invalidEntry = extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [null]
    });

    expect(invalidEntry.reasonCode).toBe('INVALID_SECTION_EXTRACTION_INPUT');
    expect(invalidEntry.reason).toContain('artifactDocuments[0] doit être un objet');

    const missingPath = extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          content: markdownWithMetadata()
        }
      ]
    });

    expect(missingPath.reasonCode).toBe('INVALID_SECTION_EXTRACTION_INPUT');
    expect(missingPath.reason).toContain('artifactDocuments[0].path doit être une chaîne non vide');

    const invalidContent = extractArtifactSectionsForNavigation({
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

    expect(invalidContent.reasonCode).toBe('INVALID_SECTION_EXTRACTION_INPUT');
    expect(invalidContent.reason).toContain('artifactDocuments[0].content doit être une chaîne');
  });

  it('validates artifactPaths source and documentReader contract strictly', () => {
    const invalidPathsType = extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactPaths: 'not-array'
    });

    expect(invalidPathsType.reasonCode).toBe('INVALID_SECTION_EXTRACTION_INPUT');

    const emptyPaths = extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactPaths: []
    });

    expect(emptyPaths.reasonCode).toBe('INVALID_SECTION_EXTRACTION_INPUT');

    const missingReader = extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactPaths: [`${ALLOWLIST_ROOT}/prd.md`]
    });

    expect(missingReader.reasonCode).toBe('INVALID_SECTION_EXTRACTION_INPUT');
    expect(missingReader.reason).toContain('options.documentReader est requis');

    const invalidPathValue = extractArtifactSectionsForNavigation(
      {
        allowlistRoots: [ALLOWLIST_ROOT],
        artifactPaths: ['   ']
      },
      {
        documentReader: () => markdownWithMetadata()
      }
    );

    expect(invalidPathValue.reasonCode).toBe('INVALID_SECTION_EXTRACTION_INPUT');
    expect(invalidPathValue.reason).toContain('artifactPaths[0] doit être une chaîne non vide');
  });

  it('accepts documentReader object payload shape { content } and majorArtifactNames alias', () => {
    const result = extractArtifactSectionsForNavigation(
      {
        allowlistRoots: [ALLOWLIST_ROOT],
        artifactPaths: [`${ALLOWLIST_ROOT}/custom.md`]
      },
      {
        majorArtifactNames: ['custom.md'],
        documentReader: () => ({
          content: markdownWithMetadata({ headings: ['## One', '### Two'] })
        })
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 1,
        processedCount: 1,
        extractedCount: 1,
        nonExtractedCount: 0,
        sectionCount: 2,
        h2Count: 1,
        h3Count: 1
      }
    });

    expect(result.extractedArtifacts[0]).toMatchObject({
      tableIndexEligible: true
    });
  });

  it('assigns ROOT parentHeadingId when H3 appears before first H2 and supports heading normalization', () => {
    const result = extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/notes.md`,
          content: `### Préambule\nTexte\n## Décision ###\n### Détails ###\n## 🚀\n### Suite`
        }
      ],
      targetArtifactNames: ['other.md']
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        sectionCount: 5,
        h2Count: 2,
        h3Count: 3
      }
    });

    const sections = result.extractedArtifacts[0].sections;

    expect(sections[0]).toMatchObject({
      headingLevel: 3,
      parentHeadingId: 'ROOT',
      anchor: 'preambule'
    });

    expect(sections[1]).toMatchObject({
      headingLevel: 2,
      anchor: 'decision'
    });

    expect(sections[2]).toMatchObject({
      headingLevel: 3,
      parentHeadingId: sections[1].headingId,
      anchor: 'details'
    });

    expect(sections[3]).toMatchObject({
      headingLevel: 2,
      anchor: 'section-5'
    });

    expect(sections[4]).toMatchObject({
      headingLevel: 3,
      parentHeadingId: sections[3].headingId,
      anchor: 'suite'
    });
  });

  it('returns ARTIFACT_SECTIONS_MISSING when only H1/H4 headings are present', () => {
    const result = extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      targetArtifactNames: ['notes.md'],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/notes.md`,
          content: markdownWithMetadata({
            headings: ['# Titre', '#### Détail'],
            body: 'Pas de H2/H3.'
          })
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_SECTIONS_MISSING',
      diagnostics: {
        requestedCount: 1,
        processedCount: 0,
        nonExtractedCount: 1,
        missingSectionsCount: 1
      }
    });
  });

  it('uses rejection priority deterministically and deduplicates corrective actions', () => {
    const result = extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: '/external/forbidden/prd.md',
          content: markdownWithMetadata({ headings: ['## One'] })
        },
        {
          path: `${ALLOWLIST_ROOT}/unsupported.yaml`,
          content: 'a: b'
        },
        {
          path: `${ALLOWLIST_ROOT}/notes.md`,
          content: 'No headings here'
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
        'ADD_STRUCTURED_HEADINGS'
      ])
    );

    expect(result.diagnostics.processedCount + result.diagnostics.nonExtractedCount).toBe(
      result.diagnostics.requestedCount
    );
  });

  it('counts read failures from artifactPaths and preserves requested accounting', () => {
    const result = extractArtifactSectionsForNavigation(
      {
        allowlistRoots: [ALLOWLIST_ROOT],
        artifactPaths: [`${ALLOWLIST_ROOT}/a.md`, `${ALLOWLIST_ROOT}/broken.md`]
      },
      {
        documentReader: (artifactPath) => {
          if (artifactPath.endsWith('broken.md')) {
            throw 'raw-reader-error';
          }

          return markdownWithMetadata({ headings: ['## Alpha', '### Beta'] });
        }
      }
    );

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_READ_FAILED',
      diagnostics: {
        requestedCount: 2,
        processedCount: 1,
        extractedCount: 1,
        nonExtractedCount: 1
      }
    });
    expect(result.reason).toContain('raw-reader-error');
    expect(result.diagnostics.processedCount + result.diagnostics.nonExtractedCount).toBe(2);
  });

  it('handles monotonic/non-finite nowMs values and keeps diagnostics non-negative', () => {
    const nowValues = [100, 95, NaN, 80, 70, 60, 50, 40, 30, 20, 10];

    const result = extractArtifactSectionsForNavigation(
      {
        allowlistRoots: [ALLOWLIST_ROOT],
        artifactDocuments: [
          {
            path: `${ALLOWLIST_ROOT}/notes.md`,
            content: '## One\n### Two'
          }
        ],
        targetArtifactNames: ['other.md']
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
    expect(result.diagnostics.p95ExtractionMs).toBeGreaterThanOrEqual(0);
  });

  it('deduplicates allowlist roots and accepts non-object runtime options without crashing', () => {
    const result = extractArtifactSectionsForNavigation(
      {
        allowlistRoots: [ALLOWLIST_ROOT, ALLOWLIST_ROOT],
        artifactDocuments: [
          {
            path: `${ALLOWLIST_ROOT}/notes.md`,
            content: '## One\n### Two'
          }
        ],
        targetArtifactNames: ['other.md']
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

  it('covers all-read-failed path where metadata validation is skipped', () => {
    const result = extractArtifactSectionsForNavigation(
      {
        allowlistRoots: [ALLOWLIST_ROOT],
        artifactPaths: [`${ALLOWLIST_ROOT}/broken.md`]
      },
      {
        documentReader: () => {
          throw new Error('io failure');
        }
      }
    );

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_READ_FAILED',
      diagnostics: {
        requestedCount: 1,
        processedCount: 0,
        extractedCount: 0,
        nonExtractedCount: 1
      }
    });
  });

  it('skips empty heading labels after normalization and keeps valid descendants', () => {
    const result = extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/notes.md`,
          content: '##    \n### Child\ntext'
        }
      ],
      targetArtifactNames: ['other.md']
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        sectionCount: 1,
        h2Count: 0,
        h3Count: 1
      }
    });

    expect(result.extractedArtifacts[0].sections).toHaveLength(1);
    expect(result.extractedArtifacts[0].sections[0]).toMatchObject({
      headingLevel: 3,
      parentHeadingId: 'ROOT'
    });
  });

  it('maps unexpected metadata validator outputs to INVALID_SECTION_EXTRACTION_INPUT deterministically', async () => {
    vi.resetModules();

    vi.doMock('../../src/artifact-metadata-validator.js', () => ({
      validateArtifactMetadataCompliance: () => ({
        allowed: false,
        reasonCode: 'OK',
        reason: 'mock',
        diagnostics: {
          requestedCount: 1,
          validatedCount: 1,
          compliantCount: 0,
          nonCompliantCount: 1,
          missingMetadataCount: 0,
          invalidMetadataCount: 0,
          allowlistRoots: [ALLOWLIST_ROOT],
          durationMs: 0,
          p95ValidationMs: 0
        },
        compliantArtifacts: [
          {
            path: '',
            sectionExtractionEligible: true
          }
        ],
        nonCompliantArtifacts: [
          {
            path: '',
            reasonCode: 'INVALID_METADATA_VALIDATION_INPUT',
            reason: 'metadata invalid input'
          },
          {
            path: '',
            reasonCode: 'UNKNOWN_REASON',
            reason: 'unknown metadata reason'
          }
        ],
        correctiveActions: []
      })
    }));

    const { extractArtifactSectionsForNavigation: extractWithMock } = await import(
      '../../src/artifact-section-extractor.js'
    );

    const result = extractWithMock({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/notes.md`,
          content: '## One\n### Two'
        }
      ],
      targetArtifactNames: ['other.md']
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_SECTION_EXTRACTION_INPUT',
      diagnostics: {
        requestedCount: 1,
        processedCount: 0,
        extractedCount: 0,
        nonExtractedCount: 3
      }
    });
  });

  it('handles defensive parse-failed branch when metadata validator wrongly reports malformed markdown as compliant', async () => {
    vi.resetModules();

    vi.doMock('../../src/artifact-metadata-validator.js', () => ({
      validateArtifactMetadataCompliance: () => ({
        allowed: true,
        reasonCode: 'OK',
        reason: 'mock',
        diagnostics: {
          requestedCount: 1,
          validatedCount: 1,
          compliantCount: 1,
          nonCompliantCount: 0,
          missingMetadataCount: 0,
          invalidMetadataCount: 0,
          allowlistRoots: [ALLOWLIST_ROOT],
          durationMs: 0,
          p95ValidationMs: 0
        },
        compliantArtifacts: [
          {
            path: `${ALLOWLIST_ROOT}/mock.md`
          }
        ],
        nonCompliantArtifacts: [],
        correctiveActions: []
      })
    }));

    const { extractArtifactSectionsForNavigation: extractWithMock } = await import(
      '../../src/artifact-section-extractor.js'
    );

    const result = extractWithMock({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/mock.md`,
          content: '---\ninvalid-frontmatter-without-closing\n## Heading'
        }
      ],
      targetArtifactNames: ['other.md']
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_PARSE_FAILED',
      diagnostics: {
        requestedCount: 1,
        processedCount: 0,
        extractedCount: 0,
        nonExtractedCount: 1
      }
    });
  });

  it('uses empty metadata object when metadata context lacks metadata payload', async () => {
    vi.resetModules();

    vi.doMock('../../src/artifact-metadata-validator.js', () => ({
      validateArtifactMetadataCompliance: () => ({
        allowed: true,
        reasonCode: 'OK',
        reason: 'mock',
        diagnostics: {
          requestedCount: 1,
          validatedCount: 1,
          compliantCount: 1,
          nonCompliantCount: 0,
          missingMetadataCount: 0,
          invalidMetadataCount: 0,
          allowlistRoots: [ALLOWLIST_ROOT],
          durationMs: 0,
          p95ValidationMs: 0
        },
        compliantArtifacts: [
          {
            path: `${ALLOWLIST_ROOT}/mock-metadata.md`
          }
        ],
        nonCompliantArtifacts: [],
        correctiveActions: []
      })
    }));

    const { extractArtifactSectionsForNavigation: extractWithMock } = await import(
      '../../src/artifact-section-extractor.js'
    );

    const result = extractWithMock({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/mock-metadata.md`,
          content: '## Heading\n### Child'
        }
      ],
      targetArtifactNames: ['other.md']
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK'
    });

    expect(result.extractedArtifacts[0].metadata).toEqual({});
  });

  it('does not mutate input payloads', () => {
    const input = {
      allowlistRoots: [ALLOWLIST_ROOT],
      targetArtifactNames: ['prd.md'],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata({ headings: ['## Alpha', '### Beta'] }),
          nested: {
            tags: ['x', 'y']
          }
        }
      ]
    };

    const options = {
      majorArtifactNames: ['override.md'],
      allowedExtensions: ['.md']
    };

    const inputSnapshot = JSON.parse(JSON.stringify(input));
    const optionsSnapshot = JSON.parse(JSON.stringify(options));

    extractArtifactSectionsForNavigation(input, options);

    expect(input).toEqual(inputSnapshot);
    expect(options).toEqual(optionsSnapshot);
  });
});
