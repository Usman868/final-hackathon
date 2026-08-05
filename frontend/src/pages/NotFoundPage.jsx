import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-muted px-4 text-center">
      <p className="text-6xl font-bold text-brand-700">404</p>
      <h1 className="mt-2 text-xl font-semibold text-ink-900">Page not found</h1>
      <p className="mt-1 max-w-sm text-sm text-ink-500">
        The page you’re looking for doesn’t exist or was moved.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
      >
        <Home className="h-4 w-4" />
        Go home
      </Link>
    </div>
  );
}
