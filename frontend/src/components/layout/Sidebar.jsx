import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  AlertTriangle,
  Users,
  UserCog,
  FileBarChart,
  Calendar,
  ClipboardList,
  Bell,
  Settings,
  Wrench,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

const navItems = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/assets', label: 'Assets', icon: Boxes },
  { to: '/issues', label: 'Issues', icon: AlertTriangle },
  { to: '/maintenance', label: 'Maintenance', icon: Calendar },
  { to: '/users', label: 'Users', icon: UserCog, roles: ['ADMIN'] },
  { to: '/audit', label: 'Audit log', icon: ClipboardList, roles: ['ADMIN'] },
  { to: '/technicians', label: 'Technicians', icon: Users, roles: ['ADMIN', 'SUPERVISOR'] },
  { to: '/reports', label: 'Reports', icon: FileBarChart, roles: ['ADMIN', 'SUPERVISOR'] },
  { to: '/notifications', label: 'Alerts', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();

  const visible = navItems.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  );

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-ink-900/40 backdrop-blur-[2px] lg:hidden"
          aria-label="Close menu"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface transition-transform duration-200 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand */}
        <div className="flex h-14 items-center justify-between gap-2 border-b border-border px-4 sm:h-16">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white shadow-sm">
              <Wrench className="h-4 w-4" strokeWidth={2.25} />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-ink-900">MaintainIQ</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-ink-400">
                Maintenance
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 lg:hidden"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {visible.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-800'
                    : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn('h-4 w-4 shrink-0', isActive ? 'text-brand-700' : 'text-ink-400')}
                    strokeWidth={isActive ? 2.25 : 2}
                  />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer user strip */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-lg bg-ink-50 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-xs font-semibold text-white">
              {(user?.name || 'U')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-900">{user?.name}</p>
              <p className="truncate text-xs text-ink-500">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
