import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Home,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Store,
  UserRound,
  Users,
  WalletCards,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../store/auth';

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const ROLE_NAV: Record<string, NavItem[]> = {
  CUSTOMER: [
    { label: 'Overview', href: '#overview', icon: Home },
    { label: 'My bookings', href: '#bookings', icon: CalendarDays },
    { label: 'Book a service', href: '#new-service', icon: Wrench },
    { label: 'Marketplace', href: '#marketplace', icon: Store },
    { label: 'Payments', href: '#payments', icon: WalletCards },
  ],
  TECHNICIAN: [
    { label: 'Overview', href: '#overview', icon: LayoutDashboard },
    { label: 'My jobs', href: '#jobs', icon: BriefcaseBusiness },
    { label: 'Schedule', href: '#schedule', icon: CalendarDays },
    { label: 'Earnings', href: '#earnings', icon: WalletCards },
    { label: 'Performance', href: '#performance', icon: BarChart3 },
  ],
  ADMIN: [
    { label: 'Overview', href: '#overview', icon: LayoutDashboard },
    { label: 'Jobs', href: '#jobs', icon: ClipboardList },
    { label: 'Professionals', href: '#professionals', icon: Users },
    { label: 'Customers', href: '#customers', icon: UserRound },
    { label: 'Reports', href: '#reports', icon: BarChart3 },
  ],
};

const ROLE_COPY: Record<string, { label: string; initials: string }> = {
  CUSTOMER: { label: 'Customer', initials: 'VK' },
  TECHNICIAN: { label: 'Service Partner', initials: 'RK' },
  ADMIN: { label: 'Administrator', initials: 'AD' },
};

/** Responsive shared application shell for all authenticated FixNGo roles. */
export function RoleLayout({ title, subtitle, children }: Props) {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const clear = useAuth((s) => s.clear);
  const role = user?.role ?? 'CUSTOMER';
  const nav = ROLE_NAV[role] ?? ROLE_NAV.CUSTOMER;
  const profile = ROLE_COPY[role] ?? ROLE_COPY.CUSTOMER;

  function logout() {
    clear();
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-20 items-center border-b border-slate-100 px-7">
          <Link to="/" className="font-heading text-[29px] font-bold tracking-tight text-primary">FixNGo</Link>
        </div>

        <nav className="flex-1 px-4 py-6">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">Workspace</p>
          <div className="mt-3 space-y-1.5">
            {nav.map((item, index) => (
              <a key={item.label} href={item.href} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${index === 0 ? 'bg-blue-50 text-primary' : 'text-slate-600 hover:bg-slate-50 hover:text-primary'}`}>
                <item.icon className="h-[19px] w-[19px]" /> {item.label}
              </a>
            ))}
          </div>
          <p className="mt-8 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">Manage</p>
          <div className="mt-3 space-y-1.5">
            <a href="#support" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-primary"><CircleHelp className="h-[19px] w-[19px]" /> Help & support</a>
            <a href="#settings" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-primary"><Settings className="h-[19px] w-[19px]" /> Settings</a>
          </div>
        </nav>

        <div className="m-4 rounded-2xl bg-gradient-to-br from-primary to-[#183483] p-4 text-white shadow-lg shadow-blue-900/10">
          <ShieldCheck className="h-6 w-6 text-blue-200" />
          <p className="mt-3 text-sm font-bold">FixNGo protected</p>
          <p className="mt-1 text-xs leading-5 text-blue-100">Every service is covered by our quality guarantee.</p>
        </div>
      </aside>

      <div className="lg:pl-[252px]">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-[72px] items-center gap-4 px-4 sm:px-6 lg:px-8">
            <button aria-label="Open menu" type="button" className="rounded-lg border border-slate-200 p-2 lg:hidden"><Menu className="h-5 w-5" /></button>
            <Link to="/" className="font-heading text-xl font-bold text-primary lg:hidden">FixNGo</Link>
            <label className="ml-auto hidden w-full max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 md:flex lg:ml-0">
              <Search className="h-4 w-4 text-slate-400" />
              <input aria-label="Search dashboard" placeholder="Search jobs, services, customers…" className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
            </label>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <button type="button" className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 xl:flex"><MapPin className="h-4 w-4 text-primary" /> Guntur <ChevronDown className="h-3.5 w-3.5" /></button>
              <button aria-label="Notifications" type="button" className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"><Bell className="h-[18px] w-[18px]" /><span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent ring-2 ring-white" /></button>
              <div className="hidden h-8 w-px bg-slate-200 sm:block" />
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-xs font-black text-white">{profile.initials}</span>
                <div className="hidden leading-tight sm:block"><p className="text-sm font-bold">{role === 'TECHNICIAN' ? 'Ravi Kumar' : role === 'ADMIN' ? 'Admin User' : 'Vijay Kumar'}</p><p className="text-[11px] text-slate-500">{profile.label}</p></div>
              </div>
              <button onClick={logout} aria-label="Sign out" title="Sign out" className="rounded-xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><LogOut className="h-[18px] w-[18px]" /></button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">{profile.label} workspace</p><h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-slate-950 lg:text-4xl">{title}</h1>{subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}</div>
            <div className="text-xs text-slate-400">Updated just now</div>
          </div>
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white px-2 pb-[max(.55rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,.08)] lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {nav.slice(0, 4).map((item, index) => <a key={item.label} href={item.href} className={`flex flex-col items-center gap-1 py-1 text-[10px] font-bold ${index === 0 ? 'text-primary' : 'text-slate-500'}`}><item.icon className="h-5 w-5" />{item.label}</a>)}
        </div>
      </nav>
    </div>
  );
}

export function roleHomePath(role: string | undefined): string {
  switch (role) {
    case 'CUSTOMER': return '/customer';
    case 'TECHNICIAN': return '/technician';
    case 'ADMIN': return '/admin';
    default: return '/login';
  }
}
