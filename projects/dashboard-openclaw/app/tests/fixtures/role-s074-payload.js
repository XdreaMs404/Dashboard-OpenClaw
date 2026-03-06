import { buildS073Payload } from './role-s073-payload.js';

export function buildS074Payload() {
  const payload = buildS073Payload();

  payload.windowRef = 'S074';
  payload.priorityQueueModelVersion = 'S074-v1';

  payload.notificationCenter = [
    {
      id: 'NOTIF-CRIT-001',
      role: 'PM',
      severity: 'critical',
      priorityScore: 97,
      summary: 'Incident critique gate G2 à notifier immédiatement.',
      contextRef: 'gate://G2/incident-critique',
      status: 'OPEN',
      ackMinutes: 4,
      decisionLatencySeconds: 52
    },
    {
      id: 'NOTIF-CRIT-002',
      role: 'ARCHITECT',
      severity: 'CRITICAL',
      priorityScore: 93,
      summary: 'Risque architecture bloquant à arbitrer.',
      contextRef: 'gate://G3/architecture-risk',
      status: 'OPEN',
      ackMinutes: 6,
      decisionLatencySeconds: 61
    },
    {
      id: 'NOTIF-HIGH-001',
      role: 'TEA',
      severity: 'high',
      priorityScore: 88,
      summary: 'Couverture branches proche du seuil global.',
      contextRef: 'quality://coverage/branches',
      status: 'OPEN',
      ackMinutes: 7,
      decisionLatencySeconds: 72
    },
    {
      id: 'NOTIF-HIGH-002',
      role: 'UXQA',
      severity: 'HIGH',
      priorityScore: 86,
      summary: 'Validation responsive en attente sur desktop.',
      contextRef: 'ux://responsive/desktop',
      status: 'RESOLVED',
      ackMinutes: 8,
      decisionLatencySeconds: 79
    },
    {
      id: 'NOTIF-MED-001',
      role: 'SPONSOR',
      severity: 'medium',
      priorityScore: 76,
      summary: 'Revue KPI collaboration hebdomadaire.',
      contextRef: 'sponsor://kpi/collaboration',
      status: 'OPEN',
      ackMinutes: 9,
      decisionLatencySeconds: 82
    },
    {
      id: 'NOTIF-MED-002',
      role: 'PM',
      severity: 'MEDIUM',
      priorityScore: 72,
      summary: 'Mise à jour backlog actions contextualisées.',
      contextRef: 'backlog://role-actions/s074',
      status: 'OPEN',
      ackMinutes: 6,
      decisionLatencySeconds: 74
    },
    {
      id: 'NOTIF-LOW-001',
      role: 'TEA',
      severity: 'low',
      priorityScore: 64,
      summary: 'Optimisation secondaire de reporting quality.',
      contextRef: 'quality://reporting/secondary',
      status: 'RESOLVED',
      ackMinutes: 5,
      decisionLatencySeconds: 68
    },
    {
      id: 'NOTIF-LOW-002',
      role: 'SPONSOR',
      severity: 'LOW',
      priorityScore: 58,
      summary: 'Amélioration cosmétique du dashboard sponsor.',
      contextRef: 'sponsor://dashboard/cosmetic',
      status: 'OPEN',
      ackMinutes: 7,
      decisionLatencySeconds: 65
    }
  ];

  payload.criticalDecisionSamplesSec = [44, 52, 61, 67, 74, 81, 85];
  payload.notificationMttaSamplesMinutes = [3.5, 4.2, 5.1, 6.4, 7.2, 8.1, 9.3];

  return payload;
}
