import { Link, Navigate, useLocation, type LinkProps } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Apple,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  Grid2X2,
  Home as HomeIcon,
  MapPin,
  Play,
  Plus,
  PackageSearch,
  Phone,
  Search,
  ShieldCheck,
  Star,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../store/auth";
import { roleHomePath } from "../lib/utils";
import { api } from "../lib/api";
import { CITY_OPTIONS } from "../lib/cities";

interface PublicListing {
  id: string;
  referenceCode: string;
  city: string;
  title: string;
  description: string | null;
  imageUrls: string[];
  pricePaise: number;
  createdAt: string;
  customer: { fullName: string };
}

interface Service {
  name: string;
  mobileName?: string;
  price: number;
  sprite: number;
}
const SERVICES: Service[] = [
  { name: "AC Repair", price: 299, sprite: 0 },
  { name: "Plumbing", price: 149, sprite: 1 },
  { name: "Electrical", price: 149, sprite: 2 },
  { name: "Home Cleaning", price: 399, sprite: 3 },
  { name: "Carpentry", price: 109, sprite: 4 },
  { name: "Pest Control", price: 599, sprite: 5 },
  { name: "Salon at Home", mobileName: "Salon at Home", price: 199, sprite: 6 },
  { name: "Painting", price: 999, sprite: 7 },
];

const POPULAR = [
  "AC Repair",
  "Deep Cleaning",
  "Plumbing",
  "Electrical",
  "Salon at Home",
];

function LoginLink({ children, ...props }: Omit<LinkProps, "to" | "state">) {
  const location = useLocation();
  return (
    <Link to="/login" state={{ backgroundLocation: location }} {...props}>
      {children}
    </Link>
  );
}

function SignupLink({ children, ...props }: Omit<LinkProps, "to" | "state">) {
  const location = useLocation();
  return (
    <Link to="/signup" state={{ backgroundLocation: location }} {...props}>
      {children}
    </Link>
  );
}

export function Home() {
  const user = useAuth((s) => s.user);
  const [city, setCity] = useState("Guntur");
  if (user) return <Navigate to={roleHomePath(user.role)} replace />;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-950">
      <DesktopHeader city={city} onCityChange={setCity} />
      <MobileHeader city={city} onCityChange={setCity} />

      <main className="hidden lg:block">
        <DesktopHero />
        <TrustStrip />
        <DesktopServices />
        <DesktopHighlights />
      </main>

      <main className="mx-auto max-w-lg px-4 pb-10 pt-5 lg:hidden">
        <MobileHome />
      </main>

      <MarketplaceSection city={city} />

      <SiteFooter />
      <MobileNav />
    </div>
  );
}

