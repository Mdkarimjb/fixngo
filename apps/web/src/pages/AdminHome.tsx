import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  LoaderCircle,
  MapPin,
  MoreHorizontal,
  Phone,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Star,
  TrendingUp,
  UserCheck,
  UserRound,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { api } from "../lib/api";
import { RoleLayout } from "../components/RoleLayout";
import {
  apiErrorMessage,
  formatJobStatus,
  initials,
  JOB_STATUS_STYLES,
  money,
} from "../lib/utils";

interface Job {
  id: string;
  referenceCode: string;
  city: string;
  location: string;
  serviceType: string;
  description: string | null;
  imageUrls: string[];
  status: string;
  technicianId: string | null;
  scheduledAt: string | null;
  createdAt: string;
  customer: {
    fullName: string;
    address: string | null;
    user: { phone: string };
  };
  technician: {
    id: string;
    fullName: string;
    rating: number;
    skills: string[];
    isAvailable: boolean;
  } | null;
  payment: { amount: number; currency: string; status: string } | null;
}

interface Technician {
  id: string;
  fullName: string;
  skills: string[];
  isAvailable: boolean;
  rating: number;
  city: string;
  location: string;
  points: number;
  distanceKm: number | null;
  dispatchScore: number;
  lastLat: number | null;
  lastLng: number | null;
  _count: { jobs: number };
}

const PAGE_SIZE = 8;
const CLOSED_STATUSES = ["COMPLETED", "CANCELLED"];

