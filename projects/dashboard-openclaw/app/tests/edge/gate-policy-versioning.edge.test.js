import { afterEach, describe, expect, it, vi } from 'vitest';
import { versionGatePolicy } from '../../src/gate-policy-versioning.js';
import { simulateGateVerdictBeforeSubmission } from '../../src/gate-pre-submit-simulation.js';

function validConcernsActionResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Action CONCERNS créée automatiquement avec policy snapshot et historique.',
    diagnostics: {
      verdict: 'CONCERNS',
      concernsActionRequired: true,
      actionCreated: true,
      durationMs: 6,
      p95ActionMs: 2,
      sourceReasonCode: 'GATE_VERDICT_CONCERNS',
      policyVersion: '1.2.0'
    },
    concernsAction: {
      actionCreated: true,
      actionId: 'act-001',
      gateId: 'G4-UX',
      storyId: 'S030',
      assignee: 'qa-owner',
      dueAt: '2026-03-03T10:00:00.000Z',
      status: 'OPEN'
    },
    policySnapshot: {
      policyScope: 'gate',
      version: '1.2.0'
    },
    historyEntry: {
      actionId: 'act-001',
      policyVersion: '1.2.0',
      changedAt: '2026-02-24T05:20:00.000Z',
      changedBy: 'dev-bot',
      changeType: 'CREATE'
    },
    correctiveActions: ['TRACK_CONCERNS_ACTION'],
    ...overrides
  };
}

