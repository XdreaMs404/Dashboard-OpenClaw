import { describe, expect, it } from 'vitest';
import { buildRolePrioritizedContextualQueue } from '../../src/role-prioritized-contextual-queue.js';
import { buildRolePrioritizedContextualQueue as buildFromIndex } from '../../src/index.js';
import { buildS074Payload } from '../fixtures/role-s074-payload.js';

describe('role-prioritized-contextual-queue unit', () => {
  it('builds centralized prioritized contextual queue with multi-severity notifications', () => {
    const result = buildRolePrioritizedContextualQueue(buildS074Payload(), {
      nowMs: Date.parse('2026-03-26T09:00:00.000Z')
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.notificationCenter).toMatchObject({
      model: 'ROLE_PRIORITIZED_CONTEXTUAL_QUEUE',
      modelVersion: 'S074-v1',
      summary: {
        totalNotifications: 8,
        openCriticalCount: 2,
        p95CriticalDecisionSec: 85,
        p90MttaMinutes: 9.3
      }
    });
    expect(result.notificationCenter.summary.severityDistribution).toMatchObject({
      CRITICAL: 2,
      HIGH: 2,
      MEDIUM: 2,
      LOW: 2
    });
  });

  it('fails when one severity level is missing', () => {
    const payload = buildS074Payload();
    payload.notificationCenter = payload.notificationCenter.filter((entry) => String(entry.severity).toUpperCase() !== 'LOW');

    const result = buildRolePrioritizedContextualQueue(payload, {
      nowMs: Date.parse('2026-03-26T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('ROLE_NOTIFICATION_SEVERITY_COVERAGE_REQUIRED');
  });

  it('fails when critical decision latency exceeds NFR-033 budget', () => {
    const payload = buildS074Payload();
    payload.criticalDecisionSamplesSec = [62, 75, 94, 110];

    const result = buildRolePrioritizedContextualQueue(payload, {
      nowMs: Date.parse('2026-03-26T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('ROLE_NOTIFICATION_DECISION_LATENCY_BUDGET_EXCEEDED');
  });

  it('fails when MTTA exceeds NFR-017 budget', () => {
    const payload = buildS074Payload();
    payload.notificationMttaSamplesMinutes = [6, 8, 11, 13];

    const result = buildRolePrioritizedContextualQueue(payload, {
      nowMs: Date.parse('2026-03-26T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('ROLE_NOTIFICATION_MTTA_BUDGET_EXCEEDED');
  });

  it('is exported from index', () => {
    const result = buildFromIndex(buildS074Payload(), {
      nowMs: Date.parse('2026-03-26T09:00:00.000Z')
    });

    expect(result.reasonCode).toBe('OK');
  });
});