export function AdminHome() {
  const queryClient = useQueryClient();
  const jobsQuery = useQuery({
    queryKey: ["admin", "jobs"],
    queryFn: async () => (await api.get<Job[]>("/jobs")).data,
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>(
    [],
  );
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(
    null,
  );

  const list = useMemo(() => jobsQuery.data ?? [], [jobsQuery.data]);
  const selectedJob = list.find((job) => job.id === selectedJobId) ?? null;
  const techniciansQuery = useQuery({
    queryKey: ["admin", "job-candidates", selectedJobId],
    queryFn: async () =>
      (await api.get<Technician[]>(`/jobs/${selectedJobId}/candidates`)).data,
    enabled: !!selectedJobId,
  });
  const technicians = useMemo(
    () => techniciansQuery.data ?? [],
    [techniciansQuery.data],
  );
  const open = list.filter(
    (job) => !CLOSED_STATUSES.includes(job.status),
  ).length;
  const done = list.filter((job) => job.status === "COMPLETED").length;
  const assigned = list.filter((job) => job.technicianId).length;
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return list.filter((job) => {
      const matchesStatus = status === "ALL" || job.status === status;
      const haystack =
        `${job.serviceType} ${job.referenceCode} ${job.id} ${job.city} ${job.location} ${job.customer.fullName} ${job.technician?.fullName ?? ""}`.toLowerCase();
      return matchesStatus && (!term || haystack.includes(term));
    });
  }, [list, search, status]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleJobs = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [search, status]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const inviteTechnicians = useMutation({
    mutationFn: async ({
      jobId,
      technicianIds,
    }: {
      jobId: string;
      technicianIds: string[];
    }) =>
      (
        await api.post<{ invited: number }>(`/jobs/${jobId}/invite`, {
          technicianIds,
        })
      ).data,
    onSuccess: (result) => {
      setAssignmentMessage(
        `WhatsApp and app offers sent to ${result.invited} technicians.`,
      );
    },
    onError: () => setAssignmentMessage(null),
  });

  const cancelJob = useMutation({
    mutationFn: async (jobId: string) =>
      (await api.post<Job>(`/jobs/${jobId}/cancel`, {})).data,
    onSuccess: (updatedJob) => {
      queryClient.setQueryData<Job[]>(["admin", "jobs"], (current = []) =>
        current.map((job) => (job.id === updatedJob.id ? updatedJob : job)),
      );
      setAssignmentMessage("Job cancelled.");
    },
    onError: () => setAssignmentMessage(null),
  });

  function selectJob(job: Job) {
    setSelectedJobId(job.id);
    setSelectedTechnicianIds([]);
    setAssignmentMessage(null);
  }

  function openAssignmentPanel() {
    const job =
      selectedJob ??
      filtered.find((item) => !CLOSED_STATUSES.includes(item.status));
    if (job) selectJob(job);
    window.setTimeout(
      () =>
        document
          .getElementById("assignment")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      0,
    );
  }

  function exportJobs() {
    const rows = [
      ["Job ID", "Service", "Customer", "Status", "Technician", "Created"],
      ...filtered.map((job) => [
        job.referenceCode,
        job.serviceType,
        job.customer.fullName,
        job.status,
        job.technician?.fullName ?? "",
        job.createdAt,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "fixngo-jobs.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <RoleLayout
      title="Operations overview"
      subtitle="Monitor service delivery, workforce activity and customer experience."
    >
      <section
        id="overview"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <AdminMetric
          icon={BriefcaseBusiness}
          label="Total jobs"
          value={list.length}
          change="12.5%"
          up
          tone="blue"
        />
        <AdminMetric
          icon={Clock3}
          label="Open jobs"
          value={open}
          change="3.2%"
          tone="amber"
        />
        <AdminMetric
          icon={UserCheck}
          label="Assigned"
          value={assigned}
          change="8.1%"
          up
          tone="violet"
        />
        <AdminMetric
          icon={CheckCircle2}
          label="Completed"
          value={done}
          change="14.7%"
          up
          tone="green"
        />
      </section>

      <div className="mt-6 grid items-start gap-6 2xl:grid-cols-[1.45fr_.55fr]">
        <section id="jobs" className="dashboard-panel overflow-hidden">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <p className="dashboard-eyebrow">Live operations</p>
                <h2 className="dashboard-title">Service jobs</h2>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={exportJobs}
                  disabled={filtered.length === 0}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download className="h-4 w-4" /> Export
                </button>
                <button
                  type="button"
                  onClick={openAssignmentPanel}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-800"
                >
                  <SlidersHorizontal className="h-4 w-4" /> Assign job
                </button>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <label className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by job, customer or professional…"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </label>
              <label className="relative">
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="h-full min-w-40 cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="ALL">All statuses</option>
                  <option value="REQUESTED">Requested</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="ON_SITE">On site</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </label>
            </div>
          </div>

          {jobsQuery.isError ? (
            <ErrorState
              message="Jobs could not be loaded. Check that the API is running and try again."
              onRetry={() => jobsQuery.refetch()}
            />
          ) : jobsQuery.isLoading ? (
            <div className="space-y-3 p-6">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Search className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 font-bold">No matching jobs</p>
              <p className="mt-1 text-sm text-slate-500">
                Try changing the search or status filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-slate-50/80 text-[10px] uppercase tracking-[.12em] text-slate-400">
                  <tr>
                    <th className="w-12 px-4 py-3.5">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="px-2 py-3.5">Job & service</th>
                    <th className="px-4 py-3.5">Customer</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Professional</th>
                    <th className="px-4 py-3.5">Value</th>
                    <th className="px-4 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleJobs.map((job, index) => (
                    <JobRow
                      key={job.id}
                      job={job}
                      index={(page - 1) * PAGE_SIZE + index}
                      selected={job.id === selectedJobId}
                      onSelect={() => selectJob(job)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 text-xs text-slate-500">
            <span>
              Showing {visibleJobs.length} of {filtered.length} jobs
            </span>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">
                Page {page} of {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={page === 1}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  setPage((value) => Math.min(pageCount, value + 1))
                }
                className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={page === pageCount}
              >
                Next
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <AssignmentPanel
            job={selectedJob}
            technicians={technicians}
            isLoading={techniciansQuery.isLoading}
            isError={techniciansQuery.isError}
            selectedTechnicianIds={selectedTechnicianIds}
            onSelectTechnician={(id) =>
              setSelectedTechnicianIds((current) =>
                current.includes(id)
                  ? current.filter((item) => item !== id)
                  : current.length < 5
                    ? [...current, id]
                    : current,
              )
            }
            onAssign={() =>
              selectedJob &&
              inviteTechnicians.mutate({
                jobId: selectedJob.id,
                technicianIds: selectedTechnicianIds,
              })
            }
            onCancel={() => selectedJob && cancelJob.mutate(selectedJob.id)}
            onRetry={() => techniciansQuery.refetch()}
            isAssigning={inviteTechnicians.isPending}
            isCancelling={cancelJob.isPending}
            error={
              inviteTechnicians.isError
                ? apiErrorMessage(
                    inviteTechnicians.error,
                    "The technician offers could not be sent. Please try again.",
                  )
                : cancelJob.isError
                  ? apiErrorMessage(
                      cancelJob.error,
                      "The job could not be cancelled. Please try again.",
                    )
                  : null
            }
            message={assignmentMessage}
          />

          <section id="reports" className="dashboard-panel p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="dashboard-eyebrow">Revenue</p>
                <h2 className="dashboard-title">Service performance</h2>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-6 font-heading text-4xl font-bold">₹4.82L</p>
            <p className="mt-1 flex items-center gap-1 text-xs font-bold text-emerald-600">
              <ArrowUpRight className="h-4 w-4" /> 18.4% from last month
            </p>
            <div
              className="mt-6 flex h-32 items-end gap-2"
              aria-label="Revenue bar chart"
            >
              {[42, 58, 45, 72, 62, 82, 68, 94, 78, 100, 88, 96].map(
                (height, index) => (
                  <div
                    key={index}
                    className="group flex-1 rounded-t bg-blue-100 transition hover:bg-primary"
                    style={{ height: `${height}%` }}
                  />
                ),
              )}
            </div>
            <div className="mt-2 flex justify-between text-[10px] font-bold uppercase text-slate-400">
              <span>Week 1</span>
              <span>Week 2</span>
              <span>Week 3</span>
              <span>Week 4</span>
            </div>
          </section>

          <section className="dashboard-panel p-5 sm:p-6">
            <p className="dashboard-eyebrow">Attention needed</p>
            <h2 className="dashboard-title">Operations health</h2>
            <div className="mt-5 space-y-3">
              <HealthItem
                icon={ShieldAlert}
                title="3 delayed jobs"
                text="Past promised arrival time"
                color="bg-red-50 text-red-600"
              />
              <HealthItem
                icon={Users}
                title="8 professionals offline"
                text="Below the daily average"
                color="bg-amber-50 text-amber-600"
              />
              <HealthItem
                icon={Star}
                title="4.8 average rating"
                text="Up 0.2 this month"
                color="bg-emerald-50 text-emerald-600"
              />
            </div>
          </section>
        </aside>
      </div>
    </RoleLayout>
  );
}

function AssignmentPanel({
  job,
  technicians,
  isLoading,
  isError,
  selectedTechnicianIds,
  onSelectTechnician,
  onAssign,
  onCancel,
  onRetry,
  isAssigning,
  isCancelling,
  error,
  message,
}: {
  job: Job | null;
  technicians: Technician[];
  isLoading: boolean;
  isError: boolean;
  selectedTechnicianIds: string[];
  onSelectTechnician: (id: string) => void;
  onAssign: () => void;
  onCancel: () => void;
  onRetry: () => void;
  isAssigning: boolean;
  isCancelling: boolean;
  error: string | null;
  message: string | null;
}) {
  const isClosed = job ? CLOSED_STATUSES.includes(job.status) : false;
  return (
    <section
      id="assignment"
      className="dashboard-panel scroll-mt-24 p-5 sm:p-6"
    >
      <p className="dashboard-eyebrow">Dispatch desk</p>
      <h2 className="dashboard-title">Invite top professionals</h2>
      {!job ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <UserCheck className="mx-auto h-7 w-7 text-slate-400" />
          <p className="mt-3 text-sm font-bold">Select a job first</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Choose a job from the table to see available professionals.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 rounded-xl bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-primary shadow-sm">
                <Wrench className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-slate-900">{job.serviceType}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Job {job.referenceCode} · {job.location}, {job.city}
                </p>
              </div>
              <span
                className={`ml-auto rounded-full px-2 py-1 text-[9px] font-bold uppercase ${JOB_STATUS_STYLES[job.status] ?? "bg-slate-100 text-slate-600"}`}
              >
                {formatJobStatus(job.status)}
              </span>
            </div>
            <div className="mt-3 space-y-1.5 border-t border-blue-100 pt-3 text-xs text-slate-600">
              <p className="flex items-center gap-2">
                <UserRound className="h-3.5 w-3.5" />
                {job.customer.fullName}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />
                {job.customer.user.phone}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                {job.customer.address || "Guntur"}
              </p>
            </div>
          </div>

          {isClosed || !!job.technicianId ? (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">
              {isClosed
                ? "This job is closed and cannot be dispatched."
                : "A technician has already accepted this job."}
            </p>
          ) : isLoading ? (
            <div className="mt-4 space-y-2">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-16 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : isError ? (
            <ErrorState
              compact
              message="Professionals could not be loaded."
              onRetry={onRetry}
            />
          ) : technicians.length === 0 ? (
            <p className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">
              No available professionals are registered in {job.location},{" "}
              {job.city}.
            </p>
          ) : (
            <div className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Top professionals in {job.location}, {job.city}
                </p>
                <span className="text-[11px] font-bold text-primary">
                  {selectedTechnicianIds.length}/5 selected
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                Ranked using customer stars, service points and distance from
                the request.
              </p>
              <div className="mt-2 max-h-[310px] space-y-2 overflow-y-auto pr-1">
                {technicians.map((technician, index) => {
                  const selected = selectedTechnicianIds.includes(
                    technician.id,
                  );
                  const selectionFull =
                    selectedTechnicianIds.length >= 5 && !selected;
                  return (
                    <button
                      key={technician.id}
                      type="button"
                      disabled={!technician.isAvailable || selectionFull}
                      onClick={() => onSelectTechnician(technician.id)}
                      className={`w-full cursor-pointer rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${selected ? "border-primary bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"}`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black ${selected ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}
                        >
                          #{index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-bold">
                              {technician.fullName}
                            </p>
                            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-slate-500">
                            {technician.skills.length
                              ? technician.skills.join(" · ")
                              : "General services"}
                          </p>
                          <p className="mt-1 text-[10px] font-medium text-slate-400">
                            {technician.points} pts · {technician._count.jobs}{" "}
                            completed
                            {technician.distanceKm !== null
                              ? ` · ${technician.distanceKm.toFixed(1)} km`
                              : " · location unavailable"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="flex items-center justify-end gap-1 text-xs font-bold">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {technician.rating.toFixed(1)}
                          </p>
                          <p className="mt-1 text-[10px] font-bold text-primary">
                            Score {technician.dispatchScore}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {message && (
            <p
              role="status"
              className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700"
            >
              {message}
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700"
            >
              {error}
            </p>
          )}
          {!isClosed && !job.technicianId && (
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={onAssign}
                disabled={
                  selectedTechnicianIds.length === 0 ||
                  isAssigning ||
                  isCancelling ||
                  isLoading ||
                  isError
                }
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAssigning && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                Send offers to {selectedTechnicianIds.length || 0} technician
                {selectedTechnicianIds.length === 1 ? "" : "s"}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={isAssigning || isCancelling}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCancelling && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}{" "}
                Cancel job
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function JobRow({
  job,
  index,
  selected,
  onSelect,
}: {
  job: Job;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const value = job.payment
    ? money(job.payment.amount, job.payment.currency)
    : "—";
  const closed = CLOSED_STATUSES.includes(job.status);
  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer transition ${selected ? "bg-blue-50/80" : "hover:bg-blue-50/30"}`}
    >
      <td className="px-4 py-4">
        <input
          type="radio"
          name="selected-job"
          checked={selected}
          onChange={onSelect}
          aria-label={`Select ${job.serviceType} job`}
          className="h-4 w-4 cursor-pointer accent-blue-700"
        />
      </td>
      <td className="px-2 py-4">
        <div className="flex items-center gap-3">
          <span
            className={`service-photo service-photo-${index % 8} h-10 w-10 shrink-0 rounded-lg`}
          />
          <div>
            <p className="font-bold text-slate-900">{job.serviceType}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {job.referenceCode}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <p className="font-medium text-slate-700">{job.customer.fullName}</p>
        <p className="mt-0.5 max-w-36 truncate text-[11px] text-slate-400">
          {job.customer.address || "Guntur"}
        </p>
      </td>
      <td className="px-4 py-4">
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${JOB_STATUS_STYLES[job.status] ?? "bg-slate-100 text-slate-600"}`}
        >
          {formatJobStatus(job.status)}
        </span>
      </td>
      <td className="px-4 py-4">
        {job.technician ? (
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
              {initials(job.technician.fullName)}
            </span>
            <span className="text-xs font-bold text-slate-700">
              {job.technician.fullName}
            </span>
          </div>
        ) : (
          <button
            type="button"
            disabled={closed}
            onClick={(event) => {
              event.stopPropagation();
              onSelect();
            }}
            className="cursor-pointer text-xs font-bold text-primary disabled:cursor-not-allowed disabled:text-slate-400"
          >
            Assign now
          </button>
        )}
      </td>
      <td className="px-4 py-4 font-heading text-base font-bold">{value}</td>
      <td className="px-4 py-4">
        <button
          aria-label="Select job"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
          className="cursor-pointer rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-primary"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

function ErrorState({
  message,
  onRetry,
  compact = false,
}: {
  message: string;
  onRetry: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`${compact ? "mt-4 p-4" : "p-10"} text-center`}>
      <AlertCircle className="mx-auto h-7 w-7 text-red-500" />
      <p className="mt-2 text-sm font-bold text-slate-800">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-primary transition hover:bg-blue-50"
      >
        Try again
      </button>
    </div>
  );
}

function AdminMetric({
  icon: Icon,
  label,
  value,
  change,
  up = false,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  change: string;
  up?: boolean;
  tone: "blue" | "amber" | "violet" | "green";
}) {
  const colors = {
    blue: "bg-blue-50 text-primary",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
    green: "bg-emerald-50 text-emerald-600",
  };
  return (
    <div className="dashboard-panel p-5">
      <div className="flex items-start justify-between">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span
          className={`flex items-center text-[11px] font-bold ${up ? "text-emerald-600" : "text-red-500"}`}
        >
          {up ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" />
          )}
          {change}
        </span>
      </div>
      <p className="mt-5 font-heading text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm font-bold text-slate-700">{label}</p>
      <p className="mt-1 text-xs text-slate-400">Compared with last month</p>
    </div>
  );
}

function HealthItem({
  icon: Icon,
  title,
  text,
  color,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{text}</p>
      </div>
      <MoreHorizontal className="h-4 w-4 text-slate-300" />
    </div>
  );
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
