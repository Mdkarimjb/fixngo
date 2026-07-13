import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Plan {
  name: string;
  price: string;
  period: string;
  blurb: string;
  features: string[];
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    name: 'Visit & Diagnose',
    price: '₹99',
    period: 'per visit',
    blurb: 'Expert inspection at your doorstep.',
    features: [
      'Same-day technician visit',
      'Full diagnosis & quote',
      'Fee waived on repair',
      'No hidden charges',
    ],
  },
  {
    name: 'Standard Repair',
    price: '₹499',
    period: 'starting',
    blurb: 'Most booked — fix it in one visit.',
    features: [
      'Verified, trained professional',
      'Genuine spare parts',
      '30-day service warranty',
      'Live tracking + WhatsApp updates',
    ],
    popular: true,
  },
  {
    name: 'Annual Care (AMC)',
    price: '₹2,999',
    period: 'per year',
    blurb: 'Year-round protection for your home.',
    features: [
      '4 scheduled services / year',
      'Priority emergency support',
      '15% off all repairs',
      'Dedicated relationship manager',
    ],
  },
];

/** Pricing tiers styled with FixNGo design tokens (Trust & Authority). */
export function PricingSection() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 py-16">
      <div>
        <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.2em] text-primary/70">
          <span className="h-px w-8 bg-primary/40" aria-hidden="true" />
          Pricing
        </p>
        <h2 className="mt-3 font-heading text-3xl font-bold text-gray-900 md:text-4xl">
          Simple, transparent pricing
        </h2>
        <p className="mt-2 text-gray-500">No hidden charges — pay only for what you book</p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={`relative flex flex-col rounded-2xl bg-white p-6 transition-shadow ${
              p.popular
                ? 'ring-2 ring-primary shadow-lg'
                : 'ring-1 ring-gray-100 shadow-sm hover:shadow-md'
            }`}
          >
            {p.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                Most popular
              </span>
            )}
            <h3 className="font-heading text-lg font-bold text-gray-900">{p.name}</h3>
            <p className="mt-1 text-sm text-gray-500">{p.blurb}</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-heading text-4xl font-bold text-primary">{p.price}</span>
              <span className="text-sm text-gray-500">{p.period}</span>
            </div>
            <ul className="mt-5 space-y-3 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-gray-700">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/login"
              className={`mt-6 cursor-pointer rounded-full px-5 py-2.5 text-center text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                p.popular
                  ? 'bg-accent text-accent-foreground hover:opacity-90 focus-visible:ring-accent'
                  : 'bg-primary text-primary-foreground hover:bg-brand-dark focus-visible:ring-ring'
              }`}
            >
              Book now
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
