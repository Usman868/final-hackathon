import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { createAsset, getAssetById, updateAsset } from '../../api/assets.api';
import { ASSET_CATEGORIES, ASSET_STATUS } from '../../constants';
import toast from 'react-hot-toast';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  category: z.string().min(1, 'Category is required'),
  location: z.string().min(1, 'Location is required').max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  model: z.string().max(100).optional().or(z.literal('')),
  manufacturer: z.string().max(100).optional().or(z.literal('')),
  condition: z.string().optional(),
  status: z.string().optional(),
  nextServiceDate: z.string().optional().or(z.literal('')),
  lastServiceDate: z.string().optional().or(z.literal('')),
});

const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'];

export default function AssetFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [loadingAsset, setLoadingAsset] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      category: '',
      location: '',
      description: '',
      model: '',
      manufacturer: '',
      condition: 'Good',
      status: 'Operational',
      nextServiceDate: '',
      lastServiceDate: '',
    },
  });

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const { data } = await getAssetById(id);
        const a = data.data.asset;
        reset({
          name: a.name || '',
          category: a.category || '',
          location: a.location || '',
          description: a.description || '',
          model: a.model || '',
          manufacturer: a.manufacturer || '',
          condition: a.condition || 'Good',
          status: a.status || 'Operational',
          nextServiceDate: a.nextServiceDate
            ? a.nextServiceDate.slice(0, 10)
            : '',
          lastServiceDate: a.lastServiceDate
            ? a.lastServiceDate.slice(0, 10)
            : '',
        });
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load asset');
        navigate('/assets');
      } finally {
        setLoadingAsset(false);
      }
    })();
  }, [id, isEdit, navigate, reset]);

  const onSubmit = async (values) => {
    setSubmitting(true);
    const payload = {
      ...values,
      description: values.description || undefined,
      model: values.model || undefined,
      manufacturer: values.manufacturer || undefined,
      nextServiceDate: values.nextServiceDate || undefined,
      lastServiceDate: values.lastServiceDate || undefined,
    };
    try {
      if (isEdit) {
        await updateAsset(id, payload);
        toast.success('Asset updated');
        navigate(`/assets/${id}`);
      } else {
        const { data } = await createAsset(payload);
        toast.success('Asset created with QR');
        navigate(`/assets/${data.data.asset._id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingAsset) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link
          to={isEdit ? `/assets/${id}` : '/assets'}
          className="mb-2 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">
          {isEdit ? 'Edit asset' : 'Create new asset'}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {isEdit
            ? 'Asset code and public QR mapping stay fixed.'
            : 'A unique code and public QR URL are generated automatically.'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5 p-5 sm:p-6">
        <Field label="Asset name *" error={errors.name}>
          <input
            className={inputCls}
            placeholder="e.g. Classroom Projector 01"
            {...register('name')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category *" error={errors.category}>
            <select className={inputCls} {...register('category')}>
              <option value="">Select category</option>
              {ASSET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Location *" error={errors.location}>
            <input
              className={inputCls}
              placeholder="Building A – Room 101"
              {...register('location')}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Model">
            <input className={inputCls} {...register('model')} />
          </Field>
          <Field label="Manufacturer">
            <input className={inputCls} {...register('manufacturer')} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Condition">
            <select className={inputCls} {...register('condition')}>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputCls} {...register('status')}>
              {Object.values(ASSET_STATUS).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Last service">
            <input type="date" className={inputCls} {...register('lastServiceDate')} />
          </Field>
          <Field label="Next service">
            <input type="date" className={inputCls} {...register('nextServiceDate')} />
          </Field>
        </div>

        <Field label="Description">
          <textarea
            rows={3}
            className={inputCls}
            placeholder="Optional notes (not shown on public page if sensitive)"
            {...register('description')}
          />
        </Field>

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Save changes' : 'Create asset'}
          </button>
          <Link
            to={isEdit ? `/assets/${id}` : '/assets'}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15';

function Field({ label, error, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-danger-600">{error.message}</p>}
    </div>
  );
}
