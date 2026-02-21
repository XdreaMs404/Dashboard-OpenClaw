import { describe, expect, it, vi } from 'vitest';
import { validateArtifactMetadataCompliance } from '../../src/artifact-metadata-validator.js';
import { validateArtifactMetadataCompliance as validateFromIndex } from '../../src/index.js';

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
  'INVALID_METADATA_VALIDATION_INPUT'
]);

function markdownWithMetadata({ stepsCompleted, inputDocuments, body = 'Document de référence.' }) {
  const steps = stepsCompleted.map((entry) => `  - ${entry}`).join('\n');
  const inputs = inputDocuments.map((entry) => `  - ${entry}`).join('\n');

  return `---\nstepsCompleted:\n${steps}\ninputDocuments:\n${inputs}\n---\n${body}`;
}

describe('artifact-metadata-validator unit', () => {
  it('returns nominal OK compliance result for valid markdown/yaml artifacts under allowlist', () => {
    const result = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata({
            stepsCompleted: ['H01', 'H02', 'H03'],
            inputDocuments: ['brainstorming-report.md', 'research-market.md']
          })
        },
        {
          path: `${ALLOWLIST_ROOT}/architecture.md`,
          content: markdownWithMetadata({
            stepsCompleted: ['H08', 'H09', 'H10'],
            inputDocuments: ['prd.md', 'ux.md']
          })
        },
        {
          path: `${ALLOWLIST_ROOT}/notes.yaml`,
          content: 'owner: pm\nstatus: stable'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 3,
        validatedCount: 3,
        compliantCount: 3,
        nonCompliantCount: 0,
        missingMetadataCount: 0,
        invalidMetadataCount: 0,
        allowlistRoots: [ALLOWLIST_ROOT]
      },
      nonCompliantArtifacts: [],
      correctiveActions: []
    });

    expect(result.compliantArtifacts).toHaveLength(3);
    expect(result.compliantArtifacts[0]).toMatchObject({
      path: `${ALLOWLIST_ROOT}/prd.md`,
      extension: '.md',
      isTargetArtifact: true,
      sectionExtractionEligible: true,
      metadata: {
        stepsCompleted: ['H01', 'H02', 'H03'],
        inputDocuments: ['brainstorming-report.md', 'research-market.md']
      }
    });
  });

  it('returns ARTIFACT_METADATA_MISSING when required fields are absent on targeted artifact', () => {
    const result = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: '# PRD without metadata'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_METADATA_MISSING',
      diagnostics: {
        requestedCount: 1,
        validatedCount: 1,
        compliantCount: 0,
        nonCompliantCount: 1,
        missingMetadataCount: 1,
        invalidMetadataCount: 0
      }
    });

    expect(result.nonCompliantArtifacts[0]).toMatchObject({
      reasonCode: 'ARTIFACT_METADATA_MISSING',
      missingFields: ['stepsCompleted', 'inputDocuments']
    });
    expect(result.correctiveActions).toContain('ADD_REQUIRED_METADATA');
  });

  it('returns ARTIFACT_METADATA_INVALID when metadata shape is not compliant', () => {
    const result = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/architecture.md`,
          content: `---\nstepsCompleted: done\ninputDocuments:\n  - prd.md\n---\nArchitecture` // invalid stepsCompleted
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_METADATA_INVALID',
      diagnostics: {
        requestedCount: 1,
        validatedCount: 1,
        compliantCount: 0,
        nonCompliantCount: 1,
        missingMetadataCount: 0,
        invalidMetadataCount: 1
      }
    });

    expect(result.nonCompliantArtifacts[0]).toMatchObject({
      reasonCode: 'ARTIFACT_METADATA_INVALID',
      metadataErrors: ['stepsCompleted doit être un tableau non vide de chaînes.']
    });
    expect(result.correctiveActions).toContain('FIX_INVALID_METADATA');
  });

  it('returns ARTIFACT_PATH_NOT_ALLOWED for artifact outside allowlist', () => {
    const result = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: '/etc/forbidden/prd.md',
          content: markdownWithMetadata({
            stepsCompleted: ['H01'],
            inputDocuments: ['brief.md']
          })
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_PATH_NOT_ALLOWED',
      diagnostics: {
        requestedCount: 1,
        validatedCount: 1,
        compliantCount: 0,
        nonCompliantCount: 1
      },
      correctiveActions: ['RESTRICT_TO_ALLOWED_ROOTS']
    });
  });

  it('returns UNSUPPORTED_ARTIFACT_TYPE for unsupported extension', () => {
    const result = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/payload.json`,
          content: '{"invalid":true}'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'UNSUPPORTED_ARTIFACT_TYPE',
      correctiveActions: ['REMOVE_UNSUPPORTED_ARTIFACTS']
    });
  });

  it('returns ARTIFACT_PARSE_FAILED for invalid markdown frontmatter and yaml payloads', () => {
    const markdownFailure = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/ux.md`,
          content: '---\nstepsCompleted:\n  - H05\ninputDocuments:\n  - prd.md\n# delimiter missing'
        }
      ]
    });

    expect(markdownFailure).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_PARSE_FAILED'
    });

    const yamlFailure = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/manifest.yaml`,
          content: 'stepsCompleted: [H01, H02\ninputDocuments:\n  - prd.md'
        }
      ]
    });

    expect(yamlFailure).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_PARSE_FAILED'
    });
  });

  it('supports artifactPaths source with documentReader and tracks ARTIFACT_READ_FAILED entries', () => {
    const documentReader = vi.fn((artifactPath) => {
      if (artifactPath.endsWith('broken.md')) {
        throw new Error('disk I/O timeout');
      }

      if (artifactPath.endsWith('non-string.md')) {
        return {
          payload: 'invalid-shape'
        };
      }

      return markdownWithMetadata({
        stepsCompleted: ['H04', 'H05'],
        inputDocuments: ['prd.md', 'ux.md']
      });
    });

    const result = validateArtifactMetadataCompliance(
      {
        allowlistRoots: [ALLOWLIST_ROOT],
        artifactPaths: [
          `${ALLOWLIST_ROOT}/readiness-check.md`,
          `${ALLOWLIST_ROOT}/broken.md`,
          `${ALLOWLIST_ROOT}/non-string.md`
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
        validatedCount: 3,
        compliantCount: 1,
        nonCompliantCount: 2
      }
    });
    expect(result.correctiveActions).toContain('RETRY_ARTIFACT_READ');
  });

  it('returns INVALID_METADATA_VALIDATION_INPUT when source is missing', () => {
    const result = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_METADATA_VALIDATION_INPUT',
      diagnostics: {
        requestedCount: 0,
        validatedCount: 0,
        compliantCount: 0,
        nonCompliantCount: 0
      }
    });
    expect(result.reason).toContain('artifactDocuments ou artifactPaths est requis');
  });

  it('prepares FR-023 by marking compliant artifacts as sectionExtractionEligible=true', () => {
    const result = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata({
            stepsCompleted: ['H01', 'H02'],
            inputDocuments: ['brief.md']
          })
        },
        {
          path: `${ALLOWLIST_ROOT}/custom-guide.md`,
          content: '# No mandatory metadata because non-target by default'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK'
    });

    for (const artifact of result.compliantArtifacts) {
      expect(artifact.sectionExtractionEligible).toBe(true);
    }
  });

  it('meets p95 and total duration constraints on synthetic corpus of 500 docs', () => {
    const artifactDocuments = Array.from({ length: 500 }, (_, index) => ({
      path: `${ALLOWLIST_ROOT}/evidence-${index}.md`,
      content: markdownWithMetadata({
        stepsCompleted: ['H01', 'H02', 'H03'],
        inputDocuments: [`source-${index}.md`],
        body: `Evidence ${index}`
      })
    }));

    const result = validateArtifactMetadataCompliance({
      allowlistRoots: [ALLOWLIST_ROOT],
      targetArtifactNames: artifactDocuments.map((artifact) => artifact.path.split('/').at(-1)),
      artifactDocuments
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 500,
        validatedCount: 500,
        compliantCount: 500,
        nonCompliantCount: 0
      }
    });

    expect(result.diagnostics.p95ValidationMs).toBeLessThanOrEqual(2000);
    expect(result.diagnostics.durationMs).toBeLessThan(60000);
  });

  it('keeps stable output contract and index export', () => {
    const result = validateFromIndex({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata({
            stepsCompleted: ['H01'],
            inputDocuments: ['brief.md']
          })
        }
      ]
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('compliantArtifacts');
    expect(result).toHaveProperty('nonCompliantArtifacts');
    expect(result).toHaveProperty('correctiveActions');

    expect(typeof result.allowed).toBe('boolean');
    expect(REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(typeof result.reason).toBe('string');

    expect(result.diagnostics).toHaveProperty('requestedCount');
    expect(result.diagnostics).toHaveProperty('validatedCount');
    expect(result.diagnostics).toHaveProperty('compliantCount');
    expect(result.diagnostics).toHaveProperty('nonCompliantCount');
    expect(result.diagnostics).toHaveProperty('missingMetadataCount');
    expect(result.diagnostics).toHaveProperty('invalidMetadataCount');
    expect(result.diagnostics).toHaveProperty('allowlistRoots');
    expect(result.diagnostics).toHaveProperty('durationMs');
    expect(result.diagnostics).toHaveProperty('p95ValidationMs');

    expect(Array.isArray(result.compliantArtifacts)).toBe(true);
    expect(Array.isArray(result.nonCompliantArtifacts)).toBe(true);
    expect(Array.isArray(result.correctiveActions)).toBe(true);
  });
});
