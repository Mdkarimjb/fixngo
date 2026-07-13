import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  PackageSearch,
  Plus,
  ShieldCheck,
  Tag,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../lib/api';
import { RoleLayout } from '../components/RoleLayout';
import { RequestServiceForm } from '../components/RequestServiceForm';
import { SellProductForm } from '../components/SellProductForm';
import { JobTicket } from '../components/JobTicket';

interface Job { id: string; serviceType: string; status: string; createdAt: string; }
interface Listing { id: string; title: string; pricePaise: number; sold: boolean; }

export function CustomerHome() {
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['customer', 'jobs'],
    queryFn: async () => (await api.get<Job[]>('/jobs/mine')).data,
  });
  const { data: listings, isLoading: listingsLoading } = useQuery({
    queryKey: ['customer', 'listings'],
    queryFn: async () => (await api.get<Listing[]>('/customers/listings')).data,
  });

  const jobList = jobs ?? [];
  const activeJobs = jobList.filter((job) => !['COMPLETED', 'CANCELLED'].includes(job.status)).length;
  const completedJobs = jobList.filter((job) => job.status === 'COMPLETED').length;
  const listingList = listings ?? [];

  return (
    <RoleLayout title="Welcome back, Vijay" subtitle="Book, track and manage every home service from one place.">
      <div id="overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Clock3} label="Active bookings" value={activeJobs} hint="Track live status" tone="blue" />
        <Metric icon={CheckCircle2} label="Services completed" value={completedJobs} hint="All-time bookings" tone="green" />
        <Metric icon={Tag} label="Marketplace listings" value={listingList.length} hint="Your active items" tone="violet" />
        <Metric icon={WalletCards} label="Rewards saved" value="₹1,240" hint="Across FixNGo services" tone="orange" />
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1.45fr_.75fr]">
        <div className="space-y-6">
          <section id="new-service"><RequestServiceForm /></section>
          <section id="bookings" className="dashboard-panel p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div><p className="dashboard-eyebrow">Bookings</p><h2 className="dashboard-title">Your service activity</h2></div>
              <button type="button" className="hidden items-center gap-1 text-sm font-bold text-primary sm:flex">View history <ArrowRight className="h-4 w-4" /></button>
            </div>
            {jobsLoading ? <SkeletonList /> : jobList.length > 0 ? (
              <ul className="mt-5 grid gap-4 2xl:grid-cols-2">{jobList.map((job) => <JobTicket key={job.id} job={job} />)}</ul>
            ) : <EmptyState icon={ClipboardList} title="No bookings yet" text="Choose a service above and your booking will appear here with live tracking." action="Book your first service" />}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="overflow-hidden rounded-2xl bg-primary text-white shadow-lg shadow-blue-900/10">
            <div className="service-photo service-photo-3 h-40" />
            <div className="p-5"><span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">This week</span><h2 className="mt-3 font-heading text-2xl font-bold">Deep-clean your home</h2><p className="mt-2 text-sm leading-6 text-blue-100">Professional cleaning from ₹399 with verified experts and safe products.</p><a href="#new-service" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white">Book cleaning <ArrowRight className="h-4 w-4" /></a></div>
          </section>

          <section className="dashboard-panel p-5">
            <p className="dashboard-eyebrow">Your benefits</p><h2 className="dashboard-title">FixNGo protection</h2>
            <div className="mt-5 space-y-4">
              {[['30-day service warranty', 'We return and resolve covered issues.'], ['Verified professionals', 'Every expert is trained and background-checked.'], ['Pay after service', 'UPI, cards and cash accepted.']].map(([title, text]) => <div key={title} className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><ShieldCheck className="h-5 w-5" /></span><div><p className="text-sm font-bold">{title}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{text}</p></div></div>)}
            </div>
          </section>
        </aside>
      </div>

      <section id="marketplace" className="mt-6 grid items-start gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <SellProductForm />
        <div className="dashboard-panel p-5 sm:p-6">
          <div className="flex items-center justify-between"><div><p className="dashboard-eyebrow">Marketplace</p><h2 className="dashboard-title">My listings</h2></div><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">{listingList.length} items</span></div>
          {listingsLoading ? <SkeletonList /> : listingList.length > 0 ? (
            <ul className="mt-5 divide-y divide-slate-100">{listingList.map((item) => <li key={item.id} className="flex items-center gap-4 py-4"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><PackageSearch className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.title}</p><p className="mt-1 text-xs text-slate-500">Listed in FixNGo Marketplace</p></div><div className="text-right"><p className="font-heading text-lg font-bold">₹{(item.pricePaise / 100).toLocaleString('en-IN')}</p><span className={`text-[10px] font-bold uppercase ${item.sold ? 'text-slate-400' : 'text-emerald-600'}`}>{item.sold ? 'Sold' : 'Active'}</span></div></li>)}</ul>
          ) : <EmptyState icon={PackageSearch} title="Nothing listed yet" text="Give an old appliance or home product a second life." action="Create a listing" />}
        </div>
      </section>
    </RoleLayout>
  );
}

function Metric({ icon: Icon, label, value, hint, tone }: { icon: LucideIcon; label: string; value: number | string; hint: string; tone: 'blue' | 'green' | 'violet' | 'orange' }) {
  const colors = { blue: 'bg-blue-50 text-primary', green: 'bg-emerald-50 text-emerald-600', violet: 'bg-violet-50 text-violet-600', orange: 'bg-orange-50 text-accent' };
  return <div className="dashboard-panel p-5"><div className="flex items-start justify-between"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors[tone]}`}><Icon className="h-5 w-5" /></span><span className="text-[11px] font-bold text-emerald-600">Live</span></div><p className="mt-5 font-heading text-3xl font-bold">{value}</p><p className="mt-1 text-sm font-bold text-slate-700">{label}</p><p className="mt-1 text-xs text-slate-400">{hint}</p></div>;
}

function SkeletonList() { return <div className="mt-5 space-y-3" aria-hidden="true">{[0, 1].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}</div>; }

function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action: string }) {
  return <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm"><Icon className="h-6 w-6" /></span><p className="mt-4 font-bold">{title}</p><p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{text}</p><a href="#new-service" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary"><Plus className="h-4 w-4" />{action}</a></div>;
}
