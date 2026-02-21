import { describe, expect, it } from 'vitest';
import { validateArtifactMetadataCompliance } from '../../src/artifact-metadata-validator.js';

const ALLOWLIST_ROOT =
  '/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts';

describe('artifact-metadata-validator edge cases', () => {
  it('fails closed on non-object input payloads', () => {
    const samples = [undefined, null, true, 42, 'S012'];

    for (const sample of samples) {
      const result = validateArtifactMetadataCompliance(sample);

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_METADATA_VALIDATION_INPUT',
        diagnostics: {
          requestedCount: 0,
          validatedCount: 0,
          compliantCount: 0,
          nonCompliantCount: 0,
          missingMetadataCount: 0,
          invalidMetadataCount: 0,
          allowlistRoots: []
        },
        compliantArtifacts: [],
        nonCompliantArtifacts: [],
        correctiveActions: []
      });
    }
  });

  it('rejects invalid allowlistRoots values', () => {
    const missing = validateArtifactMetadataCompliance({
      artifactDocuments: []
    });

    expect(missing).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_METADATA_VALIDATION_INPUT'
    });
    expect(missing.reason).toContain('allowlistRoots est requis');

    const blankRoot = validateArtifactMetadataCompliance({
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
      reasonCode: 'INVALID_METADATA_VALIDATION_INPUT'
    });
    expect(blankRoot.reason).toContain('allowlistRoots[0] invalide');
  });

  it('rejects invalid allowedExtensions and targetArtifactNames values', () => {
    const invalidExtensionsType = validateArtifactMetadataCompliance({
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
      reasonCode: 'INVALID_METADATA_VALIDATION_INPUT'
    });
    expect(invalidExtensionsType.reason).toContain('allowedExtensions invalide');

    const invalidExtensionsEntry = validateArtifactMetadataCompliance({
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
      reasonCode: 'INVALID_METADATA_VALIDATION_INPUT'
    });
    expect(invalidExtensionsEntry.reason).toContain('allowedExtensions[0] invalide');

    const invalidTargetNamesType = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT],
      targetArtifactNames: 'prd.md',
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/research.md`,
          content: '# doc'
        }
      ]
    });

    expect(invalidTargetNamesType.reasonCode).toBe('INVALID_METADATA_VALIDATION_INPUT');
    expect(invalidTargetNamesType.reason).toContain('targetArtifactNames invalide');

    const invalidTargetNameEntry = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT],
      targetArtifactNames: [''],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/research.md`,
          content: '# doc'
        }
      ]
    });

    expect(invalidTargetNameEntry.reasonCode).toBe('INVALID_METADATA_VALIDATION_INPUT');
    expect(invalidTargetNameEntry.reason).toContain('targetArtifactNames[0] invalide');
  });

  it('validates artifactDocuments shape strictly', () => {
    const invalidType = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: 'not-array'
    });

    expect(invalidType.reasonCode).toBe('INVALID_METADATA_VALIDATION_INPUT');

    const emptyArray = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: []
    });

    expect(emptyArray.reasonCode).toBe('INVALID_METADATA_VALIDATION_INPUT');

    const invalidEntry = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [null]
    });

    expect(invalidEntry.reasonCode).toBe('INVALID_METADATA_VALIDATION_INPUT');
    expect(invalidEntry.reason).toContain('artifactDocuments[0] doit être un objet');

    const missingPath = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          content: '# doc'
        }
      ]
    });

    expect(missingPath.reasonCode).toBe('INVALID_METADATA_VALIDATION_INPUT');
    expect(missingPath.reason).toContain('artifactDocuments[0].path doit être une chaîne non vide');

    const invalidContent = validateArtifactMetadataCompliance({
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

    expect(invalidContent.reasonCode).toBe('INVALID_METADATA_VALIDATION_INPUT');
    expect(invalidContent.reason).toContain('artifactDocuments[0].content doit être une chaîne');
  });

  it('validates artifactPaths source and documentReader contract strictly', () => {
    const invalidPathsType = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactPaths: 'not-array'
    });

    expect(invalidPathsType.reasonCode).toBe('INVALID_METADATA_VALIDATION_INPUT');

    const emptyPaths = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactPaths: []
    });

    expect(emptyPaths.reasonCode).toBe('INVALID_METADATA_VALIDATION_INPUT');

    const missingReader = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactPaths: [`${ALLOWLIST_ROOT}/prd.md`]
    });

    expect(missingReader.reasonCode).toBe('INVALID_METADATA_VALIDATION_INPUT');
    expect(missingReader.reason).toContain('options.documentReader est requis');

    const invalidPathValue = validateArtifactMetadataCompliance(
      {
        allowlistRoots: [ALLOWLIST_ROOT],
        artifactPaths: ['   ']
      },
      {
        documentReader: () => '# content'
      }
    );

    expect(invalidPathValue.reasonCode).toBe('INVALID_METADATA_VALIDATION_INPUT');
    expect(invalidPathValue.reason).toContain('artifactPaths[0] doit être une chaîne non vide');
  });

  it('accepts documentReader object payload shape { content } and runtime majorArtifactNames alias', () => {
    const result = validateArtifactMetadataCompliance(
      {
        allowlistRoots: [ALLOWLIST_ROOT],
        artifactPaths: [`${ALLOWLIST_ROOT}/custom.md`]
      },
      {
        majorArtifactNames: ['custom.md'],
        documentReader: () => ({
          content:
            '---\nstepsCompleted:\n  - H01\ninputDocuments:\n  - briefing.md\n---\nCustom content'
        })
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 1,
        validatedCount: 1,
        compliantCount: 1,
        nonCompliantCount: 0
      }
    });
    expect(result.compliantArtifacts[0]).toMatchObject({
      isTargetArtifact: true,
      sectionExtractionEligible: true
    });
  });

  it('handles yaml parser edge errors without crashing lot processing', () => {
    const indentationError = validateArtifactMetadataCompliance({
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

    const keyError = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/invalid.yaml`,
          content: 'not-a-key-value-line'
        }
      ]
    });

    expect(keyError.reasonCode).toBe('ARTIFACT_PARSE_FAILED');

    const listFormatError = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/invalid.yaml`,
          content: 'stepsCompleted:\n  value-without-list-marker'
        }
      ]
    });

    expect(listFormatError.reasonCode).toBe('ARTIFACT_PARSE_FAILED');

    const emptyListItem = validateArtifactMetadataCompliance({
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
    const result = validateArtifactMetadataCompliance({
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
        compliantCount: 1
      }
    });
    expect(result.compliantArtifacts[0].metadata).toEqual({
      stepsCompleted: ['H08', 'H09', 'H10'],
      inputDocuments: ['prd.md', 'ux.md']
    });
  });

  it('rejects malformed inline yaml arrays with explicit parse error', () => {
    const unclosedInline = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/invalid.yaml`,
          content: 'stepsCompleted: [H01, H02\ninputDocuments: [prd.md]'
        }
      ]
    });

    expect(unclosedInline.reasonCode).toBe('ARTIFACT_PARSE_FAILED');

    const emptyInlineValue = validateArtifactMetadataCompliance({
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

  it('covers parser success branches for empty yaml payload and comment-only lines', () => {
    const emptyYaml = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/meta.yaml`,
          content: ''
        }
      ]
    });

    expect(emptyYaml).toMatchObject({
      allowed: true,
      reasonCode: 'OK'
    });

    const commented = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/commented.yaml`,
          content: '# header\n\nkey: value\nlist:\n  # comment\n\n  - first\n  - second'
        }
      ]
    });

    expect(commented).toMatchObject({
      allowed: true,
      reasonCode: 'OK'
    });
    expect(commented.compliantArtifacts[0].metadata).toEqual({
      key: 'value',
      list: ['first', 'second']
    });
  });

  it('covers metadata branches for missing list values and invalid non-empty entries', () => {
    const missingFieldByNull = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: '---\nstepsCompleted:\ninputDocuments:\n  - source.md\n---\ncontent'
        }
      ]
    });

    expect(missingFieldByNull).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_METADATA_MISSING',
      diagnostics: {
        missingMetadataCount: 1,
        invalidMetadataCount: 0
      }
    });

    const invalidNonEmptyEntries = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/readiness-check.md`,
          content:
            '---\nstepsCompleted:\n  - H01\n  - "   "\ninputDocuments:\n  - source.md\n---\ncontent'
        }
      ]
    });

    expect(invalidNonEmptyEntries).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_METADATA_INVALID',
      diagnostics: {
        missingMetadataCount: 0,
        invalidMetadataCount: 1
      }
    });
  });

  it('uses rejection priority deterministically and deduplicates corrective actions', () => {
    const result = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: '/external/forbidden/prd.md',
          content:
            '---\nstepsCompleted:\n  - H01\ninputDocuments:\n  - brief.md\n---\ncontent'
        },
        {
          path: `${ALLOWLIST_ROOT}/payload.json`,
          content: '{}'
        },
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: '# missing metadata'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_PATH_NOT_ALLOWED'
    });
    expect(result.correctiveActions).toEqual(
      expect.arrayContaining([
        'RESTRICT_TO_ALLOWED_ROOTS',
        'REMOVE_UNSUPPORTED_ARTIFACTS',
        'ADD_REQUIRED_METADATA'
      ])
    );
  });

  it('counts non-compliant read failures in validatedCount and supports thrown-string reader errors', () => {
    const result = validateArtifactMetadataCompliance(
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
        validatedCount: 1,
        compliantCount: 0,
        nonCompliantCount: 1
      }
    });
    expect(result.reason).toContain('raw-reader-error');
  });

  it('handles monotonic/non-finite nowMs values and keeps diagnostics non-negative', () => {
    const nowValues = [100, 90, NaN, 70, 60, 50, 40, 30, 20];

    const result = validateArtifactMetadataCompliance(
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
      reasonCode: 'OK'
    });
    expect(result.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.diagnostics.p95ValidationMs).toBeGreaterThanOrEqual(0);
  });

  it('does not mutate input payloads', () => {
    const input = {
      allowlistRoots: [ALLOWLIST_ROOT],
      targetArtifactNames: ['prd.md'],
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

    validateArtifactMetadataCompliance(input, {
      allowedExtensions: ['.md', '.yaml'],
      targetArtifactNames: ['override.md']
    });

    expect(input).toEqual(snapshot);
  });
});
