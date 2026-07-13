import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeIndianRupee,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  Save,
  ShieldCheck,
  Star,
  UserRound,
  Wrench,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { api } from "../lib/api";
import { RoleLayout } from "../components/RoleLayout";
import {
  apiErrorMessage,
  formatJobStatus,
  initials,
  jobStepIndex,
  JOB_STATUS_STYLES,
  money,
} from "../lib/utils";
import { JobTracker } from "../components/JobTicket";

interface TechnicianJob {
  id: string;
  serviceType: string;
  description: string | null;
  status: string;
  lat: number | null;
  lng: number | null;
  scheduledAt: string | null;
  createdAt: string;
  customer: {
    fullName: string;
    address: string | null;
    user: { phone: string };
  };
  payment: { amount: number; currency: string; status: string } | null;
}

interface TechProfile {
  id: string;
  fullName: string;
  skills: string[];
  bio: string | null;
  experienceYears: number;
  serviceArea: string | null;
  isAvailable: boolean;
  isVerified: boolean;
  rating: number;
  lastLat: number | null;
  lastLng: number | null;
  locationUpdatedAt: string | null;
  user: { phone: string; email: string | null };
}

interface Dashboard {
  jobs: {
    today: number;
    active: number;
    completedToday: number;
    completedTotal: number;
  };
  earnings: {
    todayPaise: number;
    weekPaise: number;
    monthPaise: number;
    totalPaise: number;
    currency: string;
  };
  performance: {
    rating: number;
    ratingCount: number;
    acceptanceRate: number | null;
    onTimeRate: number | null;
    completionRate: number | null;
  };
}

interface ProfilePayload {
  fullName: string;
  email?: string;
  skills: string[];
  bio: string;
  experienceYears: number;
  serviceArea: string;
}

const NEXT_STATUS: Record<string, string> = {
  ASSIGNED: "ACCEPTED",
  ACCEPTED: "ON_SITE",
  ON_SITE: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
};
const FILTERS = ["ACTIVE", "UPCOMING", "HISTORY", "ALL"] as const;
type JobFilter = (typeof FILTERS)[number];

