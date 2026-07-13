import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Phone, KeyRound, Wrench, ArrowRight, X } from "lucide-react";
import { api } from "../lib/api";
import { useAuth, decodeUser } from "../store/auth";
import { roleHomePath } from "../lib/utils";
import type { Tokens } from "../types";

/** OTP-based login (MSG91 on the backend). Two steps: request → verify. */
export function Login({
  modal = false,
  onClose,
}: {
  modal?: boolean;
  onClose?: () => void;
}) {
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDivElement>(null);
  const setSession = useAuth((s) => s.setSession);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!modal) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [modal, onClose]);

  async function requestOtp() {
    setLoading(true);
    setError(null);
    try {
      await api.post("/auth/otp/request", { phone });
      setStep("otp");
    } catch {
      setError("Could not send OTP. Check the number and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<Tokens>("/auth/otp/verify", {
        phone,
        code,
      });
      const user = decodeUser(data.accessToken);
      if (!user) throw new Error("bad token");
      setSession(user, data);
      navigate(roleHomePath(user.role), { replace: true });
    } catch {
      setError("Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const loginCard = (
    <div
      ref={dialogRef}
      role={modal ? "dialog" : undefined}
      aria-modal={modal || undefined}
      aria-labelledby="login-title"
      tabIndex={modal ? -1 : undefined}
      className="relative w-full max-w-sm rounded-3xl bg-white p-8 shadow-xl ring-1 ring-gray-100 outline-none"
    >
      {modal && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sign in"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="h-5 w-5" />
        </button>
      )}
      <Link
        to="/"
        className="flex items-center gap-2 font-heading text-2xl font-bold text-primary"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
          <Wrench className="h-5 w-5" />
        </span>
        FixNGo
      </Link>
      <h1
        id="login-title"
        className="mt-6 font-heading text-xl font-bold text-gray-900"
      >
        {step === "phone" ? "Sign in to continue" : "Enter the OTP"}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        {step === "phone"
          ? "We’ll send a one-time password to your mobile."
          : `Sent to ${phone}. Enter it below to continue.`}
      </p>

      {step === "phone" ? (
        <div className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700"
            >
              Mobile number
            </label>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-gray-200 px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30">
              <Phone className="h-4 w-4 shrink-0 text-gray-400" />
              <input
                id="phone"
                className="w-full bg-transparent py-2.5 text-sm outline-none"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
              />
            </div>
          </div>
          <button
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary py-2.5 font-semibold text-primary-foreground transition-colors hover:bg-brand-dark disabled:opacity-50"
            onClick={requestOtp}
            disabled={loading || phone.length < 10}
          >
            {loading ? "Sending…" : "Send OTP"}{" "}
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="text-center text-sm text-gray-500">
            New to FixNGo?{" "}
            <Link to="/signup" className="font-bold text-primary">
              Create an account
            </Link>
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="otp"
              className="block text-sm font-medium text-gray-700"
            >
              One-time password
            </label>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-gray-200 px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/30">
              <KeyRound className="h-4 w-4 shrink-0 text-gray-400" />
              <input
                id="otp"
                className="w-full bg-transparent py-2.5 text-sm tracking-widest outline-none"
                placeholder="Enter OTP"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            </div>
          </div>
          <button
            className="w-full cursor-pointer rounded-xl bg-accent py-2.5 font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            onClick={verifyOtp}
            disabled={loading || code.length < 4}
          >
            {loading ? "Verifying…" : "Verify & continue"}
          </button>
          <button
            className="w-full cursor-pointer text-center text-sm text-gray-500 underline"
            onClick={() => setStep("phone")}
          >
            Change number
          </button>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );

  if (modal) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose?.();
        }}
      >
        {loginCard}
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 px-4">
      {loginCard}
    </main>
  );
}
