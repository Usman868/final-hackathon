import { cn } from '../../utils/cn';
import {
  ASSET_STATUS_COLORS,
  ISSUE_STATUS_COLORS,
  PRIORITY_COLORS,
} from '../../constants';

export function AssetStatusBadge({ status, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        ASSET_STATUS_COLORS[status] || 'bg-ink-100 text-ink-600 ring-ink-500/20',
        className
      )}
    >
      {status}
    </span>
  );
}

export function IssueStatusBadge({ status, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        ISSUE_STATUS_COLORS[status] || 'bg-ink-100 text-ink-600 ring-ink-500/20',
        className
      )}
    >
      {status}
    </span>
  );
}

export function PriorityBadge({ priority, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        PRIORITY_COLORS[priority] || 'bg-ink-100 text-ink-600 ring-ink-500/20',
        className
      )}
    >
      {priority}
    </span>
  );
}