describe('gate-policy-versioning edge cases', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fails closed on non-object payloads', () => {
    const samples = [undefined, null, true, 42, 'S031', []];

    for (const sample of samples) {
      const result = versionGatePolicy(sample);

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_GATE_POLICY_INPUT',
        correctiveActions: ['FIX_GATE_POLICY_INPUT']
      });
    }
  });

  it('rejects missing source and malformed source payloads', () => {
    const missingSource = versionGatePolicy({});

    expect(missingSource.reasonCode).toBe('INVALID_GATE_POLICY_INPUT');
    expect(missingSource.reason).toContain('Aucune source exploitable');

    const invalidConcernsActionResult = versionGatePolicy({
      concernsActionResult: 'bad'
    });

    expect(invalidConcernsActionResult.reasonCode).toBe('INVALID_GATE_POLICY_INPUT');
    expect(invalidConcernsActionResult.reason).toContain('concernsActionResult invalide');

    const invalidConcernsActionInput = versionGatePolicy({
      concernsActionInput: 'bad'
    });

    expect(invalidConcernsActionInput.reasonCode).toBe('INVALID_GATE_POLICY_INPUT');
    expect(invalidConcernsActionInput.reason).toContain('concernsActionInput invalide');
  });

  it('rejects invalid concernsActionResult contracts and non-propagable blocked reasons', () => {
    const invalidAllowed = versionGatePolicy({
      concernsActionResult: {
        allowed: 'true',
        reasonCode: 'OK'
      }
    });

    expect(invalidAllowed.reasonCode).toBe('INVALID_GATE_POLICY_INPUT');
    expect(invalidAllowed.reason).toContain('allowed invalide');

    const invalidReasonCode = versionGatePolicy({
      concernsActionResult: {
        allowed: true,
        reasonCode: 'BAD_CODE'
      }
    });

    expect(invalidReasonCode.reasonCode).toBe('INVALID_GATE_POLICY_INPUT');
    expect(invalidReasonCode.reason).toContain('reasonCode invalide');

    const blockedNonPropagable = versionGatePolicy({
      concernsActionResult: {
        allowed: false,
        reasonCode: 'POLICY_VERSION_NOT_ACTIVE',
        diagnostics: {
          sourceReasonCode: 'POLICY_VERSION_NOT_ACTIVE'
        }
      }
    });

    expect(blockedNonPropagable.reasonCode).toBe('INVALID_GATE_POLICY_INPUT');
    expect(blockedNonPropagable.reason).toContain('non propagable');
  });

  it('rejects malformed allowed result fields from concernsActionResult', () => {
    const nonOkAllowed = versionGatePolicy({
      concernsActionResult: {
        ...validConcernsActionResult(),
        reasonCode: 'GATE_POLICY_VERSION_MISSING'
      }
    });

    expect(nonOkAllowed.reasonCode).toBe('INVALID_GATE_POLICY_INPUT');
    expect(nonOkAllowed.reason).toContain('allowed=true exige reasonCode=OK');

    const invalidVerdict = versionGatePolicy({
      concernsActionResult: {
        ...validConcernsActionResult(),
        diagnostics: {
          ...validConcernsActionResult().diagnostics,
          verdict: 'UNKNOWN'
        }
      }
    });

    expect(invalidVerdict.reasonCode).toBe('INVALID_GATE_POLICY_INPUT');
    expect(invalidVerdict.reason).toContain('verdict invalide');

    const concernsRequiredWithoutAction = versionGatePolicy({
      concernsActionResult: {
        ...validConcernsActionResult(),
        concernsAction: {
          actionCreated: false,
          actionId: null,
          assignee: null,
          dueAt: null,
          status: null
        }
      }
    });

    expect(concernsRequiredWithoutAction.reasonCode).toBe('INVALID_GATE_POLICY_INPUT');
    expect(concernsRequiredWithoutAction.reason).toContain('action CONCERNS attendue');
  });

  it('rejects invalid policyVersioning input shapes and versions', () => {
    const invalidPolicyVersioningType = versionGatePolicy({
      concernsActionResult: validConcernsActionResult(),
      policyVersioning: 'bad'
    });

    expect(invalidPolicyVersioningType.reasonCode).toBe('INVALID_GATE_POLICY_INPUT');
    expect(invalidPolicyVersioningType.reason).toContain('policyVersioning invalide');

    const invalidRequestedVersion = versionGatePolicy({
      concernsActionResult: validConcernsActionResult(),
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: '1.2.0',
        requestedVersion: 'bad-semver'
      }
    });

    expect(invalidRequestedVersion.reasonCode).toBe('POLICY_VERSION_NOT_ACTIVE');

    const invalidPreviousVersion = versionGatePolicy({
      concernsActionResult: validConcernsActionResult(),
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: '1.2.0',
        requestedVersion: '1.2.0',
        previousVersion: 'bad-semver'
      }
    });

    expect(invalidPreviousVersion.reasonCode).toBe('GATE_POLICY_HISTORY_INCOMPLETE');
  });

  it('rejects malformed history entry payloads and missing mandatory fields', () => {
    const invalidHistoryType = versionGatePolicy({
      concernsActionResult: validConcernsActionResult(),
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: '1.2.0',
        requestedVersion: '1.2.0',
        previousVersion: '1.1.5'
      },
      historyEntry: 'bad'
    });

    expect(invalidHistoryType.reasonCode).toBe('GATE_POLICY_HISTORY_INCOMPLETE');

    const invalidChangeType = versionGatePolicy({
      concernsActionResult: validConcernsActionResult(),
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: '1.2.0',
        requestedVersion: '1.2.0',
        previousVersion: '1.1.5'
      },
      historyEntry: {
        changeType: 'REMOVE'
      }
    });

    expect(invalidChangeType.reasonCode).toBe('GATE_POLICY_HISTORY_INCOMPLETE');

    const invalidChangedAt = versionGatePolicy({
      concernsActionResult: validConcernsActionResult(),
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: '1.2.0',
        requestedVersion: '1.2.0',
        previousVersion: '1.1.5'
      },
      historyEntry: {
        changedAt: 'not-a-date'
      }
    });

    expect(invalidChangedAt.reasonCode).toBe('GATE_POLICY_HISTORY_INCOMPLETE');
  });

  it('handles simulation helper invalid inputs directly', () => {
    const invalidBase = simulateGateVerdictBeforeSubmission({
      baseVerdict: 'UNKNOWN'
    });

    expect(invalidBase.reasonCode).toBe('INVALID_GATE_SIMULATION_INPUT');

    const invalidSignalArray = simulateGateVerdictBeforeSubmission({
      baseVerdict: 'PASS',
      simulationInput: {
        additionalSignals: 'bad'
      }
    });

    expect(invalidSignalArray.reasonCode).toBe('INVALID_GATE_SIMULATION_INPUT');

    const invalidSignalObject = simulateGateVerdictBeforeSubmission({
      baseVerdict: 'PASS',
      simulationInput: {
        additionalSignals: [42]
      }
    });

    expect(invalidSignalObject.reasonCode).toBe('INVALID_GATE_SIMULATION_INPUT');

    const invalidSignalSeverity = simulateGateVerdictBeforeSubmission({
      baseVerdict: 'PASS',
      simulationInput: {
        additionalSignals: [{ severity: 'UNKNOWN' }]
      }
    });

    expect(invalidSignalSeverity.reasonCode).toBe('INVALID_GATE_SIMULATION_INPUT');

    const invalidSignalBlocking = simulateGateVerdictBeforeSubmission({
      baseVerdict: 'PASS',
      simulationInput: {
        additionalSignals: [{ severity: 'PASS', blocking: 'true' }]
      }
    });

    expect(invalidSignalBlocking.reasonCode).toBe('INVALID_GATE_SIMULATION_INPUT');

    const invalidReadOnly = simulateGateVerdictBeforeSubmission({
      baseVerdict: 'PASS',
      simulationInput: {
        readOnly: 'true'
      }
    });

    expect(invalidReadOnly.reasonCode).toBe('INVALID_GATE_SIMULATION_INPUT');

    const invalidForcedVerdict = simulateGateVerdictBeforeSubmission({
      baseVerdict: 'PASS',
      simulationInput: {
        forcedVerdict: 'UNKNOWN'
      }
    });

    expect(invalidForcedVerdict.reasonCode).toBe('INVALID_GATE_SIMULATION_INPUT');

    const ineligible = simulateGateVerdictBeforeSubmission({
      baseVerdict: 'PASS',
      simulationInput: {
        eligible: false
      }
    });

    expect(ineligible.reasonCode).toBe('INVALID_GATE_SIMULATION_INPUT');
    expect(ineligible.simulation.eligible).toBe(false);
    expect(ineligible.correctiveActions).toContain('ENABLE_PRE_SUBMIT_SIMULATION');
  });

  it('covers delegated exception paths from concerns action and simulation modules', () => {
    const delegatedError = versionGatePolicy(
      {
        concernsActionInput: {}
      },
      {
        concernsActionOptions: {
          nowMs: () => {
            throw new Error('boom-error');
          }
        }
      }
    );

    expect(delegatedError.reasonCode).toBe('INVALID_GATE_POLICY_INPUT');
    expect(delegatedError.reason).toContain('createGateConcernsAction a levé une exception');
    expect(delegatedError.reason).toContain('boom-error');

    const delegatedStringThrow = versionGatePolicy(
      {
        concernsActionInput: {}
      },
      {
        concernsActionOptions: {
          nowMs: () => {
            throw 'boom-string';
          }
        }
      }
    );

    expect(delegatedStringThrow.reasonCode).toBe('INVALID_GATE_POLICY_INPUT');
    expect(delegatedStringThrow.reason).toContain('boom-string');

    const simulationException = versionGatePolicy(
      {
        concernsActionResult: validConcernsActionResult(),
        policyVersioning: {
          policyScope: 'gate',
          activeVersion: '1.2.0',
          requestedVersion: '1.2.0',
          previousVersion: '1.1.5'
        },
        simulationInput: {
          eligible: true,
          readOnly: true
        }
      },
      {
        simulationOptions: {
          nowMs: () => {
            throw new Error('simulation-exception');
          }
        }
      }
    );

    expect(simulationException.reasonCode).toBe('INVALID_GATE_SIMULATION_INPUT');
    expect(simulationException.reason).toContain('simulateGateVerdictBeforeSubmission a levé une exception');
  });

  it('ensures non-mutative simulation enforcement and malformed simulation return guards', () => {
    const nonMutativeViolation = versionGatePolicy({
      concernsActionResult: validConcernsActionResult(),
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: '1.2.0',
        requestedVersion: '1.2.0',
        previousVersion: '1.1.5'
      },
      simulationInput: {
        eligible: true,
        readOnly: false,
        forcedVerdict: 'CONCERNS'
      }
    });

    expect(nonMutativeViolation.reasonCode).toBe('INVALID_GATE_SIMULATION_INPUT');
    expect(nonMutativeViolation.correctiveActions).toContain('ENSURE_NON_MUTATIVE_SIMULATION');

    const invalidSimulationOutput = versionGatePolicy(
      {
        concernsActionResult: validConcernsActionResult(),
        policyVersioning: {
          policyScope: 'gate',
          activeVersion: '1.2.0',
          requestedVersion: '1.2.0',
          previousVersion: '1.1.5'
        },
        simulationInput: {
          eligible: true,
          readOnly: true,
          forcedVerdict: 'PASS'
        }
      },
      {
        simulationOptions: {
          nowMs: (() => {
            const values = [100, 200, 300, 400, 500];
            return () => values.shift() ?? 0;
          })()
        }
      }
    );

    expect(invalidSimulationOutput.allowed).toBe(true);

    const nonFiniteStart = versionGatePolicy(
      {
        concernsActionResult: validConcernsActionResult(),
        policyVersioning: {
          policyScope: 'gate',
          activeVersion: '1.2.0',
          requestedVersion: '1.2.0',
          previousVersion: '1.1.5'
        }
      },
      {
        nowMs: (() => {
          const values = [Number.NaN, 100, 200, 300, 400];
          return () => values.shift() ?? 0;
        })()
      }
    );

    expect(nonFiniteStart.reasonCode).toBe('OK');
    expect(nonFiniteStart.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('keeps duration and percentile safe on non-monotonic / non-finite nowMs values', () => {
    const nonMonotonic = versionGatePolicy(
      {
        concernsActionResult: validConcernsActionResult(),
        policyVersioning: {
          policyScope: 'gate',
          activeVersion: '1.2.0',
          requestedVersion: '1.2.0',
          previousVersion: '1.1.5'
        }
      },
      {
        nowMs: (() => {
          const values = [100, 90, 80, 70, 60, 50];
          return () => values.shift() ?? 0;
        })()
      }
    );

    expect(nonMonotonic.reasonCode).toBe('OK');
    expect(nonMonotonic.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
    expect(nonMonotonic.diagnostics.p95SimulationMs).toBeGreaterThanOrEqual(0);

    const nonFiniteEnd = versionGatePolicy(
      {},
      {
        nowMs: (() => {
          const values = [100, Number.NaN];
          return () => values.shift() ?? 0;
        })()
      }
    );

    expect(nonFiniteEnd.reasonCode).toBe('INVALID_GATE_POLICY_INPUT');
    expect(nonFiniteEnd.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('covers policy versioning fallback chains and post-simulation corrective action loop', () => {
    const result = versionGatePolicy({
      concernsActionResult: {
        ...validConcernsActionResult(),
        correctiveActions: ['TRACK_CONCERNS_ACTION', null, 'TRACK_CONCERNS_ACTION', '   '],
        policySnapshot: {
          policyScope: '',
          version: ''
        },
        concernsAction: {
          ...validConcernsActionResult().concernsAction,
          gateId: '',
          storyId: ''
        }
      },
      policyScope: 'gate',
      policyVersion: '1.3.0',
      policyId: '   ',
      previousVersion: '1.2.0',
      simulationInput: {
        eligible: true,
        readOnly: true,
        additionalSignals: [{ signalId: 'warn', severity: 'CONCERNS' }]
      },
      simulationCorrectiveActions: ['POST_SIM_CHECK', 'POST_SIM_CHECK', '   ']
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.allowed).toBe(true);
    expect(result.policyVersioning.policyId).toBe('POLICY-G4');
    expect(result.policyVersioning.gateId).toBeUndefined();
    expect(result.policyVersioning.activeVersion).toBe('1.3.0');
    expect(result.policyVersioning.requestedVersion).toBe('1.3.0');
    expect(result.policyVersioning.previousVersion).toBe('1.2.0');
    expect(result.diagnostics.simulatedVerdict).toBe('CONCERNS');
    expect(result.correctiveActions).toContain('POST_SIM_CHECK');
  });

  it('covers invalid policy scope, explicit inactive version and semver previousVersion guards', () => {
    const invalidScope = versionGatePolicy({
      concernsActionResult: validConcernsActionResult(),
      policyVersioning: {
        policyScope: 'program',
        activeVersion: '1.2.0',
        requestedVersion: '1.2.0'
      }
    });

    expect(invalidScope.reasonCode).toBe('GATE_POLICY_VERSION_MISSING');

    const explicitInactive = versionGatePolicy({
      concernsActionResult: validConcernsActionResult(),
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: '1.2.0',
        requestedVersion: '1.2.0',
        previousVersion: '1.1.9',
        isActive: false
      }
    });

    expect(explicitInactive.reasonCode).toBe('POLICY_VERSION_NOT_ACTIVE');

    const previousVersionInvalid = versionGatePolicy({
      concernsActionResult: validConcernsActionResult(),
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: '1.2.0',
        requestedVersion: '1.2.0',
        previousVersion: 'bad-prev'
      }
    });

    expect(previousVersionInvalid.reasonCode).toBe('GATE_POLICY_HISTORY_INCOMPLETE');
  });

  it('covers history fallback chains (actor/system), update default and changedAt empty string branch', () => {
    const actorFallback = versionGatePolicy({
      concernsActionResult: {
        ...validConcernsActionResult(),
        diagnostics: {
          ...validConcernsActionResult().diagnostics,
          verdict: 'PASS',
          concernsActionRequired: false,
          sourceReasonCode: 'OK'
        },
        concernsAction: {
          ...validConcernsActionResult().concernsAction,
          actionCreated: false,
          assignee: '   '
        }
      },
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: '1.2.0',
        requestedVersion: '1.2.0',
        previousVersion: '1.2.0'
      },
      actor: 'qa-actor',
      simulationInput: {
        eligible: true,
        readOnly: true
      }
    });

    expect(actorFallback.reasonCode).toBe('OK');
    expect(actorFallback.policyVersioning.historyEntry.changeType).toBe('UPDATE');
    expect(actorFallback.policyVersioning.historyEntry.changedBy).toBe('qa-actor');

    const systemFallback = versionGatePolicy({
      concernsActionResult: {
        ...validConcernsActionResult(),
        diagnostics: {
          ...validConcernsActionResult().diagnostics,
          verdict: 'PASS',
          concernsActionRequired: false,
          sourceReasonCode: 'OK'
        },
        concernsAction: {
          ...validConcernsActionResult().concernsAction,
          actionCreated: false,
          assignee: ''
        }
      },
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: '1.2.0',
        requestedVersion: '1.2.0',
        previousVersion: '1.2.0'
      },
      simulationInput: {
        eligible: true,
        readOnly: true
      }
    });

    expect(systemFallback.reasonCode).toBe('OK');
    expect(systemFallback.policyVersioning.historyEntry.changedBy).toBe('system');

    const changedByEmptyString = versionGatePolicy({
      concernsActionResult: validConcernsActionResult(),
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: '1.2.0',
        requestedVersion: '1.2.0',
        previousVersion: '1.1.5'
      },
      historyEntry: {
        changedBy: '   '
      }
    });

    expect(changedByEmptyString.reasonCode).toBe('GATE_POLICY_HISTORY_INCOMPLETE');

    const changedAtEmptyString = versionGatePolicy({
      concernsActionResult: validConcernsActionResult(),
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: '1.2.0',
        requestedVersion: '1.2.0',
        previousVersion: '1.1.5'
      },
      historyEntry: {
        changedAt: '   '
      }
    });

    expect(changedAtEmptyString.reasonCode).toBe('GATE_POLICY_HISTORY_INCOMPLETE');
  });

  it('covers date-object parsing branches in concerns input and history metadata', () => {
    const invalidDueAtDate = versionGatePolicy({
      concernsActionResult: {
        ...validConcernsActionResult(),
        concernsAction: {
          ...validConcernsActionResult().concernsAction,
          dueAt: new Date('invalid-date')
        }
      },
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: '1.2.0',
        requestedVersion: '1.2.0',
        previousVersion: '1.1.5'
      }
    });

    expect(invalidDueAtDate.reasonCode).toBe('INVALID_GATE_POLICY_INPUT');

    const invalidChangedAtDate = versionGatePolicy({
      concernsActionResult: validConcernsActionResult(),
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: '1.2.0',
        requestedVersion: '1.2.0',
        previousVersion: '1.1.5'
      },
      historyEntry: {
        changedAt: new Date('invalid-date')
      }
    });

    expect(invalidChangedAtDate.reasonCode).toBe('GATE_POLICY_HISTORY_INCOMPLETE');
  });

  it('propagates blocked upstream results with fallback reason and corrective actions', () => {
    const blockedFallback = versionGatePolicy({
      concernsActionResult: {
        allowed: false,
        reasonCode: 'INVALID_PHASE',
        reason: '  ',
        diagnostics: {
          sourceReasonCode: 'INVALID_PHASE'
        }
      }
    });

    expect(blockedFallback.reasonCode).toBe('INVALID_PHASE');
    expect(blockedFallback.reason).toContain('Source Concerns Action bloquée');
    expect(blockedFallback.correctiveActions).toEqual(['ALIGN_CANONICAL_PHASE']);
  });

  it('couvre les branches fallback de la simulation (verdict/sourceVerdict, timings non finis, options non objet)', () => {
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(1700000000000);

    const nonFiniteTimers = versionGatePolicy(
      {
        concernsActionResult: {
          ...validConcernsActionResult(),
          diagnostics: {
            ...validConcernsActionResult().diagnostics,
            verdict: 'PASS',
            concernsActionRequired: false,
            actionCreated: false,
            sourceReasonCode: 'OK'
          },
          concernsAction: undefined
        },
        policyVersioning: {
          policyScope: 'gate',
          activeVersion: '1.2.0',
          requestedVersion: '1.2.0',
          previousVersion: '1.1.5'
        },
        simulation: {
          eligible: true,
          readOnly: true,
          additionalSignals: [
            {
              status: 'CONCERNS',
              blocking: true,
              factorId: '   ',
              detail: '   '
            }
          ]
        },
        simulationCorrectiveActions: [undefined, 'POST_SIM_VALIDATION']
      },
      {
        nowMs: (() => {
          const values = [Number.NaN, 1, 2, Number.NaN, Number.NaN];
          return () => values.shift() ?? Number.NaN;
        })()
      }
    );

    expect(nonFiniteTimers.reasonCode).toBe('OK');
    expect(nonFiniteTimers.simulation.simulatedVerdict).toBe('FAIL');
    expect(nonFiniteTimers.simulation.factors.some((factor) => factor.factorId === 'signal-1')).toBe(true);
    expect(nonFiniteTimers.correctiveActions).toContain('POST_SIM_VALIDATION');
    expect(nonFiniteTimers.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
    expect(nonFiniteTimers.simulation.evaluatedAt).toBe(new Date(1700000000000).toISOString());

    const withSourceVerdict = simulateGateVerdictBeforeSubmission(
      {
        sourceVerdict: 'PASS',
        simulation: {
          eligible: true,
          readOnly: true
        },
        correctiveActions: [null, 'SIM_KEEP']
      },
      'invalid-options'
    );

    expect(withSourceVerdict.reasonCode).toBe('OK');
    expect(withSourceVerdict.correctiveActions).toContain('SIM_KEEP');

    const nonObjectPayload = simulateGateVerdictBeforeSubmission('bad-input', null);
    expect(nonObjectPayload.reasonCode).toBe('INVALID_GATE_SIMULATION_INPUT');

    dateNowSpy.mockRestore();
  });

  it('couvre les fallbacks policy/version/history et branches String(error)', () => {
    const sourceSnapshotFallback = versionGatePolicy(
      {
        concernsActionResult: {
          ...validConcernsActionResult(),
          diagnostics: {
            ...validConcernsActionResult().diagnostics,
            verdict: 'PASS',
            concernsActionRequired: false,
            actionCreated: false,
            sourceReasonCode: 'OK'
          },
          concernsAction: undefined,
          policySnapshot: {
            policyScope: 'gate',
            version: '2.4.0'
          }
        },
        gateId: '',
        simulationInput: {
          eligible: true,
          readOnly: true
        }
      },
      'bad-runtime-options'
    );

    expect(sourceSnapshotFallback.reasonCode).toBe('OK');
    expect(sourceSnapshotFallback.policyVersioning.activeVersion).toBe('2.4.0');
    expect(sourceSnapshotFallback.policyVersioning.previousVersion).toBe('2.4.0');
    expect(sourceSnapshotFallback.policyVersioning.policyId).toBe('POLICY-G4');
    expect(sourceSnapshotFallback.diagnostics.sourceReasonCode).toBe('OK');

    const missingPolicySnapshot = versionGatePolicy({
      concernsActionResult: {
        ...validConcernsActionResult(),
        diagnostics: {
          ...validConcernsActionResult().diagnostics,
          verdict: 'PASS',
          concernsActionRequired: false,
          actionCreated: false
        },
        concernsAction: undefined,
        policySnapshot: null
      },
      simulationInput: {
        eligible: true,
        readOnly: true
      }
    });

    expect(missingPolicySnapshot.reasonCode).toBe('GATE_POLICY_VERSION_MISSING');
    expect(missingPolicySnapshot.policyVersioning.policyScope).toBe('gate');
    expect(missingPolicySnapshot.policyVersioning.activeVersion).toBeNull();
    expect(missingPolicySnapshot.policyVersioning.requestedVersion).toBeNull();
    expect(missingPolicySnapshot.policyVersioning.nextVersion).toBeNull();

    const blankReasonCode = versionGatePolicy({
      concernsActionResult: {
        allowed: true,
        reasonCode: '   '
      }
    });

    expect(blankReasonCode.reasonCode).toBe('INVALID_GATE_POLICY_INPUT');
    expect(blankReasonCode.reason).toContain('vide');

    const previousVersionFallback = versionGatePolicy({
      concernsActionResult: validConcernsActionResult(),
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: '1.2.0',
        requestedVersion: '1.2.0',
        previousVersion: ''
      },
      historyEntry: {
        policyId: 'POLICY-G4',
        nextVersion: '1.2.0',
        changedBy: 'qa-owner',
        changeType: 'UPDATE',
        changedAt: '2026-02-24T05:30:00.000Z'
      },
      simulationInput: {
        eligible: true,
        readOnly: true
      }
    });

    expect(previousVersionFallback.reasonCode).toBe('OK');
    expect(previousVersionFallback.policyVersioning.historyEntry.previousVersion).toBe('1.2.0');

    const invalidHistoryNullFields = versionGatePolicy({
      concernsActionResult: validConcernsActionResult(),
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: '1.2.0',
        requestedVersion: '1.2.0',
        previousVersion: '1.1.5'
      },
      historyEntry: {
        policyId: '',
        previousVersion: '',
        nextVersion: '',
        changedBy: 'qa-owner',
        changeType: 'UPDATE',
        changedAt: '2026-02-24T05:30:00.000Z'
      }
    });

    expect(invalidHistoryNullFields.reasonCode).toBe('GATE_POLICY_HISTORY_INCOMPLETE');
    expect(invalidHistoryNullFields.policyVersioning.historyEntry.policyId).toBeNull();
    expect(invalidHistoryNullFields.policyVersioning.historyEntry.previousVersion).toBeNull();
    expect(invalidHistoryNullFields.policyVersioning.historyEntry.nextVersion).toBeNull();

    const dueAtDateValid = versionGatePolicy({
      concernsActionResult: {
        ...validConcernsActionResult(),
        concernsAction: {
          ...validConcernsActionResult().concernsAction,
          dueAt: new Date('2026-03-03T10:00:00.000Z')
        }
      },
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: '1.2.0',
        requestedVersion: '1.2.0',
        previousVersion: '1.1.5'
      }
    });

    expect(dueAtDateValid.reasonCode).toBe('OK');

    const dueAtNonFiniteNumber = versionGatePolicy({
      concernsActionResult: {
        ...validConcernsActionResult(),
        concernsAction: {
          ...validConcernsActionResult().concernsAction,
          dueAt: Number.NaN
        }
      },
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: '1.2.0',
        requestedVersion: '1.2.0',
        previousVersion: '1.1.5'
      }
    });

    expect(dueAtNonFiniteNumber.reasonCode).toBe('INVALID_GATE_POLICY_INPUT');

    const delegatedWithoutObjectOptions = versionGatePolicy(
      {
        concernsActionInput: {}
      },
      {
        concernsActionOptions: 'bad-options'
      }
    );

    expect(delegatedWithoutObjectOptions.reasonCode).toBe('INVALID_CONCERNS_ACTION_INPUT');

    const simulationThrowsString = versionGatePolicy(
      {
        concernsActionResult: validConcernsActionResult(),
        policyVersioning: {
          policyScope: 'gate',
          activeVersion: '1.2.0',
          requestedVersion: '1.2.0',
          previousVersion: '1.1.5'
        }
      },
      {
        simulationOptions: {
          nowMs: () => {
            throw 'boom-string-sim';
          }
        }
      }
    );

    expect(simulationThrowsString.reasonCode).toBe('INVALID_GATE_SIMULATION_INPUT');
    expect(simulationThrowsString.reason).toContain('boom-string-sim');
  });

  it('couvre les branches parseTimestamp/duration/tri du helper simulation pour le gate coverage S031', () => {
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(1700000000000);

    const invalidSimulationInputType = simulateGateVerdictBeforeSubmission({
      baseVerdict: 'PASS',
      simulationInput: 'bad'
    });

    expect(invalidSimulationInputType.reasonCode).toBe('INVALID_GATE_SIMULATION_INPUT');

    const ineligibleAlreadyTagged = simulateGateVerdictBeforeSubmission({
      baseVerdict: 'PASS',
      simulationInput: {
        eligible: false
      },
      correctiveActions: ['ENABLE_PRE_SUBMIT_SIMULATION', 'B-ACTION', 'A-ACTION']
    });

    expect(ineligibleAlreadyTagged.reasonCode).toBe('INVALID_GATE_SIMULATION_INPUT');
    expect(ineligibleAlreadyTagged.correctiveActions).toEqual([
      'A-ACTION',
      'B-ACTION',
      'ENABLE_PRE_SUBMIT_SIMULATION'
    ]);

    const withDateNow = simulateGateVerdictBeforeSubmission(
      {
        baseVerdict: 'PASS',
        simulationInput: {
          eligible: true,
          readOnly: true
        },
        correctiveActions: ['B', 'A']
      },
      {
        nowMs: (() => {
          const values = [100, 120, 140, new Date('2026-02-24T06:00:00.000Z'), 200];
          return () => values.shift() ?? 200;
        })()
      }
    );

    expect(withDateNow.reasonCode).toBe('OK');
    expect(withDateNow.correctiveActions).toEqual(['A', 'B']);
    expect(withDateNow.simulation.evaluatedAt).toBe('2026-02-24T06:00:00.000Z');

    const withInvalidDateObject = simulateGateVerdictBeforeSubmission(
      {
        baseVerdict: 'PASS',
        simulationInput: {
          eligible: true,
          readOnly: true
        }
      },
      {
        nowMs: (() => {
          const values = [100, 120, 140, new Date('invalid'), 200];
          return () => values.shift() ?? 200;
        })()
      }
    );

    expect(withInvalidDateObject.reasonCode).toBe('OK');
    expect(withInvalidDateObject.simulation.evaluatedAt).toBe(new Date(1700000000000).toISOString());

    const withIsoStringNow = simulateGateVerdictBeforeSubmission(
      {
        baseVerdict: 'PASS',
        simulationInput: {
          eligible: true,
          readOnly: true
        }
      },
      {
        nowMs: (() => {
          const values = [100, 120, 140, '2026-02-24T06:00:01.000Z', 200];
          return () => values.shift() ?? 200;
        })()
      }
    );

    expect(withIsoStringNow.reasonCode).toBe('OK');
    expect(withIsoStringNow.simulation.evaluatedAt).toBe('2026-02-24T06:00:01.000Z');

    const withInvalidStringNow = simulateGateVerdictBeforeSubmission(
      {
        baseVerdict: 'PASS',
        simulationInput: {
          eligible: true,
          readOnly: true
        }
      },
      {
        nowMs: (() => {
          const values = [100, 120, 140, 'not-a-date', 200];
          return () => values.shift() ?? 200;
        })()
      }
    );

    expect(withInvalidStringNow.reasonCode).toBe('OK');
    expect(withInvalidStringNow.simulation.evaluatedAt).toBe(new Date(1700000000000).toISOString());

    const withEmptyStringNow = simulateGateVerdictBeforeSubmission(
      {
        baseVerdict: 'PASS',
        simulationInput: {
          eligible: true,
          readOnly: true
        }
      },
      {
        nowMs: (() => {
          const values = [100, 120, 140, '   ', 200];
          return () => values.shift() ?? 200;
        })()
      }
    );

    expect(withEmptyStringNow.reasonCode).toBe('OK');
    expect(withEmptyStringNow.simulation.evaluatedAt).toBe(new Date(1700000000000).toISOString());

    const withObjectNow = simulateGateVerdictBeforeSubmission(
      {
        baseVerdict: 'PASS',
        simulationInput: {
          eligible: true,
          readOnly: true
        }
      },
      {
        nowMs: (() => {
          const values = [100, 120, 140, { any: 'object' }, 200];
          return () => values.shift() ?? 200;
        })()
      }
    );

    expect(withObjectNow.reasonCode).toBe('OK');
    expect(withObjectNow.simulation.evaluatedAt).toBe(new Date(1700000000000).toISOString());

    const withNaNNumberNow = simulateGateVerdictBeforeSubmission(
      {
        baseVerdict: 'PASS',
        simulationInput: {
          eligible: true,
          readOnly: true
        }
      },
      {
        nowMs: (() => {
          const values = [100, 120, 140, Number.NaN, Number.NaN];
          return () => values.shift() ?? Number.NaN;
        })()
      }
    );

    expect(withNaNNumberNow.reasonCode).toBe('OK');
    expect(withNaNNumberNow.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
    expect(withNaNNumberNow.simulation.evaluatedAt).toBe(new Date(1700000000000).toISOString());

    const withNegativeDurationSample = simulateGateVerdictBeforeSubmission(
      {
        baseVerdict: 'PASS',
        simulationInput: {
          eligible: true,
          readOnly: true
        }
      },
      {
        nowMs: (() => {
          const values = [Number.NaN, 50, 40, '2026-02-24T06:00:02.000Z', 30];
          return () => values.shift() ?? 30;
        })()
      }
    );

    expect(withNegativeDurationSample.reasonCode).toBe('OK');
    expect(withNegativeDurationSample.diagnostics.durationMs).toBeGreaterThanOrEqual(0);

    dateNowSpy.mockRestore();
  });
});
