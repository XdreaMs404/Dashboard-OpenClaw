import path from 'node:path';

const DEFAULT_ALLOWED_EXTENSIONS = Object.freeze(['.md', '.markdown', '.yaml', '.yml']);
const DEFAULT_TARGET_ARTIFACT_NAMES = Object.freeze([
  'prd.md',
  'architecture.md',
  'ux.md',
  'epics.md',
  'readiness-check.md'
]);

const METADATA_VALIDATION_REASON_CODES = Object.freeze([
  'OK',
  'ARTIFACT_PATH_NOT_ALLOWED',
  'UNSUPPORTED_ARTIFACT_TYPE',
  'ARTIFACT_READ_FAILED',
  'ARTIFACT_PARSE_FAILED',
  'ARTIFACT_METADATA_MISSING',
  'ARTIFACT_METADATA_INVALID',
  'INVALID_METADATA_VALIDATION_INPUT'
]);

const METADATA_VALIDATION_REASON_CODE_SET = new Set(METADATA_VALIDATION_REASON_CODES);

const NON_COMPLIANCE_PRIORITY = Object.freeze([
  'ARTIFACT_PATH_NOT_ALLOWED',
  'UNSUPPORTED_ARTIFACT_TYPE',
  'ARTIFACT_READ_FAILED',
  'ARTIFACT_PARSE_FAILED',
  'ARTIFACT_METADATA_MISSING',
  'ARTIFACT_METADATA_INVALID'
]);

