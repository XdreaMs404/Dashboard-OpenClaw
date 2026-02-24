import { describe, expect, it } from 'vitest';
import { bridgeUxEvidenceToG4 } from '../../src/g4-ux-evidence-bridge.js';

const gateMap = {
  G1: { status: 'PASS', owner: 'analyst', updatedAt: '2026-02-24T10:00:00.000Z' },
  G2: { status: 'PASS', owner: 'pm', updatedAt: '2026-02-24T10:05:00.000Z' },
  G3: { status: 'PASS', owner: 'architect', updatedAt: '2026-02-24T10:10:00.000Z' },
  G4: { status: 'CONCERNS', owner: 'reviewer', updatedAt: '2026-02-24T10:15:00.000Z' },
  G5: { status: 'PASS', owner: 'jarvis', updatedAt: '2026-02-24T10:20:00.000Z' }
};

describe('g4-ux-evidence-bridge edge', () => {
  it('rejects malformed top-level payload', () => {
    const result = bridgeUxEvidenceToG4('bad-input');

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_G4_UX_BRIDGE_INPUT');
  });

  it('accepts gate map payload and deduplicates ux evidence refs', () => {
    const result = bridgeUxEvidenceToG4({
      gates: gateMap,
      g4: {
        correlationId: 'G4-CORR-EDGE',
        tech: {
          status: 'PASS',
          owner: 'tea',
          updatedAt: '2026-02-24T10:15:30.000Z'
        },
        ux: {
          status: 'CONCERNS',
          owner: 'uxqa',
          updatedAt: '2026-02-24T10:16:00.000Z',
          evidenceRefs: ['evidence://ux/g4/edge-001', 'evidence://ux/g4/edge-001', '  ']
        }
      },
      uxEvidenceIngestion: [
        {
          evidenceRef: 'evidence://ux/g4/edge-001',
          capturedAt: '2026-02-24T10:15:59.000Z',
          ingestedAt: '2026-02-24T10:16:00.100Z'
        },
        {
          evidenceRef: 'evidence://ux/g4/edge-001',
          capturedAt: '2026-02-24T10:16:01.000Z',
          ingestedAt: '2026-02-24T10:16:01.900Z'
        }
      ],
      latencySamplesMs: [120, 200, 280]
    });

    expect(result.allowed).toBe(true);
    expect(result.g4Correlation.uxEvidenceIngestion.evidenceRefs).toEqual(['evidence://ux/g4/edge-001']);
  });

  it('allows missing ux evidence when strictEvidence=false', () => {
    const result = bridgeUxEvidenceToG4(
      {
        gates: gateMap,
        g4: {
          correlationId: 'G4-CORR-EDGE',
          tech: {
            status: 'PASS',
            owner: 'tea',
            updatedAt: '2026-02-24T10:15:30.000Z'
          },
          ux: {
            status: 'PASS',
            owner: 'uxqa',
            updatedAt: '2026-02-24T10:16:00.000Z'
          }
        },
        uxEvidenceIngestion: [],
        latencySamplesMs: [220]
      },
      {
        strictEvidence: false
      }
    );

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.g4Correlation.uxEvidenceIngestion.evidenceRefs).toEqual([]);
  });
});
