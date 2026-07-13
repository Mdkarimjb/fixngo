import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  BadgeIndianRupee,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Star,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../lib/api';
import { RoleLayout } from '../components/RoleLayout';
import { JOB_STATUS_STYLES, formatJobStatus, jobStepIndex } from '../lib/utils';
import { JobTracker } from '../components/JobTicket';

interface Job { id: string; serviceType: string; status: string; }
interface TechProfile { id: string; fullName: string; isAvailable: boolean; rating: number; }

const NEXT_STATUS: Record<string, string> = { ASSIGNED: 'ACCEPTED', ACCEPTED: 'ON_SITE', ON_SITE: 'IN_PROGRESS', IN_PROGRESS: 'COMPLETED' };

export function TechnicianHome() {
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ['technician', 'me'], queryFn: async () => (await api.get<TechProfile>('/technicians/me')).data });
  const { data: jobs, isLoading } = useQuery({ queryKey: ['technician', 'jobs'], queryFn: async () => (await api.get<Job[]>('/jobs/assigned')).data });

  const availability = useMutation({ mutationFn: async (isAvailable: boolean) => (await api.patch('/technicians/me/availability', { isAvailable })).data, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['technician', 'me'] }) });
  const updateLocation = useMutation({ mutationFn: async (coords: { lat: number; lng: number }) => (await api.patch('/technicians/me/location', coords)).data });
  const advanceStatus = useMutation({ mutationFn: async ({ id, status }: { id: string; status: string }) => (await api.patch(`/jobs/${id}/status`, { status })).data, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['technician', 'jobs'] }) });

  function shareLocation() {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition((position) => updateLocation.mutate({ lat: position.coords.latitude, lng: position.coords.longitude }));
  }

  const jobList = jobs ?? [];
  const completed = jobList.filter((job) => job.status === 'COMPLETED').length;
  const active = jobList.filter((job) => !['COMPLETED', 'CANCELLED'].includes(job.status)).length;

  return (
    <RoleLayout title="Good morning, Ravi" subtitle="Here is your work plan and performance for today.">
      <section id="overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TechMetric icon={BriefcaseBusiness} label="Today's jobs" value={jobList.length} note={`${active} still active`} tone="blue" />
        <TechMetric icon={CheckCircle2} label="Completed" value={completed} note="Today" tone="green" />
        <TechMetric icon={Star} label="Customer rating" value={profile?.rating?.toFixed(1) ?? '—'} note="Based on recent jobs" tone="amber" />
        <TechMetric icon={BadgeIndianRupee} label="Today's earnings" value="₹2,450" note="₹18,600 this week" tone="violet" />
      </section>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1.45fr_.75fr]">
        <section id="jobs" className="dashboard-panel p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div><p className="dashboard-eyebrow">Assigned work</p><h2 className="dashboard-title">Today's job queue</h2></div>
            <div className="flex items-center gap-2"><span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-primary">{active} active</span><button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Filter jobs</button></div>
          </div>
          {isLoading ? <div className="mt-5 space-y-3">{[0, 1].map((index) => <div key={index} className="h-52 animate-pulse rounded-2xl bg-slate-100" />)}</div> : jobList.length > 0 ? (
            <ul className="mt-5 space-y-4">{jobList.map((job, index) => <TechnicianJob key={job.id} job={job} index={index} isPending={advanceStatus.isPending} onAdvance={(status) => advanceStatus.mutate({ id: job.id, status })} />)}</ul>
          ) : <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center"><CalendarClock className="h-9 w-9 text-slate-300" /><p className="mt-4 font-bold">Your queue is clear</p><p className="mt-1 text-sm text-slate-500">New assigned jobs will appear here automatically.</p></div>}
        </section>

        <aside className="space-y-6">
          <section className="dashboard-panel overflow-hidden">
            <div className="bg-gradient-to-br from-primary to-[#183483] p-5 text-white">
              <div className="flex items-start justify-between"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 font-heading text-xl font-bold">RK</span><span className="flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-100"><span className="h-2 w-2 rounded-full bg-emerald-300" /> {profile?.isAvailable ? 'Online' : 'Offline'}</span></div>
              <h2 className="mt-4 font-heading text-2xl font-bold">{profile?.fullName ?? 'Ravi Kumar'}</h2><p className="mt-1 flex items-center gap-1 text-sm text-blue-100"><ShieldCheck className="h-4 w-4" /> Verified service partner</p>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between"><div><p className="text-sm font-bold">Accept new jobs</p><p className="mt-0.5 text-xs text-slate-500">Control your availability</p></div><button type="button" role="switch" aria-checked={profile?.isAvailable ?? false} onClick={() => availability.mutate(!(profile?.isAvailable ?? false))} disabled={availability.isPending} className={`relative h-7 w-12 rounded-full transition ${profile?.isAvailable ? 'bg-emerald-500' : 'bg-slate-300'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${profile?.isAvailable ? 'left-6' : 'left-1'}`} /></button></div>
              <button onClick={shareLocation} disabled={updateLocation.isPending} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-blue-50 px-4 py-3 text-sm font-bold text-primary hover:bg-blue-100 disabled:opacity-50">{updateLocation.isSuccess ? <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Location updated</> : <><Navigation className="h-4 w-4" />{updateLocation.isPending ? 'Sharing location…' : 'Share live location'}</>}</button>
            </div>
          </section>

          <section id="performance" className="dashboard-panel p-5">
            <div className="flex items-center justify-between"><div><p className="dashboard-eyebrow">Performance</p><h2 className="dashboard-title">This week</h2></div><TrendingUp className="h-6 w-6 text-emerald-600" /></div>
            <div className="mt-5 space-y-4"><Progress label="Acceptance rate" value="96%" width="96%" /><Progress label="On-time arrival" value="92%" width="92%" /><Progress label="Customer satisfaction" value="98%" width="98%" /></div>
            <div className="mt-5 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-800"><strong>Excellent work!</strong> You are in the top 10% of technicians this week.</div>
          </section>
        </aside>
      </div>
    </RoleLayout>
  );
}

