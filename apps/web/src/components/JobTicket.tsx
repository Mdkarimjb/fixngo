import { Check, Ban, LoaderCircle, Star } from "lucide-react";
import { JOB_STEPS, jobStepIndex, cn } from "../lib/utils";

/**
 * Four-dot job progress tracker — the "job card" signature shared by the
 * landing-page demo ticket and real customer job tickets.
 */
export function JobTracker({ current }: { current: number }) {
  return (
    <div
      className="flex items-start"
      aria-label={`Job progress: ${JOB_STEPS[current] ?? "pending"}`}
    >
      {JOB_STEPS.map((step, i) => {
        const done = i < current || current === JOB_STEPS.length - 1;
        const active = i === current && !done;
        return (
          <div key={step} className={cn("flex items-start", i > 0 && "flex-1")}>
            {i > 0 && (
              <div
                className={cn(
                  "mt-[9px] h-0.5 flex-1 rounded-full",
                  i <= current ? "bg-primary" : "bg-gray-200",
                )}
              />
            )}
            <div className="flex w-max flex-col items-center gap-1 px-1">
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px]",
                  done && "border-primary bg-primary text-white",
                  active && "animate-tick border-accent bg-accent",
                  !done && !active && "border-gray-300 bg-white",
                )}
              >
                {done && <Check className="h-3 w-3" strokeWidth={3} />}
                {active && (
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wide",
                  done
                    ? "text-primary"
                    : active
                      ? "text-accent"
                      : "text-gray-400",
                )}
              >
                {step}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface TicketJob {
  id: string;
  referenceCode?: string;
  city?: string;
  location?: string;
  serviceType: string;
  status: string;
  createdAt?: string;
  imageUrls?: string[];
  rating?: number | null;
}

/** A customer job rendered as a work-order ticket with a progress tracker. */
export function JobTicket({
  job,
  onRate,
  ratingPending = false,
}: {
  job: TicketJob;
  onRate?: (rating: number) => void;
  ratingPending?: boolean;
}) {
  const step = jobStepIndex(job.status);
  const cancelled = job.status === "CANCELLED";
  const displayId = job.referenceCode ?? job.id.slice(0, 6).toUpperCase();

  return (
    <li
      className={cn(
        "rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md",
        cancelled && "opacity-60",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
            Job card <span className="tnum text-gray-500">{displayId}</span>
            {job.city ? (
              <span className="text-gray-400">
                {" "}
                · {job.location ? `${job.location}, ` : ""}
                {job.city}
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 truncate font-semibold text-gray-900">
            {job.serviceType}
          </p>
        </div>
        {job.createdAt && (
          <span className="tnum shrink-0 text-xs text-gray-400">
            {new Date(job.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}
          </span>
        )}
      </div>
      <div className="mt-4">
        {cancelled ? (
          <p className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
            <Ban className="h-4 w-4" /> Cancelled
          </p>
        ) : (
          <JobTracker current={step} />
        )}
      </div>
      {job.imageUrls?.length ? (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {job.imageUrls.map((url, index) => (
            <img
              key={url}
              src={url}
              alt={`Attached issue ${index + 1}`}
              className="h-14 w-14 shrink-0 rounded-lg object-cover"
            />
          ))}
        </div>
      ) : null}
      {job.status === "COMPLETED" && onRate ? (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-xs font-bold text-slate-700">
            {job.rating ? "Your technician rating" : "Rate your technician"}
          </p>
          <div
            className="mt-2 flex items-center gap-1"
            aria-label="Technician rating"
          >
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                disabled={ratingPending}
                onClick={() => onRate(rating)}
                aria-label={`Give ${rating} stars`}
                className="cursor-pointer rounded-md p-1 disabled:cursor-wait disabled:opacity-50"
              >
                <Star
                  className={cn(
                    "h-5 w-5",
                    rating <= (job.rating ?? 0)
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-300 hover:text-amber-400",
                  )}
                />
              </button>
            ))}
            {ratingPending ? (
              <LoaderCircle className="ml-1 h-4 w-4 animate-spin text-primary" />
            ) : job.rating ? (
              <span className="ml-1 text-xs font-bold text-slate-500">
                {job.rating}/5
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}
