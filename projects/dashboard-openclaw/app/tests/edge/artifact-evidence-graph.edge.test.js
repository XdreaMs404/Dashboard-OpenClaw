import { describe, expect, it } from 'vitest';
import { buildArtifactEvidenceGraph } from '../../src/artifact-evidence-graph.js';

const ALLOWLIST_ROOT =
  '/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts';

function validDiffResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'ok',
    diagnostics: {
      sourceReasonCode: 'OK'
    },
    diffResults: [
      {
        groupKey: 'grp:1',
        leftArtifactId: 'a-v1',
        rightArtifactId: 'a-v2',
        leftArtifactPath: `${ALLOWLIST_ROOT}/reports/a-v1.md`,
        rightArtifactPath: `${ALLOWLIST_ROOT}/reports/a-v2.md`,
        artifactType: 'prd'
      }
    ],
    provenanceLinks: [
      {
        groupKey: 'grp:1',
        leftArtifactId: 'a-v1',
        rightArtifactId: 'a-v2',
        decisionRefs: ['DEC-1'],
        gateRefs: ['G4-T'],
        commandRefs: ['CMD-1']
      }
    ],
    correctiveActions: [],
    ...overrides
  };
}

describe('artifact-evidence-graph edge cases', () => {
  it('fails closed on non-object inputs', () => {
    const samples = [undefined, null, true, 42, 'S020', []];

    for (const sample of samples) {
      const result = buildArtifactEvidenceGraph(sample);

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_EVIDENCE_GRAPH_INPUT',
        graph: {
          nodes: [],
          edges: [],
          clusters: []
        },
        decisionBacklinks: {},
        orphanEvidence: []
      });
    }
  });

  it('rejects invalid decisionId selectors', () => {
    const emptyDecisionId = buildArtifactEvidenceGraph({
      artifactDiffResult: validDiffResult(),
      decisionId: '   '
    });

    expect(emptyDecisionId.reasonCode).toBe('INVALID_EVIDENCE_GRAPH_INPUT');
    expect(emptyDecisionId.reason).toContain('decisionId invalide');

    const nestedEmptyDecisionId = buildArtifactEvidenceGraph({
      artifactDiffResult: validDiffResult(),
      query: {
        decisionId: '  '
      }
    });

    expect(nestedEmptyDecisionId.reasonCode).toBe('INVALID_EVIDENCE_GRAPH_INPUT');
    expect(nestedEmptyDecisionId.reason).toContain('decisionId invalide');
  });

  it('rejects missing source and invalid source payloads', () => {
    const missingSource = buildArtifactEvidenceGraph({});

    expect(missingSource.reasonCode).toBe('INVALID_EVIDENCE_GRAPH_INPUT');
    expect(missingSource.reason).toContain('Aucune source exploitable');

    const invalidArtifactDiffInput = buildArtifactEvidenceGraph({
      artifactDiffInput: 'bad'
    });

    expect(invalidArtifactDiffInput.reasonCode).toBe('INVALID_EVIDENCE_GRAPH_INPUT');
    expect(invalidArtifactDiffInput.reason).toContain('artifactDiffInput invalide');

    const invalidGraphEntries = buildArtifactEvidenceGraph({
      graphEntries: 'bad'
    });

    expect(invalidGraphEntries.reasonCode).toBe('INVALID_EVIDENCE_GRAPH_INPUT');
    expect(invalidGraphEntries.reason).toContain('graphEntries invalide');
  });

  it('rejects invalid artifactDiffResult contracts', () => {
    const invalidObject = buildArtifactEvidenceGraph({
      artifactDiffResult: 'bad'
    });

    expect(invalidObject.reasonCode).toBe('INVALID_EVIDENCE_GRAPH_INPUT');

    const invalidAllowed = buildArtifactEvidenceGraph({
      artifactDiffResult: {
        reasonCode: 'OK'
      }
    });

    expect(invalidAllowed.reasonCode).toBe('INVALID_EVIDENCE_GRAPH_INPUT');

    const invalidReasonCode = buildArtifactEvidenceGraph({
      artifactDiffResult: {
        allowed: true,
        reasonCode: 'NOT_ALLOWED',
        diffResults: [],
        provenanceLinks: []
      }
    });

    expect(invalidReasonCode.reasonCode).toBe('INVALID_EVIDENCE_GRAPH_INPUT');

    const invalidBlockedReason = buildArtifactEvidenceGraph({
      artifactDiffResult: {
        allowed: false,
        reasonCode: 'EVIDENCE_LINK_INCOMPLETE',
        reason: 'not propagable',
        diagnostics: {
          sourceReasonCode: 'EVIDENCE_LINK_INCOMPLETE'
        }
      }
    });

    expect(invalidBlockedReason.reasonCode).toBe('INVALID_EVIDENCE_GRAPH_INPUT');
    expect(invalidBlockedReason.reason).toContain('non propagable');

    const missingDiffResults = buildArtifactEvidenceGraph({
      artifactDiffResult: {
        allowed: true,
        reasonCode: 'OK',
        provenanceLinks: []
      }
    });

    expect(missingDiffResults.reasonCode).toBe('INVALID_EVIDENCE_GRAPH_INPUT');
    expect(missingDiffResults.reason).toContain('diffResults invalide');
  });

  it('rejects malformed diffResults entries', () => {
    const invalidEntryObject = buildArtifactEvidenceGraph({
      artifactDiffResult: validDiffResult({
        diffResults: [null]
      })
    });

    expect(invalidEntryObject.reasonCode).toBe('INVALID_EVIDENCE_GRAPH_INPUT');

    const incompleteEntry = buildArtifactEvidenceGraph({
      artifactDiffResult: validDiffResult({
        diffResults: [
          {
            groupKey: 'grp:1',
            leftArtifactId: 'a-v1',
            rightArtifactId: 'a-v2',
            leftArtifactPath: '',
            rightArtifactPath: `${ALLOWLIST_ROOT}/reports/a-v2.md`,
            artifactType: 'prd'
          }
        ]
      })
    });

    expect(incompleteEntry.reasonCode).toBe('EVIDENCE_LINK_INCOMPLETE');
    expect(incompleteEntry.orphanEvidence).toHaveLength(1);
    expect(incompleteEntry.orphanEvidence[0].reason).toContain('Diff incomplet');
  });

  it('returns orphan evidence when provenance link cannot be correlated', () => {
    const result = buildArtifactEvidenceGraph({
      artifactDiffResult: validDiffResult({
        provenanceLinks: [
          {
            groupKey: 'other-group',
            leftArtifactId: 'x-v1',
            rightArtifactId: 'x-v2',
            decisionRefs: ['DEC-X'],
            gateRefs: ['G-X'],
            commandRefs: ['CMD-X']
          }
        ]
      })
    });

    expect(result.reasonCode).toBe('EVIDENCE_LINK_INCOMPLETE');
    expect(result.orphanEvidence).toHaveLength(1);
    expect(result.orphanEvidence[0].reason).toContain('Aucun provenanceLink corrélé');
  });

  it('returns orphan evidence when graphEntries contain incomplete links', () => {
    const result = buildArtifactEvidenceGraph({
      graphEntries: [
        {
          groupKey: 'entry-1',
          artifactId: 'graph-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/graph-v1.md`,
          artifactType: 'spec',
          decisionRefs: ['DEC-GRAPH']
        }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'EVIDENCE_LINK_INCOMPLETE',
      diagnostics: {
        orphanCount: 1
      }
    });
    expect(result.orphanEvidence[0].candidateSource).toBe('graphEntries');
  });

  it('returns INVALID_EVIDENCE_GRAPH_INPUT for malformed graphEntries items', () => {
    const result = buildArtifactEvidenceGraph({
      graphEntries: [
        null,
        {
          groupKey: 'ok',
          artifactId: 'a',
          artifactPath: `${ALLOWLIST_ROOT}/reports/a.md`,
          decisionRefs: ['DEC-A'],
          gateRefs: ['G-A'],
          commandRefs: ['CMD-A']
        }
      ]
    });

    expect(result.reasonCode).toBe('INVALID_EVIDENCE_GRAPH_INPUT');
    expect(result.reason).toContain('graphEntries[0] invalide');
  });

  it('handles non-monotonic nowMs values safely', () => {
    const nowValues = [Number.NaN, 50, 10, 0, Number.NaN, 5, 1];

    const result = buildArtifactEvidenceGraph(
      {
        artifactDiffResult: validDiffResult()
      },
      {
        nowMs: () => nowValues.shift() ?? Number.NaN
      }
    );

    expect(result.reasonCode).toBe('OK');
    expect(result.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.diagnostics.p95GraphMs).toBeGreaterThanOrEqual(0);
  });

  it('accepts non-object options and does not mutate input payload/options', () => {
    const input = {
      artifactDiffResult: validDiffResult()
    };

    const options = {
      artifactDiffOptions: {
        nowMs: () => Date.now()
      }
    };

    const inputSnapshot = JSON.parse(JSON.stringify(input));

    const result = buildArtifactEvidenceGraph(input, options);

    expect(result.reasonCode).toBe('OK');
    expect(input).toEqual(inputSnapshot);

    const resultWithNonObjectOptions = buildArtifactEvidenceGraph(input, 'bad-options');
    expect(resultWithNonObjectOptions.reasonCode).toBe('OK');
  });

  it('fails closed when delegated diffArtifactVersions throws', () => {
    const result = buildArtifactEvidenceGraph(
      {
        artifactDiffInput: {
          artifactPairs: [
            {
              groupKey: 'x',
              left: {
                artifactId: 'x-v1',
                artifactPath: `${ALLOWLIST_ROOT}/reports/x-v1.md`,
                artifactType: 'prd',
                metadata: {},
                sections: [],
                tables: [],
                contentSummary: 'x-v1',
                decisionRefs: ['DEC-X'],
                gateRefs: ['G-X'],
                commandRefs: ['CMD-X']
              },
              right: {
                artifactId: 'x-v2',
                artifactPath: `${ALLOWLIST_ROOT}/reports/x-v2.md`,
                artifactType: 'prd',
                metadata: {},
                sections: [],
                tables: [],
                contentSummary: 'x-v2',
                decisionRefs: ['DEC-X'],
                gateRefs: ['G-X'],
                commandRefs: ['CMD-X']
              }
            }
          ]
        }
      },
      {
        artifactDiffOptions: {
          nowMs: () => {
            throw new Error('boom');
          }
        }
      }
    );

    expect(result.reasonCode).toBe('INVALID_EVIDENCE_GRAPH_INPUT');
    expect(result.reason).toContain('levé une exception');
  });

  it('uses fallback corrective actions for blocked reasons when correctiveActions missing', () => {
    const result = buildArtifactEvidenceGraph({
      artifactDiffResult: {
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

  it('normalizes and deduplicates corrective actions when provided on blocked result', () => {
    const result = buildArtifactEvidenceGraph({
      artifactDiffResult: {
        allowed: false,
        reasonCode: 'INVALID_ARTIFACT_DIFF_INPUT',
        reason: 'invalid',
        diagnostics: {
          sourceReasonCode: 'INVALID_ARTIFACT_DIFF_INPUT'
        },
        correctiveActions: ['  FIX_DIFF_INPUT  ', 'FIX_DIFF_INPUT', 'FIX_METADATA']
      }
    });

    expect(result.reasonCode).toBe('INVALID_ARTIFACT_DIFF_INPUT');
    expect(result.correctiveActions).toEqual(['FIX_DIFF_INPUT', 'FIX_METADATA']);
  });

  it('supports query.decisionId selector path', () => {
    const result = buildArtifactEvidenceGraph({
      artifactDiffResult: validDiffResult(),
      query: {
        decisionId: 'DEC-1'
      }
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.decisionBacklinks['DEC-1']).toHaveLength(2);
  });

  it('supports legacy graphEntries aliases (id/path/type/versionId/filePath) with deterministic defaults', () => {
    const legacyIdPathType = buildArtifactEvidenceGraph({
      graphEntries: [
        {
          id: 'legacy-a',
          path: `${ALLOWLIST_ROOT}/reports/legacy-a.md`,
          type: 'legacy-type',
          decisionRefs: ['DEC-LEGACY-A'],
          gateRefs: ['G-LEGACY'],
          commandRefs: ['CMD-LEGACY']
        }
      ]
    });

    expect(legacyIdPathType.reasonCode).toBe('OK');
    expect(legacyIdPathType.graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeId: 'artifact:legacy-a',
          artifactType: 'legacy-type',
          groupKey: 'entry-1'
        })
      ])
    );

    const legacyVersionFile = buildArtifactEvidenceGraph({
      graphEntries: [
        {
          versionId: 'legacy-b',
          filePath: `${ALLOWLIST_ROOT}/reports/legacy-b.md`,
          decisionRefs: ['DEC-LEGACY-B'],
          gateRefs: ['G-LEGACY'],
          commandRefs: ['CMD-LEGACY']
        }
      ]
    });

    expect(legacyVersionFile.reasonCode).toBe('OK');
    expect(legacyVersionFile.graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeId: 'artifact:legacy-b',
          artifactType: 'artifact',
          groupKey: 'entry-1'
        })
      ])
    );
  });

  it('returns null artifactId/artifactPath when orphan evidence has no resolvable artifact identity', () => {
    const result = buildArtifactEvidenceGraph({
      graphEntries: [
        {
          groupKey: 'entry-null',
          decisionRefs: ['DEC-NULL'],
          gateRefs: ['G-NULL'],
          commandRefs: ['CMD-NULL']
        }
      ]
    });

    expect(result.reasonCode).toBe('EVIDENCE_LINK_INCOMPLETE');
    expect(result.orphanEvidence).toHaveLength(1);
    expect(result.orphanEvidence[0]).toMatchObject({
      artifactId: null,
      artifactPath: null,
      candidateSource: 'graphEntries'
    });
  });

  it('reports invalid empty reasonCode as vide and uses fallback blocked reason when missing', () => {
    const emptyReasonCode = buildArtifactEvidenceGraph({
      artifactDiffResult: {
        allowed: true,
        reasonCode: '',
        diffResults: [],
        provenanceLinks: []
      }
    });

    expect(emptyReasonCode.reasonCode).toBe('INVALID_EVIDENCE_GRAPH_INPUT');
    expect(emptyReasonCode.reason).toContain('vide');

    const blockedWithoutReason = buildArtifactEvidenceGraph({
      artifactDiffResult: {
        allowed: false,
        reasonCode: 'ARTIFACT_DIFF_NOT_ELIGIBLE',
        diagnostics: {
          sourceReasonCode: 'ARTIFACT_DIFF_NOT_ELIGIBLE'
        }
      }
    });

    expect(blockedWithoutReason.reasonCode).toBe('ARTIFACT_DIFF_NOT_ELIGIBLE');
    expect(blockedWithoutReason.reason).toContain('Diff bloqué (ARTIFACT_DIFF_NOT_ELIGIBLE)');
  });

  it('flags incomplete provenance refs and uses diff defaults on incomplete entries', () => {
    const incompleteProvenance = buildArtifactEvidenceGraph({
      artifactDiffResult: validDiffResult({
        provenanceLinks: [
          {
            groupKey: 'grp:1',
            leftArtifactId: 'a-v1',
            rightArtifactId: 'a-v2',
            decisionRefs: [null],
            gateRefs: ['G4-T'],
            commandRefs: ['CMD-1']
          }
        ]
      })
    });

    expect(incompleteProvenance.reasonCode).toBe('EVIDENCE_LINK_INCOMPLETE');
    expect(incompleteProvenance.orphanEvidence[0].candidateSource).toBe('artifactDiffResult.provenanceLinks');

    const incompleteDiff = buildArtifactEvidenceGraph({
      artifactDiffResult: validDiffResult({
        diffResults: [
          {
            leftArtifactId: '',
            rightArtifactId: 'fallback-v2',
            leftArtifactPath: '',
            rightArtifactPath: `${ALLOWLIST_ROOT}/reports/fallback-v2.md`
          }
        ],
        provenanceLinks: []
      })
    });

    expect(incompleteDiff.reasonCode).toBe('EVIDENCE_LINK_INCOMPLETE');
    expect(incompleteDiff.orphanEvidence[0]).toMatchObject({
      groupKey: 'diff-1',
      artifactId: 'fallback-v2',
      artifactPath: `${ALLOWLIST_ROOT}/reports/fallback-v2.md`
    });
  });

  it('stringifies non-Error exceptions thrown by delegated diffArtifactVersions', () => {
    const result = buildArtifactEvidenceGraph(
      {
        artifactDiffInput: {
          artifactPairs: [
            {
              groupKey: 'y',
              left: {
                artifactId: 'y-v1',
                artifactPath: `${ALLOWLIST_ROOT}/reports/y-v1.md`,
                artifactType: 'prd',
                metadata: {},
                sections: [],
                tables: [],
                contentSummary: 'y-v1',
                decisionRefs: ['DEC-Y'],
                gateRefs: ['G-Y'],
                commandRefs: ['CMD-Y']
              },
              right: {
                artifactId: 'y-v2',
                artifactPath: `${ALLOWLIST_ROOT}/reports/y-v2.md`,
                artifactType: 'prd',
                metadata: {},
                sections: [],
                tables: [],
                contentSummary: 'y-v2',
                decisionRefs: ['DEC-Y'],
                gateRefs: ['G-Y'],
                commandRefs: ['CMD-Y']
              }
            }
          ]
        }
      },
      {
        artifactDiffOptions: {
          nowMs: () => {
            throw 'boom-string';
          }
        }
      }
    );

    expect(result.reasonCode).toBe('INVALID_EVIDENCE_GRAPH_INPUT');
    expect(result.reason).toContain('boom-string');
  });
});
