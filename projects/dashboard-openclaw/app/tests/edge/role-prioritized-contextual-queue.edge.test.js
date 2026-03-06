import { describe, expect, it } from 'vitest';
import { buildRolePrioritizedContextualQueue } from '../../src/role-prioritized-contextual-queue.js';
import { buildS074Payload } from '../fixtures/role-s074-payload.js';

describe('role-prioritized-contextual-queue edge', () => {
  it('rejects malformed payload', () => {
    const result = buildRolePrioritizedContextualQueue('bad-input');

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_ROLE_PRIORITY_QUEUE_INPUT');
  });

  it('propagates upstream S073 failure when role dashboards are invalid', () => {
    const payload = buildS074Payload();
    delete payload.roleDashboards;

    const result = buildRolePrioritizedContextualQueue(payload, {
      nowMs: Date.parse('2026-03-26T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('ROLE_DASHBOARD_REQUIRED_ROLES_MISSING');
  });

  it('fails when notification center is missing', () => {
    const payload = buildS074Payload();
    delete payload.notificationCenter;

    const result = buildRolePrioritizedContextualQueue(payload, {
      nowMs: Date.parse('2026-03-26T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('ROLE_NOTIFICATION_CENTER_REQUIRED');
  });

  it('fails on non-object notification entries', () => {
    const payload = buildS074Payload();
    payload.notificationCenter = ['invalid'];

    const result = buildRolePrioritizedContextualQueue(payload, {
      nowMs: Date.parse('2026-03-26T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_ROLE_PRIORITY_QUEUE_INPUT');
  });

  it('fails on invalid severity', () => {
    const payload = buildS074Payload();
    payload.notificationCenter[0].severity = 'UNKNOWN';
    payload.notificationCenter[0].priorityScore = Number.NaN;

    const result = buildRolePrioritizedContextualQueue(payload, {
      nowMs: Date.parse('2026-03-26T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('ROLE_NOTIFICATION_SEVERITY_REQUIRED');
  });

  it('fails when notification context is missing', () => {
    const payload = buildS074Payload();
    payload.notificationCenter[0].contextRef = '';

    const result = buildRolePrioritizedContextualQueue(payload, {
      nowMs: Date.parse('2026-03-26T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('ROLE_NOTIFICATION_CONTEXT_REQUIRED');
  });

  it('fails when open critical backlog exceeds max', () => {
    const payload = buildS074Payload();

    const result = buildRolePrioritizedContextualQueue(payload, {
      nowMs: Date.parse('2026-03-26T09:00:00.000Z'),
      priorityQueueRules: {
        maxOpenCritical: 1
      }
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('ROLE_NOTIFICATION_CRITICAL_BACKLOG_EXCEEDED');
  });

  it('fails when critical decision samples are missing', () => {
    const payload = buildS074Payload();
    delete payload.criticalDecisionSamplesSec;

    for (const notification of payload.notificationCenter) {
      if (String(notification.severity).toUpperCase() === 'CRITICAL') {
        delete notification.decisionLatencySeconds;
      }
    }

    const result = buildRolePrioritizedContextualQueue(payload, {
      nowMs: Date.parse('2026-03-26T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('ROLE_NOTIFICATION_DECISION_LATENCY_SAMPLES_REQUIRED');
  });

  it('fails when MTTA samples are missing', () => {
    const payload = buildS074Payload();
    delete payload.notificationMttaSamplesMinutes;

    for (const notification of payload.notificationCenter) {
      delete notification.ackMinutes;
    }

    const result = buildRolePrioritizedContextualQueue(payload, {
      nowMs: Date.parse('2026-03-26T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('ROLE_NOTIFICATION_MTTA_SAMPLES_REQUIRED');
  });

  it('supports notificationCenter object.items, severity aliases and derived severity from priority', () => {
    const payload = buildS074Payload();

    payload.notificationCenter = {
      items: payload.notificationCenter.map((entry, index) => ({
        notificationId: entry.id,
        ownerRole: entry.role,
        level: index === 0 ? 'critique' : entry.severity,
        score: entry.priorityScore,
        message: entry.summary,
        evidenceRef: entry.contextRef,
        lifecycle: entry.status,
        ackLatencyMinutes: entry.ackMinutes,
        decisionSeconds: entry.decisionLatencySeconds
      }))
    };

    payload.notificationCenter.items[1].level = '';
    payload.notificationCenter.items[1].score = 92;

    const result = buildRolePrioritizedContextualQueue(payload, {
      nowMs: Date.parse('2026-03-26T09:00:00.000Z'),
      priorityQueueRules: {
        modelVersion: 'S074-runtime'
      }
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.notificationCenter.modelVersion).toBe('S074-runtime');
  });

  it('supports payload rules + aliases + deterministic tie ordering for critical notifications', () => {
    const payload = buildS074Payload();

    payload.priorityQueueRules = {
      modelVersion: 'S074-payload-rules',
      requiredSeverities: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
    };

    delete payload.criticalDecisionSamplesSec;
    delete payload.notificationMttaSamplesMinutes;

    payload.notificationCenter = [
      {
        notificationId: 'NOTIF-B',
        targetRole: 'PM',
        severity: 'critical',
        priorityScore: 90,
        title: 'Critical B',
        gateRef: 'gate://critical/b',
        lifecycle: 'ACKED',
        ackLatencyMinutes: 4,
        decisionSeconds: 50
      },
      {
        notificationId: 'NOTIF-A',
        actorRole: 'ARCHITECT',
        severity: 'CRITICAL',
        priorityScore: 90,
        action: 'Critical A',
        storyRef: 'story://critical/a',
        lifecycle: 'OPEN',
        ackLatencyMinutes: 5,
        decisionSeconds: 55
      },
      {
        notificationId: 'NOTIF-H',
        ownerRole: 'TEA',
        score: 85,
        message: 'High derived from score',
        evidenceRef: 'ctx://high',
        lifecycle: 'OPEN',
        ackLatencyMinutes: 6,
        decisionSeconds: 70
      },
      {
        role: 'UXQA',
        score: 75,
        action: 'Medium derived from score',
        storyRef: 'ctx://medium',
        status: 'OPEN',
        ackMinutes: 7,
        decisionLatencySeconds: 75
      },
      {
        id: 'NOTIF-L',
        role: 'SPONSOR',
        priorityLabel: 'LOW',
        score: 'not-a-number',
        title: 'Low from priorityLabel',
        gateRef: 'ctx://low',
        status: 'BACKLOG',
        ackMinutes: 8,
        decisionLatencySeconds: 80
      }
    ];

    const result = buildRolePrioritizedContextualQueue(payload, {
      nowMs: Date.parse('2026-03-26T09:00:00.000Z')
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.notificationCenter.modelVersion).toBe('S074-payload-rules');

    const criticalIds = result.notificationCenter.queue
      .filter((entry) => entry.severity === 'CRITICAL')
      .map((entry) => entry.notificationId);

    expect(criticalIds).toEqual(['NOTIF-A', 'NOTIF-B']);

    const generatedMedium = result.notificationCenter.queue.find((entry) => entry.notificationId === 'notification-4');
    expect(generatedMedium?.severity).toBe('MEDIUM');

    const lowNotification = result.notificationCenter.queue.find((entry) => entry.notificationId === 'NOTIF-L');
    expect(lowNotification?.priorityScore).toBe(0);

    const ackedNotification = result.notificationCenter.queue.find((entry) => entry.notificationId === 'NOTIF-B');
    expect(ackedNotification?.status).toBe('RESOLVED');
  });

  it('falls back to default rules when payload-level rule values are invalid', () => {
    const payload = buildS074Payload();

    delete payload.priorityQueueModelVersion;

    payload.priorityQueueRules = {
      modelVersion: '   ',
      requiredSeverities: ['UNKNOWN', '', null]
    };

    const result = buildRolePrioritizedContextualQueue(payload, {
      nowMs: Date.parse('2026-03-26T09:00:00.000Z')
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.notificationCenter.modelVersion).toBe('S074-v1');
    expect(result.notificationCenter.summary.severityDistribution).toMatchObject({
      CRITICAL: 2,
      HIGH: 2,
      MEDIUM: 2,
      LOW: 2
    });
  });

  it('uses payload.requiredSeverities when priorityQueueRules is absent', () => {
    const payload = buildS074Payload();

    delete payload.priorityQueueModelVersion;
    delete payload.priorityQueueRules;

    payload.requiredSeverities = ['P0', 'P1', 'P2', 'P3'];

    const result = buildRolePrioritizedContextualQueue(payload, {
      nowMs: Date.parse('2026-03-26T09:00:00.000Z')
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.notificationCenter.modelVersion).toBe('S074-v1');
  });
});
