import { describe, expect, it, vi } from 'vitest';
import { evaluatePhaseProgressionAlert } from '../../src/phase-progression-alert.js';

function matrixOk(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Matrice de dépendances prête pour owner=ops.lead: aucun blocage actif.',
    diagnostics: {
      fromPhase: 'H09',
      toPhase: 'H10',
      owner: 'ops.lead',
      sourceReasonCode: 'OK',
      snapshotAgeMs: 100,
      isStale: false
    },
    blockingDependencies: [],
    correctiveActions: [],
    ...overrides
  };
}

function historyEntry(overrides = {}) {
  return {
    fromPhase: 'H08',
    toPhase: 'H09',
    allowed: false,
    reasonCode: 'PHASE_PREREQUISITES_INCOMPLETE',
    reason: 'PR-003 incomplet',
    timestamp: '2026-02-21T15:00:00.000Z',
    ...overrides
  };
}

describe('phase-progression-alert edge cases', () => {
  it('fails closed on non-object input payloads', () => {
    const samples = [undefined, null, true, 42, 'S010'];

    for (const sample of samples) {
      const result = evaluatePhaseProgressionAlert(sample);

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_PHASE_PROGRESSION_INPUT',
        anomalies: [],
        correctiveActions: []
      });
    }
  });

  it('rejects invalid lookbackEntries values', () => {
    const invalidValues = [0, -1, 1.2, 'abc'];

    for (const value of invalidValues) {
      const result = evaluatePhaseProgressionAlert({
        dependencyMatrix: matrixOk(),
        lookbackEntries: value
      });

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_PHASE_PROGRESSION_INPUT'
      });
      expect(result.reason).toContain('lookbackEntries invalide');
    }
  });

  it('rejects invalid escalationThreshold values', () => {
    const invalidValues = [0, -2, 2.5, 'not-a-number'];

    for (const value of invalidValues) {
      const result = evaluatePhaseProgressionAlert({
        dependencyMatrix: matrixOk(),
        escalationThreshold: value
      });

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_PHASE_PROGRESSION_INPUT'
      });
      expect(result.reason).toContain('escalationThreshold invalide');
    }
  });

  it('validates historyEntries contract strictly', () => {
    const nonArray = evaluatePhaseProgressionAlert({
      dependencyMatrix: matrixOk(),
      historyEntries: 'invalid'
    });

    expect(nonArray.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(nonArray.reason).toContain('historyEntries doit être un tableau');

    const invalidObject = evaluatePhaseProgressionAlert({
      dependencyMatrix: matrixOk(),
      historyEntries: [null]
    });

    expect(invalidObject.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(invalidObject.reason).toContain('historyEntries[0] doit être un objet valide');

    const invalidPhase = evaluatePhaseProgressionAlert({
      dependencyMatrix: matrixOk(),
      historyEntries: [
        historyEntry({
          fromPhase: 'H99'
        })
      ]
    });

    expect(invalidPhase.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(invalidPhase.reason).toContain('fromPhase/toPhase canoniques');

    const invalidAllowed = evaluatePhaseProgressionAlert({
      dependencyMatrix: matrixOk(),
      historyEntries: [
        historyEntry({
          allowed: 'false'
        })
      ]
    });

    expect(invalidAllowed.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(invalidAllowed.reason).toContain('historyEntries[0].allowed doit être booléen');

    const invalidReasonCode = evaluatePhaseProgressionAlert({
      dependencyMatrix: matrixOk(),
      historyEntries: [
        historyEntry({
          reasonCode: ' '
        })
      ]
    });

    expect(invalidReasonCode.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(invalidReasonCode.reason).toContain('historyEntries[0].reasonCode doit être une chaîne non vide');

    const invalidReason = evaluatePhaseProgressionAlert({
      dependencyMatrix: matrixOk(),
      historyEntries: [
        historyEntry({
          reason: ' '
        })
      ]
    });

    expect(invalidReason.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(invalidReason.reason).toContain('historyEntries[0].reason doit être une chaîne non vide');

    const invalidTimestamp = evaluatePhaseProgressionAlert({
      dependencyMatrix: matrixOk(),
      historyEntries: [
        historyEntry({
          timestamp: 'invalid-date'
        })
      ]
    });

    expect(invalidTimestamp.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(invalidTimestamp.reason).toContain('timestamp/recordedAt parseable');
  });

  it('validates dependencyMatrix shape and coherence strictly', () => {
    const invalidShape = evaluatePhaseProgressionAlert({
      dependencyMatrix: null,
      historyEntries: []
    });

    expect(invalidShape.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(invalidShape.reason).toContain('dependencyMatrix doit être un objet valide');

    const invalidAllowed = evaluatePhaseProgressionAlert({
      dependencyMatrix: {
        ...matrixOk(),
        allowed: 'true'
      }
    });

    expect(invalidAllowed.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(invalidAllowed.reason).toContain('dependencyMatrix.allowed doit être booléen');

    const invalidReasonCode = evaluatePhaseProgressionAlert({
      dependencyMatrix: {
        ...matrixOk(),
        reasonCode: 'UNKNOWN_REASON'
      }
    });

    expect(invalidReasonCode.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(invalidReasonCode.reason).toContain('dependencyMatrix.reasonCode invalide');

    const invalidReason = evaluatePhaseProgressionAlert({
      dependencyMatrix: {
        ...matrixOk(),
        reason: ' '
      }
    });

    expect(invalidReason.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(invalidReason.reason).toContain('dependencyMatrix.reason doit être une chaîne non vide');

    const incoherentAllowedTrue = evaluatePhaseProgressionAlert({
      dependencyMatrix: {
        ...matrixOk(),
        allowed: true,
        reasonCode: 'TRANSITION_NOT_ALLOWED'
      }
    });

    expect(incoherentAllowedTrue.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(incoherentAllowedTrue.reason).toContain('allowed=true exige reasonCode=OK');

    const incoherentAllowedFalse = evaluatePhaseProgressionAlert({
      dependencyMatrix: {
        ...matrixOk(),
        allowed: false,
        reasonCode: 'OK'
      }
    });

    expect(incoherentAllowedFalse.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(incoherentAllowedFalse.reason).toContain('allowed=false ne peut pas utiliser reasonCode=OK');

    const invalidDiagnostics = evaluatePhaseProgressionAlert({
      dependencyMatrix: {
        ...matrixOk(),
        diagnostics: null
      }
    });

    expect(invalidDiagnostics.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(invalidDiagnostics.reason).toContain('dependencyMatrix.diagnostics doit être un objet valide');

    const invalidBlockingDeps = evaluatePhaseProgressionAlert({
      dependencyMatrix: {
        ...matrixOk(),
        blockingDependencies: 'invalid'
      }
    });

    expect(invalidBlockingDeps.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(invalidBlockingDeps.reason).toContain('blockingDependencies doit être un tableau');

    const invalidActions = evaluatePhaseProgressionAlert({
      dependencyMatrix: {
        ...matrixOk(),
        correctiveActions: ['OK', 42]
      }
    });

    expect(invalidActions.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(invalidActions.reason).toContain('correctiveActions doit être un tableau de chaînes');
  });

  it('validates dependencyMatrix nested entries and diagnostics strictness', () => {
    const invalidDependencyEntry = evaluatePhaseProgressionAlert({
      dependencyMatrix: {
        ...matrixOk({
          allowed: false,
          reasonCode: 'TRANSITION_NOT_ALLOWED',
          reason: 'Transition non autorisée.',
          blockingDependencies: [null],
          correctiveActions: ['ALIGN_PHASE_SEQUENCE']
        })
      }
    });

    expect(invalidDependencyEntry.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(invalidDependencyEntry.reason).toContain('dependencyMatrix.blockingDependencies[0] doit être un objet valide');

    const invalidDependencyId = evaluatePhaseProgressionAlert({
      dependencyMatrix: {
        ...matrixOk({
          allowed: false,
          reasonCode: 'TRANSITION_NOT_ALLOWED',
          reason: 'Transition non autorisée.',
          blockingDependencies: [
            {
              id: ' ',
              reasonCode: 'TRANSITION_NOT_ALLOWED',
              reason: 'invalid id',
              owner: 'ops.lead'
            }
          ],
          correctiveActions: ['ALIGN_PHASE_SEQUENCE']
        })
      }
    });

    expect(invalidDependencyId.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(invalidDependencyId.reason).toContain('.id doit être une chaîne non vide');

    const invalidSnapshotAgeType = evaluatePhaseProgressionAlert({
      dependencyMatrix: {
        ...matrixOk({
          diagnostics: {
            fromPhase: 'H09',
            toPhase: 'H10',
            owner: 'ops.lead',
            sourceReasonCode: 'OK',
            snapshotAgeMs: 'not-an-integer',
            isStale: false
          }
        })
      }
    });

    expect(invalidSnapshotAgeType.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(invalidSnapshotAgeType.reason).toContain('snapshotAgeMs doit être un entier >= 0 ou null');

    const invalidSnapshotAgeNegative = evaluatePhaseProgressionAlert({
      dependencyMatrix: {
        ...matrixOk({
          diagnostics: {
            fromPhase: 'H09',
            toPhase: 'H10',
            owner: 'ops.lead',
            sourceReasonCode: 'OK',
            snapshotAgeMs: -1,
            isStale: false
          }
        })
      }
    });

    expect(invalidSnapshotAgeNegative.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(invalidSnapshotAgeNegative.reason).toContain('snapshotAgeMs doit être >= 0');

    const invalidIsStaleType = evaluatePhaseProgressionAlert({
      dependencyMatrix: {
        ...matrixOk({
          diagnostics: {
            fromPhase: 'H09',
            toPhase: 'H10',
            owner: 'ops.lead',
            sourceReasonCode: 'OK',
            snapshotAgeMs: 100,
            isStale: 'false'
          }
        })
      }
    });

    expect(invalidIsStaleType.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(invalidIsStaleType.reason).toContain('isStale doit être booléen');
  });

  it('rejects missing or blank owner and invalid phase overrides', () => {
    const missingOwner = evaluatePhaseProgressionAlert({
      dependencyMatrix: matrixOk({
        diagnostics: {
          fromPhase: 'H09',
          toPhase: 'H10',
          owner: null,
          sourceReasonCode: 'OK',
          snapshotAgeMs: 100,
          isStale: false
        }
      })
    });

    expect(missingOwner.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(missingOwner.reason).toContain('owner est requis');

    const blankOwner = evaluatePhaseProgressionAlert({
      owner: '   ',
      dependencyMatrix: matrixOk()
    });

    expect(blankOwner.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(blankOwner.reason).toContain('owner invalide');

    const invalidFromPhase = evaluatePhaseProgressionAlert({
      fromPhase: 'H99',
      dependencyMatrix: matrixOk()
    });

    expect(invalidFromPhase.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(invalidFromPhase.reason).toContain('fromPhase incohérente');

    const invalidToPhase = evaluatePhaseProgressionAlert({
      toPhase: 'invalid-phase',
      dependencyMatrix: matrixOk()
    });

    expect(invalidToPhase.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(invalidToPhase.reason).toContain('toPhase incohérente');
  });

  it('validates dependencyMatrixInput delegation path and builder contract', () => {
    const invalidDependencyInput = evaluatePhaseProgressionAlert({
      dependencyMatrixInput: 'invalid-shape'
    });

    expect(invalidDependencyInput.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(invalidDependencyInput.reason).toContain('dependencyMatrixInput doit être un objet valide');

    const invalidBuilderResult = evaluatePhaseProgressionAlert(
      {
        dependencyMatrixInput: {
          fromPhase: 'H09',
          toPhase: 'H10'
        }
      },
      {
        dependencyMatrixBuilder: () => ({
          allowed: 'true',
          reasonCode: 'OK',
          reason: 'invalid result contract'
        })
      }
    );

    expect(invalidBuilderResult.reasonCode).toBe('INVALID_PHASE_PROGRESSION_INPUT');
    expect(invalidBuilderResult.reason).toContain('Résultat invalide depuis buildPhaseDependencyMatrix');
  });

  it('uses direct dependencyMatrix when provided and does not call delegated builder', () => {
    const dependencyMatrixBuilder = vi.fn();

    const result = evaluatePhaseProgressionAlert(
      {
        dependencyMatrix: matrixOk(),
        dependencyMatrixInput: {
          owner: 'ignored'
        }
      },
      {
        dependencyMatrixBuilder
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK'
    });
    expect(dependencyMatrixBuilder).not.toHaveBeenCalled();
  });

  it('counts blocked entries over lookback window sorted by timestamp', () => {
    const result = evaluatePhaseProgressionAlert({
      dependencyMatrix: matrixOk(),
      lookbackEntries: 3,
      escalationThreshold: 2,
      historyEntries: [
        historyEntry({
          timestamp: '2026-02-21T15:01:00.000Z',
          allowed: false,
          reasonCode: 'TRANSITION_NOT_ALLOWED'
        }),
        historyEntry({
          timestamp: '2026-02-21T15:05:00.000Z',
          allowed: false,
          reasonCode: 'PHASE_NOTIFICATION_MISSING'
        }),
        historyEntry({
          timestamp: '2026-02-21T15:04:00.000Z',
          allowed: false,
          reasonCode: 'PHASE_PREREQUISITES_INCOMPLETE'
        }),
        historyEntry({
          timestamp: '2026-02-21T15:03:00.000Z',
          allowed: true,
          reasonCode: 'OK',
          reason: 'transition ok'
        }),
        historyEntry({
          timestamp: '2026-02-21T15:02:00.000Z',
          allowed: true,
          reasonCode: 'OK',
          reason: 'transition ok'
        })
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'REPEATED_BLOCKING_ANOMALY',
      diagnostics: {
        historyBlockedCount: 2,
        lookbackEntries: 3,
        escalationThreshold: 2
      }
    });
  });

  it('keeps strict propagation when dependency matrix is blocked even if sequence/repetition anomalies exist', () => {
    const result = evaluatePhaseProgressionAlert({
      dependencyMatrix: {
        allowed: false,
        reasonCode: 'TRANSITION_NOT_ALLOWED',
        reason: 'Transition non autorisée H09 -> H11.',
        diagnostics: {
          fromPhase: 'H09',
          toPhase: 'H11',
          owner: 'ops.lead',
          sourceReasonCode: 'TRANSITION_NOT_ALLOWED',
          snapshotAgeMs: 180,
          isStale: false
        },
        blockingDependencies: [
          {
            id: 'TRANSITION',
            reasonCode: 'TRANSITION_NOT_ALLOWED',
            reason: 'Transition non autorisée H09 -> H11.',
            owner: 'ops.lead'
          }
        ],
        correctiveActions: ['ALIGN_PHASE_SEQUENCE', 'ALIGN_PHASE_SEQUENCE']
      },
      lookbackEntries: 2,
      escalationThreshold: 1,
      historyEntries: [historyEntry(), historyEntry({ timestamp: '2026-02-21T15:01:00.000Z' })]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'TRANSITION_NOT_ALLOWED',
      alert: {
        active: true,
        severity: 'warning'
      }
    });
    expect(result.correctiveActions).toEqual(['ALIGN_PHASE_SEQUENCE']);
    expect(result.anomalies).toEqual([]);
  });

  it('accepts payload phases when canonical and overrides dependency matrix diagnostics phases', () => {
    const result = evaluatePhaseProgressionAlert({
      fromPhase: 'H10',
      toPhase: 'H11',
      dependencyMatrix: matrixOk({
        diagnostics: {
          fromPhase: 'H09',
          toPhase: 'H10',
          owner: 'ops.lead',
          sourceReasonCode: 'OK',
          snapshotAgeMs: 100,
          isStale: false
        }
      }),
      historyEntries: []
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        fromPhase: 'H10',
        toPhase: 'H11'
      }
    });
  });

  it('accepts integer-like string thresholds and Date/number timestamps from S006 history entries', () => {
    const result = evaluatePhaseProgressionAlert({
      dependencyMatrix: matrixOk(),
      lookbackEntries: '4',
      escalationThreshold: '3',
      historyEntries: [
        historyEntry({
          timestamp: new Date('2026-02-21T15:00:00.000Z'),
          allowed: false,
          reasonCode: 'TRANSITION_NOT_ALLOWED'
        }),
        historyEntry({
          timestamp: Date.parse('2026-02-21T14:59:00.000Z'),
          allowed: true,
          reasonCode: 'OK',
          reason: 'Transition validée'
        })
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        lookbackEntries: 4,
        escalationThreshold: 3,
        historyBlockedCount: 1
      }
    });
  });

  it('rejects non-numeric threshold object through defensive integer parsing', () => {
    const result = evaluatePhaseProgressionAlert({
      dependencyMatrix: matrixOk(),
      lookbackEntries: {
        value: 4
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE_PROGRESSION_INPUT'
    });
    expect(result.reason).toContain('lookbackEntries invalide');
  });

  it('rejects blank or unsupported timestamp payloads in history entries', () => {
    const blankTimestamp = evaluatePhaseProgressionAlert({
      dependencyMatrix: matrixOk(),
      historyEntries: [
        historyEntry({
          timestamp: '   '
        })
      ]
    });

    expect(blankTimestamp).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE_PROGRESSION_INPUT'
    });
    expect(blankTimestamp.reason).toContain('timestamp/recordedAt parseable');

    const unsupportedTimestamp = evaluatePhaseProgressionAlert({
      dependencyMatrix: matrixOk(),
      historyEntries: [
        historyEntry({
          timestamp: {
            unsupported: true
          }
        })
      ]
    });

    expect(unsupportedTimestamp).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE_PROGRESSION_INPUT'
    });
    expect(unsupportedTimestamp.reason).toContain('timestamp/recordedAt parseable');
  });

  it('uses sortOrder tie-breaker when history timestamps are identical', () => {
    const result = evaluatePhaseProgressionAlert({
      dependencyMatrix: matrixOk(),
      lookbackEntries: 1,
      escalationThreshold: 1,
      historyEntries: [
        historyEntry({
          timestamp: '2026-02-21T15:00:00.000Z',
          allowed: true,
          reasonCode: 'OK',
          reason: 'Transition validée'
        }),
        historyEntry({
          timestamp: '2026-02-21T15:00:00.000Z',
          allowed: false,
          reasonCode: 'PHASE_NOTIFICATION_MISSING',
          reason: 'Blocage le plus récent à timestamp identique'
        })
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'REPEATED_BLOCKING_ANOMALY',
      diagnostics: {
        historyBlockedCount: 1,
        lookbackEntries: 1,
        escalationThreshold: 1
      }
    });
  });

  it('validates blocking dependency reasonCode as non-empty string', () => {
    const result = evaluatePhaseProgressionAlert({
      dependencyMatrix: {
        ...matrixOk({
          allowed: false,
          reasonCode: 'TRANSITION_NOT_ALLOWED',
          reason: 'Transition non autorisée.',
          blockingDependencies: [
            {
              id: 'TRANSITION',
              reasonCode: ' ',
              reason: 'code manquant',
              owner: 'ops.lead'
            }
          ],
          correctiveActions: ['ALIGN_PHASE_SEQUENCE']
        })
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE_PROGRESSION_INPUT'
    });
    expect(result.reason).toContain('.reasonCode doit être une chaîne non vide');
  });

  it('rejects blank canonical phase inputs early', () => {
    const blankFromPhase = evaluatePhaseProgressionAlert({
      fromPhase: '   ',
      dependencyMatrix: matrixOk()
    });

    expect(blankFromPhase).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE_PROGRESSION_INPUT'
    });
    expect(blankFromPhase.reason).toContain('fromPhase invalide');

    const blankToPhase = evaluatePhaseProgressionAlert({
      toPhase: '   ',
      dependencyMatrix: matrixOk()
    });

    expect(blankToPhase).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE_PROGRESSION_INPUT'
    });
    expect(blankToPhase.reason).toContain('toPhase invalide');
  });

  it('keeps nominal progression when dependency matrix does not expose phases', () => {
    const result = evaluatePhaseProgressionAlert({
      dependencyMatrix: matrixOk({
        diagnostics: {
          fromPhase: null,
          toPhase: null,
          owner: 'ops.lead',
          sourceReasonCode: 'OK',
          snapshotAgeMs: 90,
          isStale: false
        }
      }),
      historyEntries: []
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        fromPhase: null,
        toPhase: null
      }
    });
  });
});
