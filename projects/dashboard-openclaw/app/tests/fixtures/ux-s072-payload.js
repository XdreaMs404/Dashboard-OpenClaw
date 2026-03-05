import { buildS071Payload } from './ux-s071-payload.js';

export function buildS072Payload() {
  const payload = buildS071Payload();

  payload.windowRef = 'S072';
  payload.uxRegressionModelVersion = 'S072-v1';

  payload.uxRegressionRecords = [
    {
      id: 'REG-EMPTY-MOBILE',
      state: 'empty',
      viewport: 'mobile',
      verdict: 'PASS',
      subgate: 'designSystemCompliance',
      status: 'RESOLVED',
      severity: 'MINOR',
      evidenceRefs: ['s072-empty-mobile.png', 's072-empty-mobile.json']
    },
    {
      id: 'REG-LOADING-TABLET',
      state: 'loading',
      viewport: 'tablet',
      verdict: 'CONCERNS',
      subgate: 'accessibilityAA',
      status: 'OPEN',
      severity: 'MAJOR',
      evidenceRefs: ['s072-loading-tablet.png']
    },
    {
      id: 'REG-ERROR-DESKTOP',
      state: 'error',
      viewport: 'desktop',
      verdict: 'FAIL',
      subgate: 'responsiveCoverage',
      status: 'OPEN',
      severity: 'MAJOR',
      evidenceRefs: ['s072-error-desktop.png']
    },
    {
      id: 'REG-SUCCESS-MOBILE',
      state: 'success',
      viewport: 'mobile',
      verdict: 'PASS',
      subgate: 'interactionStates',
      status: 'RESOLVED',
      severity: 'MINOR',
      evidenceRefs: ['s072-success-mobile.png']
    },
    {
      id: 'REG-LOADING-DESKTOP',
      state: 'loading',
      viewport: 'desktop',
      verdict: 'CONCERNS',
      subgate: 'visualHierarchy',
      status: 'OPEN',
      severity: 'MAJOR',
      evidenceRefs: ['s072-loading-desktop.png']
    },
    {
      id: 'REG-SUCCESS-TABLET',
      state: 'success',
      viewport: 'tablet',
      verdict: 'PASS',
      subgate: 'perceivedPerformance',
      status: 'RESOLVED',
      severity: 'MINOR',
      evidenceRefs: ['s072-success-tablet.png']
    }
  ];

  return payload;
}
