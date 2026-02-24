import { describe, expect, it } from 'vitest';
import { simulateGateVerdictBeforeSubmission } from '../../src/gate-pre-submit-simulation.js';

describe('gate-pre-submit-simulation edge', () => {
  it('requires delegate when policyVersionInput is provided', () => {
    const result = simulateGateVerdictBeforeSubmission({
      policyVersionInput: {
        policyScope: 'gate'
      },
      simulationInput: {
        eligible: true,
        readOnly: true
      }
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_GATE_SIMULATION_INPUT');
    expect(result.reason).toContain('versionGatePolicy');
  });

  it('rejects invalid policyVersionResult shape', () => {
    const result = simulateGateVerdictBeforeSubmission({
      policyVersionResult: {
        allowed: 'yes',
        reasonCode: 'OK'
      },
      simulationInput: {
        eligible: true,
        readOnly: true
      }
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_GATE_SIMULATION_INPUT');
  });

  it('auto-builds evidence chain when not explicitly required', () => {
    const result = simulateGateVerdictBeforeSubmission({
      baseVerdict: 'CONCERNS',
      simulationInput: {
        eligible: true,
        readOnly: true
      },
      trendSamples: [
        { verdict: 'CONCERNS', at: '2026-02-24T09:00:00.000Z' },
        { verdict: 'PASS', at: '2026-02-24T10:00:00.000Z' }
      ]
    });

    expect(result.allowed).toBe(true);
    expect(result.evidenceChain.primaryEvidenceRefs.length).toBeGreaterThan(0);
    expect(result.evidenceChain.trendEvidenceRefs.length).toBeGreaterThan(0);
  });

  it('propagates blocked delegate reason code without rewrite', () => {
    const result = simulateGateVerdictBeforeSubmission(
      {
        policyVersionInput: {
          policyScope: 'gate',
          activeVersion: '1.2.0'
        },
        simulationInput: {
          eligible: true,
          readOnly: true
        }
      },
      {
        versionGatePolicy: () => ({
          allowed: false,
          reasonCode: 'G4_SUBGATES_UNSYNC',
          reason: 'Sous-gates G4 non synchronisés.',
          diagnostics: {
            sourceReasonCode: 'G4_SUBGATES_UNSYNC'
          },
          correctiveActions: ['SYNC_G4_SUBGATES']
        })
      }
    );

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('G4_SUBGATES_UNSYNC');
    expect(result.correctiveActions).toContain('SYNC_G4_SUBGATES');
  });
});
