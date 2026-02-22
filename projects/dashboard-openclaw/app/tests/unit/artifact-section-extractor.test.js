import { describe, expect, it, vi } from 'vitest';
import { extractArtifactSectionsForNavigation } from '../../src/artifact-section-extractor.js';
import { extractArtifactSectionsForNavigation as extractFromIndex } from '../../src/index.js';

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
  'INVALID_SECTION_EXTRACTION_INPUT'
]);

function markdownWithMetadata({
  stepsCompleted = ['H01'],
  inputDocuments = ['brief.md'],
  headings = ['## Section'],
  body = 'Contenu de test.'
}) {
  const steps = stepsCompleted.map((entry) => `  - ${entry}`).join('\n');
  const inputs = inputDocuments.map((entry) => `  - ${entry}`).join('\n');
  const headingsBlock = headings.join('\n');

  return `---\nstepsCompleted:\n${steps}\ninputDocuments:\n${inputs}\n---\n${headingsBlock}\n${body}`;
}

function markdownWithoutMetadata({ headings = ['## Section'], body = 'Contenu de test.' } = {}) {
  return `${headings.join('\n')}\n${body}`;
}

describe('artifact-section-extractor unit', () => {
  it('returns nominal OK extraction for markdown artifacts with H2/H3 sections', () => {
    const result = extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata({
            stepsCompleted: ['H01', 'H02'],
            inputDocuments: ['brief.md', 'research.md'],
            headings: ['## Contexte', '### Objectif', '## Portée']
          })
        },
        {
          path: `${ALLOWLIST_ROOT}/notes-techniques.md`,
          content: markdownWithoutMetadata({
            headings: ['## Décisions', '### Impact']
          })
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 2,
        processedCount: 2,
        extractedCount: 2,
        nonExtractedCount: 0,
        sectionCount: 5,
        h2Count: 3,
        h3Count: 2,
        missingSectionsCount: 0,
        allowlistRoots: [ALLOWLIST_ROOT]
      },
      nonExtractedArtifacts: [],
      correctiveActions: []
    });

    expect(result.extractedArtifacts).toHaveLength(2);

    for (const artifact of result.extractedArtifacts) {
      expect(artifact.tableIndexEligible).toBe(true);
      expect(artifact.sectionCount).toBeGreaterThan(0);

      for (const section of artifact.sections) {
        expect([2, 3]).toContain(section.headingLevel);
        expect(section.startLine).toBeGreaterThan(0);
        expect(section.endLine).toBeGreaterThanOrEqual(section.startLine);
        expect(typeof section.anchor).toBe('string');
        expect(section.anchor.length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps deterministic section ordering, anchors and H3 parentHeadingId hierarchy', () => {
    const result = extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata({
            headings: ['## Vision Produit', '### Scope', '### Scope', '## Livraison', '### Échéances'],
            body: 'Texte.'
          })
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requestedCount: 1,
        extractedCount: 1,
        sectionCount: 5,
        h2Count: 2,
        h3Count: 3
      }
    });

    const sections = result.extractedArtifacts[0].sections;

    expect(sections.map((section) => section.anchor)).toEqual([
      'vision-produit',
      'scope',
      'scope-2',
      'livraison',
      'echeances'
    ]);

    const h2Sections = sections.filter((section) => section.headingLevel === 2);
    const firstH2Id = h2Sections[0].headingId;
    const secondH2Id = h2Sections[1].headingId;

    expect(sections[1].parentHeadingId).toBe(firstH2Id);
    expect(sections[2].parentHeadingId).toBe(firstH2Id);
    expect(sections[4].parentHeadingId).toBe(secondH2Id);
    expect(sections[0].parentHeadingId).toBeNull();
    expect(sections[3].parentHeadingId).toBeNull();

    for (let index = 0; index < sections.length; index += 1) {
      if (index > 0) {
        expect(sections[index].startLine).toBeGreaterThanOrEqual(sections[index - 1].startLine);
      }

      expect(sections[index].endLine).toBeGreaterThanOrEqual(sections[index].startLine);
    }
  });

  it('returns ARTIFACT_SECTIONS_MISSING when targeted markdown has no H2/H3 sections', () => {
    const result = extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata({
            headings: ['# Titre principal'],
            body: 'Aucune section secondaire.'
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
        extractedCount: 0,
        nonExtractedCount: 1,
        sectionCount: 0,
        missingSectionsCount: 1
      }
    });

    expect(result.nonExtractedArtifacts[0]).toMatchObject({
      reasonCode: 'ARTIFACT_SECTIONS_MISSING',
      sectionErrors: ['Aucune section H2/H3 exploitable détectée dans le contenu markdown.']
    });
    expect(result.correctiveActions).toContain('ADD_STRUCTURED_HEADINGS');
  });

  it('integrates S012 metadata guard and returns ARTIFACT_METADATA_MISSING when metadata is absent', () => {
    const result = extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithoutMetadata({ headings: ['## Contexte', '### Objectif'] })
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_METADATA_MISSING',
      diagnostics: {
        requestedCount: 1,
        processedCount: 0,
        extractedCount: 0,
        nonExtractedCount: 1
      }
    });
    expect(result.nonExtractedArtifacts[0]).toMatchObject({
      reasonCode: 'ARTIFACT_METADATA_MISSING',
      missingFields: ['stepsCompleted', 'inputDocuments']
    });
    expect(result.correctiveActions).toContain('ADD_REQUIRED_METADATA');
  });

  it('integrates S012 metadata guard and returns ARTIFACT_METADATA_INVALID when metadata shape is invalid', () => {
    const result = extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/architecture.md`,
          content:
            '---\nstepsCompleted: done\ninputDocuments:\n  - prd.md\n---\n## Contexte\n### Contraintes'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_METADATA_INVALID',
      diagnostics: {
        requestedCount: 1,
        extractedCount: 0,
        nonExtractedCount: 1
      }
    });

    expect(result.nonExtractedArtifacts[0]).toMatchObject({
      reasonCode: 'ARTIFACT_METADATA_INVALID',
      metadataErrors: ['stepsCompleted doit être un tableau non vide de chaînes.']
    });
    expect(result.correctiveActions).toContain('FIX_INVALID_METADATA');
  });

  it('returns ARTIFACT_PATH_NOT_ALLOWED for artifacts outside allowlist', () => {
    const result = extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: '/tmp/forbidden/prd.md',
          content: markdownWithMetadata({ headings: ['## Contexte'] })
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
    const result = extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/payload.yaml`,
          content: 'stepsCompleted:\n  - H01\ninputDocuments:\n  - brief.md'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'UNSUPPORTED_ARTIFACT_TYPE',
      diagnostics: {
        requestedCount: 1,
        extractedCount: 0,
        nonExtractedCount: 1
      },
      correctiveActions: ['REMOVE_UNSUPPORTED_ARTIFACTS']
    });
  });

  it('returns ARTIFACT_PARSE_FAILED for invalid markdown frontmatter', () => {
    const result = extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: '---\nstepsCompleted:\n  - H01\ninputDocuments:\n  - brief.md\n## Missing frontmatter closing'
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'ARTIFACT_PARSE_FAILED'
    });
    expect(result.correctiveActions).toContain('FIX_ARTIFACT_SYNTAX');
  });

  it('supports artifactPaths source with documentReader and tracks ARTIFACT_READ_FAILED entries', () => {
    const documentReader = vi.fn((artifactPath) => {
      if (artifactPath.endsWith('broken.md')) {
        throw new Error('disk timeout');
      }

      if (artifactPath.endsWith('invalid-shape.md')) {
        return {
          payload: 'invalid'
        };
      }

      return markdownWithMetadata({
        headings: ['## Contexte', '### Objectif']
      });
    });

    const result = extractArtifactSectionsForNavigation(
      {
        allowlistRoots: [ALLOWLIST_ROOT],
        artifactPaths: [
          `${ALLOWLIST_ROOT}/prd.md`,
          `${ALLOWLIST_ROOT}/broken.md`,
          `${ALLOWLIST_ROOT}/invalid-shape.md`
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
        extractedCount: 1,
        nonExtractedCount: 2
      }
    });
    expect(result.correctiveActions).toContain('RETRY_ARTIFACT_READ');
  });

  it('returns INVALID_SECTION_EXTRACTION_INPUT when source is missing', () => {
    const result = extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT]
    });

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
        missingSectionsCount: 0
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
        headings: ['## Overview', '### Details'],
        body: `Evidence ${index}`
      })
    }));

    const result = extractArtifactSectionsForNavigation({
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
        extractedCount: 500,
        nonExtractedCount: 0,
        sectionCount: 1000,
        h2Count: 500,
        h3Count: 500,
        missingSectionsCount: 0
      }
    });

    expect(result.diagnostics.p95ExtractionMs).toBeLessThanOrEqual(2000);
    expect(result.diagnostics.durationMs).toBeLessThan(60000);
    expect(result.diagnostics.processedCount + result.diagnostics.nonExtractedCount).toBe(
      result.diagnostics.requestedCount
    );
  });

  it('keeps stable output contract and index export', () => {
    const result = extractFromIndex({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata({
            headings: ['## Contexte', '### Objectif']
          })
        }
      ]
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('extractedArtifacts');
    expect(result).toHaveProperty('nonExtractedArtifacts');
    expect(result).toHaveProperty('correctiveActions');

    expect(typeof result.allowed).toBe('boolean');
    expect(REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(typeof result.reason).toBe('string');

    expect(result.diagnostics).toHaveProperty('requestedCount');
    expect(result.diagnostics).toHaveProperty('processedCount');
    expect(result.diagnostics).toHaveProperty('extractedCount');
    expect(result.diagnostics).toHaveProperty('nonExtractedCount');
    expect(result.diagnostics).toHaveProperty('sectionCount');
    expect(result.diagnostics).toHaveProperty('h2Count');
    expect(result.diagnostics).toHaveProperty('h3Count');
    expect(result.diagnostics).toHaveProperty('missingSectionsCount');
    expect(result.diagnostics).toHaveProperty('allowlistRoots');
    expect(result.diagnostics).toHaveProperty('durationMs');
    expect(result.diagnostics).toHaveProperty('p95ExtractionMs');

    expect(Array.isArray(result.extractedArtifacts)).toBe(true);
    expect(Array.isArray(result.nonExtractedArtifacts)).toBe(true);
    expect(Array.isArray(result.correctiveActions)).toBe(true);
  });
});
