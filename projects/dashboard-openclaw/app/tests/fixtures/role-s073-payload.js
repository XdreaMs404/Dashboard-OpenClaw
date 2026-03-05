export function buildS073Payload() {
  return {
    window: 'story',
    windowRef: 'S073',
    roleDashboardModelVersion: 'S073-v1',
    roleDashboards: [
      {
        role: 'PM',
        dashboardId: 'pm-dashboard',
        title: 'Dashboard PM',
        contextRef: 'gate://G2/phase-notify',
        widgets: [
          { id: 'pm-actions', title: 'Actions PM prioritaires', sourceRef: 'proof://pm/actions' },
          { id: 'pm-risks', title: 'Risques actifs PM', sourceRef: 'proof://pm/risks' }
        ]
      },
      {
        role: 'Architecte',
        dashboardId: 'architect-dashboard',
        title: 'Dashboard Architecte',
        contextRef: 'gate://G3/readiness',
        widgets: [
          { id: 'arch-readiness', title: 'Readiness solutioning', sourceRef: 'proof://architect/readiness' },
          { id: 'arch-debt', title: 'Dette technique structurante', sourceRef: 'proof://architect/debt' }
        ]
      },
      {
        role: 'TEA',
        dashboardId: 'tea-dashboard',
        title: 'Dashboard TEA',
        contextRef: 'gate://G4T/quality',
        widgets: [
          { id: 'tea-coverage', title: 'Couverture globale', sourceRef: 'proof://tea/coverage' },
          { id: 'tea-regressions', title: 'Régressions techniques', sourceRef: 'proof://tea/regressions' }
        ]
      },
      {
        role: 'UX QA',
        dashboardId: 'uxqa-dashboard',
        title: 'Dashboard UX QA',
        contextRef: 'gate://G4UX/evidence',
        widgets: [
          { id: 'uxqa-responsive', title: 'Responsive 3 breakpoints', sourceRef: 'proof://uxqa/responsive' },
          { id: 'uxqa-a11y', title: 'Conformité a11y AA', sourceRef: 'proof://uxqa/a11y' }
        ]
      },
      {
        role: 'Sponsor',
        dashboardId: 'sponsor-dashboard',
        title: 'Dashboard Sponsor',
        contextRef: 'gate://G5/executive',
        widgets: [
          { id: 'sponsor-kpi', title: 'KPI collaboration', sourceRef: 'proof://sponsor/kpi' },
          { id: 'sponsor-ack', title: 'SLA ACK critiques', sourceRef: 'proof://sponsor/ack' }
        ]
      }
    ],
    roleActionQueue: [
      {
        id: 'ACT-PM-001',
        role: 'PM',
        priorityScore: 96,
        summary: 'Publier notification de fin de phase G2 en < 5 min.',
        contextRef: 'phase://G2/notify',
        status: 'OPEN',
        ackMinutes: 4
      },
      {
        id: 'ACT-PM-002',
        role: 'PM',
        priorityScore: 82,
        summary: 'Clarifier les handoffs en attente sur E07.',
        contextRef: 'handoff://E07/pending',
        status: 'OPEN',
        ackMinutes: 6
      },
      {
        id: 'ACT-ARCH-001',
        role: 'ARCHITECT',
        priorityScore: 94,
        summary: 'Valider cohérence PRD/archi sur sprint courant.',
        contextRef: 'architecture://readiness/check',
        status: 'OPEN',
        ackMinutes: 5
      },
      {
        id: 'ACT-ARCH-002',
        role: 'ARCHITECT',
        priorityScore: 79,
        summary: 'Réduire dette structurelle identifiée en revue.',
        contextRef: 'architecture://debt/structural',
        status: 'RESOLVED',
        ackMinutes: 7
      },
      {
        id: 'ACT-TEA-001',
        role: 'TEA',
        priorityScore: 93,
        summary: 'Vérifier couverture branches globale >= 85%.',
        contextRef: 'quality://coverage/branches',
        status: 'OPEN',
        ackMinutes: 6
      },
      {
        id: 'ACT-TEA-002',
        role: 'TEA',
        priorityScore: 78,
        summary: 'Confirmer non-régression sur quality gates rapides.',
        contextRef: 'quality://fast-gates/non-regression',
        status: 'OPEN',
        ackMinutes: 8
      },
      {
        id: 'ACT-UXQA-001',
        role: 'UX QA',
        priorityScore: 95,
        summary: 'Vérifier preuves responsive + 4 états UI.',
        contextRef: 'ux://responsive/four-states',
        status: 'OPEN',
        ackMinutes: 5
      },
      {
        id: 'ACT-UXQA-002',
        role: 'UXQA',
        priorityScore: 81,
        summary: 'Valider microcopy et focus visible clavier.',
        contextRef: 'ux://microcopy/focus',
        status: 'OPEN',
        ackMinutes: 7
      },
      {
        id: 'ACT-SPONSOR-001',
        role: 'Sponsor',
        priorityScore: 92,
        summary: 'Revue des KPI collaboration/notifications critiques.',
        contextRef: 'sponsor://kpi/collaboration',
        status: 'OPEN',
        ackMinutes: 6
      },
      {
        id: 'ACT-SPONSOR-002',
        role: 'SPONSOR',
        priorityScore: 74,
        summary: 'Valider plan anti-fatigue notifications.',
        contextRef: 'sponsor://notifications/fatigue-plan',
        status: 'RESOLVED',
        ackMinutes: 9
      }
    ],
    latencySamplesMs: [410, 520, 640, 760, 880, 1030, 1240, 1450, 1620, 1880],
    mttaSamplesMinutes: [2.5, 3.2, 4.1, 5.4, 6, 6.8, 7.1, 8.2, 9.4]
  };
}
