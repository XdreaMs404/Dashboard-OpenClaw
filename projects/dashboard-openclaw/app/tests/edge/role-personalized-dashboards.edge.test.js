import { describe, expect, it } from 'vitest';
import { buildRolePersonalizedDashboards } from '../../src/role-personalized-dashboards.js';
import { buildS073Payload } from '../fixtures/role-s073-payload.js';

describe('role-personalized-dashboards edge', () => {
  it('rejects malformed payload', () => {
    const result = buildRolePersonalizedDashboards('bad-input');

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_ROLE_DASHBOARD_INPUT');
  });

  it('rejects non-object role dashboard entries', () => {
    const payload = buildS073Payload();
    payload.roleDashboards = ['invalid'];

    const result = buildRolePersonalizedDashboards(payload, {
      nowMs: Date.parse('2026-03-25T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_ROLE_DASHBOARD_INPUT');
  });

  it('rejects when personalization context is missing for one role', () => {
    const payload = buildS073Payload();
    payload.roleDashboards[2].contextRef = '';

    const result = buildRolePersonalizedDashboards(payload, {
      nowMs: Date.parse('2026-03-25T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('ROLE_DASHBOARD_PERSONALIZATION_REQUIRED');
  });

  it('rejects when no role action queue is provided', () => {
    const payload = buildS073Payload();
    delete payload.roleActionQueue;

    const result = buildRolePersonalizedDashboards(payload, {
      nowMs: Date.parse('2026-03-25T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('ROLE_ACTION_QUEUE_REQUIRED');
  });

  it('rejects when queue does not cover all required roles', () => {
    const payload = buildS073Payload();
    payload.roleActionQueue = payload.roleActionQueue.filter((entry) => String(entry.role).toUpperCase() !== 'TEA');

    const result = buildRolePersonalizedDashboards(payload, {
      nowMs: Date.parse('2026-03-25T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('ROLE_ACTION_QUEUE_REQUIRED');
  });

  it('rejects when latency samples are missing', () => {
    const payload = buildS073Payload();
    delete payload.latencySamplesMs;

    const result = buildRolePersonalizedDashboards(payload, {
      nowMs: Date.parse('2026-03-25T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('ROLE_DASHBOARD_LATENCY_SAMPLES_REQUIRED');
  });

  it('rejects when MTTA samples are missing and queue has no ack minutes', () => {
    const payload = buildS073Payload();
    delete payload.mttaSamplesMinutes;

    for (const action of payload.roleActionQueue) {
      delete action.ackMinutes;
    }

    const result = buildRolePersonalizedDashboards(payload, {
      nowMs: Date.parse('2026-03-25T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('ROLE_DASHBOARD_MTTA_SAMPLES_REQUIRED');
  });

  it('rejects notification fatigue when too many high-priority actions stay open for a role', () => {
    const payload = buildS073Payload();

    payload.roleActionQueue.push(
      {
        id: 'ACT-PM-003',
        role: 'PM',
        priorityScore: 93,
        summary: 'Escalade 3',
        contextRef: 'phase://G2/escalation-3',
        status: 'OPEN',
        ackMinutes: 4
      },
      {
        id: 'ACT-PM-004',
        role: 'PM',
        priorityScore: 92,
        summary: 'Escalade 4',
        contextRef: 'phase://G2/escalation-4',
        status: 'OPEN',
        ackMinutes: 4
      },
      {
        id: 'ACT-PM-005',
        role: 'PM',
        priorityScore: 91,
        summary: 'Escalade 5',
        contextRef: 'phase://G2/escalation-5',
        status: 'OPEN',
        ackMinutes: 4
      }
    );

    const result = buildRolePersonalizedDashboards(payload, {
      nowMs: Date.parse('2026-03-25T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('ROLE_DASHBOARD_NOTIFICATION_FATIGUE_RISK');
  });

  it('supports roleDashboards object + aliases', () => {
    const payload = buildS073Payload();

    payload.roleDashboards = {
      PM: {
        dashboardId: 'pm-dashboard',
        contextRef: 'gate://G2/phase-notify',
        widgets: [{ id: 'pm-actions', title: 'Actions PM prioritaires' }]
      },
      Architecte: {
        dashboardId: 'architect-dashboard',
        contextRef: 'gate://G3/readiness',
        widgets: [{ id: 'arch-readiness', title: 'Readiness solutioning' }]
      },
      TEA: {
        dashboardId: 'tea-dashboard',
        contextRef: 'gate://G4T/quality',
        widgets: [{ id: 'tea-coverage', title: 'Couverture globale' }]
      },
      'UX QA': {
        dashboardId: 'uxqa-dashboard',
        contextRef: 'gate://G4UX/evidence',
        widgets: [{ id: 'uxqa-responsive', title: 'Responsive 3 breakpoints' }]
      },
      Sponsor: {
        dashboardId: 'sponsor-dashboard',
        contextRef: 'gate://G5/executive',
        widgets: [{ id: 'sponsor-kpi', title: 'KPI collaboration' }]
      }
    };

    const result = buildRolePersonalizedDashboards(payload, {
      nowMs: Date.parse('2026-03-25T09:00:00.000Z')
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
  });

  it('supports roleViews + roleActions aliases with runtime roleWorkspaceRules and fallback fields', () => {
    const payload = {
      roleViews: {
        PM: {
          focusRef: 'ctx://pm',
          cards: ['Inbox PM', { widgetId: 'pm-priority', label: 'Top actions PM' }]
        },
        Architecte: {
          personaRef: 'ctx://arch',
          panels: [{ id: '', name: '***', sourceRef: 'proof://arch/widget' }]
        },
        TEA: {
          contextRefs: ['ctx://tea', undefined],
          widgets: [{ title: 'Gate coverage TEA' }]
        },
        'UX QA': {
          contextRef: 'ctx://uxqa',
          widgets: [{ label: 'Audit lane UX' }]
        },
        Sponsor: {
          contextRef: 'ctx://sponsor',
          widgets: [{ title: 'Executive summary sponsor' }]
        }
      },
      roleActions: [
        {
          actionId: 'A-PM-2',
          targetRole: 'PM',
          priority: 95,
          action: 'Escalade PM',
          evidenceRef: 'e://pm/2',
          lifecycle: 'BACKLOG'
        },
        {
          actionId: 'A-PM-1',
          role: 'PM',
          priority: 95,
          action: 'Escalade PM bis',
          evidenceRef: 'e://pm/1',
          lifecycle: 'BACKLOG'
        },
        {
          id: 'A-ARCH-1',
          ownerRole: 'ARCHITECT',
          score: 88,
          title: 'Review architecture',
          gateRef: 'g://arch',
          lifecycle: 'CLOSED'
        },
        {
          id: 'A-TEA-1',
          actorRole: 'TEA',
          priorityScore: 87,
          summary: 'Quality audit',
          storyRef: 's://tea'
        },
        {
          id: 'A-UX-1',
          role: 'UX QA',
          priorityScore: 86,
          summary: 'UX audit',
          contextRef: 'ux://audit',
          status: 'OPEN'
        },
        {
          id: 'A-SP-1',
          role: 'SPONSOR',
          priorityScore: 84,
          summary: 'Sponsor review',
          contextRef: 'sp://review',
          status: 'RESOLVED'
        }
      ],
      roleDashboardLatencySamplesMs: [600, 700, 800, 900, 1100],
      ackLatencySamplesMinutes: [2, 3, 4, 5, 6, 8]
    };

    const result = buildRolePersonalizedDashboards(payload, {
      roleWorkspaceRules: {
        modelVersion: 'S073-runtime-rules',
        requiredRoles: ['PM', 'ARCHITECT', 'TEA', 'UXQA', 'SPONSOR'],
        maxHighPriorityOpenPerRole: 3
      }
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.roleDashboards.modelVersion).toBe('S073-runtime-rules');
    expect(result.prioritizedActionQueue.queueByRole.PM[0].actionId).toBe('A-PM-1');
  });

  it('supports payload roleDashboardRules + unknown role labels + runtime latency/MTTA fallback', () => {
    const payload = {
      roleDashboardModelVersion: '',
      roleDashboardRules: {
        modelVersion: '   ',
        requiredRoles: ['OPS'],
        minActionsPerRole: 1,
        highPriorityThreshold: 90,
        maxHighPriorityOpenPerRole: 2
      },
      roleDashboards: [
        {
          role: 'OPS',
          contextRef: 'ops://context',
          widgets: [{ title: 'Ops board' }]
        }
      ],
      roleActionQueue: [
        {
          title: 'Ops action title',
          role: 'OPS',
          score: 91,
          storyRef: 'ops://story',
          status: 'OPEN'
        }
      ]
    };

    const result = buildRolePersonalizedDashboards(payload, {
      latencySamplesMs: [300, 350, 400, 450],
      mttaSamplesMinutes: [1, 2, 2.5]
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.roleDashboards.modelVersion).toBe('S073-v1');
    expect(result.roleDashboards.roles[0].roleLabel).toBe('OPS');
    expect(result.prioritizedActionQueue.queueByRole.OPS[0].actionId).toBe('role-action-1');
  });

  it('supports payload roleWorkspaceRules source with undefined required role entries', () => {
    const payload = buildS073Payload();
    payload.roleWorkspaceRules = {
      modelVersion: 'S073-payload-workspace',
      requiredRoles: [undefined, 'pm', 'architecte', 'tea', 'ux qa', 'sponsor']
    };
    delete payload.roleDashboardModelVersion;

    const result = buildRolePersonalizedDashboards(payload, {
      nowMs: Date.parse('2026-03-25T09:00:00.000Z')
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.roleDashboards.modelVersion).toBe('S073-payload-workspace');
  });

  it('supports prioritizedActions and actions queue aliases', () => {
    const prioritizedPayload = {
      roleDashboardRules: { requiredRoles: ['PM'] },
      roleDashboards: [{ role: 'PM', contextRef: 'pm://ctx', widgets: [{ title: 'PM board' }] }],
      prioritizedActions: [
        {
          id: 'ACT-PM-P',
          role: 'PM',
          priorityScore: 82,
          summary: 'Prioritized queue alias',
          contextRef: 'pm://action',
          status: 'OPEN',
          ackMinutes: 2
        }
      ],
      roleDashboardLatencySamplesMs: [500, 650, 700],
      ackLatencySamplesMinutes: [1, 2, 3]
    };

    const prioritizedResult = buildRolePersonalizedDashboards(prioritizedPayload);
    expect(prioritizedResult.allowed).toBe(true);
    expect(prioritizedResult.reasonCode).toBe('OK');

    const actionsPayload = {
      roleDashboardRules: { requiredRoles: ['PM'] },
      roleDashboards: [{ role: 'PM', contextRef: 'pm://ctx', widgets: [{ title: 'PM board' }] }],
      actions: [
        {
          id: 'ACT-PM-A',
          role: 'PM',
          priorityScore: 81,
          summary: 'Actions alias',
          contextRef: 'pm://action',
          status: 'OPEN',
          ackMinutes: 2
        }
      ],
      roleDashboardLatencySamplesMs: [500, 650, 700],
      ackLatencySamplesMinutes: [1, 2, 3]
    };

    const actionsResult = buildRolePersonalizedDashboards(actionsPayload);
    expect(actionsResult.allowed).toBe(true);
    expect(actionsResult.reasonCode).toBe('OK');
  });

  it('rejects action queue entries without derived summary', () => {
    const payload = {
      roleDashboardRules: { requiredRoles: ['PM'] },
      roleDashboards: [{ role: 'PM', contextRef: 'pm://ctx', widgets: [{ title: 'PM board' }] }],
      roleActionQueue: [
        {
          role: 'PM',
          priorityScore: 90,
          contextRef: 'pm://action',
          status: 'OPEN',
          ackMinutes: 1
        }
      ],
      roleDashboardLatencySamplesMs: [500, 650, 700],
      ackLatencySamplesMinutes: [1, 2, 3]
    };

    const result = buildRolePersonalizedDashboards(payload);
    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_ROLE_DASHBOARD_INPUT');
  });

  it('rejects action queue entries without any context fallback', () => {
    const payload = {
      roleDashboardRules: { requiredRoles: ['PM'] },
      roleDashboards: [{ role: 'PM', contextRef: 'pm://ctx', widgets: [{ title: 'PM board' }] }],
      roleActionQueue: [
        {
          id: 'ACT-PM-CTX',
          role: 'PM',
          priorityScore: 90,
          summary: 'Missing all contexts',
          status: 'OPEN',
          ackMinutes: 1
        }
      ],
      roleDashboardLatencySamplesMs: [500, 650, 700],
      ackLatencySamplesMinutes: [1, 2, 3]
    };

    const result = buildRolePersonalizedDashboards(payload);
    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('ROLE_ACTION_CONTEXT_REQUIRED');
  });
});
