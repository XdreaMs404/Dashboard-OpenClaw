import { describe, expect, it } from 'vitest';
import { buildArtifactStalenessIndicator } from '../../src/artifact-staleness-indicator.js';

const ALLOWLIST_ROOT =
  '/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts';

function validEvidenceGraphResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'ok',
    diagnostics: {
      sourceReasonCode: 'OK'
    },
    graph: {
      nodes: [
        {
          nodeId: 'artifact:a-v1',
          nodeType: 'artifact',
          artifactId: 'a-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/a-v1.md`,
          artifactType: 'prd',
          updatedAt: '2026-02-23T12:00:00.000Z'
        }
      ],
      edges: [],
      clusters: []
    },
    decisionBacklinks: {
      'DEC-1': [
        {
          artifactId: 'a-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/a-v1.md`,
          artifactType: 'prd',
          updatedAt: '2026-02-23T12:00:00.000Z'
        }
      ]
    },
    orphanEvidence: [],
    correctiveActions: [],
    ...overrides
  };
}

describe('artifact-staleness-indicator edge cases', () => {
  it('fails closed on non-object inputs', () => {
    const samples = [undefined, null, true, 42, 'S021', []];

    for (const sample of samples) {
      const result = buildArtifactStalenessIndicator(sample);

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_STALENESS_INPUT',
        stalenessBoard: {
          staleButAvailable: true,
          artifacts: []
        },
        decisionFreshness: {}
      });
    }
  });

  it('rejects invalid maxAgeSeconds and rebuildDurationMs', () => {
    const invalidMaxAge = buildArtifactStalenessIndicator({
      evidenceGraphResult: validEvidenceGraphResult(),
      maxAgeSeconds: 0
    });

    expect(invalidMaxAge.reasonCode).toBe('INVALID_STALENESS_INPUT');
    expect(invalidMaxAge.reason).toContain('maxAgeSeconds invalide');

    const invalidRebuildDuration = buildArtifactStalenessIndicator({
      evidenceGraphResult: validEvidenceGraphResult(),
      rebuildDurationMs: -1
    });

    expect(invalidRebuildDuration.reasonCode).toBe('INVALID_STALENESS_INPUT');
    expect(invalidRebuildDuration.reason).toContain('rebuildDurationMs invalide');
  });

  it('rejects missing source and invalid source payloads', () => {
    const missingSource = buildArtifactStalenessIndicator({});

    expect(missingSource.reasonCode).toBe('INVALID_STALENESS_INPUT');
    expect(missingSource.reason).toContain('Aucune source exploitable');

    const invalidEvidenceGraphInput = buildArtifactStalenessIndicator({
      evidenceGraphInput: 'bad'
    });

    expect(invalidEvidenceGraphInput.reasonCode).toBe('INVALID_STALENESS_INPUT');
    expect(invalidEvidenceGraphInput.reason).toContain('evidenceGraphInput invalide');

    const invalidEvidenceGraphResult = buildArtifactStalenessIndicator({
      evidenceGraphResult: 'bad'
    });

    expect(invalidEvidenceGraphResult.reasonCode).toBe('INVALID_STALENESS_INPUT');
    expect(invalidEvidenceGraphResult.reason).toContain('evidenceGraphResult invalide');
  });

  it('rejects invalid evidenceGraphResult contracts', () => {
    const invalidAllowed = buildArtifactStalenessIndicator({
      evidenceGraphResult: {
        reasonCode: 'OK'
      }
    });

    expect(invalidAllowed.reasonCode).toBe('INVALID_STALENESS_INPUT');

    const invalidReasonCode = buildArtifactStalenessIndicator({
      evidenceGraphResult: {
        allowed: true,
        reasonCode: 'NOT_ALLOWED',
        graph: {
          nodes: []
        },
        decisionBacklinks: {}
      }
    });

    expect(invalidReasonCode.reasonCode).toBe('INVALID_STALENESS_INPUT');

    const invalidBlockedReason = buildArtifactStalenessIndicator({
      evidenceGraphResult: {
        allowed: false,
        reasonCode: 'ARTIFACT_STALENESS_DETECTED',
        reason: 'not propagable',
        diagnostics: {
          sourceReasonCode: 'ARTIFACT_STALENESS_DETECTED'
        }
      }
    });

    expect(invalidBlockedReason.reasonCode).toBe('INVALID_STALENESS_INPUT');
    expect(invalidBlockedReason.reason).toContain('non propagable');

    const missingGraphNodes = buildArtifactStalenessIndicator({
      evidenceGraphResult: {
        allowed: true,
        reasonCode: 'OK',
        graph: {},
        decisionBacklinks: {}
      }
    });

    expect(missingGraphNodes.reasonCode).toBe('INVALID_STALENESS_INPUT');
    expect(missingGraphNodes.reason).toContain('graph.nodes invalide');
  });

  it('rejects invalid artifactTimestamps and eventLedger payloads', () => {
    const invalidArtifactTimestampsShape = buildArtifactStalenessIndicator({
      evidenceGraphResult: validEvidenceGraphResult(),
      artifactTimestamps: 'bad'
    });

    expect(invalidArtifactTimestampsShape.reasonCode).toBe('INVALID_STALENESS_INPUT');
    expect(invalidArtifactTimestampsShape.reason).toContain('artifactTimestamps invalide');

    const invalidArtifactTimestampValue = buildArtifactStalenessIndicator({
      evidenceGraphResult: validEvidenceGraphResult(),
      artifactTimestamps: {
        'a-v1': 'not-a-date'
      }
    });

    expect(invalidArtifactTimestampValue.reasonCode).toBe('INVALID_STALENESS_INPUT');
    expect(invalidArtifactTimestampValue.reason).toContain('artifactTimestamps.a-v1 invalide');

    const invalidEventLedgerShape = buildArtifactStalenessIndicator({
      evidenceGraphResult: validEvidenceGraphResult(),
      eventLedger: 'bad'
    });

    expect(invalidEventLedgerShape.reasonCode).toBe('INVALID_STALENESS_INPUT');
    expect(invalidEventLedgerShape.reason).toContain('eventLedger invalide');

    const invalidEventLedgerEntry = buildArtifactStalenessIndicator({
      evidenceGraphResult: validEvidenceGraphResult(),
      eventLedger: [1, 'x', 3]
    });

    expect(invalidEventLedgerEntry.reasonCode).toBe('INVALID_STALENESS_INPUT');
    expect(invalidEventLedgerEntry.reason).toContain('eventLedger[1] invalide');
  });

  it('returns EVENT_LEDGER_GAP_DETECTED on expected start/end mismatches', () => {
    const expectedStartMismatch = buildArtifactStalenessIndicator({
      evidenceGraphResult: validEvidenceGraphResult(),
      eventLedger: {
        events: [2, 3, 4],
        expectedSequenceStart: 1
      }
    });

    expect(expectedStartMismatch.reasonCode).toBe('EVENT_LEDGER_GAP_DETECTED');
    expect(expectedStartMismatch.reason).toContain('start attendu');

    const expectedEndMismatch = buildArtifactStalenessIndicator({
      evidenceGraphResult: validEvidenceGraphResult(),
      eventLedger: {
        events: [2, 3, 4],
        expectedSequenceEnd: 5
      }
    });

    expect(expectedEndMismatch.reasonCode).toBe('EVENT_LEDGER_GAP_DETECTED');
    expect(expectedEndMismatch.reason).toContain('end attendu');
  });

  it('handles non-monotonic nowMs values safely', () => {
    const nowValues = [Number.NaN, 20, 10, 0, Number.NaN, 5, 1];

    const result = buildArtifactStalenessIndicator(
      {
        evidenceGraphResult: validEvidenceGraphResult(),
        artifactTimestamps: {
          'a-v1': '2026-02-23T12:00:00.000Z'
        }
      },
      {
        nowMs: () => nowValues.shift() ?? Number.NaN
      }
    );

    expect(['OK', 'ARTIFACT_STALENESS_DETECTED']).toContain(result.reasonCode);
    expect(result.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.diagnostics.p95StalenessMs).toBeGreaterThanOrEqual(0);
  });

  it('accepts non-object options and does not mutate input payload/options', () => {
    const input = {
      evidenceGraphResult: validEvidenceGraphResult(),
      artifactTimestamps: {
        'a-v1': '2026-02-23T12:00:00.000Z'
      }
    };

    const options = {
      evidenceGraphOptions: {
        nowMs: () => Date.now()
      }
    };

    const inputSnapshot = JSON.parse(JSON.stringify(input));

    const result = buildArtifactStalenessIndicator(input, options);

    expect(['OK', 'ARTIFACT_STALENESS_DETECTED']).toContain(result.reasonCode);
    expect(input).toEqual(inputSnapshot);

    const resultWithNonObjectOptions = buildArtifactStalenessIndicator(input, 'bad-options');
    expect(['OK', 'ARTIFACT_STALENESS_DETECTED']).toContain(resultWithNonObjectOptions.reasonCode);
  });

  it('fails closed when delegated buildArtifactEvidenceGraph throws', () => {
    const result = buildArtifactStalenessIndicator(
      {
        evidenceGraphInput: {
          graphEntries: [
            {
              groupKey: 'x',
              artifactId: 'x-v1',
              artifactPath: `${ALLOWLIST_ROOT}/reports/x-v1.md`,
              artifactType: 'prd',
              decisionRefs: ['DEC-X'],
              gateRefs: ['G-X'],
              commandRefs: ['CMD-X']
            }
          ]
        }
      },
      {
        evidenceGraphOptions: {
          nowMs: () => {
            throw new Error('boom');
          }
        }
      }
    );

    expect(result.reasonCode).toBe('INVALID_STALENESS_INPUT');
    expect(result.reason).toContain('levé une exception');
  });

  it('uses fallback corrective actions for blocked reasons when correctiveActions missing', () => {
    const result = buildArtifactStalenessIndicator({
      evidenceGraphResult: {
        allowed: false,
        reasonCode: 'ARTIFACT_PARSE_FAILED',
        reason: 'parse error',
        diagnostics: {
          sourceReasonCode: 'ARTIFACT_PARSE_FAILED'
        }
      }
    });

    expect(result.reasonCode).toBe('ARTIFACT_PARSE_FAILED');
    expect(result.correctiveActions).toEqual(['FIX_ARTIFACT_SYNTAX']);
  });

  it('marks artifact as stale when timestamp is missing and keeps stale-but-available board', () => {
    const result = buildArtifactStalenessIndicator({
      evidenceGraphResult: validEvidenceGraphResult(),
      maxAgeSeconds: 100
    });

    expect(result.reasonCode).toBe('ARTIFACT_STALENESS_DETECTED');
    expect(result.stalenessBoard.staleButAvailable).toBe(true);
    expect(result.stalenessBoard.artifacts[0]).toMatchObject({
      artifactId: 'a-v1',
      isStale: true
    });
  });

  it('supports eventLedger object with sequences array', () => {
    const result = buildArtifactStalenessIndicator({
      evidenceGraphResult: validEvidenceGraphResult(),
      eventLedger: {
        sequences: [10, 11, 12]
      },
      artifactTimestamps: {
        'a-v1': '2026-02-23T12:00:00.000Z'
      }
    });

    expect(['OK', 'ARTIFACT_STALENESS_DETECTED']).toContain(result.reasonCode);
  });

  it('handles empty corpus with empty ledger while keeping stable zero diagnostics', () => {
    const result = buildArtifactStalenessIndicator({
      evidenceGraphResult: validEvidenceGraphResult({
        graph: {
          nodes: [],
          edges: [],
          clusters: []
        },
        decisionBacklinks: {}
      }),
      eventLedger: []
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        artifactsCount: 0,
        staleCount: 0,
        staleRatio: 0,
        p95StalenessMs: 0
      },
      stalenessBoard: {
        summary: {
          artifactsCount: 0,
          staleCount: 0,
          staleRatio: 0
        }
      }
    });
  });

  it('rejects empty artifactTimestamps keys and out-of-range timestamps', () => {
    const emptyKey = buildArtifactStalenessIndicator({
      evidenceGraphResult: validEvidenceGraphResult(),
      artifactTimestamps: {
        '': '2026-02-23T12:00:00.000Z'
      }
    });

    expect(emptyKey.reasonCode).toBe('INVALID_STALENESS_INPUT');
    expect(emptyKey.reason).toContain('clé vide');

    const outOfRangeTimestamp = buildArtifactStalenessIndicator({
      evidenceGraphResult: validEvidenceGraphResult(),
      artifactTimestamps: {
        'a-v1': 9_000_000_000_000_000
      }
    });

    expect(outOfRangeTimestamp.reasonCode).toBe('INVALID_STALENESS_INPUT');
    expect(outOfRangeTimestamp.reason).toContain('date non reconnue');
  });

  it('accepts null/blank timestamp entries as absent and supports numeric path-based timestamp fallback', () => {
    const nowMs = new Date('2026-02-23T12:30:00.000Z').getTime();

    const result = buildArtifactStalenessIndicator(
      {
        evidenceGraphResult: validEvidenceGraphResult(),
        maxAgeSeconds: 1800,
        artifactTimestamps: {
          'a-v1': null,
          [`${ALLOWLIST_ROOT}/reports/a-v1.md`]: nowMs - 120_000,
          ignored: '   '
        }
      },
      {
        nowMs: () => nowMs
      }
    );

    expect(result.reasonCode).toBe('OK');
    expect(result.stalenessBoard.artifacts[0]).toMatchObject({
      artifactId: 'a-v1',
      isStale: false,
      stalenessLevel: 'fresh'
    });
  });

  it('validates evidenceGraphResult variants: empty reasonCode, fallback blocked reason and invalid decisionBacklinks shape', () => {
    const emptyReasonCode = buildArtifactStalenessIndicator({
      evidenceGraphResult: {
        allowed: true,
        reasonCode: '',
        graph: {
          nodes: []
        },
        decisionBacklinks: {}
      }
    });

    expect(emptyReasonCode.reasonCode).toBe('INVALID_STALENESS_INPUT');
    expect(emptyReasonCode.reason).toContain('vide');

    const blockedWithoutReason = buildArtifactStalenessIndicator({
      evidenceGraphResult: {
        allowed: false,
        reasonCode: 'ARTIFACT_DIFF_NOT_ELIGIBLE',
        diagnostics: {
          sourceReasonCode: 'ARTIFACT_DIFF_NOT_ELIGIBLE'
        }
      }
    });

    expect(blockedWithoutReason.reasonCode).toBe('ARTIFACT_DIFF_NOT_ELIGIBLE');
    expect(blockedWithoutReason.reason).toContain('Source evidence graph bloquée');

    const invalidDecisionBacklinks = buildArtifactStalenessIndicator({
      evidenceGraphResult: {
        allowed: true,
        reasonCode: 'OK',
        graph: {
          nodes: []
        },
        decisionBacklinks: []
      }
    });

    expect(invalidDecisionBacklinks.reasonCode).toBe('INVALID_STALENESS_INPUT');
    expect(invalidDecisionBacklinks.reason).toContain('decisionBacklinks invalide');
  });

  it('handles object-based ledger sequence extraction and stringified delegated exceptions', () => {
    const ledgerFromObjects = buildArtifactStalenessIndicator({
      evidenceGraphResult: validEvidenceGraphResult(),
      eventLedger: {
        events: [{ seq: 7 }, { id: 8 }, { sequence: 9 }],
        expectedSequenceStart: 7,
        expectedSequenceEnd: 9
      },
      artifactTimestamps: {
        'a-v1': '2026-02-23T12:20:00.000Z'
      }
    });

    expect(['OK', 'ARTIFACT_STALENESS_DETECTED']).toContain(ledgerFromObjects.reasonCode);

    const delegatedStringThrow = buildArtifactStalenessIndicator(
      {
        evidenceGraphInput: {
          graphEntries: [
            {
              groupKey: 'z',
              artifactId: 'z-v1',
              artifactPath: `${ALLOWLIST_ROOT}/reports/z-v1.md`,
              artifactType: 'prd',
              decisionRefs: ['DEC-Z'],
              gateRefs: ['G-Z'],
              commandRefs: ['CMD-Z']
            }
          ]
        }
      },
      {
        evidenceGraphOptions: {
          nowMs: () => {
            throw 'boom-string';
          }
        }
      }
    );

    expect(delegatedStringThrow.reasonCode).toBe('INVALID_STALENESS_INPUT');
    expect(delegatedStringThrow.reason).toContain('boom-string');
  });

  it('covers artifact-node fallback normalization, registry enrichment, by-path timestamp and decision freshness skips', () => {
    const result = buildArtifactStalenessIndicator(
      {
        evidenceGraphResult: validEvidenceGraphResult({
          graph: {
            nodes: [
              {
                nodeId: 'artifact:node-from-id',
                nodeType: 'artifact',
                artifactPath: '',
                artifactType: '',
                updatedAt: ''
              },
              {
                nodeId: 'not-an-artifact-id',
                nodeType: 'artifact'
              }
            ],
            edges: [],
            clusters: []
          },
          decisionBacklinks: {
            'DEC-NON-ARRAY': 'bad-shape',
            'DEC-MIXED': [
              null,
              { artifactId: '' },
              { artifactId: 'ghost-artifact' },
              {
                artifactId: 'node-from-id',
                artifactPath: `${ALLOWLIST_ROOT}/reports/node-from-id.md`,
                artifactType: 'doc',
                updatedAt: '2026-02-23T12:10:00.000Z'
              },
              {
                artifactId: 'node-from-id',
                artifactPath: `${ALLOWLIST_ROOT}/reports/node-from-id.md`
              }
            ]
          }
        }),
        artifactTimestamps: {
          [`${ALLOWLIST_ROOT}/reports/node-from-id.md`]: '2026-02-23T12:20:00.000Z'
        }
      },
      {
        nowMs: () => new Date('2026-02-23T12:30:00.000Z').getTime()
      }
    );

    expect(result.reasonCode).toBe('ARTIFACT_STALENESS_DETECTED');
    expect(result.stalenessBoard.artifacts).toHaveLength(2);
    expect(result.stalenessBoard.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          artifactId: 'node-from-id',
          artifactPath: `${ALLOWLIST_ROOT}/reports/node-from-id.md`,
          artifactType: 'doc',
          isStale: false
        }),
        expect.objectContaining({
          artifactId: 'ghost-artifact',
          artifactPath: '',
          artifactType: 'artifact',
          isStale: true
        })
      ])
    );
    expect(result.decisionFreshness['DEC-MIXED']).toHaveLength(2);
    expect(result.decisionFreshness['DEC-NON-ARRAY']).toBeUndefined();
  });

  it('normalizes blocked corrective actions containing null/duplicates', () => {
    const result = buildArtifactStalenessIndicator({
      evidenceGraphResult: {
        allowed: false,
        reasonCode: 'ARTIFACT_PARSE_FAILED',
        reason: 'parse error',
        diagnostics: {
          sourceReasonCode: 'ARTIFACT_PARSE_FAILED'
        },
        correctiveActions: [null, '  FIX_ARTIFACT_SYNTAX  ', 'FIX_ARTIFACT_SYNTAX']
      }
    });

    expect(result.reasonCode).toBe('ARTIFACT_PARSE_FAILED');
    expect(result.correctiveActions).toEqual(['FIX_ARTIFACT_SYNTAX']);
  });
});
