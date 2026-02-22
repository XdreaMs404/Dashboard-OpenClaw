import path from 'node:path';
import { extractArtifactSectionsForNavigation } from './artifact-section-extractor.js';

const DEFAULT_ALLOWED_EXTENSIONS = Object.freeze(['.md', '.markdown']);
const SUPPORTED_EXTENSION_SET = new Set(DEFAULT_ALLOWED_EXTENSIONS);

const DEFAULT_TARGET_ARTIFACT_NAMES = Object.freeze([
  'prd.md',
  'architecture.md',
  'ux.md',
  'epics.md',
  'readiness-check.md'
]);

const DEFAULT_SCHEMA_VERSION = 'artifact-table-index.v1';
const DEFAULT_EXTRACTED_AT = '1970-01-01T00:00:00.000Z';

const TABLE_INDEX_REASON_CODES = Object.freeze([
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

const TABLE_INDEX_REASON_CODE_SET = new Set(TABLE_INDEX_REASON_CODES);

const NON_INDEX_PRIORITY = Object.freeze([
  'ARTIFACT_PATH_NOT_ALLOWED',
  'UNSUPPORTED_ARTIFACT_TYPE',
  'ARTIFACT_READ_FAILED',
  'ARTIFACT_PARSE_FAILED',
  'ARTIFACT_METADATA_MISSING',
  'ARTIFACT_METADATA_INVALID',
  'ARTIFACT_SECTIONS_MISSING',
  'ARTIFACT_TABLES_MISSING'
]);

const CORRECTIVE_ACTIONS_BY_REASON = Object.freeze({
  ARTIFACT_PATH_NOT_ALLOWED: 'RESTRICT_TO_ALLOWED_ROOTS',
  UNSUPPORTED_ARTIFACT_TYPE: 'REMOVE_UNSUPPORTED_ARTIFACTS',
  ARTIFACT_READ_FAILED: 'RETRY_ARTIFACT_READ',
  ARTIFACT_PARSE_FAILED: 'FIX_ARTIFACT_SYNTAX',
  ARTIFACT_METADATA_MISSING: 'ADD_REQUIRED_METADATA',
  ARTIFACT_METADATA_INVALID: 'FIX_INVALID_METADATA',
  ARTIFACT_SECTIONS_MISSING: 'ADD_STRUCTURED_HEADINGS',
  ARTIFACT_TABLES_MISSING: 'ADD_MARKDOWN_TABLES'
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
  indexedCount,
  nonIndexedCount,
  tableCount,
  emptyTableCount,
  allowlistRoots,
  durationMs,
  p95IndexMs
}) {
  return {
    requestedCount,
    processedCount,
    indexedCount,
    nonIndexedCount,
    tableCount,
    emptyTableCount,
    allowlistRoots: [...allowlistRoots],
    durationMs,
    p95IndexMs
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  indexedArtifacts,
  nonIndexedArtifacts,
  correctiveActions
}) {
  const safeReasonCode = TABLE_INDEX_REASON_CODE_SET.has(reasonCode)
    ? reasonCode
    : 'INVALID_TABLE_INDEX_INPUT';

  return {
    allowed,
    reasonCode: safeReasonCode,
    reason,
    diagnostics: createDiagnostics(diagnostics),
    indexedArtifacts: indexedArtifacts.map((artifact) => cloneValue(artifact)),
    nonIndexedArtifacts: nonIndexedArtifacts.map((artifact) => cloneValue(artifact)),
    correctiveActions: [...correctiveActions]
  };
}

function createInvalidInputResult({
  reason,
  allowlistRoots = [],
  requestedCount = 0,
  durationMs = 0,
  p95IndexMs = 0
}) {
  return createResult({
    allowed: false,
    reasonCode: 'INVALID_TABLE_INDEX_INPUT',
    reason,
    diagnostics: {
      requestedCount,
      processedCount: 0,
      indexedCount: 0,
      nonIndexedCount: 0,
      tableCount: 0,
      emptyTableCount: 0,
      allowlistRoots,
      durationMs,
      p95IndexMs
    },
    indexedArtifacts: [],
    nonIndexedArtifacts: [],
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
          `allowedExtensions[${index}] invalide: seules les extensions .md et .markdown sont supportées pour l’indexation de tableaux.`
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

function buildNonIndex({
  pathValue,
  reasonCode,
  reason,
  metadataErrors = [],
  missingFields = [],
  sectionErrors = [],
  tableErrors = []
}) {
  const nonIndex = {
    path: pathValue,
    reasonCode,
    reason
  };

  if (metadataErrors.length > 0) {
    nonIndex.metadataErrors = [...metadataErrors];
  }

  if (missingFields.length > 0) {
    nonIndex.missingFields = [...missingFields];
  }

  if (sectionErrors.length > 0) {
    nonIndex.sectionErrors = [...sectionErrors];
  }

  if (tableErrors.length > 0) {
    nonIndex.tableErrors = [...tableErrors];
  }

  return nonIndex;
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
    nonIndexedArtifacts: [],
    indexDurations: []
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
  const nonIndexedArtifacts = [];
  const indexDurations = [];

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
        nonIndexedArtifacts.push(
          buildNonIndex({
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
      nonIndexedArtifacts.push(
        buildNonIndex({
          pathValue: normalizePathCandidate(artifactPath),
          reasonCode: 'ARTIFACT_READ_FAILED',
          reason: `Lecture échouée pour ${artifactPath}: ${String(error?.message ?? error)}.`
        })
      );
    } finally {
      indexDurations.push(toDurationMs(readStartMs, nowMs()));
    }
  }

  return {
    valid: true,
    requestedCount: payload.artifactPaths.length,
    documents,
    nonIndexedArtifacts,
    indexDurations
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
    reason: 'artifactDocuments ou artifactPaths est requis pour l’indexation de tableaux (source exploitable absente).'
  };
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

function splitMarkdownTableRow(line) {
  const trimmed = normalizeText(line);

  if (!trimmed.includes('|')) {
    return null;
  }

  let normalized = trimmed;

  if (normalized.startsWith('|')) {
    normalized = normalized.slice(1);
  }

  if (normalized.endsWith('|')) {
    normalized = normalized.slice(0, -1);
  }

  const cells = [];
  let current = '';

  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];

    if (character === '\\' && normalized[index + 1] === '|') {
      current += '|';
      index += 1;
      continue;
    }

    if (character === '|') {
      cells.push(normalizeText(current));
      current = '';
      continue;
    }

    current += character;
  }

  cells.push(normalizeText(current));

  return cells;
}

function isTableSeparatorCell(cell) {
  return /^:?-{3,}:?$/.test(cell);
}

function isTableSeparatorRow(cells, expectedColumns) {
  if (!Array.isArray(cells) || cells.length < expectedColumns || expectedColumns === 0) {
    return false;
  }

  for (let index = 0; index < expectedColumns; index += 1) {
    if (!isTableSeparatorCell(cells[index])) {
      return false;
    }
  }

  return true;
}

function normalizeRowCells(cells, columnCount) {
  const normalized = [];

  for (let index = 0; index < columnCount; index += 1) {
    normalized.push(normalizeText(cells[index] ?? ''));
  }

  return normalized;
}

function resolveSectionForLine(lineNumber, sections) {
  if (!Array.isArray(sections) || sections.length === 0) {
    return null;
  }

  const directMatch = sections.find(
    (section) => lineNumber >= section.startLine && lineNumber <= section.endLine
  );

  if (directMatch) {
    return directMatch;
  }

  let previous = null;

  for (const section of sections) {
    if (section.startLine <= lineNumber) {
      previous = section;
      continue;
    }

    break;
  }

  return previous ?? sections[0];
}

function stableHash(value) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function extractTablesFromMarkdown(markdownContent) {
  const frontmatterRange = resolveFrontmatterRange(markdownContent);

  if (!frontmatterRange.valid) {
    return {
      valid: false,
      reasonCode: 'ARTIFACT_PARSE_FAILED',
      reason: frontmatterRange.reason
    };
  }

  const lines = frontmatterRange.lines;
  const tables = [];
  let emptyTableCount = 0;

  for (let lineIndex = frontmatterRange.bodyStartLineIndex; lineIndex < lines.length; ) {
    const headerCells = splitMarkdownTableRow(lines[lineIndex]);

    if (!headerCells || headerCells.length === 0) {
      lineIndex += 1;
      continue;
    }

    const separatorCells = splitMarkdownTableRow(lines[lineIndex + 1] ?? '');

    if (!separatorCells || !isTableSeparatorRow(separatorCells, headerCells.length)) {
      lineIndex += 1;
      continue;
    }

    const normalizedHeaders = normalizeRowCells(headerCells, headerCells.length);
    const rows = [];
    let cursor = lineIndex + 2;

    while (cursor < lines.length) {
      const rowCells = splitMarkdownTableRow(lines[cursor]);

      if (!rowCells || rowCells.length === 0) {
        break;
      }

      rows.push(normalizeRowCells(rowCells, normalizedHeaders.length));
      cursor += 1;
    }

    if (rows.length === 0) {
      emptyTableCount += 1;
      lineIndex = cursor;
      continue;
    }

    tables.push({
      startLine: lineIndex + 1,
      endLine: Math.max(lineIndex + 1, cursor),
      headers: normalizedHeaders,
      rows,
      rowCount: rows.length,
      columnCount: normalizedHeaders.length
    });

    lineIndex = cursor;
  }

  return {
    valid: true,
    tables,
    emptyTableCount
  };
}

function resolveExtractedAt(runtimeOptions) {
  const extractedAt = normalizeText(runtimeOptions.extractedAt);

  if (extractedAt.length > 0) {
    return extractedAt;
  }

  return DEFAULT_EXTRACTED_AT;
}

function buildTableId({ artifactPath, sectionHeadingId, tableOrdinal, headers, rows }) {
  const hashInput = [
    artifactPath,
    sectionHeadingId,
    tableOrdinal,
    headers.join('¦'),
    rows.map((row) => row.join('¦')).join('¶')
  ].join('§');

  return `tbl_${stableHash(hashInput)}`;
}

function mapSectionReasonCode(reasonCode) {
  if (reasonCode === 'INVALID_SECTION_EXTRACTION_INPUT') {
    return 'INVALID_TABLE_INDEX_INPUT';
  }

  if (TABLE_INDEX_REASON_CODE_SET.has(reasonCode)) {
    return reasonCode;
  }

  return 'INVALID_TABLE_INDEX_INPUT';
}

function mapSectionNonIndex(nonExtractedArtifact) {
  return buildNonIndex({
    pathValue: nonExtractedArtifact.path,
    reasonCode: mapSectionReasonCode(nonExtractedArtifact.reasonCode),
    reason: nonExtractedArtifact.reason,
    metadataErrors: nonExtractedArtifact.metadataErrors ?? [],
    missingFields: nonExtractedArtifact.missingFields ?? [],
    sectionErrors: nonExtractedArtifact.sectionErrors ?? []
  });
}

function resolvePrimaryReasonCode(nonIndexedArtifacts) {
  const prioritizedReasonCode = NON_INDEX_PRIORITY.find((reasonCode) =>
    nonIndexedArtifacts.some((artifact) => artifact.reasonCode === reasonCode)
  );

  return prioritizedReasonCode ?? nonIndexedArtifacts[0].reasonCode;
}

function deriveReasonText({ reasonCode, nonIndexedArtifacts, diagnostics }) {
  if (reasonCode === 'OK') {
    return `Indexation tables réussie: ${diagnostics.indexedCount}/${diagnostics.requestedCount} artefacts indexés.`;
  }

  const firstRejection =
    nonIndexedArtifacts.find((artifact) => artifact.reasonCode === reasonCode) ?? nonIndexedArtifacts[0];

  return `Indexation tables bloquée (${reasonCode}): ${firstRejection.reason}`;
}

function deriveCorrectiveActions(nonIndexedArtifacts) {
  return [
    ...new Set(
      nonIndexedArtifacts
        .map((artifact) => CORRECTIVE_ACTIONS_BY_REASON[artifact.reasonCode])
        .filter((action) => typeof action === 'string' && action.length > 0)
    )
  ];
}

export function indexArtifactMarkdownTables(input, options = {}) {
  const payload = isObject(input) ? input : {};
  const runtimeOptions = isObject(options) ? options : {};
  const nowMs = typeof runtimeOptions.nowMs === 'function' ? runtimeOptions.nowMs : () => Date.now();

  const indexingStartedAtMs = nowMs();

  const allowlistResolution = resolveAllowlistRoots(payload);

  if (!allowlistResolution.valid) {
    return createInvalidInputResult({
      reason: allowlistResolution.reason,
      durationMs: toDurationMs(indexingStartedAtMs, nowMs())
    });
  }

  const allowlistRoots = allowlistResolution.allowlistRoots;

  const extensionsResolution = resolveAllowedExtensions(payload, runtimeOptions);

  if (!extensionsResolution.valid) {
    return createInvalidInputResult({
      reason: extensionsResolution.reason,
      allowlistRoots,
      durationMs: toDurationMs(indexingStartedAtMs, nowMs())
    });
  }

  const allowedExtensions = extensionsResolution.allowedExtensions;

  const targetArtifactsResolution = resolveTargetArtifactNames(payload, runtimeOptions);

  if (!targetArtifactsResolution.valid) {
    return createInvalidInputResult({
      reason: targetArtifactsResolution.reason,
      allowlistRoots,
      durationMs: toDurationMs(indexingStartedAtMs, nowMs())
    });
  }

  const targetArtifactNames = targetArtifactsResolution.targetArtifactNames;

  const sourceResolution = resolveArtifactSources(payload, runtimeOptions, nowMs);

  if (!sourceResolution.valid) {
    return createInvalidInputResult({
      reason: sourceResolution.reason,
      allowlistRoots,
      durationMs: toDurationMs(indexingStartedAtMs, nowMs())
    });
  }

  const nonIndexedArtifacts = [...sourceResolution.nonIndexedArtifacts];
  const indexDurations = [...sourceResolution.indexDurations];
  const indexedArtifacts = [];
  const extractedAt = resolveExtractedAt(runtimeOptions);
  const schemaVersion = normalizeText(runtimeOptions.schemaVersion) || DEFAULT_SCHEMA_VERSION;

  const sectionNonIndexedByPath = new Map();
  const sectionsByPath = new Map();

  if (sourceResolution.documents.length > 0) {
    const sectionResult = extractArtifactSectionsForNavigation(
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

    for (const nonExtractedArtifact of sectionResult.nonExtractedArtifacts) {
      const mappedNonIndex = mapSectionNonIndex(nonExtractedArtifact);
      nonIndexedArtifacts.push(mappedNonIndex);

      const normalizedPath = normalizePathCandidate(nonExtractedArtifact.path);

      if (normalizedPath !== null) {
        sectionNonIndexedByPath.set(normalizedPath, mappedNonIndex);
      }
    }

    for (const extractedArtifact of sectionResult.extractedArtifacts) {
      const normalizedPath = normalizePathCandidate(extractedArtifact.path);

      if (normalizedPath !== null) {
        sectionsByPath.set(normalizedPath, extractedArtifact.sections ?? []);
      }
    }
  }

  let tableCount = 0;
  let emptyTableCount = 0;

  for (const document of sourceResolution.documents) {
    const artifactPath = document.resolvedPath;

    if (sectionNonIndexedByPath.has(artifactPath)) {
      continue;
    }

    if (!sectionsByPath.has(artifactPath)) {
      nonIndexedArtifacts.push(
        buildNonIndex({
          pathValue: artifactPath,
          reasonCode: 'INVALID_TABLE_INDEX_INPUT',
          reason:
            `État sections incohérent pour ${artifactPath}: artefact non classé par l’extracteur de sections.`
        })
      );
      continue;
    }

    const indexStartMs = nowMs();
    const tableExtraction = extractTablesFromMarkdown(document.content);

    if (!tableExtraction.valid) {
      nonIndexedArtifacts.push(
        buildNonIndex({
          pathValue: artifactPath,
          reasonCode: tableExtraction.reasonCode,
          reason: `${tableExtraction.reason} (${artifactPath}).`
        })
      );
      indexDurations.push(toDurationMs(indexStartMs, nowMs()));
      continue;
    }

    const sections = sectionsByPath.get(artifactPath);

    if (!Array.isArray(sections) || sections.length === 0) {
      nonIndexedArtifacts.push(
        buildNonIndex({
          pathValue: artifactPath,
          reasonCode: 'ARTIFACT_SECTIONS_MISSING',
          reason: `Aucune section exploitable disponible pour indexer les tableaux de ${artifactPath}.`,
          sectionErrors: ['Aucune section H2/H3 exploitable détectée pour rattacher les tableaux.']
        })
      );
      indexDurations.push(toDurationMs(indexStartMs, nowMs()));
      continue;
    }

    emptyTableCount += tableExtraction.emptyTableCount;

    if (tableExtraction.tables.length === 0) {
      nonIndexedArtifacts.push(
        buildNonIndex({
          pathValue: artifactPath,
          reasonCode: 'ARTIFACT_TABLES_MISSING',
          reason: `Aucun tableau markdown exploitable trouvé pour ${artifactPath}.`,
          tableErrors: ['Aucun tableau markdown exploitable détecté (header/separator/rows).']
        })
      );
      indexDurations.push(toDurationMs(indexStartMs, nowMs()));
      continue;
    }

    const indexedTables = tableExtraction.tables.map((table, index) => {
      const linkedSection = resolveSectionForLine(table.startLine, sections);
      const sectionHeadingId = linkedSection?.headingId ?? 'ROOT';
      const sectionAnchor = linkedSection?.anchor ?? 'root';

      return {
        tableId: buildTableId({
          artifactPath,
          sectionHeadingId,
          tableOrdinal: index,
          headers: table.headers,
          rows: table.rows
        }),
        sectionHeadingId,
        sectionAnchor,
        headers: cloneValue(table.headers),
        rows: cloneValue(table.rows),
        rowCount: table.rowCount,
        columnCount: table.columnCount,
        schemaVersion,
        extractedAt,
        startLine: table.startLine,
        endLine: table.endLine
      };
    });

    tableCount += indexedTables.length;

    indexedArtifacts.push({
      path: artifactPath,
      extension: path.extname(artifactPath).toLowerCase(),
      sourceType: document.sourceType,
      tableCount: indexedTables.length,
      tables: indexedTables,
      searchIndexEligible: true
    });

    indexDurations.push(toDurationMs(indexStartMs, nowMs()));
  }

  const diagnostics = {
    requestedCount: sourceResolution.requestedCount,
    processedCount: indexedArtifacts.length,
    indexedCount: indexedArtifacts.length,
    nonIndexedCount: nonIndexedArtifacts.length,
    tableCount,
    emptyTableCount,
    allowlistRoots,
    durationMs: toDurationMs(indexingStartedAtMs, nowMs()),
    p95IndexMs: computePercentile(indexDurations, 95)
  };

  if (nonIndexedArtifacts.length === 0) {
    return createResult({
      allowed: true,
      reasonCode: 'OK',
      reason: deriveReasonText({
        reasonCode: 'OK',
        nonIndexedArtifacts,
        diagnostics
      }),
      diagnostics,
      indexedArtifacts,
      nonIndexedArtifacts,
      correctiveActions: []
    });
  }

  const reasonCode = resolvePrimaryReasonCode(nonIndexedArtifacts);

  return createResult({
    allowed: false,
    reasonCode,
    reason: deriveReasonText({
      reasonCode,
      nonIndexedArtifacts,
      diagnostics
    }),
    diagnostics,
    indexedArtifacts,
    nonIndexedArtifacts,
    correctiveActions: deriveCorrectiveActions(nonIndexedArtifacts)
  });
}