const CORRECTIVE_ACTIONS_BY_REASON = Object.freeze({
  ARTIFACT_PATH_NOT_ALLOWED: 'RESTRICT_TO_ALLOWED_ROOTS',
  UNSUPPORTED_ARTIFACT_TYPE: 'REMOVE_UNSUPPORTED_ARTIFACTS',
  ARTIFACT_READ_FAILED: 'RETRY_ARTIFACT_READ',
  ARTIFACT_PARSE_FAILED: 'FIX_ARTIFACT_SYNTAX',
  ARTIFACT_METADATA_MISSING: 'ADD_REQUIRED_METADATA',
  ARTIFACT_METADATA_INVALID: 'FIX_INVALID_METADATA'
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
  const numericValues = values
    .map((value) => Math.max(0, Math.trunc(value)))
    .sort((a, b) => a - b);

  const rank = Math.ceil((percentile / 100) * numericValues.length) - 1;
  const boundedRank = Math.max(0, Math.min(numericValues.length - 1, rank));

  return numericValues[boundedRank];
}

function createDiagnostics({
  requestedCount,
  validatedCount,
  compliantCount,
  nonCompliantCount,
  missingMetadataCount,
  invalidMetadataCount,
  allowlistRoots,
  durationMs,
  p95ValidationMs
}) {
  return {
    requestedCount,
    validatedCount,
    compliantCount,
    nonCompliantCount,
    missingMetadataCount,
    invalidMetadataCount,
    allowlistRoots: [...allowlistRoots],
    durationMs,
    p95ValidationMs
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  compliantArtifacts,
  nonCompliantArtifacts,
  correctiveActions
}) {
  const safeReasonCode = METADATA_VALIDATION_REASON_CODE_SET.has(reasonCode)
    ? reasonCode
    : 'INVALID_METADATA_VALIDATION_INPUT';

  return {
    allowed,
    reasonCode: safeReasonCode,
    reason,
    diagnostics: createDiagnostics(diagnostics),
    compliantArtifacts: compliantArtifacts.map((artifact) => cloneValue(artifact)),
    nonCompliantArtifacts: nonCompliantArtifacts.map((artifact) => cloneValue(artifact)),
    correctiveActions: [...correctiveActions]
  };
}

function createInvalidInputResult({
  reason,
  allowlistRoots = [],
  requestedCount = 0,
  durationMs = 0,
  p95ValidationMs = 0
}) {
  return createResult({
    allowed: false,
    reasonCode: 'INVALID_METADATA_VALIDATION_INPUT',
    reason,
    diagnostics: {
      requestedCount,
      validatedCount: 0,
      compliantCount: 0,
      nonCompliantCount: 0,
      missingMetadataCount: 0,
      invalidMetadataCount: 0,
      allowlistRoots,
      durationMs,
      p95ValidationMs
    },
    compliantArtifacts: [],
    nonCompliantArtifacts: [],
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
    nonCompliantArtifacts: [],
    validationDurations: new Array(documents.length).fill(0)
  };
}

function buildNonCompliance({
  pathValue,
  reasonCode,
  reason,
  missingFields = [],
  metadataErrors = []
}) {
  const nonCompliance = {
    path: pathValue,
    reasonCode,
    reason
  };

  if (missingFields.length > 0) {
    nonCompliance.missingFields = [...missingFields];
  }

  if (metadataErrors.length > 0) {
    nonCompliance.metadataErrors = [...metadataErrors];
  }

  return nonCompliance;
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
  const nonCompliantArtifacts = [];
  const validationDurations = [];

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
        nonCompliantArtifacts.push(
          buildNonCompliance({
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
      nonCompliantArtifacts.push(
        buildNonCompliance({
          pathValue: normalizePathCandidate(artifactPath),
          reasonCode: 'ARTIFACT_READ_FAILED',
          reason: `Lecture échouée pour ${artifactPath}: ${String(error?.message ?? error)}.`
        })
      );
    } finally {
      validationDurations.push(toDurationMs(readStartMs, nowMs()));
    }
  }

  return {
    valid: true,
    requestedCount: payload.artifactPaths.length,
    documents,
    nonCompliantArtifacts,
    validationDurations
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
      'artifactDocuments ou artifactPaths est requis pour la validation metadata (source exploitable absente).'
  };
}

function isPathWithinAllowlist(candidatePath, allowlistRoots) {
  for (const root of allowlistRoots) {
    if (candidatePath === root) {
      return true;
    }

    if (candidatePath.startsWith(`${root}${path.sep}`)) {
      return true;
    }
  }

  return false;
}

function normalizeLineEndings(value) {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function normalizeYamlScalar(token) {
  const trimmed = normalizeText(token);

  if (trimmed.length < 2) {
    return trimmed;
  }

  const startsWithSingleQuote = trimmed.startsWith("'");
  const endsWithSingleQuote = trimmed.endsWith("'");
  const startsWithDoubleQuote = trimmed.startsWith('"');
  const endsWithDoubleQuote = trimmed.endsWith('"');

  if (startsWithSingleQuote && endsWithSingleQuote) {
    return trimmed.slice(1, -1);
  }

  if (startsWithDoubleQuote && endsWithDoubleQuote) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function parseYamlInlineArray(valueToken, lineNumber) {
  if (!valueToken.endsWith(']')) {
    return {
      valid: false,
      reason: `YAML invalide ligne ${lineNumber}: tableau inline non fermé.`
    };
  }

  const inner = valueToken.slice(1, -1).trim();

  if (inner.length === 0) {
    return {
      valid: true,
      values: []
    };
  }

  const parts = inner.split(',');
  const values = [];

  for (const part of parts) {
    const normalized = normalizeYamlScalar(part);

    if (normalized.length === 0) {
      return {
        valid: false,
        reason: `YAML invalide ligne ${lineNumber}: valeur vide dans tableau inline.`
      };
    }

    values.push(normalized);
  }

  return {
    valid: true,
    values
  };
}

function parseSimpleYamlObject(yamlContent) {
  const normalizedContent = normalizeLineEndings(yamlContent);

  if (normalizeText(normalizedContent).length === 0) {
    return {
      valid: true,
      data: {}
    };
  }

  const lines = normalizedContent.split('\n');
  const parsed = {};

  for (let index = 0; index < lines.length; ) {
    const rawLine = lines[index];
    const trimmedLine = rawLine.trim();

    if (trimmedLine.length === 0 || trimmedLine.startsWith('#')) {
      index += 1;
      continue;
    }

    if (/^\s/.test(rawLine)) {
      return {
        valid: false,
        reason: `YAML invalide ligne ${index + 1}: indentation inattendue.`
      };
    }

    const keyMatch = rawLine.match(/^([A-Za-z0-9_.-]+)\s*:\s*(.*)$/);

    if (!keyMatch) {
      return {
        valid: false,
        reason: `YAML invalide ligne ${index + 1}: clé attendue au format key: value.`
      };
    }

    const key = keyMatch[1];
    const valueToken = keyMatch[2].trim();

    if (valueToken.length > 0) {
      if (valueToken.startsWith('[')) {
        const inlineArray = parseYamlInlineArray(valueToken, index + 1);

        if (!inlineArray.valid) {
          return inlineArray;
        }

        parsed[key] = inlineArray.values;
      } else {
        parsed[key] = normalizeYamlScalar(valueToken);
      }

      index += 1;
      continue;
    }

    index += 1;

    const listValues = [];
    let hasListItems = false;

    while (index < lines.length) {
      const nestedRawLine = lines[index];
      const nestedTrimmed = nestedRawLine.trim();

      if (nestedTrimmed.length === 0 || nestedTrimmed.startsWith('#')) {
        index += 1;
        continue;
      }

      if (!/^\s/.test(nestedRawLine)) {
        break;
      }

      const listMatch = nestedRawLine.match(/^\s*-\s*(.*?)\s*$/);

      if (!listMatch) {
        return {
          valid: false,
          reason: `YAML invalide ligne ${index + 1}: item de liste attendu au format - value.`
        };
      }

      const listValue = normalizeYamlScalar(listMatch[1]);

      if (listValue.length === 0) {
        return {
          valid: false,
          reason: `YAML invalide ligne ${index + 1}: item de liste vide.`
        };
      }

      listValues.push(listValue);
      hasListItems = true;
      index += 1;
    }

    parsed[key] = hasListItems ? listValues : null;
  }

  return {
    valid: true,
    data: parsed
  };
}

function extractMarkdownFrontmatter(markdownContent) {
  const normalized = normalizeLineEndings(markdownContent);
  const lines = normalized.split('\n');

  if (lines.length === 0 || !/^---\s*$/.test(lines[0])) {
    return {
      valid: true,
      metadata: {}
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

  const frontmatterContent = lines.slice(1, closingIndex).join('\n');
  const parsedFrontmatter = parseSimpleYamlObject(frontmatterContent);

  if (!parsedFrontmatter.valid) {
    return {
      valid: false,
      reason: `Frontmatter markdown invalide: ${parsedFrontmatter.reason}`
    };
  }

  return {
    valid: true,
    metadata: parsedFrontmatter.data
  };
}

function parseArtifactMetadata({ extension, content }) {
  if (extension === '.md' || extension === '.markdown') {
    const markdownMetadata = extractMarkdownFrontmatter(content);

    if (!markdownMetadata.valid) {
      return {
        valid: false,
        reasonCode: 'ARTIFACT_PARSE_FAILED',
        reason: markdownMetadata.reason
      };
    }

    return {
      valid: true,
      metadata: markdownMetadata.metadata
    };
  }

  const yamlMetadata = parseSimpleYamlObject(content);

  if (!yamlMetadata.valid) {
    return {
      valid: false,
      reasonCode: 'ARTIFACT_PARSE_FAILED',
      reason: yamlMetadata.reason
    };
  }

  return {
    valid: true,
    metadata: yamlMetadata.data
  };
}

function validateRequiredMetadata(metadata) {
  const missingFields = [];
  const metadataErrors = [];

  for (const field of ['stepsCompleted', 'inputDocuments']) {
    if (!(field in metadata) || metadata[field] === null) {
      missingFields.push(field);
      continue;
    }

    const value = metadata[field];

    if (!Array.isArray(value) || value.length === 0) {
      metadataErrors.push(`${field} doit être un tableau non vide de chaînes.`);
      continue;
    }

    const hasInvalidEntry = value.some((entry) => typeof entry !== 'string' || entry.trim().length === 0);

    if (hasInvalidEntry) {
      metadataErrors.push(`${field} doit contenir uniquement des chaînes non vides.`);
    }
  }

  if (missingFields.length > 0) {
    return {
      valid: false,
      missing: true,
      missingFields,
      metadataErrors
    };
  }

  if (metadataErrors.length > 0) {
    return {
      valid: false,
      missing: false,
      missingFields,
      metadataErrors
    };
  }

  return {
    valid: true,
    missing: false,
    missingFields: [],
    metadataErrors: [],
    normalizedMetadata: {
      stepsCompleted: metadata.stepsCompleted.map((entry) => entry.trim()),
      inputDocuments: metadata.inputDocuments.map((entry) => entry.trim())
    }
  };
}

function resolvePrimaryReasonCode(nonCompliantArtifacts) {
  const prioritizedReasonCode = NON_COMPLIANCE_PRIORITY.find((reasonCode) =>
    nonCompliantArtifacts.some((artifact) => artifact.reasonCode === reasonCode)
  );

  return prioritizedReasonCode ?? nonCompliantArtifacts[0].reasonCode;
}

function deriveReasonText({ reasonCode, nonCompliantArtifacts, diagnostics }) {
  if (reasonCode === 'OK') {
    return `Validation metadata réussie: ${diagnostics.compliantCount}/${diagnostics.requestedCount} artefacts conformes.`;
  }

  const firstNonCompliance =
    nonCompliantArtifacts.find((artifact) => artifact.reasonCode === reasonCode) ??
    nonCompliantArtifacts[0];

  return `Validation metadata bloquée (${reasonCode}): ${firstNonCompliance.reason}`;
}

function deriveCorrectiveActions(nonCompliantArtifacts) {
  return [
    ...new Set(
      nonCompliantArtifacts
        .map((artifact) => CORRECTIVE_ACTIONS_BY_REASON[artifact.reasonCode])
        .filter((action) => typeof action === 'string' && action.length > 0)
    )
  ];
}

function validateResolvedDocument({ document, allowlistRoots, allowedExtensions, targetArtifactNames }) {
  const resolvedPath = document.resolvedPath;

  if (!isPathWithinAllowlist(resolvedPath, allowlistRoots)) {
    return {
      compliant: false,
      nonCompliance: buildNonCompliance({
        pathValue: resolvedPath,
        reasonCode: 'ARTIFACT_PATH_NOT_ALLOWED',
        reason: `Chemin hors allowlist: ${resolvedPath}.`
      })
    };
  }

  const extension = path.extname(resolvedPath).toLowerCase();

  if (!allowedExtensions.has(extension)) {
    return {
      compliant: false,
      nonCompliance: buildNonCompliance({
        pathValue: resolvedPath,
        reasonCode: 'UNSUPPORTED_ARTIFACT_TYPE',
        reason:
          `Extension non supportée: ${extension || '(aucune)'} pour ${resolvedPath}. Extensions autorisées: ${Array.from(allowedExtensions).join(', ')}.`
      })
    };
  }

  const parsedMetadata = parseArtifactMetadata({
    extension,
    content: document.content
  });

  if (!parsedMetadata.valid) {
    return {
      compliant: false,
      nonCompliance: buildNonCompliance({
        pathValue: resolvedPath,
        reasonCode: 'ARTIFACT_PARSE_FAILED',
        reason: `${parsedMetadata.reason} (${resolvedPath}).`
      })
    };
  }

  const artifactName = path.basename(resolvedPath).toLowerCase();
  const isTargetArtifact = targetArtifactNames.has(artifactName);

  if (isTargetArtifact) {
    const metadataValidation = validateRequiredMetadata(parsedMetadata.metadata);

    if (!metadataValidation.valid) {
      if (metadataValidation.missing) {
        return {
          compliant: false,
          nonCompliance: buildNonCompliance({
            pathValue: resolvedPath,
            reasonCode: 'ARTIFACT_METADATA_MISSING',
            reason:
              `Metadata obligatoire manquante pour ${resolvedPath}: ${metadataValidation.missingFields.join(', ')}.`,
            missingFields: metadataValidation.missingFields,
            metadataErrors: metadataValidation.metadataErrors
          })
        };
      }

      return {
        compliant: false,
        nonCompliance: buildNonCompliance({
          pathValue: resolvedPath,
          reasonCode: 'ARTIFACT_METADATA_INVALID',
          reason:
            `Metadata invalide pour ${resolvedPath}: ${metadataValidation.metadataErrors.join(' ')}`,
          metadataErrors: metadataValidation.metadataErrors
        })
      };
    }

    return {
      compliant: true,
      compliantArtifact: {
        path: resolvedPath,
        extension,
        sourceType: document.sourceType,
        isTargetArtifact,
        metadata: metadataValidation.normalizedMetadata,
        sectionExtractionEligible: true
      }
    };
  }

  return {
    compliant: true,
    compliantArtifact: {
      path: resolvedPath,
      extension,
      sourceType: document.sourceType,
      isTargetArtifact,
      metadata: cloneValue(parsedMetadata.metadata),
      sectionExtractionEligible: true
    }
  };
}

export function validateArtifactMetadataCompliance(input, options = {}) {
  const payload = isObject(input) ? input : {};
  const runtimeOptions = isObject(options) ? options : {};
  const nowMs = typeof runtimeOptions.nowMs === 'function' ? runtimeOptions.nowMs : () => Date.now();

  const validationStartMs = nowMs();

  const allowlistResolution = resolveAllowlistRoots(payload);

  if (!allowlistResolution.valid) {
    return createInvalidInputResult({
      reason: allowlistResolution.reason,
      durationMs: toDurationMs(validationStartMs, nowMs())
    });
  }

  const allowlistRoots = allowlistResolution.allowlistRoots;

  const extensionsResolution = resolveAllowedExtensions(payload, runtimeOptions);

  if (!extensionsResolution.valid) {
    return createInvalidInputResult({
      reason: extensionsResolution.reason,
      allowlistRoots,
      durationMs: toDurationMs(validationStartMs, nowMs())
    });
  }

  const allowedExtensions = extensionsResolution.allowedExtensions;

  const targetArtifactResolution = resolveTargetArtifactNames(payload, runtimeOptions);

  if (!targetArtifactResolution.valid) {
    return createInvalidInputResult({
      reason: targetArtifactResolution.reason,
      allowlistRoots,
      durationMs: toDurationMs(validationStartMs, nowMs())
    });
  }

  const targetArtifactNames = targetArtifactResolution.targetArtifactNames;

  const sourceResolution = resolveArtifactSources(payload, runtimeOptions, nowMs);

  if (!sourceResolution.valid) {
    return createInvalidInputResult({
      reason: sourceResolution.reason,
      allowlistRoots,
      durationMs: toDurationMs(validationStartMs, nowMs())
    });
  }

  let missingMetadataCount = 0;
  let invalidMetadataCount = 0;

  const compliantArtifacts = [];
  const nonCompliantArtifacts = [...sourceResolution.nonCompliantArtifacts];
  const validationDurations = [...sourceResolution.validationDurations];

  for (const existingNonCompliance of sourceResolution.nonCompliantArtifacts) {
    if (existingNonCompliance.reasonCode === 'ARTIFACT_METADATA_MISSING') {
      missingMetadataCount += 1;
    }

    if (existingNonCompliance.reasonCode === 'ARTIFACT_METADATA_INVALID') {
      invalidMetadataCount += 1;
    }
  }

  for (const document of sourceResolution.documents) {
    const artifactStartMs = nowMs();

    const validationResult = validateResolvedDocument({
      document,
      allowlistRoots,
      allowedExtensions,
      targetArtifactNames
    });

    if (validationResult.compliant) {
      compliantArtifacts.push(validationResult.compliantArtifact);
    } else {
      nonCompliantArtifacts.push(validationResult.nonCompliance);

      if (validationResult.nonCompliance.reasonCode === 'ARTIFACT_METADATA_MISSING') {
        missingMetadataCount += 1;
      }

      if (validationResult.nonCompliance.reasonCode === 'ARTIFACT_METADATA_INVALID') {
        invalidMetadataCount += 1;
      }
    }

    validationDurations.push(toDurationMs(artifactStartMs, nowMs()));
  }

  const diagnostics = {
    requestedCount: sourceResolution.requestedCount,
    validatedCount: compliantArtifacts.length + nonCompliantArtifacts.length,
    compliantCount: compliantArtifacts.length,
    nonCompliantCount: nonCompliantArtifacts.length,
    missingMetadataCount,
    invalidMetadataCount,
    allowlistRoots,
    durationMs: toDurationMs(validationStartMs, nowMs()),
    p95ValidationMs: computePercentile(validationDurations, 95)
  };

  if (nonCompliantArtifacts.length === 0) {
    return createResult({
      allowed: true,
      reasonCode: 'OK',
      reason: deriveReasonText({
        reasonCode: 'OK',
        nonCompliantArtifacts,
        diagnostics
      }),
      diagnostics,
      compliantArtifacts,
      nonCompliantArtifacts,
      correctiveActions: []
    });
  }

  const reasonCode = resolvePrimaryReasonCode(nonCompliantArtifacts);

  return createResult({
    allowed: false,
    reasonCode,
    reason: deriveReasonText({
      reasonCode,
      nonCompliantArtifacts,
      diagnostics
    }),
    diagnostics,
    compliantArtifacts,
    nonCompliantArtifacts,
    correctiveActions: deriveCorrectiveActions(nonCompliantArtifacts)
  });
}
