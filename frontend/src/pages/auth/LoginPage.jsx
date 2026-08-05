import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../context/AuthContext';
import {
  Wrench,
  Eye,
  EyeOff,
  Loader2,
  QrCode,
  Bell,
  Sparkles,
  History,
} from 'lucide-react';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-surface-muted">
      <div className="flex w-full flex-col justify-center px-5 py-10 sm:px-8 lg:w-[48%] lg:px-12 xl:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white">
              <Wrench className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-ink-900">MaintainIQ</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            Sign in to manage assets, issues, and maintenance history.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@maintainiq.demo"
                className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-ink-900 shadow-sm outline-none transition placeholder:text-ink-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-danger-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 pr-10 text-sm text-ink-900 shadow-sm outline-none transition placeholder:text-ink-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-400 hover:text-ink-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-danger-600">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-border bg-ink-50/80 px-4 py-3 text-xs text-ink-600">
            <p className="font-semibold text-ink-700">Demo accounts</p>
            <p className="mt-1">admin@maintainiq.demo · tech1@maintainiq.demo</p>
            <p>
              Password: <span className="font-mono">Demo@12345</span>
            </p>
          </div>

          <p className="mt-8 text-center text-xs text-ink-400">
            Public asset pages do not require login — scan a QR to report an issue.
          </p>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-brand-900 lg:flex lg:w-[52%] lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 30%, #5eead4 0%, transparent 45%), radial-gradient(circle at 80% 70%, #14b8a6 0%, transparent 40%)',
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/20">
              <Wrench className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-white">MaintainIQ</span>
          </div>

          <h2 className="mt-12 max-w-md text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
            Smarter maintenance.
            <br />
            Clearer history.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-brand-100/90">
            QR-linked assets, AI issue triage, controlled workflows, and a permanent
            service timeline — built for facilities teams.
          </p>

          <ul className="mt-10 space-y-4">
            {[
              { icon: QrCode, text: 'QR code asset tracking' },
              { icon: Bell, text: 'Real-time issue updates' },
              { icon: Sparkles, text: 'AI-powered triage' },
              { icon: History, text: 'Complete maintenance history' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-brand-50">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-brand-200/70">
          Staff access only. Reporters use the public asset page — no account required.
        </p>
      </div>
    </div>
  );
}