export function TechnicianHome() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<JobFilter>("ACTIVE");
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["technician", "me"],
    queryFn: async () => (await api.get<TechProfile>("/technicians/me")).data,
  });
  const dashboardQuery = useQuery({
    queryKey: ["technician", "dashboard"],
    queryFn: async () =>
      (await api.get<Dashboard>("/technicians/me/dashboard")).data,
  });
  const jobsQuery = useQuery({
    queryKey: ["technician", "jobs"],
    queryFn: async () =>
      (await api.get<TechnicianJob[]>("/jobs/assigned")).data,
  });

  function refreshTechnicianData() {
    void queryClient.invalidateQueries({ queryKey: ["technician"] });
  }

  const availability = useMutation({
    mutationFn: async (isAvailable: boolean) =>
      (await api.patch("/technicians/me/availability", { isAvailable })).data,
    onSuccess: refreshTechnicianData,
  });
  const updateLocation = useMutation({
    mutationFn: async (coords: { lat: number; lng: number }) =>
      (await api.patch("/technicians/me/location", coords)).data,
    onSuccess: () => {
      setLocationMessage("Location updated");
      // Only the profile (lastLat/lastLng/locationUpdatedAt) changed here —
      // avoid re-running the dashboard's aggregate queries and job list
      // fetch on every GPS ping.
      void queryClient.invalidateQueries({ queryKey: ["technician", "me"] });
    },
    onError: () => setLocationMessage("Could not save your location"),
  });
  const advanceStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      (await api.patch(`/jobs/${id}/status`, { status })).data,
    onSuccess: refreshTechnicianData,
  });
  const declineJob = useMutation({
    mutationFn: async (id: string) =>
      (await api.post(`/jobs/${id}/decline`, {})).data,
    onSuccess: refreshTechnicianData,
  });

  function shareLocation() {
    setLocationMessage(null);
    if (!("geolocation" in navigator)) {
      setLocationMessage("Location is not supported by this device");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        updateLocation.mutate({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      () => setLocationMessage("Location permission was denied"),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  const jobList = useMemo(() => jobsQuery.data ?? [], [jobsQuery.data]);
  const visibleJobs = useMemo(() => {
    const now = Date.now();
    return jobList.filter((job) => {
      const closed = ["COMPLETED", "CANCELLED"].includes(job.status);
      if (filter === "ACTIVE") return !closed;
      if (filter === "HISTORY") return closed;
      if (filter === "UPCOMING")
        return (
          !closed &&
          !!job.scheduledAt &&
          new Date(job.scheduledAt).getTime() > now
        );
      return true;
    });
  }, [filter, jobList]);

  const profile = profileQuery.data;
  const dashboard = dashboardQuery.data;
  const greeting =
    new Date().getHours() < 12
      ? "Good morning"
      : new Date().getHours() < 18
        ? "Good afternoon"
        : "Good evening";
  const pageError =
    profileQuery.isError || jobsQuery.isError || dashboardQuery.isError;

  return (
    <RoleLayout
      title={`${greeting}${profile?.fullName ? `, ${profile.fullName.split(" ")[0]}` : ""}`}
      subtitle="Manage assignments, availability, earnings and your service profile."
      userName={profile?.fullName}
    >
      {pageError && (
        <div
          role="alert"
          className="mb-5 flex flex-col justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center"
        >
          <span>
            Some technician data could not be loaded. Confirm the API and
            database migration are running.
          </span>
          <button
            type="button"
            onClick={() => refreshTechnicianData()}
            className="font-bold text-red-700"
          >
            Try again
          </button>
        </div>
      )}

      <section
        id="overview"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <TechMetric
          icon={BriefcaseBusiness}
          label="Today's jobs"
          value={dashboard?.jobs.today ?? "—"}
          note={`${dashboard?.jobs.active ?? 0} active assignments`}
          tone="blue"
          loading={dashboardQuery.isLoading}
        />
        <TechMetric
          icon={CheckCircle2}
          label="Completed today"
          value={dashboard?.jobs.completedToday ?? "—"}
          note={`${dashboard?.jobs.completedTotal ?? 0} completed all time`}
          tone="green"
          loading={dashboardQuery.isLoading}
        />
        <TechMetric
          icon={Star}
          label="Customer rating"
          value={dashboard ? dashboard.performance.rating.toFixed(1) : "—"}
          note={`${dashboard?.performance.ratingCount ?? 0} customer ratings`}
          tone="amber"
          loading={dashboardQuery.isLoading}
        />
        <TechMetric
          icon={BadgeIndianRupee}
          label="Today's earnings"
          value={dashboard ? money(dashboard.earnings.todayPaise) : "—"}
          note={`${dashboard ? money(dashboard.earnings.weekPaise) : "₹0"} this week`}
          tone="violet"
          loading={dashboardQuery.isLoading}
        />
      </section>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1.45fr_.75fr]">
        <div className="space-y-6">
          <section
            id="jobs"
            className="dashboard-panel scroll-mt-24 p-5 sm:p-6"
          >
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <p className="dashboard-eyebrow">Assigned work</p>
                <h2 className="dashboard-title">Job queue</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFilter(item)}
                    className={`rounded-xl px-3 py-2 text-[11px] font-bold transition ${filter === item ? "bg-primary text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  >
                    {item.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
            {jobsQuery.isLoading ? (
              <JobSkeleton />
            ) : visibleJobs.length > 0 ? (
              <ul className="mt-5 space-y-4">
                {visibleJobs.map((job, index) => (
                  <TechnicianJobCard
                    key={job.id}
                    job={job}
                    index={index}
                    busy={
                      (advanceStatus.isPending &&
                        advanceStatus.variables?.id === job.id) ||
                      (declineJob.isPending && declineJob.variables === job.id)
                    }
                    onAdvance={(status) =>
                      advanceStatus.mutate({ id: job.id, status })
                    }
                    onDecline={() => declineJob.mutate(job.id)}
                    error={
                      (advanceStatus.isError &&
                        advanceStatus.variables?.id === job.id) ||
                      (declineJob.isError && declineJob.variables === job.id)
                        ? apiErrorMessage(advanceStatus.error || declineJob.error)
                        : null
                    }
                  />
                ))}
              </ul>
            ) : (
              <EmptyQueue filter={filter} />
            )}
          </section>

          <section
            id="earnings"
            className="dashboard-panel scroll-mt-24 p-5 sm:p-6"
          >
            <div>
              <p className="dashboard-eyebrow">Payout overview</p>
              <h2 className="dashboard-title">Earnings</h2>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Earning
                label="This week"
                value={money(dashboard?.earnings.weekPaise ?? 0)}
              />
              <Earning
                label="This month"
                value={money(dashboard?.earnings.monthPaise ?? 0)}
              />
              <Earning
                label="All time"
                value={money(dashboard?.earnings.totalPaise ?? 0)}
              />
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Earnings include completed jobs whose payment is marked paid.
            </p>
          </section>

          <ProfileEditor profile={profile} onSaved={refreshTechnicianData} />
        </div>

        <aside className="space-y-6">
          <section className="dashboard-panel overflow-hidden">
            <div className="bg-gradient-to-br from-primary to-[#183483] p-5 text-white">
              <div className="flex items-start justify-between">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 font-heading text-xl font-bold">
                  {initials(profile?.fullName, "SP")}
                </span>
                <span
                  className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${profile?.isAvailable ? "bg-emerald-400/20 text-emerald-100" : "bg-white/10 text-blue-100"}`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${profile?.isAvailable ? "bg-emerald-300" : "bg-slate-300"}`}
                  />{" "}
                  {profile?.isAvailable ? "Online" : "Offline"}
                </span>
              </div>
              <h2 className="mt-4 font-heading text-2xl font-bold">
                {profile?.fullName ?? "Service partner"}
              </h2>
              <p className="mt-1 flex items-center gap-1 text-sm text-blue-100">
                {profile?.isVerified ? (
                  <>
                    <ShieldCheck className="h-4 w-4" /> Verified service partner
                  </>
                ) : (
                  <>
                    <Clock3 className="h-4 w-4" /> Verification pending
                  </>
                )}
              </p>
              {profile?.skills.length ? (
                <p className="mt-3 text-xs text-blue-100">
                  {profile.skills.join(" · ")}
                </p>
              ) : null}
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">Accept new jobs</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Control dispatch availability
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-label="Accept new jobs"
                  aria-checked={profile?.isAvailable ?? false}
                  onClick={() =>
                    availability.mutate(!(profile?.isAvailable ?? false))
                  }
                  disabled={!profile || availability.isPending}
                  className={`relative h-7 w-12 rounded-full transition ${profile?.isAvailable ? "bg-emerald-500" : "bg-slate-300"}`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${profile?.isAvailable ? "left-6" : "left-1"}`}
                  />
                </button>
              </div>
              <button
                onClick={shareLocation}
                disabled={updateLocation.isPending}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-blue-50 px-4 py-3 text-sm font-bold text-primary hover:bg-blue-100 disabled:opacity-50"
              >
                {updateLocation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : locationMessage === "Location updated" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <LocateFixed className="h-4 w-4" />
                )}
                {updateLocation.isPending
                  ? "Sharing location…"
                  : "Update current location"}
              </button>
              {locationMessage && (
                <p
                  role="status"
                  className={`mt-2 text-center text-xs ${locationMessage === "Location updated" ? "text-emerald-600" : "text-red-600"}`}
                >
                  {locationMessage}
                </p>
              )}
              {profile?.locationUpdatedAt && (
                <p className="mt-2 text-center text-[10px] text-slate-400">
                  Last shared {relativeTime(profile.locationUpdatedAt)}
                </p>
              )}
            </div>
          </section>

          <section
            id="performance"
            className="dashboard-panel scroll-mt-24 p-5"
          >
            <div>
              <p className="dashboard-eyebrow">Performance</p>
              <h2 className="dashboard-title">Service quality</h2>
            </div>
            <div className="mt-5 space-y-4">
              <Progress
                label="Acceptance rate"
                value={dashboard?.performance.acceptanceRate}
              />
              <Progress
                label="On-time arrival"
                value={dashboard?.performance.onTimeRate}
              />
              <Progress
                label="Completion rate"
                value={dashboard?.performance.completionRate}
              />
            </div>
            <p className="mt-5 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800">
              Rates are calculated from your real assignment and job history.
              New accounts show “Not enough data” until activity is recorded.
            </p>
          </section>

          <section id="schedule" className="dashboard-panel scroll-mt-24 p-5">
            <p className="dashboard-eyebrow">Schedule</p>
            <h2 className="dashboard-title">Upcoming visits</h2>
            <div className="mt-4 space-y-3">
              {jobList
                .filter(
                  (job) =>
                    job.scheduledAt &&
                    !["COMPLETED", "CANCELLED"].includes(job.status),
                )
                .slice(0, 4)
                .map((job) => (
                  <div
                    key={job.id}
                    className="flex gap-3 rounded-xl border border-slate-100 p-3"
                  >
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-bold">{job.serviceType}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateTime(job.scheduledAt!)}
                      </p>
                    </div>
                  </div>
                ))}
              {!jobList.some(
                (job) =>
                  job.scheduledAt &&
                  !["COMPLETED", "CANCELLED"].includes(job.status),
              ) && (
                <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">
                  No scheduled visits yet.
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </RoleLayout>
  );
}

function TechnicianJobCard({
  job,
  index,
  busy,
  onAdvance,
  onDecline,
  error,
}: {
  job: TechnicianJob;
  index: number;
  busy: boolean;
  onAdvance: (status: string) => void;
  onDecline: () => void;
  error: string | null;
}) {
  const next = NEXT_STATUS[job.status];
  const directions =
    job.lat !== null && job.lng !== null
      ? `https://www.google.com/maps/dir/?api=1&destination=${job.lat},${job.lng}`
      : null;
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-primary/30 hover:shadow-md sm:p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex gap-3">
          <span
            className={`service-photo service-photo-${index % 8} h-14 w-14 shrink-0 rounded-xl`}
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-heading text-xl font-bold">
                {job.serviceType}
              </p>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${JOB_STATUS_STYLES[job.status] ?? "bg-slate-100 text-slate-600"}`}
              >
                {formatJobStatus(job.status)}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Job #{job.id.slice(0, 8).toUpperCase()}
              {job.scheduledAt ? ` · ${formatDateTime(job.scheduledAt)}` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={`tel:${job.customer.user.phone}`}
            aria-label={`Call ${job.customer.fullName}`}
            className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:text-primary"
          >
            <Phone className="h-4 w-4" />
          </a>
          {directions ? (
            <a
              href={directions}
              target="_blank"
              rel="noreferrer"
              aria-label="Open directions"
              className="rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:text-primary"
            >
              <Navigation className="h-4 w-4" />
            </a>
          ) : (
            <span
              title="No map location provided"
              className="rounded-xl border border-slate-100 p-2.5 text-slate-300"
            >
              <MapPin className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>
      {job.description && (
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
          {job.description}
        </p>
      )}
      {!["CANCELLED"].includes(job.status) && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <JobTracker current={Math.max(0, jobStepIndex(job.status))} />
        </div>
      )}
      <div className="mt-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div className="space-y-1 text-xs text-slate-500">
          <p className="flex items-center gap-2">
            <UserRound className="h-4 w-4" />
            {job.customer.fullName}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {job.customer.address || "Address supplied by map location"}
          </p>
          {job.payment && (
            <p className="flex items-center gap-2 font-bold text-slate-700">
              <BadgeIndianRupee className="h-4 w-4" />
              {money(job.payment.amount)} ·{" "}
              {formatJobStatus(job.payment.status)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {["ASSIGNED", "ACCEPTED", "ON_SITE", "IN_PROGRESS"].includes(
            job.status,
          ) && (
            <button
              onClick={onDecline}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />{" "}
              {job.status === "ASSIGNED" ? "Decline" : "Cancel job"}
            </button>
          )}
          {next && (
            <button
              onClick={() => onAdvance(next)}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {job.status === "ASSIGNED"
                ? "Accept job"
                : `Mark ${formatJobStatus(next)}`}{" "}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700"
        >
          {error}
        </p>
      )}
    </li>
  );
}

function ProfileEditor({
  profile,
  onSaved,
}: {
  profile: TechProfile | undefined;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    skills: "",
    bio: "",
    experienceYears: "0",
    serviceArea: "",
  });
  useEffect(() => {
    if (profile)
      setForm({
        fullName: profile.fullName,
        email: profile.user.email ?? "",
        skills: profile.skills.join(", "),
        bio: profile.bio ?? "",
        experienceYears: String(profile.experienceYears),
        serviceArea: profile.serviceArea ?? "",
      });
  }, [profile]);
  const save = useMutation({
    mutationFn: async (payload: ProfilePayload) =>
      (await api.patch("/technicians/me", payload)).data,
    onSuccess: onSaved,
  });
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.fullName.trim()) return;
    save.mutate({
      fullName: form.fullName.trim(),
      // Send "" (not undefined) so an intentionally cleared field actually
      // clears the stored email instead of being treated as "no change".
      email: form.email.trim(),
      skills: form.skills
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      bio: form.bio.trim(),
      experienceYears: Number(form.experienceYears) || 0,
      serviceArea: form.serviceArea.trim(),
    });
  }
  const field = (name: keyof typeof form) => ({
    value: form[name],
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => setForm((current) => ({ ...current, [name]: event.target.value })),
  });
  return (
    <form
      id="settings"
      onSubmit={submit}
      className="dashboard-panel scroll-mt-24 p-5 sm:p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="dashboard-eyebrow">Professional profile</p>
          <h2 className="dashboard-title">Public service details</h2>
        </div>
        <Wrench className="h-6 w-6 text-primary" />
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-700">
          Full name
          <input
            required
            className="dashboard-input mt-1.5"
            {...field("fullName")}
          />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Email
          <input
            type="email"
            className="dashboard-input mt-1.5"
            {...field("email")}
          />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Service area
          <input
            placeholder="e.g. Guntur and nearby"
            className="dashboard-input mt-1.5"
            {...field("serviceArea")}
          />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Experience (years)
          <input
            type="number"
            min="0"
            max="60"
            className="dashboard-input mt-1.5"
            {...field("experienceYears")}
          />
        </label>
        <label className="text-sm font-bold text-slate-700 sm:col-span-2">
          Skills, separated by commas
          <input
            placeholder="AC repair, Electrical, Installation"
            className="dashboard-input mt-1.5"
            {...field("skills")}
          />
        </label>
        <label className="text-sm font-bold text-slate-700 sm:col-span-2">
          About your work
          <textarea
            rows={3}
            maxLength={500}
            className="dashboard-input mt-1.5"
            {...field("bio")}
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!profile || save.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {save.isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}{" "}
          Save profile
        </button>
        {save.isSuccess && (
          <span role="status" className="text-sm font-bold text-emerald-600">
            Profile saved
          </span>
        )}
        {save.isError && (
          <span role="alert" className="text-sm text-red-600">
            {apiErrorMessage(save.error)}
          </span>
        )}
      </div>
    </form>
  );
}

function TechMetric({
  icon: Icon,
  label,
  value,
  note,
  tone,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  note: string;
  tone: "blue" | "green" | "amber" | "violet";
  loading: boolean;
}) {
  const colors = {
    blue: "bg-blue-50 text-primary",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="dashboard-panel p-5">
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors[tone]}`}
      >
        <Icon className={`h-5 w-5 ${Icon === Star ? "fill-current" : ""}`} />
      </span>
      <p
        className={`mt-5 font-heading text-3xl font-bold ${loading ? "animate-pulse text-slate-300" : ""}`}
      >
        {value}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-700">{label}</p>
      <p className="mt-1 text-xs text-slate-400">{note}</p>
    </div>
  );
}

function Progress({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="font-bold text-slate-600">{label}</span>
        <span className="font-bold text-slate-900">
          {value === null || value === undefined
            ? "Not enough data"
            : `${value}%`}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${value ?? 0}%` }}
        />
      </div>
    </div>
  );
}
function Earning({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-2 font-heading text-2xl font-bold">{value}</p>
    </div>
  );
}
function JobSkeleton() {
  return (
    <div className="mt-5 space-y-3">
      {[0, 1].map((item) => (
        <div
          key={item}
          className="h-52 animate-pulse rounded-2xl bg-slate-100"
        />
      ))}
    </div>
  );
}
function EmptyQueue({ filter }: { filter: JobFilter }) {
  return (
    <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
      <CalendarClock className="h-9 w-9 text-slate-300" />
      <p className="mt-4 font-bold">No {filter.toLowerCase()} jobs</p>
      <p className="mt-1 text-sm text-slate-500">
        Assignments and updates will appear here automatically.
      </p>
    </div>
  );
}
function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
function relativeTime(value: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60_000),
  );
  return minutes < 1
    ? "just now"
    : minutes < 60
      ? `${minutes} min ago`
      : `${Math.floor(minutes / 60)} hr ago`;
}
