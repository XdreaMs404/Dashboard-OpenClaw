import { describe, expect, it } from 'vitest';
import { ingestBmadArtifacts } from '../../src/artifact-ingestion-pipeline.js';

const ALLOWLIST_ROOT =
  '/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts';

describe('artifact-ingestion-pipeline edge cases', () => {
  it('fails closed on non-object input payloads', () => {
    const samples = [undefined, null, true, 42, 'S011'];

    for (const sample of samples) {
      const result = ingestBmadArtifacts(sample);

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_ARTIFACT_INGESTION_INPUT',
        diagnostics: {
          requestedCount: 0,
          ingestedCount: 0,
          rejectedCount: 0,
          metadataValidatedCount: 0,
          missingMetadataCount: 0,
          allowlistRoots: []
        },
        ingestedArtifacts: [],
        rejectedArtifacts: [],
        correctiveActions: []
      });
    }
  });

  it('rejects invalid allowlistRoots values', () => {
    const missing = ingestBmadArtifacts({
      artifactDocuments: []
    });

    expect(missing).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_ARTIFACT_INGESTION_INPUT'
    });
    expect(missing.reason).toContain('allowlistRoots est requis');

    const blankRoot = ingestBmadArtifacts({
      allowlistRoots: ['   '],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/research.md`,
          content: '# doc'
        }
      ]
    });

    expect(blankRoot).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_ARTIFACT_INGESTION_INPUT'
    });
    expect(blankRoot.reason).toContain('allowlistRoots[0] invalide');
  });

  it('rejects invalid allowedExtensions and majorArtifactNames options', () => {
    const invalidExtensionsType = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/research.md`,
          content: '# doc'
        }
      ],
      allowedExtensions: '.md'
    });

    expect(invalidExtensionsType).toMatchObject({
      reasonCode: 'INVALID_ARTIFACT_INGESTION_INPUT'
    });
    expect(invalidExtensionsType.reason).toContain('allowedExtensions invalide');

    const invalidExtensionsEntry = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/research.md`,
          content: '# doc'
        }
      ],
      allowedExtensions: ['md']
    });

    expect(invalidExtensionsEntry).toMatchObject({
      reasonCode: 'INVALID_ARTIFACT_INGESTION_INPUT'
    });
    expect(invalidExtensionsEntry.reason).toContain('allowedExtensions[0] invalide');

    const invalidMajorNames = ingestBmadArtifacts(
      {
        allowlistRoots: [ALLOWLIST_ROOT],
        artifactDocuments: [
          {
            path: `${ALLOWLIST_ROOT}/research.md`,
            content: '# doc'
          }
        ]
      },
      {
        majorArtifactNames: ['']
      }
    );

    expect(invalidMajorNames).toMatchObject({
      reasonCode: 'INVALID_ARTIFACT_INGESTION_INPUT'
    });
    expect(invalidMajorNames.reason).toContain('majorArtifactNames[0] invalide');
  });

  it('validates artifactDocuments shape strictly', () => {
    const invalidType = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: 'not-array'
    });

    expect(invalidType.reasonCode).toBe('INVALID_ARTIFACT_INGESTION_INPUT');

    const emptyArray = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: []
    });

    expect(emptyArray.reasonCode).toBe('INVALID_ARTIFACT_INGESTION_INPUT');

    const invalidEntry = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [null]
    });

    expect(invalidEntry.reasonCode).toBe('INVALID_ARTIFACT_INGESTION_INPUT');
    expect(invalidEntry.reason).toContain('artifactDocuments[0] doit être un objet');

    const missingPath = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          content: '# doc'
        }
      ]
    });

    expect(missingPath.reasonCode).toBe('INVALID_ARTIFACT_INGESTION_INPUT');
    expect(missingPath.reason).toContain('artifactDocuments[0].path doit être une chaîne non vide');

    const invalidContent = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/research.md`,
          content: {
            text: 'invalid'
          }
        }
      ]
    });

    expect(invalidContent.reasonCode).toBe('INVALID_ARTIFACT_INGESTION_INPUT');
    expect(invalidContent.reason).toContain('artifactDocuments[0].content doit être une chaîne');
  });

  it('validates artifactPaths source and documentReader contract strictly', () => {
    const invalidPathsType = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactPaths: 'not-array'
    });

    expect(invalidPathsType.reasonCode).toBe('INVALID_ARTIFACT_INGESTION_INPUT');

    const emptyPaths = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactPaths: []
    });

    expect(emptyPaths.reasonCode).toBe('INVALID_ARTIFACT_INGESTION_INPUT');

    const missingReader = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactPaths: [`${ALLOWLIST_ROOT}/prd.md`]
    });

    expect(missingReader.reasonCode).toBe('INVALID_ARTIFACT_INGESTION_INPUT');
    expect(missingReader.reason).toContain('options.documentReader est requis');

    const invalidPathValue = ingestBmadArtifacts(
      {
        allowlistRoots: [ALLOWLIST_ROOT],
        artifactPaths: ['   ']
      },
      {
        documentReader: () => '# content'
      }
    );

    expect(invalidPathValue.reasonCode).toBe('INVALID_ARTIFACT_INGESTION_INPUT');
    expect(invalidPathValue.reason).toContain('artifactPaths[0] doit être une chaîne non vide');
  });

  it('accepts documentReader object payload shape { content }', () => {
    const result = ingestBmadArtifacts(
      {
        allowlistRoots: [ALLOWLIST_ROOT],
        artifactPaths: [`${ALLOWLIST_ROOT}/prd.md`]
      },
      {
        documentReader: () => ({
          content:
            '---\nstepsCompleted:\n  - H01\ninputDocuments:\n  - briefing.md\n---\nPRD content'
        })
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 1,
        ingestedCount: 1,
        rejectedCount: 0,
        metadataValidatedCount: 1
      }
    });
  });

  it('handles yaml parser edge errors without crashing lot processing', () => {
    const indentationError = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/invalid.yaml`,
          content: '  orphan: value'
        }
      ]
    });

    expect(indentationError).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_PARSE_FAILED'
    });

    const keyError = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/invalid.yaml`,
          content: 'not-a-key-value-line'
        }
      ]
    });

    expect(keyError.reasonCode).toBe('ARTIFACT_PARSE_FAILED');

    const listFormatError = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/invalid.yaml`,
          content: 'stepsCompleted:\n  value-without-list-marker'
        }
      ]
    });

    expect(listFormatError.reasonCode).toBe('ARTIFACT_PARSE_FAILED');

    const emptyListItem = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/invalid.yaml`,
          content: 'stepsCompleted:\n  -\ninputDocuments:\n  - prd.md'
        }
      ]
    });

    expect(emptyListItem.reasonCode).toBe('ARTIFACT_PARSE_FAILED');
  });

  it('supports inline yaml arrays and quoted scalar parsing', () => {
    const result = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/epics.md`,
          content:
            '---\nstepsCompleted: ["H08", "H09", "H10"]\ninputDocuments:\n  - "prd.md"\n  - \'ux.md\'\n---\nEpics'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        metadataValidatedCount: 1
      }
    });
    expect(result.ingestedArtifacts[0].metadata).toEqual({
      stepsCompleted: ['H08', 'H09', 'H10'],
      inputDocuments: ['prd.md', 'ux.md']
    });
  });

  it('rejects malformed inline yaml arrays with explicit parse error', () => {
    const unclosedInline = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/invalid.yaml`,
          content: 'stepsCompleted: [H01, H02\ninputDocuments: [prd.md]'
        }
      ]
    });

    expect(unclosedInline.reasonCode).toBe('ARTIFACT_PARSE_FAILED');

    const emptyInlineValue = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/invalid.yaml`,
          content: 'stepsCompleted: [H01, ,H03]\ninputDocuments: [prd.md]'
        }
      ]
    });

    expect(emptyInlineValue.reasonCode).toBe('ARTIFACT_PARSE_FAILED');
  });

  it('treats custom majorArtifactNames strictly', () => {
    const missingCustomMetadata = ingestBmadArtifacts(
      {
        allowlistRoots: [ALLOWLIST_ROOT],
        artifactDocuments: [
          {
            path: `${ALLOWLIST_ROOT}/custom-gate.md`,
            content: '# no metadata'
          }
        ],
        majorArtifactNames: ['custom-gate.md']
      },
      {
        majorArtifactNames: ['overridden-ignored.md']
      }
    );

    expect(missingCustomMetadata).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_METADATA_MISSING',
      diagnostics: {
        missingMetadataCount: 1
      }
    });
  });

  it('supports custom allowedExtensions and can reject markdown when extension list is restricted', () => {
    const result = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      allowedExtensions: ['.yaml'],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/research.md`,
          content: '# markdown not allowed by policy override'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'UNSUPPORTED_ARTIFACT_TYPE',
      correctiveActions: ['REMOVE_UNSUPPORTED_ARTIFACTS']
    });
  });

  it('deduplicates corrective actions when multiple rejections share the same reason', () => {
    const result = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/payload-a.json`,
          content: '{}'
        },
        {
          path: `${ALLOWLIST_ROOT}/payload-b.json`,
          content: '{}'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'UNSUPPORTED_ARTIFACT_TYPE'
    });
    expect(result.correctiveActions).toEqual(['REMOVE_UNSUPPORTED_ARTIFACTS']);
  });

  it('handles monotonicity issues from custom nowMs provider without negative durations', () => {
    const nowValues = [100, 90, 80, 70, 60, 50, 40];

    const nowMs = () => nowValues.shift() ?? 40;

    const result = ingestBmadArtifacts(
      {
        allowlistRoots: [ALLOWLIST_ROOT],
        artifactDocuments: [
          {
            path: `${ALLOWLIST_ROOT}/research.md`,
            content: '# doc'
          }
        ]
      },
      {
        nowMs
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK'
    });
    expect(result.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.diagnostics.p95IngestMs).toBeGreaterThanOrEqual(0);
  });

  it('guards non-finite timing values and non-object runtime options', () => {
    const nowValues = [NaN, NaN, NaN, NaN, NaN, NaN];
    const result = ingestBmadArtifacts(
      {
        allowlistRoots: [ALLOWLIST_ROOT],
        artifactDocuments: [
          {
            path: `${ALLOWLIST_ROOT}/research.md`,
            content: '# doc'
          }
        ]
      },
      {
        nowMs: () => nowValues.shift() ?? NaN
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        durationMs: 0,
        p95IngestMs: 0
      }
    });

    const nonObjectOptions = ingestBmadArtifacts(
      {
        allowlistRoots: [ALLOWLIST_ROOT],
        artifactDocuments: [
          {
            path: `${ALLOWLIST_ROOT}/research.md`,
            content: '# doc'
          }
        ]
      },
      'runtime-options-not-object'
    );

    expect(nonObjectOptions).toMatchObject({
      allowed: true,
      reasonCode: 'OK'
    });
  });

  it('deduplicates duplicated allowlist roots and accepts root-equal path before extension validation', () => {
    const duplicatedRoots = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT, ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/research.md`,
          content: '# doc'
        }
      ]
    });

    expect(duplicatedRoots).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        allowlistRoots: [ALLOWLIST_ROOT]
      }
    });

    const rootEqualPath = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: ALLOWLIST_ROOT,
          content: '# root path'
        }
      ]
    });

    expect(rootEqualPath).toMatchObject({
      allowed: false,
      reasonCode: 'UNSUPPORTED_ARTIFACT_TYPE'
    });
  });

  it('covers yaml parser success branches for empty payloads, comments and blank nested lines', () => {
    const emptyYaml = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/empty.yaml`,
          content: ''
        }
      ]
    });

    expect(emptyYaml).toMatchObject({
      allowed: true,
      reasonCode: 'OK'
    });

    const commentsAndInlineEmptyArray = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/commented.yaml`,
          content: '# heading comment\ntags: []\nnotes:\n  # inside list comment\n\n  - first\n  - second'
        }
      ]
    });

    expect(commentsAndInlineEmptyArray).toMatchObject({
      allowed: true,
      reasonCode: 'OK'
    });
    expect(commentsAndInlineEmptyArray.ingestedArtifacts[0].metadata).toEqual({
      tags: [],
      notes: ['first', 'second']
    });
  });

  it('covers frontmatter parse failure and missing-list branch on major artifacts', () => {
    const invalidFrontmatterYaml = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: '---\nstepsCompleted:\n  invalid-line\n---\ncontent'
        }
      ]
    });

    expect(invalidFrontmatterYaml).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_PARSE_FAILED'
    });

    const nullListValue = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: '---\nstepsCompleted:\ninputDocuments:\n  - source.md\n---\ncontent'
        }
      ]
    });

    expect(nullListValue).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_METADATA_MISSING',
      diagnostics: {
        missingMetadataCount: 1
      }
    });
  });

  it('covers metadata invalid non-empty array branch and thrown-string read errors', () => {
    const invalidMetadataEntry = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/readiness-check.md`,
          content:
            '---\nstepsCompleted:\n  - H01\n  - "   "\ninputDocuments:\n  - source.md\n---\ncontent'
        }
      ]
    });

    expect(invalidMetadataEntry).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_METADATA_INVALID'
    });
    expect(invalidMetadataEntry.rejectedArtifacts[0].metadataErrors).toEqual([
      'stepsCompleted doit contenir uniquement des chaînes non vides.'
    ]);

    const readThrowString = ingestBmadArtifacts(
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

    expect(readThrowString).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_READ_FAILED'
    });
    expect(readThrowString.reason).toContain('raw-reader-error');
  });

  it('rejects invalid majorArtifactNames type when provided as non-array', () => {
    const result = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      majorArtifactNames: 'prd.md',
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/research.md`,
          content: '# doc'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_ARTIFACT_INGESTION_INPUT'
    });
    expect(result.reason).toContain('majorArtifactNames invalide');
  });

  it('does not mutate input payloads', () => {
    const input = {
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content:
            '---\nstepsCompleted:\n  - H01\ninputDocuments:\n  - source.md\n---\ncontent',
          nested: {
            tags: ['a', 'b']
          }
        }
      ]
    };

    const snapshot = JSON.parse(JSON.stringify(input));

    ingestBmadArtifacts(input, {
      allowedExtensions: ['.md', '.yaml'],
      majorArtifactNames: ['prd.md']
    });

    expect(input).toEqual(snapshot);
  });
});
