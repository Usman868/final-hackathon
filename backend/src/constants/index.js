/**
 * MaintainIQ – Shared Constants
 * Single source of truth for statuses, roles, categories, etc.
 */

export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  TECHNICIAN: 'TECHNICIAN',
  SUPERVISOR: 'SUPERVISOR',
  // PUBLIC_REPORTER never logs in – only used conceptually
});

export const ASSET_STATUS = Object.freeze({
  OPERATIONAL: 'Operational',
  ISSUE_REPORTED: 'Issue Reported',
  UNDER_INSPECTION: 'Under Inspection',
  UNDER_MAINTENANCE: 'Under Maintenance',
  OUT_OF_SERVICE: 'Out Of Service',
  RETIRED: 'Retired',
});

export const ISSUE_STATUS = Object.freeze({
  REPORTED: 'Reported',
  ASSIGNED: 'Assigned',
  INSPECTION_STARTED: 'Inspection Started',
  MAINTENANCE_IN_PROGRESS: 'Maintenance In Progress',
  WAITING_FOR_PARTS: 'Waiting For Parts',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
});

/**
 * Allowed status transitions for issues.
 * Key = current status, value = array of allowed next statuses.
 */
export const ISSUE_STATUS_TRANSITIONS = Object.freeze({
  [ISSUE_STATUS.REPORTED]: [ISSUE_STATUS.ASSIGNED, ISSUE_STATUS.CLOSED],
  [ISSUE_STATUS.ASSIGNED]: [
    ISSUE_STATUS.INSPECTION_STARTED,
    ISSUE_STATUS.REPORTED, // un-assign
  ],
  [ISSUE_STATUS.INSPECTION_STARTED]: [
    ISSUE_STATUS.MAINTENANCE_IN_PROGRESS,
    ISSUE_STATUS.WAITING_FOR_PARTS,
    ISSUE_STATUS.RESOLVED,
  ],
  [ISSUE_STATUS.MAINTENANCE_IN_PROGRESS]: [
    ISSUE_STATUS.WAITING_FOR_PARTS,
    ISSUE_STATUS.RESOLVED,
  ],
  [ISSUE_STATUS.WAITING_FOR_PARTS]: [
    ISSUE_STATUS.MAINTENANCE_IN_PROGRESS,
    ISSUE_STATUS.RESOLVED,
  ],
  [ISSUE_STATUS.RESOLVED]: [ISSUE_STATUS.CLOSED, ISSUE_STATUS.REOPENED],
  [ISSUE_STATUS.CLOSED]: [ISSUE_STATUS.REOPENED],
  [ISSUE_STATUS.REOPENED]: [
    ISSUE_STATUS.ASSIGNED,
    ISSUE_STATUS.INSPECTION_STARTED,
  ],
});

/**
 * Asset status updates driven by issue events.
 */
export const ASSET_STATUS_ON_EVENT = Object.freeze({
  ISSUE_SUBMITTED: ASSET_STATUS.ISSUE_REPORTED,
  INSPECTION_STARTED: ASSET_STATUS.UNDER_INSPECTION,
  MAINTENANCE_STARTED: ASSET_STATUS.UNDER_MAINTENANCE,
  MAINTENANCE_COMPLETED: ASSET_STATUS.OPERATIONAL,
  CRITICAL_SAFETY: ASSET_STATUS.OUT_OF_SERVICE,
  RETIRED: ASSET_STATUS.RETIRED,
});

export const SLA_HOURS_BY_PRIORITY = Object.freeze({
  Critical: 4,
  High: 24,
  Medium: 72,
  Low: 168,
});

export const PRIORITY = Object.freeze({
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
});

export const ASSET_CONDITION = Object.freeze({
  EXCELLENT: 'Excellent',
  GOOD: 'Good',
  FAIR: 'Fair',
  POOR: 'Poor',
  CRITICAL: 'Critical',
});

export const ASSET_CATEGORIES = [
  'Electronics',
  'HVAC',
  'Plumbing',
  'Electrical',
  'Furniture',
  'IT Equipment',
  'Laboratory',
  'Medical',
  'Kitchen',
  'Safety',
  'Vehicles',
  'Other',
];

export const ISSUE_CATEGORIES = [
  'Hardware Failure',
  'Software / Firmware',
  'Leakage / Performance',
  'Electrical',
  'Mechanical',
  'Connectivity',
  'Safety Hazard',
  'Cosmetic',
  'Preventive',
  'Other',
];

export const HISTORY_ACTIONS = Object.freeze({
  ASSET_CREATED: 'ASSET_CREATED',
  ASSET_UPDATED: 'ASSET_UPDATED',
  ASSET_STATUS_CHANGED: 'ASSET_STATUS_CHANGED',
  ASSET_RETIRED: 'ASSET_RETIRED',
  ISSUE_REPORTED: 'ISSUE_REPORTED',
  ISSUE_ASSIGNED: 'ISSUE_ASSIGNED',
  ISSUE_STATUS_CHANGED: 'ISSUE_STATUS_CHANGED',
  INSPECTION_STARTED: 'INSPECTION_STARTED',
  MAINTENANCE_PERFORMED: 'MAINTENANCE_PERFORMED',
  ISSUE_RESOLVED: 'ISSUE_RESOLVED',
  ISSUE_CLOSED: 'ISSUE_CLOSED',
  ISSUE_REOPENED: 'ISSUE_REOPENED',
  EVIDENCE_UPLOADED: 'EVIDENCE_UPLOADED',
  PARTS_REPLACED: 'PARTS_REPLACED',
  SERVICE_SCHEDULED: 'SERVICE_SCHEDULED',
  AI_TRIAGE_APPLIED: 'AI_TRIAGE_APPLIED',
});

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
};

export default {
  ROLES,
  ASSET_STATUS,
  ISSUE_STATUS,
  ISSUE_STATUS_TRANSITIONS,
  ASSET_STATUS_ON_EVENT,
  PRIORITY,
  SLA_HOURS_BY_PRIORITY,
  ASSET_CONDITION,
  ASSET_CATEGORIES,
  ISSUE_CATEGORIES,
  HISTORY_ACTIONS,
  COOKIE_OPTIONS,
};
