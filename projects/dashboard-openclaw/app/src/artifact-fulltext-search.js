import path from 'node:path';
import { indexArtifactMarkdownTables } from './artifact-table-indexer.js';

const REASON_CODES = Object.freeze([
  'OK',
  'ARTIFACT_PATH_NOT_ALLOWED',
  'UNSUPPORTED_ARTIFACT_TYPE',
  'ARTIFACT_READ_FAILED',
  'ARTIFACT_PARSE_FAILED',
  'ARTIFACT_METADATA_MISSING',
  'ARTIFACT_METADATA_INVALID',
  'ARTIFACT_SECTIONS_MISSING',
  'ARTIFACT_TABLES_MISSING',
  'INVALID_ARTIFACT_SEARCH_INPUT'
]);

const REASON_CODE_SET = new Set(REASON_CODES);

const BLOCKING_REASON_CODES = new Set([
  'ARTIFACT_PATH_NOT_ALLOWED',
  'UNSUPPORTED_ARTIFACT_TYPE',
  'ARTIFACT_READ_FAILED',
  'ARTIFACT_PARSE_FAILED',
  'ARTIFACT_METADATA_MISSING',
  'ARTIFACT_METADATA_INVALID',
  'ARTIFACT_SECTIONS_MISSING',
  'ARTIFACT_TABLES_MISSING'
]);

const ACTION_BY_REASON = Object.freeze({
  ARTIFACT_PATH_NOT_ALLOWED: 'RESTRICT_TO_ALLOWED_ROOTS',
  UNSUPPORTED_ARTIFACT_TYPE: 'REMOVE_UNSUPPORTED_ARTIFACTS',
  ARTIFACT_READ_FAILED: 'RETRY_ARTIFACT_READ',
  ARTIFACT_PARSE_FAILED: 'FIX_ARTIFACT_SYNTAX',
  ARTIFACT_METADATA_MISSING: 'ADD_REQUIRED_METADATA',
  ARTIFACT_METADATA_INVALID: 'FIX_INVALID_METADATA',
  ARTIFACT_SECTIONS_MISSING: 'ADD_STRUCTURED_HEADINGS',
  ARTIFACT_TABLES_MISSING: 'ADD_MARKDOWN_TABLES'
});

const FIELD_WEIGHTS = Object.freeze({
  content: 5,
  sections: 3,
  tables: 4,
  path: 2,
  artifactType: 2
});

const DEFAULT_FILTERS = Object.freeze({
  artifactTypes: [],
  phase: [],
  agent: [],
  gate: [],
  owner: [],
  riskLevel: [],
  dateFrom: null,
  dateTo: null,
  dateFromMs: null,
  dateToMs: null
});

const DEFAULT_PAGINATION = Object.freeze({
  offset: 0,
  limit: 50
});

const MAX_QUERY_TOKENS = 32;
const MAX_QUERY_TOKEN_LENGTH = 64;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneValue(entry));
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