function DesktopHeader({
  city,
  onCityChange,
}: {
  city: string;
  onCityChange: (city: string) => void;
}) {
  return (
    <header className="sticky top-0 z-50 hidden border-b border-slate-100 bg-white/95 backdrop-blur lg:block">
      <div className="mx-auto flex h-[72px] max-w-[1360px] items-center px-8">
        <Link
          to="/"
          className="font-heading text-[30px] font-bold leading-none text-primary"
        >
          FixNGo
        </Link>
        <label className="relative ml-8 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-primary/40">
          <MapPin className="h-4 w-4 text-primary" />
          <select
            aria-label="Select city"
            value={city}
            onChange={(event) => onCityChange(event.target.value)}
            className="appearance-none bg-transparent pr-5 outline-none"
          >
            {CITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 h-4 w-4 text-slate-400" />
        </label>
        <nav className="ml-auto flex items-center gap-10 text-sm font-medium text-slate-700">
          <a href="#services" className="hover:text-primary">
            Services
          </a>
          <a href="#marketplace" className="hover:text-primary">
            Marketplace
          </a>
          <a href="#why" className="hover:text-primary">
            Why us
          </a>
          <a href="#how" className="hover:text-primary">
            How it works
          </a>
          <a href="#reviews" className="hover:text-primary">
            Reviews
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <LoginLink className="rounded-lg border border-primary px-5 py-2.5 text-sm font-bold text-primary transition hover:bg-blue-50">
            Sign in
          </LoginLink>
          <SignupLink className="rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700">
            Create account
          </SignupLink>
        </div>
      </div>
    </header>
  );
}

function MobileHeader({
  city,
  onCityChange,
}: {
  city: string;
  onCityChange: (city: string) => void;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        <label className="relative inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold">
          <MapPin className="h-4 w-4 text-primary" />
          <select
            aria-label="Select city"
            value={city}
            onChange={(event) => onCityChange(event.target.value)}
            className="max-w-28 appearance-none bg-transparent pr-4 outline-none"
          >
            {CITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-slate-400" />
        </label>
        <Link to="/" className="font-heading text-xl font-bold text-primary">
          FixNGo
        </Link>
        <SignupLink className="rounded-lg bg-accent px-3 py-2 text-xs font-bold text-white">
          Sign up
        </SignupLink>
      </div>
    </header>
  );
}

function SearchBox({ mobile = false }: { mobile?: boolean }) {
  return (
    <form
      onSubmit={(event) => event.preventDefault()}
      className={`flex items-center rounded-xl border border-slate-200 bg-white shadow-sm ${mobile ? "mt-4 px-3" : "mt-7 max-w-xl p-1.5"}`}
    >
      <Search className="h-5 w-5 shrink-0 text-slate-400" />
      <input
        aria-label="Search services"
        className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-slate-400"
        placeholder="What service do you need?"
      />
      {!mobile && (
        <LoginLink className="rounded-lg bg-accent px-6 py-3 text-sm font-bold text-white hover:bg-orange-700">
          Search
        </LoginLink>
      )}
    </form>
  );
}

function DesktopHero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#f5f8ff]">
      <img
        src="/images/fixngo-hero.webp"
        alt="FixNGo technician servicing an air conditioner"
        className="absolute inset-y-0 right-0 -z-10 h-full w-[58%] object-cover object-center"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#f5f8ff_0%,#f5f8ff_39%,rgba(245,248,255,.92)_46%,rgba(245,248,255,.05)_73%)]" />
      <div className="mx-auto grid min-h-[450px] max-w-[1360px] grid-cols-[1.08fr_.92fr] items-center gap-8 px-8 py-10">
        <div className="max-w-[620px]">
          <h1 className="font-heading text-[64px] font-bold leading-[.98] tracking-[-.025em] text-slate-950">
            Fixed today,
            <br />
            not <em className="text-primary">someday</em>.
          </h1>
          <p className="mt-5 text-lg text-slate-600">
            Verified home services, with upfront pricing and live tracking.
          </p>
          <SearchBox />
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span className="mr-1">Popular:</span>
            {POPULAR.map((item) => (
              <LoginLink
                key={item}
                className="rounded-full border border-slate-200 bg-white/75 px-3 py-1.5 text-xs hover:border-primary hover:text-primary"
              >
                {item}
              </LoginLink>
            ))}
          </div>
        </div>
        <div className="relative h-full" aria-hidden="true" />
      </div>
    </section>
  );
}

