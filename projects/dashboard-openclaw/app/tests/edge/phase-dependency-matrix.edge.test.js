import { describe, expect, it, vi } from 'vitest';
import { buildPhaseDependencyMatrix } from '../../src/phase-dependency-matrix.js';

function transitionOk(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Transition autorisée H04 -> H05.',
    diagnostics: {
      fromIndex: 3,
      toIndex: 4,
      elapsedMs: 120_000,
      slaMs: 600_000
    },
    ...overrides
  };
}

function prerequisitesOk(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Prérequis validés.',
    diagnostics: {
      fromPhase: 'H04',
      toPhase: 'H05',
      requiredCount: 2,
      satisfiedCount: 2,
      missingPrerequisiteIds: []
    },
    ...overrides
  };
}

describe('phase-dependency-matrix edge cases', () => {
  it('fails closed on non-object inputs with INVALID_PHASE_DEPENDENCY_INPUT', () => {
    const inputs = [undefined, null, true, 42, 'S009'];

    for (const sample of inputs) {
      const result = buildPhaseDependencyMatrix(sample);

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_PHASE_DEPENDENCY_INPUT',
        dependencies: [],
        blockingDependencies: [],
        correctiveActions: []
      });
    }
  });

  it('rejects missing or blank owner when no phaseState source is available', () => {
    const missingOwner = buildPhaseDependencyMatrix({
      transitionValidation: transitionOk(),
      prerequisitesValidation: prerequisitesOk()
    });

    expect(missingOwner).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE_DEPENDENCY_INPUT'
    });
    expect(missingOwner.reason).toContain('owner est requis');

    const blankOwner = buildPhaseDependencyMatrix({
      owner: '   ',
      transitionValidation: transitionOk(),
      prerequisitesValidation: prerequisitesOk()
    });

    expect(blankOwner).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE_DEPENDENCY_INPUT'
    });
    expect(blankOwner.reason).toContain('owner est requis');
  });

  it('rejects invalid freshness parameters (maxRefreshIntervalMs and snapshotAgeMs)', () => {
    const invalidInterval = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk(),
      prerequisitesValidation: prerequisitesOk(),
      maxRefreshIntervalMs: 'abc'
    });

    expect(invalidInterval).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE_DEPENDENCY_INPUT'
    });
    expect(invalidInterval.reason).toContain('maxRefreshIntervalMs invalide');

    const invalidIntervalZero = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk(),
      prerequisitesValidation: prerequisitesOk(),
      maxRefreshIntervalMs: 0
    });

    expect(invalidIntervalZero).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE_DEPENDENCY_INPUT'
    });

    const invalidSnapshotAge = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk(),
      prerequisitesValidation: prerequisitesOk(),
      snapshotAgeMs: -1
    });

    expect(invalidSnapshotAge).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE_DEPENDENCY_INPUT'
    });
    expect(invalidSnapshotAge.reason).toContain('snapshotAgeMs invalide');
  });

  it('validates transitionValidation contract strictly', () => {
    const badShape = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: 'invalid',
      prerequisitesValidation: prerequisitesOk()
    });

    expect(badShape.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(badShape.reason).toContain('transitionValidation doit être un objet valide');

    const badReasonCode = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: {
        allowed: false,
        reasonCode: 'UNKNOWN_REASON',
        reason: 'invalid reason code'
      },
      prerequisitesValidation: prerequisitesOk()
    });

    expect(badReasonCode.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(badReasonCode.reason).toContain('transitionValidation.reasonCode invalide');

    const incoherentAllowed = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: {
        allowed: true,
        reasonCode: 'TRANSITION_NOT_ALLOWED',
        reason: 'incoherent payload'
      },
      prerequisitesValidation: prerequisitesOk()
    });

    expect(incoherentAllowed.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(incoherentAllowed.reason).toContain('allowed=true exige reasonCode=OK');
  });

  it('validates prerequisitesValidation contract strictly', () => {
    const badShape = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk(),
      prerequisitesValidation: null
    });

    expect(badShape.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(badShape.reason).toContain('prerequisitesValidation doit être un objet valide');

    const badReasonCode = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk(),
      prerequisitesValidation: {
        allowed: false,
        reasonCode: 'UNKNOWN_REASON',
        reason: 'invalid reason code'
      }
    });

    expect(badReasonCode.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(badReasonCode.reason).toContain('prerequisitesValidation.reasonCode invalide');

    const incoherentAllowed = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk(),
      prerequisitesValidation: {
        allowed: true,
        reasonCode: 'PHASE_PREREQUISITES_INCOMPLETE',
        reason: 'incoherent payload'
      }
    });

    expect(incoherentAllowed.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(incoherentAllowed.reason).toContain('allowed=true exige reasonCode=OK');
  });

  it('validates overrideEvaluation contract and input shape', () => {
    const invalidOverrideShape = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk(),
      prerequisitesValidation: prerequisitesOk(),
      overrideEvaluation: 'invalid'
    });

    expect(invalidOverrideShape.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(invalidOverrideShape.reason).toContain('overrideEvaluation doit être un objet valide');

    const invalidOverrideState = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk(),
      prerequisitesValidation: prerequisitesOk(),
      overrideEvaluation: {
        allowed: false,
        reasonCode: 'OVERRIDE_REQUEST_MISSING',
        reason: 'override requis',
        override: {
          required: 'yes',
          applied: false
        },
        requiredActions: []
      }
    });

    expect(invalidOverrideState.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(invalidOverrideState.reason).toContain('overrideEvaluation.override.required doit être booléen');

    const invalidOverrideInput = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk(),
      prerequisitesValidation: prerequisitesOk(),
      overrideInput: 'not-an-object'
    });

    expect(invalidOverrideInput.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(invalidOverrideInput.reason).toContain('overrideInput doit être un objet valide');
  });

  it('rejects invalid transitionInput and prerequisitesInput types', () => {
    const invalidTransitionInput = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionInput: 'H04->H05',
      prerequisitesValidation: prerequisitesOk()
    });

    expect(invalidTransitionInput.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(invalidTransitionInput.reason).toContain('transitionInput doit être un objet valide');

    const invalidPrerequisitesInput = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk(),
      prerequisitesInput: 'invalid-checklist'
    });

    expect(invalidPrerequisitesInput.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(invalidPrerequisitesInput.reason).toContain('prerequisitesInput doit être un objet valide');
  });

  it('uses injected validators/projector with cloned payloads and preserves original input object', () => {
    const transitionInput = {
      fromPhase: 'H04',
      toPhase: 'H05',
      transitionRequestedAt: '2026-02-21T15:30:00.000Z',
      notificationPublishedAt: null,
      metadata: {
        tags: ['alpha']
      }
    };

    const prerequisitesInput = {
      prerequisites: [{ id: 'PR-001', required: true, status: 'done' }],
      metadata: {
        labels: ['initial']
      }
    };

    const overrideInput = {
      overrideRequest: {
        requestedBy: 'ops.lead',
        justification: 'Incident critique prioritaire avec traçabilité complète en cours.'
      },
      metadata: {
        path: ['start']
      }
    };

    const phaseStateInput = {
      phaseId: 'H04',
      owner: 'fallback.owner',
      startedAt: '2026-02-21T15:20:00.000Z',
      finishedAt: null,
      nowAt: '2026-02-21T15:30:00.000Z',
      metadata: {
        source: ['projection']
      }
    };

    const input = {
      transitionInput,
      prerequisitesInput,
      overrideInput,
      phaseStateInput,
      snapshotAgeMs: 100
    };

    const snapshot = JSON.parse(JSON.stringify(input));

    const transitionValidator = vi.fn().mockImplementation((payload) => {
      payload.metadata.tags.push('mutated-by-transition-validator');

      return {
        allowed: false,
        reasonCode: 'PHASE_NOTIFICATION_MISSING',
        reason: 'notificationPublishedAt requis.',
        diagnostics: {
          fromIndex: 3,
          toIndex: 4,
          elapsedMs: null,
          slaMs: 600_000
        }
      };
    });

    const prerequisitesValidator = vi.fn().mockImplementation((payload) => {
      payload.metadata.labels.push('mutated-by-prereq-validator');

      return {
        allowed: false,
        reasonCode: 'PHASE_NOTIFICATION_MISSING',
        reason: 'Blocage transition amont.',
        diagnostics: {
          fromPhase: 'H04',
          toPhase: 'H05'
        }
      };
    });

    const overrideEvaluator = vi.fn().mockImplementation((payload) => {
      payload.metadata.path.push('mutated-by-override-evaluator');

      return {
        allowed: false,
        reasonCode: 'OVERRIDE_REQUEST_MISSING',
        reason: 'overrideRequest est requis pour un blocage éligible.',
        diagnostics: {
          sourceReasonCode: 'PHASE_NOTIFICATION_MISSING'
        },
        override: {
          required: true,
          applied: false
        },
        requiredActions: ['CAPTURE_JUSTIFICATION', 'CAPTURE_APPROVER']
      };
    });

    const phaseStateProjector = vi.fn().mockImplementation((payload) => {
      payload.metadata.source.push('mutated-by-projector');

      return {
        phaseId: payload.phaseId,
        owner: payload.owner,
        status: 'running'
      };
    });

    const result = buildPhaseDependencyMatrix(input, {
      transitionValidator,
      prerequisitesValidator,
      overrideEvaluator,
      phaseStateProjector
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'OVERRIDE_REQUEST_MISSING',
      diagnostics: {
        owner: 'fallback.owner',
        sourceReasonCode: 'PHASE_NOTIFICATION_MISSING'
      }
    });

    expect(transitionValidator).toHaveBeenCalledTimes(1);
    expect(prerequisitesValidator).toHaveBeenCalledTimes(1);
    expect(overrideEvaluator).toHaveBeenCalledTimes(1);
    expect(phaseStateProjector).toHaveBeenCalledTimes(1);

    expect(transitionValidator.mock.calls[0][0].metadata.tags).toEqual([
      'alpha',
      'mutated-by-transition-validator'
    ]);
    expect(prerequisitesValidator.mock.calls[0][0].metadata.labels).toEqual([
      'initial',
      'mutated-by-prereq-validator'
    ]);
    expect(overrideEvaluator.mock.calls[0][0].metadata.path).toEqual([
      'start',
      'mutated-by-override-evaluator'
    ]);
    expect(phaseStateProjector.mock.calls[0][0].metadata.source).toEqual([
      'projection',
      'mutated-by-projector'
    ]);

    expect(input).toEqual(snapshot);
  });

  it('does not call injected validators when direct validations are supplied', () => {
    const transitionValidator = vi.fn();
    const prerequisitesValidator = vi.fn();
    const overrideEvaluator = vi.fn();

    const result = buildPhaseDependencyMatrix(
      {
        owner: 'ops.lead',
        transitionValidation: transitionOk(),
        prerequisitesValidation: prerequisitesOk(),
        overrideEvaluation: {
          allowed: true,
          reasonCode: 'OK',
          reason: 'Aucun override requis.',
          diagnostics: {
            sourceReasonCode: 'OK'
          },
          override: {
            required: false,
            applied: false
          },
          requiredActions: []
        },
        transitionInput: {
          fromPhase: 'H99',
          toPhase: 'H00'
        },
        prerequisitesInput: {
          prerequisites: null
        },
        overrideInput: {
          overrideRequest: {}
        }
      },
      {
        transitionValidator,
        prerequisitesValidator,
        overrideEvaluator
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK'
    });
    expect(transitionValidator).not.toHaveBeenCalled();
    expect(prerequisitesValidator).not.toHaveBeenCalled();
    expect(overrideEvaluator).not.toHaveBeenCalled();
  });

  it('keeps prerequisites transition blocker as warning when transition is already blocked', () => {
    const result = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: {
        allowed: false,
        reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
        reason: 'Notification hors SLA.',
        diagnostics: {
          fromIndex: 3,
          toIndex: 4,
          elapsedMs: 900_000,
          slaMs: 600_000
        }
      },
      prerequisitesValidation: {
        allowed: false,
        reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
        reason: 'Blocage transition amont.',
        diagnostics: {
          fromPhase: 'H04',
          toPhase: 'H05'
        }
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED'
    });

    const prerequisitesDependency = result.dependencies.find(
      (dependency) => dependency.id === 'PREREQUISITES'
    );

    expect(prerequisitesDependency).toMatchObject({
      status: 'warning',
      blocking: false,
      reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED'
    });
  });

  it('accepts non-object options and resolves owner from phaseStateProjection', () => {
    const result = buildPhaseDependencyMatrix(
      {
        transitionValidation: transitionOk(),
        prerequisitesValidation: prerequisitesOk(),
        phaseStateProjection: {
          phaseId: 'H04',
          owner: 'projection.owner',
          status: 'running'
        },
        snapshotAgeMs: '120',
        maxRefreshIntervalMs: '5000'
      },
      'runtime-options-not-object'
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        owner: 'projection.owner',
        snapshotAgeMs: 120,
        maxRefreshIntervalMs: 5000
      }
    });
  });

  it('derives phases from transition diagnostic indexes and keeps null when indexes are invalid', () => {
    const derived = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk({
        diagnostics: {
          fromIndex: 0,
          toIndex: 1
        }
      }),
      prerequisitesValidation: prerequisitesOk({
        diagnostics: {
          requiredCount: 2,
          satisfiedCount: 2,
          missingPrerequisiteIds: []
        }
      })
    });

    expect(derived).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        fromPhase: 'H01',
        toPhase: 'H02'
      }
    });

    const unresolved = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk({
        diagnostics: {
          fromIndex: -1,
          toIndex: 99
        }
      }),
      prerequisitesValidation: prerequisitesOk({
        diagnostics: {
          fromPhase: '   ',
          toPhase: '   '
        }
      })
    });

    expect(unresolved).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        fromPhase: null,
        toPhase: null
      }
    });
  });

  it('rejects non numeric freshness values through defensive integer parsing', () => {
    const invalidIntervalObject = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk(),
      prerequisitesValidation: prerequisitesOk(),
      maxRefreshIntervalMs: {
        ms: 5000
      }
    });

    expect(invalidIntervalObject).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE_DEPENDENCY_INPUT'
    });
    expect(invalidIntervalObject.reason).toContain('maxRefreshIntervalMs invalide');

    const invalidSnapshotObject = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk(),
      prerequisitesValidation: prerequisitesOk(),
      snapshotAgeMs: {
        age: 120
      }
    });

    expect(invalidSnapshotObject).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE_DEPENDENCY_INPUT'
    });
    expect(invalidSnapshotObject.reason).toContain('snapshotAgeMs invalide');
  });

  it('covers strict transition and prerequisites validation error branches', () => {
    const transitionAllowedType = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: {
        allowed: 'yes',
        reasonCode: 'OK',
        reason: 'invalid type'
      },
      prerequisitesValidation: prerequisitesOk()
    });

    expect(transitionAllowedType.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(transitionAllowedType.reason).toContain('transitionValidation.allowed doit être booléen');

    const transitionMissingReason = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: {
        allowed: false,
        reasonCode: 'TRANSITION_NOT_ALLOWED',
        reason: '   '
      },
      prerequisitesValidation: prerequisitesOk()
    });

    expect(transitionMissingReason.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(transitionMissingReason.reason).toContain('transitionValidation.reason doit être une chaîne non vide');

    const transitionIncoherentFalseOk = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: {
        allowed: false,
        reasonCode: 'OK',
        reason: 'incoherent'
      },
      prerequisitesValidation: prerequisitesOk()
    });

    expect(transitionIncoherentFalseOk.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(transitionIncoherentFalseOk.reason).toContain('allowed=false ne peut pas utiliser reasonCode=OK');

    const prerequisitesAllowedType = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk(),
      prerequisitesValidation: {
        allowed: 'yes',
        reasonCode: 'OK',
        reason: 'invalid type'
      }
    });

    expect(prerequisitesAllowedType.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(prerequisitesAllowedType.reason).toContain('prerequisitesValidation.allowed doit être booléen');

    const prerequisitesMissingReason = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk(),
      prerequisitesValidation: {
        allowed: false,
        reasonCode: 'PHASE_PREREQUISITES_INCOMPLETE',
        reason: '   '
      }
    });

    expect(prerequisitesMissingReason.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(prerequisitesMissingReason.reason).toContain('prerequisitesValidation.reason doit être une chaîne non vide');

    const prerequisitesIncoherentFalseOk = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk(),
      prerequisitesValidation: {
        allowed: false,
        reasonCode: 'OK',
        reason: 'incoherent'
      }
    });

    expect(prerequisitesIncoherentFalseOk.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(prerequisitesIncoherentFalseOk.reason).toContain(
      'allowed=false ne peut pas utiliser reasonCode=OK'
    );
  });

  it('covers strict override validation error branches', () => {
    const overrideAllowedType = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk(),
      prerequisitesValidation: prerequisitesOk(),
      overrideEvaluation: {
        allowed: 'yes',
        reasonCode: 'OVERRIDE_REQUEST_MISSING',
        reason: 'invalid'
      }
    });

    expect(overrideAllowedType.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(overrideAllowedType.reason).toContain('overrideEvaluation.allowed doit être booléen');

    const overrideInvalidReasonCode = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk(),
      prerequisitesValidation: prerequisitesOk(),
      overrideEvaluation: {
        allowed: false,
        reasonCode: 'UNKNOWN_REASON',
        reason: 'invalid',
        override: {
          required: true,
          applied: false
        },
        requiredActions: []
      }
    });

    expect(overrideInvalidReasonCode.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(overrideInvalidReasonCode.reason).toContain('overrideEvaluation.reasonCode invalide');

    const overrideMissingReason = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk(),
      prerequisitesValidation: prerequisitesOk(),
      overrideEvaluation: {
        allowed: false,
        reasonCode: 'OVERRIDE_REQUEST_MISSING',
        reason: '   ',
        override: {
          required: true,
          applied: false
        },
        requiredActions: []
      }
    });

    expect(overrideMissingReason.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(overrideMissingReason.reason).toContain('overrideEvaluation.reason doit être une chaîne non vide');

    const overrideIncoherentTrueNotOk = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk(),
      prerequisitesValidation: prerequisitesOk(),
      overrideEvaluation: {
        allowed: true,
        reasonCode: 'OVERRIDE_REQUEST_MISSING',
        reason: 'invalid',
        override: {
          required: true,
          applied: false
        },
        requiredActions: []
      }
    });

    expect(overrideIncoherentTrueNotOk.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(overrideIncoherentTrueNotOk.reason).toContain('allowed=true exige reasonCode=OK');

    const overrideIncoherentFalseOk = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk(),
      prerequisitesValidation: prerequisitesOk(),
      overrideEvaluation: {
        allowed: false,
        reasonCode: 'OK',
        reason: 'invalid',
        override: {
          required: true,
          applied: false
        },
        requiredActions: []
      }
    });

    expect(overrideIncoherentFalseOk.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(overrideIncoherentFalseOk.reason).toContain('allowed=false ne peut pas utiliser reasonCode=OK');

    const overrideMissingObject = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk(),
      prerequisitesValidation: prerequisitesOk(),
      overrideEvaluation: {
        allowed: false,
        reasonCode: 'OVERRIDE_REQUEST_MISSING',
        reason: 'override missing',
        override: null,
        requiredActions: []
      }
    });

    expect(overrideMissingObject.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(overrideMissingObject.reason).toContain('overrideEvaluation.override doit être un objet valide');

    const overrideAppliedType = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk(),
      prerequisitesValidation: prerequisitesOk(),
      overrideEvaluation: {
        allowed: false,
        reasonCode: 'OVERRIDE_REQUEST_MISSING',
        reason: 'override pending',
        override: {
          required: true,
          applied: 'no'
        },
        requiredActions: []
      }
    });

    expect(overrideAppliedType.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(overrideAppliedType.reason).toContain('overrideEvaluation.override.applied doit être booléen');

    const overrideActionsType = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk(),
      prerequisitesValidation: prerequisitesOk(),
      overrideEvaluation: {
        allowed: false,
        reasonCode: 'OVERRIDE_REQUEST_MISSING',
        reason: 'override pending',
        override: {
          required: true,
          applied: false
        },
        requiredActions: ['CAPTURE_JUSTIFICATION', 42]
      }
    });

    expect(overrideActionsType.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(overrideActionsType.reason).toContain(
      'overrideEvaluation.requiredActions doit être un tableau de chaînes'
    );
  });

  it('fails when delegated sources are missing or return invalid contracts', () => {
    const missingPrerequisitesSource = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk()
    });

    expect(missingPrerequisitesSource.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(missingPrerequisitesSource.reason).toContain(
      'prerequisitesValidation ou prerequisitesInput est requis'
    );

    const invalidTransitionValidatorResult = buildPhaseDependencyMatrix(
      {
        owner: 'ops.lead',
        transitionInput: {
          fromPhase: 'H04',
          toPhase: 'H05',
          transitionRequestedAt: '2026-02-21T15:40:00.000Z',
          notificationPublishedAt: '2026-02-21T15:30:00.000Z'
        },
        prerequisitesValidation: prerequisitesOk()
      },
      {
        transitionValidator: () => ({
          allowed: 'yes',
          reasonCode: 'OK',
          reason: 'invalid contract'
        })
      }
    );

    expect(invalidTransitionValidatorResult.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(invalidTransitionValidatorResult.reason).toContain(
      'Résultat invalide depuis validatePhaseTransition'
    );

    const invalidPrerequisitesValidatorResult = buildPhaseDependencyMatrix(
      {
        owner: 'ops.lead',
        transitionValidation: transitionOk(),
        prerequisitesInput: {
          prerequisites: [{ id: 'PR-001', required: true, status: 'done' }]
        }
      },
      {
        prerequisitesValidator: () => ({
          allowed: 'yes',
          reasonCode: 'OK',
          reason: 'invalid contract'
        })
      }
    );

    expect(invalidPrerequisitesValidatorResult.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(invalidPrerequisitesValidatorResult.reason).toContain(
      'Résultat invalide depuis validatePhasePrerequisites'
    );

    const invalidOverrideEvaluatorResult = buildPhaseDependencyMatrix(
      {
        owner: 'ops.lead',
        transitionValidation: transitionOk(),
        prerequisitesValidation: prerequisitesOk(),
        overrideInput: {
          overrideRequest: {
            requestedBy: 'ops.lead'
          }
        }
      },
      {
        overrideEvaluator: () => ({
          allowed: 'yes',
          reasonCode: 'OK',
          reason: 'invalid contract',
          override: {
            required: false,
            applied: false
          },
          requiredActions: []
        })
      }
    );

    expect(invalidOverrideEvaluatorResult.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(invalidOverrideEvaluatorResult.reason).toContain(
      'Résultat invalide depuis evaluatePhaseTransitionOverride'
    );
  });

  it('validates phase state projection sources strictly when owner fallback is required', () => {
    const invalidPhaseStateProjection = buildPhaseDependencyMatrix({
      transitionValidation: transitionOk(),
      prerequisitesValidation: prerequisitesOk(),
      phaseStateProjection: 'not-an-object'
    });

    expect(invalidPhaseStateProjection.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(invalidPhaseStateProjection.reason).toContain('phaseStateProjection doit être un objet valide');

    const missingOwnerInProjection = buildPhaseDependencyMatrix({
      transitionValidation: transitionOk(),
      prerequisitesValidation: prerequisitesOk(),
      phaseStateProjection: {
        phaseId: 'H04',
        owner: '   '
      }
    });

    expect(missingOwnerInProjection.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(missingOwnerInProjection.reason).toContain('phaseStateProjection.owner est requis');

    const invalidPhaseStateInput = buildPhaseDependencyMatrix({
      transitionValidation: transitionOk(),
      prerequisitesValidation: prerequisitesOk(),
      phaseStateInput: 'not-an-object'
    });

    expect(invalidPhaseStateInput.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(invalidPhaseStateInput.reason).toContain('phaseStateInput doit être un objet valide');

    const invalidProjectionFromProjector = buildPhaseDependencyMatrix(
      {
        transitionValidation: transitionOk(),
        prerequisitesValidation: prerequisitesOk(),
        phaseStateInput: {
          phaseId: 'H04',
          owner: 'fallback.owner'
        }
      },
      {
        phaseStateProjector: () => null
      }
    );

    expect(invalidProjectionFromProjector.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(invalidProjectionFromProjector.reason).toContain(
      'Résultat invalide depuis buildPhaseStateProjection: objet requis'
    );

    const invalidProjectionOwnerFromProjector = buildPhaseDependencyMatrix(
      {
        transitionValidation: transitionOk(),
        prerequisitesValidation: prerequisitesOk(),
        phaseStateInput: {
          phaseId: 'H04',
          owner: 'fallback.owner'
        }
      },
      {
        phaseStateProjector: () => ({
          phaseId: 'H04',
          owner: '   '
        })
      }
    );

    expect(invalidProjectionOwnerFromProjector.reasonCode).toBe('INVALID_PHASE_DEPENDENCY_INPUT');
    expect(invalidProjectionOwnerFromProjector.reason).toContain(
      'owner requis lorsque owner n’est pas fourni'
    );
  });

  it('covers advanced aggregation branches for prerequisites, override and transition interactions', () => {
    const blockedPrerequisitesFallback = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk(),
      prerequisitesValidation: {
        allowed: false,
        reasonCode: 'TRANSITION_NOT_ALLOWED',
        reason: 'État prérequis incohérent injecté pour test de robustesse.',
        diagnostics: {
          fromPhase: 'H04',
          toPhase: 'H05'
        }
      }
    });

    const fallbackDependency = blockedPrerequisitesFallback.dependencies.find(
      (dependency) => dependency.id === 'PREREQUISITES'
    );
    expect(fallbackDependency).toMatchObject({
      status: 'blocked',
      reasonCode: 'TRANSITION_NOT_ALLOWED',
      blocking: true
    });

    const nonEligibleOverrideOnTransition = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: {
        allowed: false,
        reasonCode: 'INVALID_PHASE',
        reason: 'Phase invalide détectée.',
        diagnostics: {
          fromIndex: 0,
          toIndex: 99
        }
      },
      prerequisitesValidation: prerequisitesOk(),
      overrideEvaluation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Override injecté pour test de non-éligibilité.',
        diagnostics: {
          sourceReasonCode: 'INVALID_PHASE'
        },
        override: {
          required: true,
          applied: true
        },
        requiredActions: ['REVALIDATE_TRANSITION']
      }
    });

    expect(nonEligibleOverrideOnTransition).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE'
    });
    expect(
      nonEligibleOverrideOnTransition.dependencies.find((dependency) => dependency.id === 'TRANSITION')
    ).toMatchObject({
      status: 'blocked',
      reasonCode: 'INVALID_PHASE'
    });

    const revalidatePrerequisitesAfterOverride = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: {
        allowed: false,
        reasonCode: 'PHASE_NOTIFICATION_MISSING',
        reason: 'notificationPublishedAt requis.',
        diagnostics: {
          fromIndex: 3,
          toIndex: 4
        }
      },
      prerequisitesValidation: {
        allowed: false,
        reasonCode: 'PHASE_NOTIFICATION_MISSING',
        reason: 'Blocage transition amont détecté.',
        diagnostics: {
          fromPhase: 'H04',
          toPhase: 'H05'
        }
      },
      overrideEvaluation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Override exceptionnel approuvé.',
        diagnostics: {
          sourceReasonCode: 'PHASE_NOTIFICATION_MISSING'
        },
        override: {
          required: true,
          applied: true
        },
        requiredActions: ['REVALIDATE_TRANSITION', 'RECORD_OVERRIDE_AUDIT']
      }
    });

    expect(revalidatePrerequisitesAfterOverride).toMatchObject({
      allowed: true,
      reasonCode: 'OK'
    });
    expect(
      revalidatePrerequisitesAfterOverride.dependencies.find((dependency) => dependency.id === 'PREREQUISITES')
    ).toMatchObject({
      status: 'warning',
      reason: expect.stringContaining('Prérequis à revalider après override')
    });

    const standaloneOverrideBlock = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: transitionOk({ diagnostics: 'invalid-diagnostics-shape' }),
      prerequisitesValidation: prerequisitesOk({ diagnostics: 'invalid-diagnostics-shape' }),
      overrideEvaluation: {
        allowed: false,
        reasonCode: 'OVERRIDE_REQUEST_MISSING',
        reason: 'overrideRequest est requis pour un blocage éligible.',
        diagnostics: 'invalid-diagnostics-shape',
        override: {
          required: true,
          applied: false
        },
        requiredActions: ['CAPTURE_JUSTIFICATION', 'CAPTURE_APPROVER']
      }
    });

    expect(standaloneOverrideBlock).toMatchObject({
      allowed: false,
      reasonCode: 'OVERRIDE_REQUEST_MISSING'
    });
    expect(
      standaloneOverrideBlock.dependencies.find((dependency) => dependency.id === 'OVERRIDE')
    ).toMatchObject({
      status: 'blocked',
      blocking: true,
      reasonCode: 'OVERRIDE_REQUEST_MISSING'
    });
  });
});