function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeArtifactType(value) {
  return normalizeLower(value)
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function inferArtifactType(artifactPath) {
  const basename = path.basename(artifactPath).toLowerCase();

  if (basename.endsWith('.markdown')) {
    return normalizeArtifactType(basename.slice(0, -9));
  }

  if (basename.endsWith('.md')) {
    return normalizeArtifactType(basename.slice(0, -3));
  }

  return normalizeArtifactType(basename);
}

function normalizeForSearch(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

  const sorted = values
    .map((value) => Math.max(0, Math.trunc(value)))
    .sort((left, right) => left - right);

  const rank = Math.ceil((percentile / 100) * sorted.length) - 1;
  const bounded = Math.max(0, Math.min(sorted.length - 1, rank));

  return sorted[bounded];
}

function toIsoDate(value) {
  const normalized = normalizeText(value);

  if (normalized.length === 0) {
    return null;
  }

  const parsedDate = new Date(normalized);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString();
}

function normalizeList(value, label, { requireArray = false } = {}) {
  if (value === undefined) {
    return {
      valid: true,
      values: []
    };
  }

  if (requireArray && !Array.isArray(value)) {
    return {
      valid: false,
      reason: `${label} invalide: tableau non vide requis.`
    };
  }

  const source = Array.isArray(value) ? value : [value];

  if (source.length === 0) {
    return {
      valid: false,
      reason: `${label} invalide: valeur non vide requise.`
    };
  }

  const values = [];
  const seen = new Set();

  for (let index = 0; index < source.length; index += 1) {
    const normalized = normalizeLower(String(source[index] ?? ''));

    if (normalized.length === 0) {
      return {
        valid: false,
        reason: `${label}[${index}] invalide: chaîne non vide requise.`
      };
    }

    if (!seen.has(normalized)) {
      seen.add(normalized);
      values.push(normalized);
    }
  }

  return {
    valid: true,
    values
  };
}

function resolveQuery(payload) {
  const query = normalizeText(payload.query);

  if (query.length === 0) {
    return {
      valid: false,
      reason: 'query invalide: chaîne non vide requise.'
    };
  }

  const tokens = [...new Set(normalizeForSearch(query).split(' ').filter((token) => token.length > 0))];

  if (tokens.length === 0) {
    return {
      valid: false,
      reason: 'query invalide: aucun token exploitable après normalisation.'
    };
  }

  if (tokens.length > MAX_QUERY_TOKENS) {
    return {
      valid: false,
      reason: `query invalide: maximum ${MAX_QUERY_TOKENS} tokens autorisés.`
    };
  }

  if (tokens.some((token) => token.length > MAX_QUERY_TOKEN_LENGTH)) {
    return {
      valid: false,
      reason: `query invalide: token trop long (${MAX_QUERY_TOKEN_LENGTH} caractères max).`
    };
  }

  return {
    valid: true,
    query,
    tokens
  };
}

function resolvePagination(payload) {
  if (payload.pagination === undefined) {
    return {
      valid: true,
      pagination: cloneValue(DEFAULT_PAGINATION)
    };
  }

  if (!isObject(payload.pagination)) {
    return {
      valid: false,
      reason: 'pagination invalide: objet attendu.'
    };
  }

  const offset = payload.pagination.offset ?? DEFAULT_PAGINATION.offset;
  const limit = payload.pagination.limit ?? DEFAULT_PAGINATION.limit;

  if (!Number.isInteger(offset) || offset < 0) {
    return {
      valid: false,
      reason: 'pagination.offset invalide: entier >= 0 requis.'
    };
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    return {
      valid: false,
      reason: 'pagination.limit invalide: entier entre 1 et 500 requis.'
    };
  }

  return {
    valid: true,
    pagination: {
      offset,
      limit
    }
  };
}

function resolveFilters(payload) {
  if (payload.filters === undefined) {
    return {
      valid: true,
      filters: cloneValue(DEFAULT_FILTERS)
    };
  }

  if (!isObject(payload.filters)) {
    return {
      valid: false,
      reason: 'filters invalide: objet attendu.'
    };
  }

  const allowedKeys = new Set([
    'artifactTypes',
    'phase',
    'agent',
    'gate',
    'owner',
    'riskLevel',
    'dateFrom',
    'dateTo'
  ]);

  const unknownKeys = Object.keys(payload.filters).filter((key) => !allowedKeys.has(key));

  if (unknownKeys.length > 0) {
    return {
      valid: false,
      reason: `filters contient des clés non supportées: ${unknownKeys.join(', ')}.`
    };
  }

  const artifactTypes = normalizeList(payload.filters.artifactTypes, 'filters.artifactTypes', {
    requireArray: true
  });

  if (!artifactTypes.valid) {
    return artifactTypes;
  }

  const phase = normalizeList(payload.filters.phase, 'filters.phase');

  if (!phase.valid) {
    return phase;
  }

  const agent = normalizeList(payload.filters.agent, 'filters.agent');

  if (!agent.valid) {
    return agent;
  }

  const gate = normalizeList(payload.filters.gate, 'filters.gate');

  if (!gate.valid) {
    return gate;
  }

  const owner = normalizeList(payload.filters.owner, 'filters.owner');

  if (!owner.valid) {
    return owner;
  }

  const riskLevel = normalizeList(payload.filters.riskLevel, 'filters.riskLevel');

  if (!riskLevel.valid) {
    return riskLevel;
  }

  const normalizedArtifactTypes = artifactTypes.values.map((value) => normalizeArtifactType(value));

  if (normalizedArtifactTypes.some((value) => value.length === 0)) {
    return {
      valid: false,
      reason: 'filters.artifactTypes invalide: type artefact non vide requis.'
    };
  }

  const dateFrom = payload.filters.dateFrom === undefined ? null : toIsoDate(payload.filters.dateFrom);
  const dateTo = payload.filters.dateTo === undefined ? null : toIsoDate(payload.filters.dateTo);

  if (payload.filters.dateFrom !== undefined && dateFrom === null) {
    return {
      valid: false,
      reason: 'filters.dateFrom invalide: date ISO ou compatible requise.'
    };
  }

  if (payload.filters.dateTo !== undefined && dateTo === null) {
    return {
      valid: false,
      reason: 'filters.dateTo invalide: date ISO ou compatible requise.'
    };
  }

  const dateFromMs = dateFrom === null ? null : new Date(dateFrom).getTime();
  const dateToMs = dateTo === null ? null : new Date(dateTo).getTime();

  if (dateFromMs !== null && dateToMs !== null && dateFromMs > dateToMs) {
    return {
      valid: false,
      reason: 'filters.dateFrom invalide: doit être antérieure ou égale à filters.dateTo.'
    };
  }

  return {
    valid: true,
    filters: {
      artifactTypes: normalizedArtifactTypes,
      phase: phase.values,
      agent: agent.values,
      gate: gate.values,
      owner: owner.values,
      riskLevel: riskLevel.values,
      dateFrom,
      dateTo,
      dateFromMs,
      dateToMs
    }
  };
}

function buildAppliedFilters(filters, pagination) {
  return {
    artifactTypes: [...filters.artifactTypes],
    phase: [...filters.phase],
    agent: [...filters.agent],
    gate: [...filters.gate],
    owner: [...filters.owner],
    riskLevel: [...filters.riskLevel],
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    offset: pagination.offset,
    limit: pagination.limit
  };
}

function createDiagnostics({
  query,
  requestedCount,
  indexedCount,
  matchedCount,
  filteredOutCount,
  durationMs,
  p95SearchMs,
  sourceReasonCode
}) {
  return {
    query,
    requestedCount,
    indexedCount,
    matchedCount,
    filteredOutCount,
    durationMs,
    p95SearchMs,
    sourceReasonCode
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  results,
  appliedFilters,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode,
    reason,
    diagnostics: createDiagnostics(diagnostics),
    results: results.map((entry) => cloneValue(entry)),
    appliedFilters: cloneValue(appliedFilters),
    correctiveActions: [...correctiveActions]
  };
}

function createInvalidResult({ query, reason, appliedFilters, durationMs = 0 }) {
  return createResult({
    allowed: false,
    reasonCode: 'INVALID_ARTIFACT_SEARCH_INPUT',
    reason,
    diagnostics: {
      query,
      requestedCount: 0,
      indexedCount: 0,
      matchedCount: 0,
      filteredOutCount: 0,
      durationMs,
      p95SearchMs: 0,
      sourceReasonCode: 'INVALID_ARTIFACT_SEARCH_INPUT'
    },
    results: [],
    appliedFilters,
    correctiveActions: []
  });
}

function createBlockedResult({
  query,
  reasonCode,
  reason,
  sourceReasonCode,
  requestedCount,
  indexedCount,
  appliedFilters,
  correctiveActions,
  durationMs
}) {
  return createResult({
    allowed: false,
    reasonCode,
    reason: `Recherche full-text bloquée (${reasonCode}): ${reason}`,
    diagnostics: {
      query,
      requestedCount,
      indexedCount,
      matchedCount: 0,
      filteredOutCount: 0,
      durationMs,
      p95SearchMs: 0,
      sourceReasonCode
    },
    results: [],
    appliedFilters,
    correctiveActions
  });
}

function normalizeSections(value, label) {
  if (value === undefined) {
    return {
      valid: true,
      sections: []
    };
  }

  if (!Array.isArray(value)) {
    return {
      valid: false,
      reason: `${label} invalide: tableau attendu si fourni.`
    };
  }

  const sections = [];

  for (const entry of value) {
    if (typeof entry === 'string') {
      const text = normalizeText(entry);

      if (text.length > 0) {
        sections.push(text);
      }

      continue;
    }

    if (!isObject(entry)) {
      continue;
    }

    const text =
      normalizeText(entry.headingText) ||
      normalizeText(entry.title) ||
      normalizeText(entry.anchor) ||
      normalizeText(entry.content);

    if (text.length > 0) {
      sections.push(text);
    }
  }

  return {
    valid: true,
    sections
  };
}

function normalizeTableEntry(entry) {
  if (typeof entry === 'string') {
    const text = normalizeText(entry);

    if (text.length === 0) {
      return null;
    }

    return {
      text,
      sectionAnchor: ''
    };
  }

  if (!isObject(entry)) {
    return null;
  }

  const headers = Array.isArray(entry.headers)
    ? entry.headers.map((item) => normalizeText(String(item ?? '')))
    : [];

  const rows = Array.isArray(entry.rows)
    ? entry.rows
        .filter((row) => Array.isArray(row))
        .map((row) => row.map((cell) => normalizeText(String(cell ?? ''))))
    : [];

  const parts = [];

  if (headers.length > 0) {
    parts.push(headers.join(' | '));
  }

  for (const row of rows) {
    parts.push(row.join(' | '));
  }

  const text = normalizeText(parts.join(' \n ')) || normalizeText(entry.text) || normalizeText(entry.snippet);

  if (text.length === 0) {
    return null;
  }

  return {
    text,
    sectionAnchor: normalizeText(entry.sectionAnchor)
  };
}

function normalizeTables(value, label) {
  if (value === undefined) {
    return {
      valid: true,
      tables: []
    };
  }

  if (!Array.isArray(value)) {
    return {
      valid: false,
      reason: `${label} invalide: tableau attendu si fourni.`
    };
  }

  return {
    valid: true,
    tables: value.map((entry) => normalizeTableEntry(entry)).filter((entry) => entry !== null)
  };
}

function normalizeDocument(sourceEntry, index, labelPrefix) {
  if (!isObject(sourceEntry)) {
    return {
      valid: false,
      reason: `${labelPrefix}[${index}] invalide: objet requis.`
    };
  }

  const artifactPathCandidate =
    normalizeText(String(sourceEntry.artifactPath ?? sourceEntry.path ?? sourceEntry.filePath ?? ''));

  if (artifactPathCandidate.length === 0) {
    return {
      valid: false,
      reason: `${labelPrefix}[${index}].artifactPath invalide: chemin non vide requis.`
    };
  }

  const artifactPath = path.resolve(artifactPathCandidate);
  const artifactType = normalizeArtifactType(sourceEntry.artifactType) || inferArtifactType(artifactPath);

  if (artifactType.length === 0) {
    return {
      valid: false,
      reason: `${labelPrefix}[${index}].artifactType invalide: type artefact requis.`
    };
  }

  const rawContent = sourceEntry.content ?? sourceEntry.text ?? sourceEntry.body;

  if (rawContent !== undefined && typeof rawContent !== 'string') {
    return {
      valid: false,
      reason: `${labelPrefix}[${index}].content invalide: chaîne requise si fournie.`
    };
  }

  const sectionsResolution = normalizeSections(sourceEntry.sections, `${labelPrefix}[${index}].sections`);

  if (!sectionsResolution.valid) {
    return sectionsResolution;
  }

  const tablesResolution = normalizeTables(sourceEntry.tables, `${labelPrefix}[${index}].tables`);

  if (!tablesResolution.valid) {
    return tablesResolution;
  }

  const dateValue =
    sourceEntry.date ?? sourceEntry.dateAt ?? sourceEntry.updatedAt ?? sourceEntry.createdAt ?? sourceEntry.indexedAt;

  const date = dateValue === undefined ? null : toIsoDate(dateValue);

  if (dateValue !== undefined && date === null) {
    return {
      valid: false,
      reason: `${labelPrefix}[${index}].date invalide: date ISO ou compatible requise.`
    };
  }

  return {
    valid: true,
    document: {
      artifactPath,
      artifactType,
      content: normalizeText(rawContent ?? ''),
      sections: sectionsResolution.sections,
      tables: tablesResolution.tables,
      searchIndexEligible: sourceEntry.searchIndexEligible !== false,
      phase: normalizeLower(sourceEntry.phase),
      agent: normalizeLower(sourceEntry.agent),
      gate: normalizeLower(sourceEntry.gate),
      owner: normalizeLower(sourceEntry.owner),
      riskLevel: normalizeLower(sourceEntry.riskLevel ?? sourceEntry.risk),
      date,
      dateMs: date === null ? null : new Date(date).getTime()
    }
  };
}

function resolveSearchIndexSource(payload) {
  const entries = Array.isArray(payload.searchIndex)
    ? payload.searchIndex
    : isObject(payload.searchIndex) && Array.isArray(payload.searchIndex.entries)
      ? payload.searchIndex.entries
      : isObject(payload.searchIndex) && Array.isArray(payload.searchIndex.documents)
        ? payload.searchIndex.documents
        : null;

  if (entries === null) {
    return {
      valid: false,
      reason: 'searchIndex invalide: tableau attendu (ou objet avec entries/documents en tableau).'
    };
  }

  const documents = [];

  for (let index = 0; index < entries.length; index += 1) {
    const normalizedDocument = normalizeDocument(entries[index], index, 'searchIndex');

    if (!normalizedDocument.valid) {
      return normalizedDocument;
    }

    documents.push(normalizedDocument.document);
  }

  return {
    valid: true,
    blocked: false,
    sourceReasonCode: 'OK',
    requestedCount: entries.length,
    indexedCount: documents.filter((entry) => entry.searchIndexEligible).length,
    documents,
    correctiveActions: []
  };
}

function normalizeCorrectiveActions(reasonCode, correctiveActions) {
  if (Array.isArray(correctiveActions) && correctiveActions.length > 0) {
    return [...new Set(correctiveActions.filter((entry) => typeof entry === 'string' && entry.length > 0))];
  }

  return ACTION_BY_REASON[reasonCode] ? [ACTION_BY_REASON[reasonCode]] : [];
}

function tableArtifactToDocument(artifact, index) {
  const tables = Array.isArray(artifact.tables) ? artifact.tables : [];
  const tableTexts = tables.map((entry) => normalizeTableEntry(entry)).filter((entry) => entry !== null);

  const sections = Array.isArray(artifact.sections)
    ? artifact.sections
    : tableTexts.map((table) => table.sectionAnchor).filter((entry) => entry.length > 0);

  return normalizeDocument(
    {
      artifactPath: artifact.path ?? artifact.artifactPath ?? artifact.filePath,
      artifactType: artifact.artifactType,
      content:
        typeof artifact.content === 'string'
          ? artifact.content
          : tableTexts.map((table) => table.text).join(' \n '),
      sections,
      tables,
      searchIndexEligible: artifact.searchIndexEligible,
      phase: artifact.phase,
      agent: artifact.agent,
      gate: artifact.gate,
      owner: artifact.owner,
      riskLevel: artifact.riskLevel ?? artifact.risk,
      date: artifact.date ?? artifact.dateAt ?? artifact.updatedAt
    },
    index,
    'tableIndexResult.indexedArtifacts'
  );
}

function resolveTableIndexSource(tableIndexResult) {
  if (!isObject(tableIndexResult)) {
    return {
      valid: false,
      reason: 'tableIndexResult invalide: objet attendu.'
    };
  }

  const reasonCode = normalizeText(tableIndexResult.reasonCode);

  if (tableIndexResult.allowed === false) {
    if (!BLOCKING_REASON_CODES.has(reasonCode)) {
      return {
        valid: false,
        reason: `tableIndexResult invalide: reasonCode ${reasonCode} non propagable pour search.`
      };
    }

    return {
      valid: true,
      blocked: true,
      reasonCode,
      reason: normalizeText(tableIndexResult.reason) || `Indexation amont bloquée (${reasonCode}).`,
      sourceReasonCode: reasonCode,
      requestedCount: Math.max(0, Math.trunc(tableIndexResult.diagnostics?.requestedCount ?? 0)),
      indexedCount: Math.max(0, Math.trunc(tableIndexResult.diagnostics?.indexedCount ?? 0)),
      documents: [],
      correctiveActions: normalizeCorrectiveActions(reasonCode, tableIndexResult.correctiveActions)
    };
  }

  if (!Array.isArray(tableIndexResult.indexedArtifacts)) {
    return {
      valid: false,
      reason: 'tableIndexResult.indexedArtifacts invalide: tableau attendu.'
    };
  }

  const documents = [];

  for (let index = 0; index < tableIndexResult.indexedArtifacts.length; index += 1) {
    const normalizedDocument = tableArtifactToDocument(tableIndexResult.indexedArtifacts[index], index);

    if (!normalizedDocument.valid) {
      return normalizedDocument;
    }

    documents.push(normalizedDocument.document);
  }

  const requestedCount = Math.max(
    documents.length,
    Math.trunc(tableIndexResult.diagnostics?.requestedCount ?? documents.length)
  );

  return {
    valid: true,
    blocked: false,
    sourceReasonCode: REASON_CODE_SET.has(reasonCode) ? reasonCode : 'OK',
    requestedCount,
    indexedCount: documents.filter((entry) => entry.searchIndexEligible).length,
    documents,
    correctiveActions: []
  };
}

function resolveSource(payload, runtimeOptions, nowMs) {
  if (payload.searchIndex !== undefined) {
    return resolveSearchIndexSource(payload);
  }

  if (payload.tableIndexResult !== undefined) {
    return resolveTableIndexSource(payload.tableIndexResult);
  }

  if (payload.tableIndexInput !== undefined) {
    if (!isObject(payload.tableIndexInput)) {
      return {
        valid: false,
        reason: 'tableIndexInput invalide: objet requis pour la délégation S014.'
      };
    }

    const delegatedOptions = isObject(runtimeOptions.tableIndexOptions)
      ? cloneValue(runtimeOptions.tableIndexOptions)
      : {};

    if (typeof nowMs === 'function' && delegatedOptions.nowMs === undefined) {
      delegatedOptions.nowMs = nowMs;
    }

    const delegatedResult = indexArtifactMarkdownTables(payload.tableIndexInput, delegatedOptions);

    return resolveTableIndexSource(delegatedResult);
  }

  return {
    valid: false,
    reason: 'Aucune source exploitable: fournir searchIndex, tableIndexResult ou tableIndexInput.'
  };
}

function countOccurrences(haystack, needle) {
  let count = 0;
  let cursor = 0;

  while (cursor < haystack.length) {
    const index = haystack.indexOf(needle, cursor);

    if (index === -1) {
      break;
    }

    count += 1;
    cursor = index + needle.length;
  }

  return count;
}

function scoreField(fieldText, tokens) {
  const normalizedField = normalizeForSearch(fieldText);

  if (normalizedField.length === 0) {
    return 0;
  }

  let score = 0;

  for (const token of tokens) {
    score += countOccurrences(normalizedField, token);
  }

  return score;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSnippet(text, tokens) {
  const normalizedText = normalizeText(text);
  const loweredText = normalizedText.toLowerCase();
  let firstMatchIndex = -1;

  for (const token of tokens) {
    const tokenIndex = loweredText.indexOf(token.toLowerCase());

    if (tokenIndex !== -1 && (firstMatchIndex === -1 || tokenIndex < firstMatchIndex)) {
      firstMatchIndex = tokenIndex;
    }
  }

  const snippetStart = Math.max(0, firstMatchIndex - 60);
  const snippetEnd = Math.min(normalizedText.length, snippetStart + 220);

  let snippet = normalizedText.slice(snippetStart, snippetEnd);

  if (snippetStart > 0) {
    snippet = `…${snippet}`;
  }

  if (snippetEnd < normalizedText.length) {
    snippet = `${snippet}…`;
  }

  const pattern = tokens.map((token) => escapeRegex(token)).join('|');

  return snippet.replace(new RegExp(`(${pattern})`, 'gi'), '<mark>$1</mark>');
}

function buildSearchResult(document, tokens) {
  const sectionsText = document.sections.join(' \n ');
  const tablesText = document.tables.map((table) => table.text).join(' \n ');

  const contentScore = scoreField(document.content, tokens);
  const sectionsScore = scoreField(sectionsText, tokens);
  const tablesScore = scoreField(tablesText, tokens);
  const pathScore = scoreField(document.artifactPath, tokens);
  const artifactTypeScore = scoreField(document.artifactType, tokens);

  const score =
    contentScore * FIELD_WEIGHTS.content +
    sectionsScore * FIELD_WEIGHTS.sections +
    tablesScore * FIELD_WEIGHTS.tables +
    pathScore * FIELD_WEIGHTS.path +
    artifactTypeScore * FIELD_WEIGHTS.artifactType;

  if (score <= 0) {
    return null;
  }

  const matchedFields = [
    ...(contentScore > 0 ? ['content'] : []),
    ...(sectionsScore > 0 ? ['sections'] : []),
    ...(tablesScore > 0 ? ['tables'] : [])
  ];

  const snippetSource = [
    { score: contentScore, text: document.content },
    { score: tablesScore, text: tablesText },
    { score: sectionsScore, text: sectionsText },
    { score: pathScore, text: document.artifactPath }
  ].sort((left, right) => right.score - left.score)[0].text;

  return {
    artifactPath: document.artifactPath,
    artifactType: document.artifactType,
    score,
    snippet: buildSnippet(snippetSource, tokens),
    matchedFields,
    phase: document.phase,
    agent: document.agent,
    gate: document.gate,
    owner: document.owner,
    riskLevel: document.riskLevel,
    date: document.date
  };
}

function passesFilters(document, filters) {
  if (filters.artifactTypes.length > 0 && !filters.artifactTypes.includes(document.artifactType)) {
    return false;
  }

  if (filters.phase.length > 0 && !filters.phase.includes(document.phase)) {
    return false;
  }

  if (filters.agent.length > 0 && !filters.agent.includes(document.agent)) {
    return false;
  }

  if (filters.gate.length > 0 && !filters.gate.includes(document.gate)) {
    return false;
  }

  if (filters.owner.length > 0 && !filters.owner.includes(document.owner)) {
    return false;
  }

  if (filters.riskLevel.length > 0 && !filters.riskLevel.includes(document.riskLevel)) {
    return false;
  }

  if (filters.dateFromMs !== null || filters.dateToMs !== null) {
    if (document.dateMs === null) {
      return false;
    }

    if (filters.dateFromMs !== null && document.dateMs < filters.dateFromMs) {
      return false;
    }

    if (filters.dateToMs !== null && document.dateMs > filters.dateToMs) {
      return false;
    }
  }

  return true;
}

function compareResults(left, right) {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  return left.artifactPath.localeCompare(right.artifactPath);
}

function deriveReason(matchedCount, indexedCount) {
  if (matchedCount === 0) {
    return `Recherche full-text exécutée: aucun résultat sur ${indexedCount} artefacts indexés.`;
  }

  return `Recherche full-text exécutée: ${matchedCount} résultat(s) sur ${indexedCount} artefacts indexés.`;
}

export function searchArtifactsFullText(input, options = {}) {
  const payload = isObject(input) ? input : {};
  const runtimeOptions = isObject(options) ? options : {};
  const nowMs = typeof runtimeOptions.nowMs === 'function' ? runtimeOptions.nowMs : () => Date.now();
  const startedAtMs = nowMs();

  const queryResolution = resolveQuery(payload);
  const paginationResolution = resolvePagination(payload);
  const fallbackAppliedFilters = buildAppliedFilters(
    cloneValue(DEFAULT_FILTERS),
    paginationResolution.valid ? paginationResolution.pagination : cloneValue(DEFAULT_PAGINATION)
  );

  if (!queryResolution.valid) {
    return createInvalidResult({
      query: normalizeText(payload.query),
      reason: queryResolution.reason,
      appliedFilters: fallbackAppliedFilters,
      durationMs: toDurationMs(startedAtMs, nowMs())
    });
  }

  if (!paginationResolution.valid) {
    return createInvalidResult({
      query: queryResolution.query,
      reason: paginationResolution.reason,
      appliedFilters: fallbackAppliedFilters,
      durationMs: toDurationMs(startedAtMs, nowMs())
    });
  }

  const filtersResolution = resolveFilters(payload);

  if (!filtersResolution.valid) {
    return createInvalidResult({
      query: queryResolution.query,
      reason: filtersResolution.reason,
      appliedFilters: fallbackAppliedFilters,
      durationMs: toDurationMs(startedAtMs, nowMs())
    });
  }

  const filters = filtersResolution.filters;
  const pagination = paginationResolution.pagination;
  const appliedFilters = buildAppliedFilters(filters, pagination);

  const sourceResolution = resolveSource(payload, runtimeOptions, nowMs);

  if (!sourceResolution.valid) {
    return createInvalidResult({
      query: queryResolution.query,
      reason: sourceResolution.reason,
      appliedFilters,
      durationMs: toDurationMs(startedAtMs, nowMs())
    });
  }

  if (sourceResolution.blocked) {
    return createBlockedResult({
      query: queryResolution.query,
      reasonCode: sourceResolution.reasonCode,
      reason: sourceResolution.reason,
      sourceReasonCode: sourceResolution.sourceReasonCode,
      requestedCount: sourceResolution.requestedCount,
      indexedCount: sourceResolution.indexedCount,
      appliedFilters,
      correctiveActions: sourceResolution.correctiveActions,
      durationMs: toDurationMs(startedAtMs, nowMs())
    });
  }

  const documents = sourceResolution.documents.map((entry) => cloneValue(entry));
  const searchableDocuments = documents.filter((entry) => entry.searchIndexEligible !== false);

  const searchDurations = [];
  const rawMatches = [];

  for (const document of searchableDocuments) {
    const searchStartedAtMs = nowMs();
    const searchResult = buildSearchResult(document, queryResolution.tokens);

    if (searchResult !== null) {
      rawMatches.push({
        document,
        searchResult
      });
    }

    searchDurations.push(toDurationMs(searchStartedAtMs, nowMs()));
  }

  let filteredOutCount = 0;
  const filteredMatches = [];

  for (const match of rawMatches) {
    if (!passesFilters(match.document, filters)) {
      filteredOutCount += 1;
      continue;
    }

    filteredMatches.push(match.searchResult);
  }

  filteredMatches.sort(compareResults);

  const paginatedResults = filteredMatches
    .slice(pagination.offset, pagination.offset + pagination.limit)
    .map((entry) => cloneValue(entry));

  const requestedCount = Math.max(documents.length, Math.max(0, Math.trunc(sourceResolution.requestedCount)));
  const indexedCount = Math.max(searchableDocuments.length, Math.max(0, Math.trunc(sourceResolution.indexedCount)));

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: deriveReason(filteredMatches.length, indexedCount),
    diagnostics: {
      query: queryResolution.query,
      requestedCount,
      indexedCount,
      matchedCount: filteredMatches.length,
      filteredOutCount,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      p95SearchMs: computePercentile(searchDurations, 95),
      sourceReasonCode: sourceResolution.sourceReasonCode
    },
    results: paginatedResults,
    appliedFilters,
    correctiveActions: []
  });
}
