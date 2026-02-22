import path from 'node:path';
import { validateArtifactMetadataCompliance } from './artifact-metadata-validator.js';

const DEFAULT_ALLOWED_EXTENSIONS = Object.freeze(['.md', '.markdown']);
const SUPPORTED_EXTENSION_SET = new Set(DEFAULT_ALLOWED_EXTENSIONS);

const DEFAULT_TARGET_ARTIFACT_NAMES = Object.freeze([
  'prd.md',
  'architecture.md',
  'ux.md',
  'epics.md',
  'readiness-check.md'
]);

const SECTION_EXTRACTION_REASON_CODES = Object.freeze([
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

const SECTION_EXTRACTION_REASON_CODE_SET = new Set(SECTION_EXTRACTION_REASON_CODES);

const NON_EXTRACTION_PRIORITY = Object.freeze([
  'ARTIFACT_PATH_NOT_ALLOWED',
  'UNSUPPORTED_ARTIFACT_TYPE',
  'ARTIFACT_READ_FAILED',
  'ARTIFACT_PARSE_FAILED',
  'ARTIFACT_METADATA_MISSING',
  'ARTIFACT_METADATA_INVALID',
  'ARTIFACT_SECTIONS_MISSING'
]);

const CORRECTIVE_ACTIONS_BY_REASON = Object.freeze({
  ARTIFACT_PATH_NOT_ALLOWED: 'RESTRICT_TO_ALLOWED_ROOTS',
  UNSUPPORTED_ARTIFACT_TYPE: 'REMOVE_UNSUPPORTED_ARTIFACTS',
  ARTIFACT_READ_FAILED: 'RETRY_ARTIFACT_READ',
  ARTIFACT_PARSE_FAILED: 'FIX_ARTIFACT_SYNTAX',
  ARTIFACT_METADATA_MISSING: 'ADD_REQUIRED_METADATA',
  ARTIFACT_METADATA_INVALID: 'FIX_INVALID_METADATA',
  ARTIFACT_SECTIONS_MISSING: 'ADD_STRUCTURED_HEADINGS'
});

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item));
  }

  if (isObject(value)) {
    const clone = {};

    for (const [key, nested] of Object.entries(value)) {
      clone[key] = cloneValue(nested);
    }

    return clone;
  }

  return value;
}

function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function normalizePathCandidate(value) {
  const normalizedText = normalizeText(value);

  if (normalizedText.length === 0) {
    return null;
  }

  return path.resolve(normalizedText);
}

function normalizeLineEndings(value) {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function toDurationMs(startMs, endMs) {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return 0;
  }

  const duration = endMs - startMs;

  if (!Number.isFinite(duration) || duration < 0) {
    return 0;
  }

  return Math.trunc(duration);
}

function computePercentile(values, percentile) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  const numericValues = values
    .map((value) => Math.max(0, Math.trunc(value)))
    .sort((left, right) => left - right);

  const rank = Math.ceil((percentile / 100) * numericValues.length) - 1;
  const boundedRank = Math.max(0, Math.min(numericValues.length - 1, rank));

  return numericValues[boundedRank];
}

function createDiagnostics({
  requestedCount,
  processedCount,
  extractedCount,
  nonExtractedCount,
  sectionCount,
  h2Count,
  h3Count,
  missingSectionsCount,
  allowlistRoots,
  durationMs,
  p95ExtractionMs
}) {
  return {
    requestedCount,
    processedCount,
    extractedCount,
    nonExtractedCount,
    sectionCount,
    h2Count,
    h3Count,
    missingSectionsCount,
    allowlistRoots: [...allowlistRoots],
    durationMs,
    p95ExtractionMs
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  extractedArtifacts,
  nonExtractedArtifacts,
  correctiveActions
}) {
  const safeReasonCode = SECTION_EXTRACTION_REASON_CODE_SET.has(reasonCode)
    ? reasonCode
    : 'INVALID_SECTION_EXTRACTION_INPUT';

  return {
    allowed,
    reasonCode: safeReasonCode,
    reason,
    diagnostics: createDiagnostics(diagnostics),
    extractedArtifacts: extractedArtifacts.map((artifact) => cloneValue(artifact)),
    nonExtractedArtifacts: nonExtractedArtifacts.map((artifact) => cloneValue(artifact)),
    correctiveActions: [...correctiveActions]
  };
}

