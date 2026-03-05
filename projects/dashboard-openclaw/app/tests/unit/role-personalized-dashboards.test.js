import { describe, expect, it } from 'vitest';
import { buildRolePersonalizedDashboards } from '../../src/role-personalized-dashboards.js';
import { buildRolePersonalizedDashboards as buildFromIndex } from '../../src/index.js';
import { buildS073Payload } from '../fixtures/role-s073-payload.js';

describe('role-personalized-dashboards unit', () => {
  it('builds role dashboards + contextual action queue for PM/Architect/TEA/UXQA/Sponsor', () => {
    const result = buildRolePersonalizedDashboards(buildS073Payload(), {
      nowMs: Date.parse('2026-03-25T09:00:00.000Z')
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.roleDashboards).toMatchObject({
      model: 'ROLE_PERSONALIZED_DASHBOARDS',
      modelVersion: 'S073-v1',
      performance: {
        budgetCompliant: true
      },
      reliability: {
        budgetCompliant: true
      }
    });
    expect(result.roleDashboards.roles).toHaveLength(5);
    expect(result.prioritizedActionQueue.summary.totalActions).toBe(10);
    expect(result.prioritizedActionQueue.queueByRole.PM[0].actionId).toBe('ACT-PM-001');
  });

  it('fails when one required role dashboard is missing', () => {
    const payload = buildS073Payload();
    payload.roleDashboards = payload.roleDashboards.filter((entry) => String(entry.role).toUpperCase() !== 'SPONSOR');

    const result = buildRolePersonalizedDashboards(payload, {
      nowMs: Date.parse('2026-03-25T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('ROLE_DASHBOARD_REQUIRED_ROLES_MISSING');
  });

  it('fails when an action is missing contextual reference', () => {
    const payload = buildS073Payload();
    payload.roleActionQueue[0].contextRef = '';

    const result = buildRolePersonalizedDashboards(payload, {
      nowMs: Date.parse('2026-03-25T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('ROLE_ACTION_CONTEXT_REQUIRED');
  });

  it('fails when latency p95 exceeds NFR-010 budget', () => {
    const payload = buildS073Payload();
    payload.latencySamplesMs = [800, 900, 1000, 1200, 2100, 2300, 2600];

    const result = buildRolePersonalizedDashboards(payload, {
      nowMs: Date.parse('2026-03-25T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('ROLE_DASHBOARD_P95_LATENCY_BUDGET_EXCEEDED');
  });

  it('fails when MTTA p90 exceeds NFR-017 budget', () => {
    const payload = buildS073Payload();
    payload.mttaSamplesMinutes = [5, 7, 9, 11, 12, 14];

    const result = buildRolePersonalizedDashboards(payload, {
      nowMs: Date.parse('2026-03-25T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('ROLE_DASHBOARD_MTTA_BUDGET_EXCEEDED');
  });

  it('is exported from index', () => {
    const result = buildFromIndex(buildS073Payload(), {
      nowMs: Date.parse('2026-03-25T09:00:00.000Z')
    });

    expect(result.reasonCode).toBe('OK');
  });
});
