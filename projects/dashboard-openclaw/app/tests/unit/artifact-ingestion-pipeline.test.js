import { describe, expect, it, vi } from 'vitest';
import { ingestBmadArtifacts } from '../../src/artifact-ingestion-pipeline.js';
import { ingestBmadArtifacts as ingestFromIndex } from '../../src/index.js';

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
  'INVALID_ARTIFACT_INGESTION_INPUT'
]);

function markdownWithMetadata({ stepsCompleted, inputDocuments, body = 'Document de référence.' }) {
  const steps = stepsCompleted.map((entry) => `  - ${entry}`).join('\n');
  const inputs = inputDocuments.map((entry) => `  - ${entry}`).join('\n');

  return `---\nstepsCompleted:\n${steps}\ninputDocuments:\n${inputs}\n---\n${body}`;
}

describe('artifact-ingestion-pipeline unit', () => {
  it('ingests markdown/yaml artifacts under allowlist in nominal mode', () => {
    const result = ingestBmadArtifacts({
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
          path: `${ALLOWLIST_ROOT}/research.md`,
          content: '# Research\n\nSans frontmatter obligatoire car non-majeur.'
        },
        {
          path: `${ALLOWLIST_ROOT}/metadata.yml`,
          content: 'owner: pm\nnotes:\n  - baseline\n  - validated'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 4,
        ingestedCount: 4,
        rejectedCount: 0,
        metadataValidatedCount: 2,
        missingMetadataCount: 0,
        allowlistRoots: [ALLOWLIST_ROOT]
      },
      rejectedArtifacts: [],
      correctiveActions: []
    });

    expect(result.ingestedArtifacts).toHaveLength(4);
    expect(result.ingestedArtifacts[0]).toMatchObject({
      path: `${ALLOWLIST_ROOT}/prd.md`,
      extension: '.md',
      isMajorArtifact: true,
      metadata: {
        stepsCompleted: ['H01', 'H02', 'H03'],
        inputDocuments: ['brainstorming-report.md', 'research-market.md']
      }
    });
  });

  it('blocks artifacts outside allowlist and recommends RESTRICT_TO_ALLOWED_ROOTS', () => {
    const result = ingestBmadArtifacts({
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
        ingestedCount: 0,
        rejectedCount: 1
      }
    });
    expect(result.rejectedArtifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reasonCode: 'ARTIFACT_PATH_NOT_ALLOWED'
        })
      ])
    );
    expect(result.correctiveActions).toContain('RESTRICT_TO_ALLOWED_ROOTS');
  });

  it('blocks unsupported file extensions with UNSUPPORTED_ARTIFACT_TYPE', () => {
    const result = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/payload.json`,
          content: '{"status":"invalid"}'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'UNSUPPORTED_ARTIFACT_TYPE',
      diagnostics: {
        requestedCount: 1,
        ingestedCount: 0,
        rejectedCount: 1
      }
    });
  });

  it('rejects missing metadata for major artifacts and increments missingMetadataCount', () => {
    const result = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: '# PRD\n\nSans frontmatter obligatoire attendu sur artefact majeur.'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_METADATA_MISSING',
      diagnostics: {
        requestedCount: 1,
        ingestedCount: 0,
        rejectedCount: 1,
        metadataValidatedCount: 0,
        missingMetadataCount: 1
      }
    });

    expect(result.rejectedArtifacts[0]).toMatchObject({
      reasonCode: 'ARTIFACT_METADATA_MISSING',
      metadataErrors: ['stepsCompleted manquant', 'inputDocuments manquant']
    });
    expect(result.correctiveActions).toContain('ADD_REQUIRED_METADATA');
  });

  it('rejects invalid metadata format for major artifacts with explicit metadataErrors', () => {
    const result = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/architecture.md`,
          content: `---\nstepsCompleted: done\ninputDocuments:\n  - prd.md\n---\nArchitecture` // stepsCompleted invalid
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_METADATA_INVALID'
    });
    expect(result.rejectedArtifacts[0]).toMatchObject({
      reasonCode: 'ARTIFACT_METADATA_INVALID',
      metadataErrors: ['stepsCompleted doit être un tableau non vide de chaînes.']
    });
  });

  it('returns parse failures for invalid markdown frontmatter and yaml payloads', () => {
    const markdownFailure = ingestBmadArtifacts({
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

    const yamlFailure = ingestBmadArtifacts({
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

  it('supports artifactPaths source with documentReader and handles read failures', () => {
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

    const result = ingestBmadArtifacts(
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
        ingestedCount: 1,
        rejectedCount: 2,
        metadataValidatedCount: 1
      }
    });
    expect(result.correctiveActions).toContain('RETRY_ARTIFACT_READ');
  });

  it('fails with INVALID_ARTIFACT_INGESTION_INPUT when no source is available', () => {
    const result = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_ARTIFACT_INGESTION_INPUT',
      diagnostics: {
        requestedCount: 0,
        ingestedCount: 0,
        rejectedCount: 0
      }
    });
    expect(result.reason).toContain('artifactDocuments ou artifactPaths est requis');
  });

  it('uses rejection priority deterministically and deduplicates corrective actions', () => {
    const result = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: '/external/forbidden/prd.md',
          content: markdownWithMetadata({
            stepsCompleted: ['H01'],
            inputDocuments: ['brief.md']
          })
        },
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: '# Missing metadata major artifact'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_PATH_NOT_ALLOWED',
      diagnostics: {
        requestedCount: 2,
        ingestedCount: 0,
        rejectedCount: 2,
        missingMetadataCount: 1
      }
    });

    expect(result.correctiveActions).toEqual(
      expect.arrayContaining(['RESTRICT_TO_ALLOWED_ROOTS', 'ADD_REQUIRED_METADATA'])
    );
  });

  it('meets performance diagnostics constraints on synthetic corpus of 500 artifacts', () => {
    const artifactDocuments = Array.from({ length: 500 }, (_, index) => ({
      path: `${ALLOWLIST_ROOT}/research-${index}.md`,
      content: `# Evidence ${index}\n\nArtifact non majeur pour benchmark.`
    }));

    const result = ingestBmadArtifacts({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 500,
        ingestedCount: 500,
        rejectedCount: 0
      }
    });

    expect(result.diagnostics.p95IngestMs).toBeLessThanOrEqual(2000);
    expect(result.diagnostics.durationMs).toBeLessThan(5000);
  });

  it('keeps stable output contract and index export', () => {
    const result = ingestFromIndex({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata({
            stepsCompleted: ['H01', 'H02'],
            inputDocuments: ['brainstorming.md']
          })
        }
      ]
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('ingestedArtifacts');
    expect(result).toHaveProperty('rejectedArtifacts');
    expect(result).toHaveProperty('correctiveActions');

    expect(typeof result.allowed).toBe('boolean');
    expect(REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(typeof result.reason).toBe('string');

    expect(result.diagnostics).toHaveProperty('requestedCount');
    expect(result.diagnostics).toHaveProperty('ingestedCount');
    expect(result.diagnostics).toHaveProperty('rejectedCount');
    expect(result.diagnostics).toHaveProperty('metadataValidatedCount');
    expect(result.diagnostics).toHaveProperty('missingMetadataCount');
    expect(result.diagnostics).toHaveProperty('allowlistRoots');
    expect(result.diagnostics).toHaveProperty('durationMs');
    expect(result.diagnostics).toHaveProperty('p95IngestMs');

    expect(Array.isArray(result.ingestedArtifacts)).toBe(true);
    expect(Array.isArray(result.rejectedArtifacts)).toBe(true);
    expect(Array.isArray(result.correctiveActions)).toBe(true);
  });
});