function TechnicianJob({ job, index, isPending, onAdvance }: { job: Job; index: number; isPending: boolean; onAdvance: (status: string) => void }) {
  const next = NEXT_STATUS[job.status];
  const times = ['9:30 AM', '11:45 AM', '2:15 PM', '4:30 PM'];
  return <li className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-primary/30 hover:shadow-md sm:p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="flex gap-3"><span className="service-photo service-photo-0 h-14 w-14 shrink-0 rounded-xl" /><div><div className="flex flex-wrap items-center gap-2"><p className="font-heading text-xl font-bold">{job.serviceType}</p><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${JOB_STATUS_STYLES[job.status] ?? 'bg-slate-100 text-slate-600'}`}>{formatJobStatus(job.status)}</span></div><p className="mt-1 text-xs text-slate-500">Job #{job.id.slice(0, 8).toUpperCase()} · {times[index % times.length]}</p></div></div><div className="flex gap-2"><button type="button" aria-label="Call customer" className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:text-primary"><Phone className="h-4 w-4" /></button><button type="button" aria-label="Open directions" className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:text-primary"><MapPin className="h-4 w-4" /></button></div></div><div className="mt-5 rounded-xl bg-slate-50 p-3"><JobTracker current={Math.max(0, jobStepIndex(job.status))} /></div><div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div className="flex items-center gap-2 text-xs text-slate-500"><UserRound className="h-4 w-4" /> Customer location · Guntur</div>{next && <button onClick={() => onAdvance(next)} disabled={isPending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50">Mark {formatJobStatus(next)} <ArrowRight className="h-4 w-4" /></button>}</div></li>;
}

function TechMetric({ icon: Icon, label, value, note, tone }: { icon: LucideIcon; label: string; value: number | string; note: string; tone: 'blue' | 'green' | 'amber' | 'violet' }) {
  const colors = { blue: 'bg-blue-50 text-primary', green: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', violet: 'bg-violet-50 text-violet-600' };
  return <div className="dashboard-panel p-5"><div className="flex items-center justify-between"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors[tone]}`}><Icon className={`h-5 w-5 ${Icon === Star ? 'fill-current' : ''}`} /></span><span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600"><TrendingUp className="h-3.5 w-3.5" /> 8.4%</span></div><p className="mt-5 font-heading text-3xl font-bold">{value}</p><p className="mt-1 text-sm font-bold text-slate-700">{label}</p><p className="mt-1 text-xs text-slate-400">{note}</p></div>;
}

function Progress({ label, value, width }: { label: string; value: string; width: string }) { return <div><div className="flex justify-between text-xs"><span className="font-bold text-slate-600">{label}</span><span className="font-bold text-slate-900">{value}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-primary" style={{ width }} /></div></div>; }