function createInvalidInputResult({
  reason,
  allowlistRoots = [],
  requestedCount = 0,
  durationMs = 0,
  p95ExtractionMs = 0
}) {
  return createResult({
    allowed: false,
    reasonCode: 'INVALID_SECTION_EXTRACTION_INPUT',
    reason,
    diagnostics: {
      requestedCount,
      processedCount: 0,
      extractedCount: 0,
      nonExtractedCount: 0,
      sectionCount: 0,
      h2Count: 0,
      h3Count: 0,
      missingSectionsCount: 0,
      allowlistRoots,
      durationMs,
      p95ExtractionMs
    },
    extractedArtifacts: [],
    nonExtractedArtifacts: [],
    correctiveActions: []
  });
}

function resolveAllowlistRoots(payload) {
  if (!Array.isArray(payload.allowlistRoots) || payload.allowlistRoots.length === 0) {
    return {
      valid: false,
      reason: 'allowlistRoots est requis et doit être un tableau non vide de racines autorisées.'
    };
  }

  const normalizedRoots = [];
  const seen = new Set();

  for (let index = 0; index < payload.allowlistRoots.length; index += 1) {
    const root = normalizePathCandidate(payload.allowlistRoots[index]);

    if (root === null) {
      return {
        valid: false,
        reason: `allowlistRoots[${index}] invalide: chemin non vide requis.`
      };
    }

    if (!seen.has(root)) {
      seen.add(root);
      normalizedRoots.push(root);
    }
  }

  return {
    valid: true,
    allowlistRoots: normalizedRoots
  };
}

function resolveAllowedExtensions(payload, runtimeOptions) {
  const source = payload.allowedExtensions ?? runtimeOptions.allowedExtensions;

  if (source === undefined) {
    return {
      valid: true,
      allowedExtensions: new Set(DEFAULT_ALLOWED_EXTENSIONS)
    };
  }

  if (!Array.isArray(source) || source.length === 0) {
    return {
      valid: false,
      reason: 'allowedExtensions invalide: tableau non vide requis si fourni.'
    };
  }

  const extensions = new Set();

  for (let index = 0; index < source.length; index += 1) {
    const extension = normalizeText(source[index]).toLowerCase();

    if (!extension.startsWith('.') || extension.length < 2) {
      return {
        valid: false,
        reason: `allowedExtensions[${index}] invalide: extension attendue au format .ext.`
      };
    }

    if (!SUPPORTED_EXTENSION_SET.has(extension)) {
      return {
        valid: false,
        reason:
          `allowedExtensions[${index}] invalide: seules les extensions .md et .markdown sont supportées pour l’extraction de sections.`
      };
    }

    extensions.add(extension);
  }

  return {
    valid: true,
    allowedExtensions: extensions
  };
}

function resolveTargetArtifactNames(payload, runtimeOptions) {
  const source =
    payload.targetArtifactNames ??
    payload.majorArtifactNames ??
    runtimeOptions.targetArtifactNames ??
    runtimeOptions.majorArtifactNames;

  if (source === undefined) {
    return {
      valid: true,
      targetArtifactNames: new Set(DEFAULT_TARGET_ARTIFACT_NAMES)
    };
  }

  if (!Array.isArray(source) || source.length === 0) {
    return {
      valid: false,
      reason: 'targetArtifactNames invalide: tableau non vide requis si fourni.'
    };
  }

  const names = new Set();

  for (let index = 0; index < source.length; index += 1) {
    const name = normalizeText(source[index]).toLowerCase();

    if (name.length === 0) {
      return {
        valid: false,
        reason: `targetArtifactNames[${index}] invalide: nom de fichier non vide requis.`
      };
    }

    names.add(name);
  }

  return {
    valid: true,
    targetArtifactNames: names
  };
}

function createSourceDocument({ artifactPath, content, sourceType, index }) {
  return {
    path: artifactPath,
    resolvedPath: normalizePathCandidate(artifactPath),
    content,
    sourceType,
    index
  };
}

