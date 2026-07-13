import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, MapPin, Wrench, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { toDateTimeLocalValue } from '../lib/utils';

const SERVICE_TYPES = [
  'AC Repair',
  'Plumbing',
  'Electrical',
  'Appliance Repair',
  'Cleaning',
  'Carpentry',
  'Pest Control',
];

interface NewJob {
  serviceType: string;
  description?: string;
  lat?: number;
  lng?: number;
  scheduledAt?: string;
}
/** Customer form to request a new service job. */
export function RequestServiceForm() {
  const queryClient = useQueryClient();
  const [serviceType, setServiceType] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [locating, setLocating] = useState(false);

  const mutation = useMutation({
    mutationFn: async (payload: NewJob) =>
      (await api.post('/jobs', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', 'jobs'] });
      setServiceType('');
      setDescription('');
      setScheduledAt('');
      setCoords(null);
    },
  });

  function useMyLocation() {
    if (!('geolocation' in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!serviceType) return;
    mutation.mutate({
      serviceType,
      description: description || undefined,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      lat: coords?.lat,
      lng: coords?.lng,
    });
  }

  return (
    <form onSubmit={submit} className="dashboard-panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div><p className="dashboard-eyebrow">Quick booking</p><h2 className="dashboard-title">Request a service</h2><p className="mt-1 text-sm text-slate-500">Tell us what needs attention and we’ll find the right expert.</p></div>
        <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary sm:flex"><Wrench className="h-5 w-5" /></span>
      </div>

      <p className="mt-6 text-sm font-bold text-slate-700" id="service-type-label">
        What do you need?
      </p>
      <div
        className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
        role="group"
        aria-labelledby="service-type-label"
      >
        {SERVICE_TYPES.map((s) => {
          const selected = serviceType === s;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={selected}
              onClick={() => setServiceType(selected ? '' : s)}
              className={`cursor-pointer rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-primary hover:bg-blue-50 hover:text-primary'
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>
      <label htmlFor="service-type" className="mt-4 block text-xs font-bold text-slate-500">
        Something else? Type it here
      </label>
      <input
        id="service-type"
        className="dashboard-input mt-1.5"
        placeholder="e.g. Geyser installation"
        value={SERVICE_TYPES.includes(serviceType) ? '' : serviceType}
        onChange={(e) => setServiceType(e.target.value)}
      />

      <label htmlFor="service-description" className="mt-4 block text-sm font-bold text-slate-700">
        Describe the issue (optional)
      </label>
      <textarea
        id="service-description"
        className="dashboard-input mt-1.5"
        rows={3}
        placeholder="What needs fixing?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <label htmlFor="scheduled-at" className="mt-4 block text-sm font-bold text-slate-700">
        Preferred date and time (optional)
      </label>
      <input
        id="scheduled-at"
        type="datetime-local"
        min={toDateTimeLocalValue(new Date())}
        className="dashboard-input mt-1.5"
        value={scheduledAt}
        onChange={(e) => setScheduledAt(e.target.value)}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={useMyLocation}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-primary hover:text-primary disabled:opacity-50"
          disabled={locating}
        >
          <MapPin className="h-4 w-4" />
          {locating ? 'Locating…' : coords ? 'Location added' : 'Use my location'}
        </button>
        {coords && (
          <span className="text-xs text-gray-500">
            {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </span>
        )}
      </div>

      <button
        type="submit"
        className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 font-bold text-accent-foreground shadow-sm transition hover:bg-orange-700 disabled:opacity-50"
        disabled={!serviceType || mutation.isPending}
      >
        {mutation.isPending ? 'Requesting…' : <>Request service <ArrowRight className="h-4 w-4" /></>}
      </button>

      {mutation.isSuccess && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" /> Service requested!
        </p>
      )}
      {mutation.isError && (
        <p className="mt-2 text-sm text-red-600">
          Could not create the request. Please try again.
        </p>
      )}
    </form>
  );
}
