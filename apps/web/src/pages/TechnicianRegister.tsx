import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, MapPin, Phone, UserRound, Wrench, X } from "lucide-react";
import { api } from "../lib/api";
import { CITY_OPTIONS, locationsForCity } from "../lib/cities";
import { decodeUser, useAuth } from "../store/auth";
import type { Tokens } from "../types";
import { apiErrorMessage, roleHomePath } from "../lib/utils";

type AccountRole = "CUSTOMER" | "TECHNICIAN";

export function Signup({
  modal = false,
  onClose,
}: {
  modal?: boolean;
  onClose?: () => void;
}) {
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLFormElement>(null);
  const setSession = useAuth((state) => state.setSession);
  const [role, setRole] = useState<AccountRole>("CUSTOMER");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Guntur");
  const [location, setLocation] = useState("Brodipet");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<Tokens>("/auth/register", {
        fullName: fullName.trim(),
        phone,
        role,
        ...(role === "TECHNICIAN" ? { city, location } : {}),
      });
      const user = decodeUser(data.accessToken);
      if (!user) throw new Error("Account token could not be read");
      setSession(user, data);
      navigate(roleHomePath(user.role), { replace: true });
    } catch (requestError) {
      setError(
        apiErrorMessage(requestError, "Your account could not be created."),
      );
    } finally {
      setLoading(false);
    }
  }

  const signupForm = (
    <form
      ref={dialogRef}
      role={modal ? "dialog" : undefined}
      aria-modal={modal || undefined}
      tabIndex={modal ? -1 : undefined}
      onSubmit={submit}
      className="relative w-full max-w-lg rounded-3xl bg-white p-7 shadow-xl ring-1 ring-slate-100 outline-none sm:p-9"
    >
      {modal ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close signup"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
      ) : null}
      <Link
        to="/"
        className="flex items-center gap-2 font-heading text-2xl font-bold text-primary"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
          <Wrench className="h-5 w-5" />
        </span>
        FixNGo
      </Link>
      <h1 className="mt-6 font-heading text-2xl font-bold">
        Create your account
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Join FixNGo as a customer or as a service technician.
      </p>

      <fieldset className="mt-6">
        <legend className="text-sm font-bold text-slate-700">
          I want to join as
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {(["CUSTOMER", "TECHNICIAN"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRole(option)}
              className={`rounded-xl border px-4 py-3 text-sm font-bold transition ${role === option ? "border-primary bg-blue-50 text-primary ring-2 ring-blue-100" : "border-slate-200 text-slate-600 hover:border-blue-300"}`}
            >
              {option === "CUSTOMER" ? "Customer" : "Technician"}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-700 sm:col-span-2">
          Full name
          <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:ring-2 focus-within:ring-blue-100">
            <UserRound className="h-4 w-4 text-slate-400" />
            <input
              required
              minLength={2}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full py-2.5 outline-none"
            />
          </div>
        </label>
        <label className="text-sm font-bold text-slate-700 sm:col-span-2">
          Mobile number
          <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:ring-2 focus-within:ring-blue-100">
            <Phone className="h-4 w-4 text-slate-400" />
            <input
              required
              inputMode="tel"
              minLength={10}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full py-2.5 outline-none"
              placeholder="10-digit mobile number"
            />
          </div>
        </label>
        {role === "TECHNICIAN" ? (
          <>
            <label className="text-sm font-bold text-slate-700">
              Service city
              <select
                value={city}
                onChange={(event) => {
                  const nextCity = event.target.value;
                  setCity(nextCity);
                  setLocation(locationsForCity(nextCity)[0] ?? "");
                }}
                className="dashboard-input mt-1.5"
              >
                {CITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-bold text-slate-700">
              Service location
              <div className="relative mt-1.5">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                <select
                  required
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className="dashboard-input pl-10"
                >
                  {locationsForCity(city).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <p className="text-xs leading-5 text-slate-500 sm:col-span-2">
              Job offers will be sent for customers selecting this exact service
              location. You can update it later from your technician profile.
            </p>
          </>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={
          loading ||
          !fullName.trim() ||
          phone.length < 10 ||
          (role === "TECHNICIAN" && !location)
        }
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-50"
      >
        {loading
          ? "Creating account…"
          : `Create ${role === "CUSTOMER" ? "customer" : "technician"} account`}
        <ArrowRight className="h-4 w-4" />
      </button>
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}
      <p className="mt-5 text-center text-sm text-slate-500">
        Already registered?{" "}
        <Link to="/login" className="font-bold text-primary">
          Sign in
        </Link>
      </p>
    </form>
  );

  if (modal) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/60 px-4 py-8 backdrop-blur-sm sm:items-center"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose?.();
        }}
      >
        {signupForm}
      </div>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-orange-50 px-4 py-10">
      {signupForm}
    </main>
  );
}