function TrustStrip() {
  const items: Array<{ icon: LucideIcon; value: string; label: string }> = [
    { icon: Star, value: "4.8", label: "Service rating" },
    { icon: BriefcaseBusiness, value: "50,000+", label: "Jobs completed" },
    { icon: ShieldCheck, value: "Background-verified", label: "Professionals" },
    { icon: ShieldCheck, value: "30-day", label: "Service warranty" },
  ];
  return (
    <div id="why" className="relative z-10 mx-auto -mt-1 max-w-[1240px] px-8">
      <div className="grid grid-cols-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-lg shadow-slate-200/60">
        {items.map((item, index) => (
          <div
            key={item.value}
            className={`flex items-center justify-center gap-4 px-5 ${index ? "border-l border-slate-200" : ""}`}
          >
            <item.icon
              className={`h-8 w-8 text-primary ${item.icon === Star ? "fill-primary" : ""}`}
            />
            <div>
              <p className="font-heading text-[23px] font-bold leading-none text-slate-950">
                {item.value}
              </p>
              <p className="mt-1 text-xs text-slate-500">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServicePhoto({
  index,
  className = "",
}: {
  index: number;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`${SERVICES[index].name} professional`}
      className={`service-photo service-photo-${index} ${className}`}
    />
  );
}

function DesktopServices() {
  return (
    <section id="services" className="mx-auto max-w-[1360px] px-8 py-8">
      <div className="flex items-end justify-between">
        <h2 className="font-heading text-3xl font-bold">
          Top services for your home
        </h2>
        <LoginLink className="flex items-center gap-1 text-sm font-bold text-primary">
          View all services <ArrowRight className="h-4 w-4" />
        </LoginLink>
      </div>
      <div className="mt-5 grid grid-cols-4 gap-3 xl:grid-cols-8">
        {SERVICES.map((service) => (
          <LoginLink
            key={service.name}
            className="group overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <ServicePhoto
              index={service.sprite}
              className="h-[122px] rounded-lg"
            />
            <div className="px-1 pb-2 pt-3">
              <p className="truncate text-sm font-bold">{service.name}</p>
              <p className="mt-1 flex items-center justify-between text-xs text-slate-500">
                from ₹{service.price}
                <ArrowRight className="h-4 w-4 text-primary transition group-hover:translate-x-0.5" />
              </p>
            </div>
          </LoginLink>
        ))}
      </div>
    </section>
  );
}

function DesktopHighlights() {
  return (
    <section className="mx-auto grid max-w-[1360px] grid-cols-[1.05fr_.95fr_.72fr] gap-5 px-8 pb-10 pt-1">
      <div
        id="how"
        className="rounded-2xl border border-slate-200 bg-white p-6"
      >
        <h2 className="font-heading text-2xl font-bold">How it works</h2>
        <p className="text-sm text-slate-500">Three simple steps</p>
        <div className="relative mt-7 grid grid-cols-3 gap-4 text-center before:absolute before:left-[16%] before:right-[16%] before:top-4 before:border-t before:border-dashed before:border-slate-300">
          {[
            ["Pick a service", "Choose from home services."],
            ["Book a slot", "Share your preferred time."],
            ["We get it done", "Track your verified pro."],
          ].map(([title, text], index) => (
            <div key={title} className="relative">
              <span className="relative mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-primary font-heading text-lg font-bold text-white">
                {index + 1}
              </span>
              <p className="mt-3 text-sm font-bold">{title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </div>
      <div
        id="reviews"
        className="rounded-2xl border border-slate-200 bg-white p-6"
      >
        <h2 className="font-heading text-2xl font-bold">What customers say</h2>
        <div className="mt-4 rounded-xl border border-slate-100 p-5 text-center">
          <div className="flex justify-center gap-0.5 text-amber-400">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} className="h-4 w-4 fill-current" />
            ))}
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            “Technician arrived on time, fixed the issue quickly and explained
            everything. Great experience!”
          </p>
          <p className="mt-3 text-sm font-bold">
            Priya M.{" "}
            <span className="font-normal text-slate-500">· Guntur</span>
          </p>
          <p className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
            <ShieldCheck className="h-4 w-4" /> Verified review
          </p>
        </div>
      </div>
      <div className="rounded-2xl bg-primary p-6 text-white shadow-lg">
        <h2 className="font-heading text-2xl font-bold">
          Ready to get started?
        </h2>
        <p className="mt-1 text-sm text-blue-100">
          Book a trusted professional in minutes.
        </p>
        <ul className="mt-5 space-y-2 text-sm">
          {[
            "Upfront pricing",
            "Verified professionals",
            "Live tracking",
            "Pay after service",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              {item}
            </li>
          ))}
        </ul>
        <LoginLink className="mt-6 block rounded-lg bg-accent px-4 py-3 text-center text-sm font-bold text-white hover:bg-orange-700">
          Book a Service Now
        </LoginLink>
      </div>
    </section>
  );
}

function MobileHome() {
  return (
    <>
      <h1 className="font-heading text-3xl font-bold">
        Hello, Vijay! <span aria-hidden="true">👋</span>
      </h1>
      <p className="mt-1 text-sm text-slate-500">How can we help you today?</p>
      <SearchBox mobile />
      <div className="mt-5 grid grid-cols-2 gap-3">
        {SERVICES.map((service) => (
          <LoginLink
            key={service.name}
            className="flex min-h-[92px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <ServicePhoto index={service.sprite} className="w-[42%] shrink-0" />
            <div className="min-w-0 self-center px-3 py-2">
              <p className="text-[13px] font-bold leading-tight">
                {service.mobileName || service.name}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                from ₹{service.price}
              </p>
            </div>
          </LoginLink>
        ))}
      </div>
      <LoginLink className="mt-4 flex items-center justify-center gap-1 text-sm font-bold text-primary">
        View all services <ArrowRight className="h-4 w-4" />
      </LoginLink>
    </>
  );
}

function MarketplaceSection({ city }: { city: string }) {
  const [selected, setSelected] = useState<PublicListing | null>(null);
  const listings = useQuery({
    queryKey: ["marketplace", "public"],
    queryFn: async () =>
      (await api.get<PublicListing[]>("/marketplace/listings")).data,
  });
  const items = (listings.data ?? []).filter((item) => item.city === city);

  return (
    <>
      <section
        id="marketplace"
        className="scroll-mt-24 border-y border-slate-200 bg-white"
      >
        <div className="mx-auto max-w-[1360px] px-4 py-10 sm:px-8 lg:py-14">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-violet-600">
                Community marketplace
              </p>
              <h2 className="mt-2 font-heading text-3xl font-bold text-slate-950">
                Pre-owned products near you
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Products listed directly by FixNGo customers in {city}.
              </p>
            </div>
            <LoginLink className="inline-flex items-center gap-1 text-sm font-bold text-primary">
              Sell a product <ArrowRight className="h-4 w-4" />
            </LoginLink>
          </div>

          {listings.isLoading ? (
            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-56 animate-pulse rounded-2xl bg-slate-100"
                />
              ))}
            </div>
          ) : listings.isError ? (
            <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-sm text-red-700">
              Marketplace products could not be loaded right now.
            </div>
          ) : items.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {items.map((item, index) => (
                <MarketplaceCard
                  key={item.id}
                  item={item}
                  index={index}
                  onOpen={() => setSelected(item)}
                />
              ))}
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <PackageSearch className="h-9 w-9 text-slate-300" />
              <p className="mt-3 font-bold">No products listed yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Customer products will appear here as soon as they are listed.
              </p>
            </div>
          )}
        </div>
      </section>
      {selected && (
        <MarketplaceDetails
          key={selected.id}
          item={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function MarketplaceCard({
  item,
  index,
  onOpen,
}: {
  item: PublicListing;
  index: number;
  onOpen: () => void;
}) {
  const colors = [
    "from-violet-100 to-indigo-50 text-violet-600",
    "from-blue-100 to-cyan-50 text-blue-600",
    "from-orange-100 to-amber-50 text-orange-600",
    "from-emerald-100 to-teal-50 text-emerald-600",
  ];
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`View details for ${item.title}`}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {item.imageUrls[0] ? (
        <img
          src={item.imageUrls[0]}
          alt={item.title}
          className="h-28 w-full bg-slate-100 object-cover transition duration-300 group-hover:scale-105 sm:h-36"
        />
      ) : (
        <div
          className={`flex h-28 items-center justify-center bg-gradient-to-br sm:h-36 ${colors[index % colors.length]}`}
        >
          <PackageSearch className="h-12 w-12 transition group-hover:scale-110" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-bold text-slate-900">
            {item.title}
          </h3>
          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase text-emerald-700">
            Available
          </span>
        </div>
        {item.description && (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
            {item.description}
          </p>
        )}
        <p className="mt-3 font-heading text-2xl font-bold text-slate-950">
          ₹{(item.pricePaise / 100).toLocaleString("en-IN")}
        </p>
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400">
          <span className="truncate">
            {item.city} · {item.referenceCode}
          </span>
          <span className="shrink-0">
            {new Date(item.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>
      </div>
      <span className="sr-only">
        View product details and contact FixNGo support
      </span>
    </button>
  );
}

function MarketplaceDetails({
  item,
  onClose,
}: {
  item: PublicListing;
  onClose: () => void;
}) {
  const [activeImage, setActiveImage] = useState(item.imageUrls[0] ?? null);
  const supportPhone =
    import.meta.env.VITE_SUPPORT_PHONE?.trim() || "+919876500000";
  const displayPhone = supportPhone.replace(
    /^(\+91)(\d{5})(\d{5})$/,
    "$1 $2 $3",
  );

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", keydown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="marketplace-item-title"
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-4xl sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-violet-600">
              Pre-owned marketplace · {item.referenceCode}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">
              Listed in {item.city} by {item.customer.fullName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product details"
            className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-[1.08fr_.92fr]">
          <div>
            {activeImage ? (
              <img
                src={activeImage}
                alt={item.title}
                className="aspect-[4/3] w-full rounded-2xl bg-slate-100 object-contain"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-50 text-violet-500">
                <PackageSearch className="h-20 w-20" />
              </div>
            )}
            {item.imageUrls.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {item.imageUrls.map((url, index) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setActiveImage(url)}
                    aria-label={`View product photo ${index + 1}`}
                    className={`aspect-square overflow-hidden rounded-xl border-2 ${activeImage === url ? "border-primary ring-2 ring-blue-100" : "border-transparent"}`}
                  >
                    <img
                      src={url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <h2
                id="marketplace-item-title"
                className="font-heading text-3xl font-bold leading-tight text-slate-950"
              >
                {item.title}
              </h2>
              <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase text-emerald-700">
                Available
              </span>
            </div>
            <p className="mt-4 font-heading text-4xl font-bold text-primary">
              ₹{(item.pricePaise / 100).toLocaleString("en-IN")}
            </p>
            <div className="mt-5 border-t border-slate-100 pt-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Item details
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                {item.description ||
                  "The seller has not added a detailed description for this item."}
              </p>
            </div>
            <div className="mt-5 rounded-2xl bg-blue-50 p-4">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Seller contact stays private
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    FixNGo support coordinates buyer enquiries. The seller’s
                    phone number is never displayed publicly.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-auto pt-5">
              <p className="text-xs text-slate-500">
                Interested in this product? Call FixNGo customer support:
              </p>
              <a
                href={`tel:${supportPhone.replace(/\s/g, "")}`}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700"
              >
                <Phone className="h-5 w-5" /> Call {displayPhone}
              </a>
              <p className="mt-2 text-center text-[10px] text-slate-400">
                Quote item {item.referenceCode} when calling
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const FOOTER_COLUMNS = [
  {
    title: "Company",
    links: [
      "About us",
      "Terms & conditions",
      "Privacy policy",
      "Anti-discrimination policy",
      "Careers",
    ],
  },
  {
    title: "For customers",
    links: ["FixNGo reviews", "Services near you", "Contact us"],
  },
  {
    title: "For professionals",
    links: ["Register as a professional"],
  },
];

function SiteFooter() {
  const socialLinks = [
    { label: "X", mark: "X" },
    { label: "Facebook", mark: "f" },
    { label: "Instagram", mark: "ig" },
    { label: "LinkedIn", mark: "in" },
    { label: "YouTube", mark: "" },
  ];

  return (
    <footer className="bg-[#101010] pb-28 text-white lg:pb-0">
      <div className="mx-auto max-w-[1360px] px-6 py-10 sm:px-8 lg:py-14">
        <Link
          to="/"
          className="inline-block font-heading text-[30px] font-bold leading-none text-white transition hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          FixNGo
        </Link>

        <div className="mt-9 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_1.25fr] lg:gap-12">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h2 className="font-body text-base font-bold text-white">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-3">
                {column.links.map((item) => (
                  <li key={item}>
                    <LoginLink className="text-sm text-zinc-400 transition hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                      {item}
                    </LoginLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <h2 className="font-body text-base font-bold text-white">
              Social links
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {socialLinks.map((item) => (
                <a
                  key={item.label}
                  href="#"
                  aria-label={item.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 text-zinc-300 transition hover:border-zinc-400 hover:bg-white hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {item.mark ? (
                    <span
                      aria-hidden="true"
                      className="text-xs font-bold tracking-tight"
                    >
                      {item.mark}
                    </span>
                  ) : (
                    <Play aria-hidden="true" className="h-4 w-4 fill-current" />
                  )}
                </a>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3 lg:flex-col xl:flex-row">
              <a
                href="#"
                aria-label="Download FixNGo on the App Store"
                className="inline-flex min-w-[154px] items-center gap-2.5 rounded-lg border border-zinc-600 bg-black px-3 py-2 text-white transition hover:border-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Apple className="h-7 w-7 fill-white" />
                <span>
                  <span className="block text-[9px] uppercase leading-none text-zinc-300">
                    Download on the
                  </span>
                  <span className="mt-1 block text-base font-bold leading-none">
                    App Store
                  </span>
                </span>
              </a>
              <a
                href="#"
                aria-label="Get FixNGo on Google Play"
                className="inline-flex min-w-[154px] items-center gap-2.5 rounded-lg border border-zinc-600 bg-black px-3 py-2 text-white transition hover:border-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Play className="h-7 w-7 fill-white" />
                <span>
                  <span className="block text-[9px] uppercase leading-none text-zinc-300">
                    Get it on
                  </span>
                  <span className="mt-1 block text-base font-bold leading-none">
                    Google Play
                  </span>
                </span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-zinc-800 pt-6 text-xs leading-5 text-zinc-500 lg:mt-12">
          <p>
            © Copyright 2026 FixNGo Technologies Private Limited. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

function MobileNav() {
  const nav: Array<{ icon: LucideIcon; label: string }> = [
    { icon: HomeIcon, label: "Home" },
    { icon: Grid2X2, label: "Services" },
    { icon: Plus, label: "Book" },
    { icon: CalendarDays, label: "Bookings" },
    { icon: UserRound, label: "Account" },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white px-2 pb-[max(.6rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,.08)] lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {nav.map((item, index) => {
          const content = (
            <>
              <span
                className={
                  index === 2
                    ? "-mt-7 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-accent text-white shadow-lg"
                    : "flex h-7 items-center"
                }
              >
                <item.icon className={index === 2 ? "h-7 w-7" : "h-5 w-5"} />
              </span>
              {item.label}
            </>
          );
          const className = `flex flex-col items-center gap-1 text-[10px] font-bold ${index === 0 ? "text-primary" : "text-slate-500"}`;
          return index === 0 ? (
            <Link to="/" key={item.label} className={className}>
              {content}
            </Link>
          ) : (
            <LoginLink key={item.label} className={className}>
              {content}
            </LoginLink>
          );
        })}
      </div>
    </nav>
  );
}
