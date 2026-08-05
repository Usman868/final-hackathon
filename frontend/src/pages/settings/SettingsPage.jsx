import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, User, Shield, Bell, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import toast from 'react-hot-toast';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().max(20).optional().or(z.literal('')),
});

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [prefBusy, setPrefBusy] = useState(false);

  const prefs = user?.notificationPreferences || {};
  const [emailEnabled, setEmailEnabled] = useState(prefs.emailEnabled !== false);
  const [emailIssueAssigned, setEmailIssueAssigned] = useState(
    prefs.emailIssueAssigned !== false
  );
  const [emailIssueStatus, setEmailIssueStatus] = useState(
    prefs.emailIssueStatus !== false
  );
  const [emailMaintenanceDue, setEmailMaintenanceDue] = useState(
    prefs.emailMaintenanceDue !== false
  );
  const [inAppEnabled, setInAppEnabled] = useState(prefs.inAppEnabled !== false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
    },
  });

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      const { data } = await api.patch('/auth/me', {
        name: values.name.trim(),
        phone: values.phone?.trim() || undefined,
      });
      setUser(data.data.user);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const savePrefs = async () => {
    setPrefBusy(true);
    try {
      const { data } = await api.patch('/auth/me', {
        notificationPreferences: {
          emailEnabled,
          emailIssueAssigned,
          emailIssueStatus,
          emailMaintenanceDue,
          inAppEnabled,
        },
      });
      setUser(data.data.user);
      toast.success('Notification preferences saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save preferences');
    } finally {
      setPrefBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Profile and notification preferences.
        </p>
      </div>

      <div className="card flex items-center gap-4 p-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-lg font-semibold text-white">
          {(user?.name || 'U')
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-ink-900">{user?.name}</p>
          <p className="text-sm text-ink-500">{user?.email}</p>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-800">
            <Shield className="h-3 w-3" />
            {user?.role}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <User className="h-4 w-4 text-brand-700" />
          Profile
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Full name</label>
          <input
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
            {...register('name')}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-danger-600">{errors.name.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Phone</label>
          <input
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
            placeholder="Optional"
            {...register('phone')}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">Email</label>
          <input
            disabled
            value={user?.email || ''}
            className="w-full cursor-not-allowed rounded-lg border border-border bg-ink-50 px-3 py-2 text-sm text-ink-500"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Save profile
        </button>
      </form>

      <div className="card space-y-4 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
          <Bell className="h-4 w-4 text-brand-700" />
          Notifications
        </div>
        <Toggle
          label="In-app alerts"
          description="Show notifications in the Alerts page and top bar"
          checked={inAppEnabled}
          onChange={setInAppEnabled}
        />
        <div className="border-t border-border pt-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-ink-800">
            <Mail className="h-4 w-4 text-brand-700" />
            Email notifications
          </div>
          <p className="mb-3 text-xs text-ink-400">
            Requires SMTP on the server. Without SMTP, emails are logged only (dev mode).
          </p>
          <div className="space-y-3">
            <Toggle
              label="Enable email notifications"
              checked={emailEnabled}
              onChange={setEmailEnabled}
            />
            <Toggle
              label="Issue assigned to me"
              checked={emailIssueAssigned}
              onChange={setEmailIssueAssigned}
              disabled={!emailEnabled}
            />
            <Toggle
              label="Issue status changes"
              checked={emailIssueStatus}
              onChange={setEmailIssueStatus}
              disabled={!emailEnabled}
            />
            <Toggle
              label="Maintenance due / overdue"
              checked={emailMaintenanceDue}
              onChange={setEmailMaintenanceDue}
              disabled={!emailEnabled}
            />
          </div>
        </div>
        <button
          type="button"
          disabled={prefBusy}
          onClick={savePrefs}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {prefBusy && <Loader2 className="h-4 w-4 animate-spin" />}
          Save notification settings
        </button>
      </div>
    </div>
  );
}

function Toggle({ label, description, checked, onChange, disabled }) {
  return (
    <label
      className={`flex cursor-pointer items-start justify-between gap-4 ${disabled ? 'opacity-50' : ''}`}
    >
      <div>
        <p className="text-sm font-medium text-ink-800">{label}</p>
        {description && <p className="text-xs text-ink-400">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-brand-600' : 'bg-ink-200'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </label>
  );
}