function buildNonExtraction({
  pathValue,
  reasonCode,
  reason,
  metadataErrors = [],
  missingFields = [],
  sectionErrors = []
}) {
  const nonExtraction = {
    path: pathValue,
    reasonCode,
    reason
  };

  if (metadataErrors.length > 0) {
    nonExtraction.metadataErrors = [...metadataErrors];
  }

  if (missingFields.length > 0) {
    nonExtraction.missingFields = [...missingFields];
  }

  if (sectionErrors.length > 0) {
    nonExtraction.sectionErrors = [...sectionErrors];
  }

  return nonExtraction;
}

function resolveArtifactDocuments(payload) {
  if (!Array.isArray(payload.artifactDocuments) || payload.artifactDocuments.length === 0) {
    return {
      valid: false,
      reason: 'artifactDocuments doit être un tableau non vide lorsque fourni.'
    };
  }

  const documents = [];

  for (let index = 0; index < payload.artifactDocuments.length; index += 1) {
    const artifact = payload.artifactDocuments[index];

    if (!isObject(artifact)) {
      return {
        valid: false,
        reason: `artifactDocuments[${index}] doit être un objet { path, content }.`
      };
    }

    const artifactPath = normalizeText(artifact.path ?? artifact.filePath);

    if (artifactPath.length === 0) {
      return {
        valid: false,
        reason: `artifactDocuments[${index}].path doit être une chaîne non vide.`
      };
    }

    if (typeof artifact.content !== 'string') {
      return {
        valid: false,
        reason: `artifactDocuments[${index}].content doit être une chaîne.`
      };
    }

    documents.push(
      createSourceDocument({
        artifactPath,
        content: artifact.content,
        sourceType: 'artifactDocuments',
        index
      })
    );
  }

  return {
    valid: true,
    requestedCount: documents.length,
    documents,
    nonExtractedArtifacts: [],
    extractionDurations: []
  };
}

function resolveArtifactPaths(payload, runtimeOptions, nowMs) {
  if (!Array.isArray(payload.artifactPaths) || payload.artifactPaths.length === 0) {
    return {
      valid: false,
      reason: 'artifactPaths doit être un tableau non vide lorsque fourni.'
    };
  }

  const documentReader =
    typeof runtimeOptions.documentReader === 'function' ? runtimeOptions.documentReader : null;

  if (documentReader === null) {
    return {
      valid: false,
      reason:
        'options.documentReader est requis pour résoudre artifactPaths (lecture contrôlée des documents).'
    };
  }

  const documents = [];
  const nonExtractedArtifacts = [];
  const extractionDurations = [];

  for (let index = 0; index < payload.artifactPaths.length; index += 1) {
    const artifactPath = normalizeText(payload.artifactPaths[index]);

    if (artifactPath.length === 0) {
      return {
        valid: false,
        reason: `artifactPaths[${index}] doit être une chaîne non vide.`
      };
    }

    const readStartMs = nowMs();

    try {
      const readResult = documentReader(artifactPath, { index });
      const content =
        typeof readResult === 'string'
          ? readResult
          : isObject(readResult) && typeof readResult.content === 'string'
            ? readResult.content
            : null;

      if (content === null) {
        nonExtractedArtifacts.push(
          buildNonExtraction({
            pathValue: normalizePathCandidate(artifactPath),
            reasonCode: 'ARTIFACT_READ_FAILED',
            reason:
              `Lecture échouée pour ${artifactPath}: documentReader doit retourner une chaîne ou { content }.`
          })
        );
      } else {
        documents.push(
          createSourceDocument({
            artifactPath,
            content,
            sourceType: 'artifactPaths',
            index
          })
        );
      }
    } catch (error) {
      nonExtractedArtifacts.push(
        buildNonExtraction({
          pathValue: normalizePathCandidate(artifactPath),
          reasonCode: 'ARTIFACT_READ_FAILED',
          reason: `Lecture échouée pour ${artifactPath}: ${String(error?.message ?? error)}.`
        })
      );
    } finally {
      extractionDurations.push(toDurationMs(readStartMs, nowMs()));
    }
  }

  return {
    valid: true,
    requestedCount: payload.artifactPaths.length,
    documents,
    nonExtractedArtifacts,
    extractionDurations
  };
}

function resolveArtifactSources(payload, runtimeOptions, nowMs) {
  if (payload.artifactDocuments !== undefined) {
    return resolveArtifactDocuments(payload);
  }

  if (payload.artifactPaths !== undefined) {
    return resolveArtifactPaths(payload, runtimeOptions, nowMs);
  }

  return {
    valid: false,
    reason:
      'artifactDocuments ou artifactPaths est requis pour l’extraction de sections (source exploitable absente).'
  };
}

