# FixNGo Homepage Redesign

The public homepage now follows the approved desktop and mobile reference while preserving the existing role-based React application.

## Included

- Responsive desktop marketing homepage with location selector, hero search, technician imagery, live booking tracker, trust strip, service discovery, customer review, and booking CTA.
- Mobile-first PWA home with two-column services, active booking card, and persistent five-item bottom navigation.
- Generated and optimized FixNGo hero and service-category imagery.
- Installable PWA manifest, service worker, offline precache, theme colors, and maskable SVG app icon.
- Modern authenticated dashboard shell with responsive sidebar, mobile navigation, global search, notifications, profile controls, and role-aware navigation.
- Customer workspace with service metrics, quick booking, live job activity, marketplace management, and protection benefits.
- Technician workspace with availability and live-location controls, job progression, daily earnings, ratings, and performance indicators.
- Admin workspace with operational KPIs, searchable/filterable job management, revenue visualization, and service-health alerts.

## Run locally

```bash
npm install
npm run dev:web
```

## Production build

```bash
npm --workspace apps/web run build
```
