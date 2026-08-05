export const ROLES = {
  ADMIN: 'ADMIN',
  TECHNICIAN: 'TECHNICIAN',
  SUPERVISOR: 'SUPERVISOR',
};

export const ASSET_STATUS = {
  OPERATIONAL: 'Operational',
  ISSUE_REPORTED: 'Issue Reported',
  UNDER_INSPECTION: 'Under Inspection',
  UNDER_MAINTENANCE: 'Under Maintenance',
  OUT_OF_SERVICE: 'Out Of Service',
  RETIRED: 'Retired',
};

export const ISSUE_STATUS = {
  REPORTED: 'Reported',
  ASSIGNED: 'Assigned',
  INSPECTION_STARTED: 'Inspection Started',
  MAINTENANCE_IN_PROGRESS: 'Maintenance In Progress',
  WAITING_FOR_PARTS: 'Waiting For Parts',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
};


export const ISSUE_STATUS_TRANSITIONS = {
  [ISSUE_STATUS.REPORTED]: [ISSUE_STATUS.ASSIGNED, ISSUE_STATUS.CLOSED],
  [ISSUE_STATUS.ASSIGNED]: [ISSUE_STATUS.INSPECTION_STARTED, ISSUE_STATUS.REPORTED],
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
  [ISSUE_STATUS.REOPENED]: [ISSUE_STATUS.ASSIGNED, ISSUE_STATUS.INSPECTION_STARTED],
};

export const PRIORITY = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

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

export const ASSET_STATUS_COLORS = {
  [ASSET_STATUS.OPERATIONAL]: 'bg-emerald-50 text-emerald-800 ring-emerald-600/15',
  [ASSET_STATUS.ISSUE_REPORTED]: 'bg-amber-50 text-amber-800 ring-amber-600/15',
  [ASSET_STATUS.UNDER_INSPECTION]: 'bg-sky-50 text-sky-800 ring-sky-600/15',
  [ASSET_STATUS.UNDER_MAINTENANCE]: 'bg-violet-50 text-violet-800 ring-violet-600/15',
  [ASSET_STATUS.OUT_OF_SERVICE]: 'bg-red-50 text-red-800 ring-red-600/15',
  [ASSET_STATUS.RETIRED]: 'bg-slate-100 text-slate-600 ring-slate-500/15',
};

export const ISSUE_STATUS_COLORS = {
  [ISSUE_STATUS.REPORTED]: 'bg-amber-50 text-amber-800 ring-amber-600/15',
  [ISSUE_STATUS.ASSIGNED]: 'bg-sky-50 text-sky-800 ring-sky-600/15',
  [ISSUE_STATUS.INSPECTION_STARTED]: 'bg-cyan-50 text-cyan-800 ring-cyan-600/15',
  [ISSUE_STATUS.MAINTENANCE_IN_PROGRESS]: 'bg-violet-50 text-violet-800 ring-violet-600/15',
  [ISSUE_STATUS.WAITING_FOR_PARTS]: 'bg-orange-50 text-orange-800 ring-orange-600/15',
  [ISSUE_STATUS.RESOLVED]: 'bg-emerald-50 text-emerald-800 ring-emerald-600/15',
  [ISSUE_STATUS.CLOSED]: 'bg-slate-100 text-slate-600 ring-slate-500/15',
  [ISSUE_STATUS.REOPENED]: 'bg-rose-50 text-rose-800 ring-rose-600/15',
};

export const PRIORITY_COLORS = {
  [PRIORITY.LOW]: 'bg-slate-100 text-slate-600 ring-slate-500/15',
  [PRIORITY.MEDIUM]: 'bg-sky-50 text-sky-800 ring-sky-600/15',
  [PRIORITY.HIGH]: 'bg-amber-50 text-amber-800 ring-amber-600/15',
  [PRIORITY.CRITICAL]: 'bg-red-50 text-red-800 ring-red-600/15',
};

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