function slugifyHeading(headingText) {
  const normalized = headingText
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized;
}

function normalizeHeadingText(rawHeadingText) {
  const trimmed = normalizeText(rawHeadingText.replace(/\s+#+\s*$/, ''));

  if (trimmed.length === 0) {
    return '';
  }

  return trimmed.replace(/\s+/g, ' ');
}

function resolveFrontmatterRange(markdownContent) {
  const normalized = normalizeLineEndings(markdownContent);
  const lines = normalized.split('\n');

  if (lines.length === 0 || !/^---\s*$/.test(lines[0])) {
    return {
      valid: true,
      lines,
      bodyStartLineIndex: 0
    };
  }

  let closingIndex = -1;

  for (let index = 1; index < lines.length; index += 1) {
    if (/^---\s*$/.test(lines[index])) {
      closingIndex = index;
      break;
    }
  }

  if (closingIndex === -1) {
    return {
      valid: false,
      reason: 'Frontmatter markdown invalide: séparateur de fermeture --- manquant.'
    };
  }

  return {
    valid: true,
    lines,
    bodyStartLineIndex: closingIndex + 1
  };
}

function extractSectionsFromMarkdown(markdownContent) {
  const frontmatterRange = resolveFrontmatterRange(markdownContent);

  if (!frontmatterRange.valid) {
    return {
      valid: false,
      reasonCode: 'ARTIFACT_PARSE_FAILED',
      reason: frontmatterRange.reason
    };
  }

  const lines = frontmatterRange.lines;
  const headingCandidates = [];
  const anchorOccurrences = new Map();

  for (let lineIndex = frontmatterRange.bodyStartLineIndex; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const headingMatch = line.match(/^\s{0,3}(#{2,3})[ \t]+(.+?)\s*$/);

    if (!headingMatch) {
      continue;
    }

    const headingLevel = headingMatch[1].length;

    if (headingLevel !== 2 && headingLevel !== 3) {
      continue;
    }

    const headingText = normalizeHeadingText(headingMatch[2]);

    if (headingText.length === 0) {
      continue;
    }

    const baseAnchor = slugifyHeading(headingText) || `section-${lineIndex + 1}`;
    const occurrence = (anchorOccurrences.get(baseAnchor) ?? 0) + 1;
    anchorOccurrences.set(baseAnchor, occurrence);

    const anchor = occurrence === 1 ? baseAnchor : `${baseAnchor}-${occurrence}`;

    headingCandidates.push({
      headingLevel,
      headingText,
      anchor,
      startLine: lineIndex + 1
    });
  }

  if (headingCandidates.length === 0) {
    return {
      valid: true,
      sections: []
    };
  }

  let lastH2HeadingId = null;

  const sections = headingCandidates.map((heading, index) => {
    const nextHeading = headingCandidates[index + 1];
    const endLine = Math.max(heading.startLine, (nextHeading?.startLine ?? lines.length + 1) - 1);
    const headingId = `section-${heading.anchor}-${heading.startLine}`;

    const parentHeadingId =
      heading.headingLevel === 3 ? (lastH2HeadingId ?? 'ROOT') : null;

    if (heading.headingLevel === 2) {
      lastH2HeadingId = headingId;
    }

    return {
      headingId,
      headingLevel: heading.headingLevel,
      headingText: heading.headingText,
      anchor: heading.anchor,
      startLine: heading.startLine,
      endLine,
      parentHeadingId
    };
  });

  return {
    valid: true,
    sections
  };
}

function mapMetadataReasonCode(reasonCode) {
  if (reasonCode === 'INVALID_METADATA_VALIDATION_INPUT') {
    return 'INVALID_SECTION_EXTRACTION_INPUT';
  }

  if (SECTION_EXTRACTION_REASON_CODE_SET.has(reasonCode)) {
    return reasonCode;
  }

  return 'INVALID_SECTION_EXTRACTION_INPUT';
}

function mapMetadataNonExtraction(nonCompliantArtifact) {
  return buildNonExtraction({
    pathValue: nonCompliantArtifact.path,
    reasonCode: mapMetadataReasonCode(nonCompliantArtifact.reasonCode),
    reason: nonCompliantArtifact.reason,
    metadataErrors: nonCompliantArtifact.metadataErrors ?? [],
    missingFields: nonCompliantArtifact.missingFields ?? []
  });
}

function resolvePrimaryReasonCode(nonExtractedArtifacts) {
  const prioritizedReasonCode = NON_EXTRACTION_PRIORITY.find((reasonCode) =>
    nonExtractedArtifacts.some((artifact) => artifact.reasonCode === reasonCode)
  );

  return prioritizedReasonCode ?? nonExtractedArtifacts[0].reasonCode;
}

function deriveReasonText({ reasonCode, nonExtractedArtifacts, diagnostics }) {
  if (reasonCode === 'OK') {
    return `Extraction sections réussie: ${diagnostics.extractedCount}/${diagnostics.requestedCount} artefacts extraits.`;
  }

  const firstRejection =
    nonExtractedArtifacts.find((artifact) => artifact.reasonCode === reasonCode) ??
    nonExtractedArtifacts[0];

  return `Extraction sections bloquée (${reasonCode}): ${firstRejection.reason}`;
}

function deriveCorrectiveActions(nonExtractedArtifacts) {
  return [
    ...new Set(
      nonExtractedArtifacts
        .map((artifact) => CORRECTIVE_ACTIONS_BY_REASON[artifact.reasonCode])
        .filter((action) => typeof action === 'string' && action.length > 0)
    )
  ];
}

export function extractArtifactSectionsForNavigation(input, options = {}) {
  const payload = isObject(input) ? input : {};
  const runtimeOptions = isObject(options) ? options : {};
  const nowMs = typeof runtimeOptions.nowMs === 'function' ? runtimeOptions.nowMs : () => Date.now();

  const extractionStartedAtMs = nowMs();

  const allowlistResolution = resolveAllowlistRoots(payload);

  if (!allowlistResolution.valid) {
    return createInvalidInputResult({
      reason: allowlistResolution.reason,
      durationMs: toDurationMs(extractionStartedAtMs, nowMs())
    });
  }

  const allowlistRoots = allowlistResolution.allowlistRoots;

  const extensionsResolution = resolveAllowedExtensions(payload, runtimeOptions);

  if (!extensionsResolution.valid) {
    return createInvalidInputResult({
      reason: extensionsResolution.reason,
      allowlistRoots,
      durationMs: toDurationMs(extractionStartedAtMs, nowMs())
    });
  }

  const allowedExtensions = extensionsResolution.allowedExtensions;

  const targetArtifactsResolution = resolveTargetArtifactNames(payload, runtimeOptions);

  if (!targetArtifactsResolution.valid) {
    return createInvalidInputResult({
      reason: targetArtifactsResolution.reason,
      allowlistRoots,
      durationMs: toDurationMs(extractionStartedAtMs, nowMs())
    });
  }

  const targetArtifactNames = targetArtifactsResolution.targetArtifactNames;

  const sourceResolution = resolveArtifactSources(payload, runtimeOptions, nowMs);

  if (!sourceResolution.valid) {
    return createInvalidInputResult({
      reason: sourceResolution.reason,
      allowlistRoots,
      durationMs: toDurationMs(extractionStartedAtMs, nowMs())
    });
  }

  const nonExtractedArtifacts = [...sourceResolution.nonExtractedArtifacts];
  const extractionDurations = [...sourceResolution.extractionDurations];
  const extractedArtifacts = [];

  const metadataNonCompliantByPath = new Map();
  const metadataCompliantByPath = new Map();

  if (sourceResolution.documents.length > 0) {
    const metadataResult = validateArtifactMetadataCompliance(
      {
        allowlistRoots,
        allowedExtensions: [...allowedExtensions],
        targetArtifactNames: [...targetArtifactNames],
        artifactDocuments: sourceResolution.documents.map((document) => ({
          path: document.path,
          content: document.content
        }))
      },
      {
        nowMs
      }
    );

    for (const nonCompliantArtifact of metadataResult.nonCompliantArtifacts) {
      const mappedNonExtraction = mapMetadataNonExtraction(nonCompliantArtifact);
      nonExtractedArtifacts.push(mappedNonExtraction);

      const normalizedPath = normalizePathCandidate(nonCompliantArtifact.path);

      if (normalizedPath !== null) {
        metadataNonCompliantByPath.set(normalizedPath, mappedNonExtraction);
      }
    }

    for (const compliantArtifact of metadataResult.compliantArtifacts) {
      const normalizedPath = normalizePathCandidate(compliantArtifact.path);

      if (normalizedPath !== null) {
        metadataCompliantByPath.set(normalizedPath, compliantArtifact);
      }
    }
  }

  let sectionCount = 0;
  let h2Count = 0;
  let h3Count = 0;
  let missingSectionsCount = 0;

  for (const document of sourceResolution.documents) {
    const artifactPath = document.resolvedPath;

    if (metadataNonCompliantByPath.has(artifactPath)) {
      continue;
    }

    if (!metadataCompliantByPath.has(artifactPath)) {
      nonExtractedArtifacts.push(
        buildNonExtraction({
          pathValue: artifactPath,
          reasonCode: 'INVALID_SECTION_EXTRACTION_INPUT',
          reason:
            `État metadata incohérent pour ${artifactPath}: artefact non classé par le validateur metadata.`
        })
      );
      continue;
    }

    const extractionStartMs = nowMs();

    const sectionExtraction = extractSectionsFromMarkdown(document.content);

    if (!sectionExtraction.valid) {
      nonExtractedArtifacts.push(
        buildNonExtraction({
          pathValue: artifactPath,
          reasonCode: sectionExtraction.reasonCode,
          reason: `${sectionExtraction.reason} (${artifactPath}).`
        })
      );

      extractionDurations.push(toDurationMs(extractionStartMs, nowMs()));
      continue;
    }

    if (sectionExtraction.sections.length === 0) {
      missingSectionsCount += 1;

      nonExtractedArtifacts.push(
        buildNonExtraction({
          pathValue: artifactPath,
          reasonCode: 'ARTIFACT_SECTIONS_MISSING',
          reason: `Aucune section H2/H3 exploitable trouvée pour ${artifactPath}.`,
          sectionErrors: ['Aucune section H2/H3 exploitable détectée dans le contenu markdown.']
        })
      );

      extractionDurations.push(toDurationMs(extractionStartMs, nowMs()));
      continue;
    }

    const sections = sectionExtraction.sections.map((section) => cloneValue(section));
    const artifactH2Count = sections.filter((section) => section.headingLevel === 2).length;
    const artifactH3Count = sections.filter((section) => section.headingLevel === 3).length;

    sectionCount += sections.length;
    h2Count += artifactH2Count;
    h3Count += artifactH3Count;

    const metadataContext = metadataCompliantByPath.get(artifactPath);

    extractedArtifacts.push({
      path: artifactPath,
      extension: path.extname(artifactPath).toLowerCase(),
      sourceType: document.sourceType,
      sectionCount: sections.length,
      h2Count: artifactH2Count,
      h3Count: artifactH3Count,
      sections,
      metadata: cloneValue(metadataContext?.metadata ?? {}),
      tableIndexEligible: true
    });

    extractionDurations.push(toDurationMs(extractionStartMs, nowMs()));
  }

  const diagnostics = {
    requestedCount: sourceResolution.requestedCount,
    processedCount: extractedArtifacts.length,
    extractedCount: extractedArtifacts.length,
    nonExtractedCount: nonExtractedArtifacts.length,
    sectionCount,
    h2Count,
    h3Count,
    missingSectionsCount,
    allowlistRoots,
    durationMs: toDurationMs(extractionStartedAtMs, nowMs()),
    p95ExtractionMs: computePercentile(extractionDurations, 95)
  };

  if (nonExtractedArtifacts.length === 0) {
    return createResult({
      allowed: true,
      reasonCode: 'OK',
      reason: deriveReasonText({
        reasonCode: 'OK',
        nonExtractedArtifacts,
        diagnostics
      }),
      diagnostics,
      extractedArtifacts,
      nonExtractedArtifacts,
      correctiveActions: []
    });
  }

  const reasonCode = resolvePrimaryReasonCode(nonExtractedArtifacts);

  return createResult({
    allowed: false,
    reasonCode,
    reason: deriveReasonText({
      reasonCode,
      nonExtractedArtifacts,
      diagnostics
    }),
    diagnostics,
    extractedArtifacts,
    nonExtractedArtifacts,
    correctiveActions: deriveCorrectiveActions(nonExtractedArtifacts)
  });
}
