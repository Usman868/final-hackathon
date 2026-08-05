import { useEffect, useState } from "react";
import { Menu, Bell, Search, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { getUnreadCount } from "../../api/notifications.api";

export default function Topbar({ onMenuClick, title, unreadBump = 0 }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchCount = () => {
      getUnreadCount()
        .then(({ data }) => {
          if (!cancelled) setUnread(data?.data?.count ?? 0);
        })
        .catch(() => {});
    };
    fetchCount();
    const id = setInterval(fetchCount, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (unreadBump > 0) {
      setUnread((c) => c + 1);
    }
  }, [unreadBump]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-surface/95 px-4 backdrop-blur-sm sm:h-16 sm:px-6 lg:px-8">
      {/* Left: menu + optional title */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-800 lg:hidden"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        {title ? (
          <h1 className="hidden text-sm font-semibold text-ink-800 sm:block lg:text-base">
            {title}
          </h1>
        ) : null}
      </div>

      {/* Center: search */}
      <div className="relative mx-3 hidden min-w-0 flex-1 md:block lg:mx-6 xl:mx-8">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          type="search"
          placeholder="Search assets, issues…"
          className="w-full max-w-xl rounded-lg border border-border bg-surface-muted py-2 pl-9 pr-3 text-sm text-ink-800 placeholder:text-ink-400 outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/15 lg:max-w-lg xl:max-w-xl"
        />
      </div>

      {/* Spacer on mobile when search is hidden */}
      <div className="flex-1 md:hidden" />

      {/* Right: notifications · profile · logout */}
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3 lg:gap-4">
        <button
          type="button"
          onClick={() => navigate("/notifications")}
          className="relative rounded-lg p-2.5 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        <div className="hidden items-center gap-2.5 border-l border-border pl-3 sm:flex lg:gap-3 lg:pl-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-semibold text-white">
            {(user?.name || "U")
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="hidden min-w-0 text-left lg:block">
            <p className="max-w-[10rem] truncate text-xs font-medium text-ink-900">
              {user?.name}
            </p>
            <p className="text-[10px] text-ink-500">{user?.role}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-2.5 py-2 text-ink-600 hover:bg-ink-50 hover:text-ink-900 sm:px-3"
          title="Log out"
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="hidden text-xs font-medium xl:inline">Log out</span>
        </button>
      </div>
    </header>
  );
}
