@AGENTS.md

# Gastro System — Projekt-Kontext für Claude

## Was ist das?
Das `gastro-system` ist eine eigenständige **White-Label Gastro-SaaS-Plattform**, die aus Odi's Bowl herausgewachsen ist. Sie ist der technische Unterbau für das übergeordnete Produkt **FlowCore / Meso** — spezialisiert auf Gastronomie und Dienstleistungsbetriebe.

**Erster Zielkunde:** Haus des Döners, Rheine
**Demo-Deadline:** 7 Tage ab 2026-04-12
**Betreiber:** Sebastian Brüning (Kommandozentrale)

---

## Tech Stack

| Was | Womit |
|-----|-------|
| Framework | Next.js 16.2.3 (`--webpack` Flag wegen Turbopack/lightningcss-Bug) |
| Styling | Tailwind CSS v4 |
| Datenbank | Supabase (`eyjmccrmmwnoiaxsgtco`) |
| Auth | Supabase Auth |
| Sprache | TypeScript |
| Runtime | Node.js, React 19 |

**Wichtig:** `npm run dev` nutzt `--webpack`. Turbopack ist bewusst deaktiviert (Bug mit lightningcss-darwin-x64 in Next.js 16).

---

## Supabase

- **Projekt-ID:** `eyjmccrmmwnoiaxsgtco`
- **URL:** `https://eyjmccrmmwnoiaxsgtco.supabase.co`
- **Anon Key + Service Role:** in `.env.local`

### Kern-Tabellen

| Tabelle | Zweck |
|---------|-------|
| `restaurants` | Multi-Tenant Kern — jedes Restaurant ist ein Tenant |
| `menu_categories` | Kategorien pro Restaurant, mehrsprachig (DE/EN/TR) |
| `menu_items` | Menü-Items, flexibel für Bowl/Döner/Pizza etc. |
| `upsells` | Upsell-Angebote pro Restaurant |
| `gastro_orders` + `gastro_order_items` | Bestellungen mit Tisch-Tracking |
| `gastro_customers` | Kundendaten pro Restaurant |
| `gastro_stamp_cards` | Stempelkarten-System |
| `gastro_admin_users` | Admin-Accounts, Rollen (owner/admin/staff) |
| `meso_tasks` | Mitarbeiter-Tasks |
| `meso_sops` | Standard Operating Procedures, mehrsprachig |

### Aktive Restaurants (Tenants)

| Name | Slug | is_demo |
|------|------|---------|
| Odi's Bowl | `odis-bowl` | false |
| Haus des Döners | `haus-des-doeners` | true |

### RLS
Alle Tabellen RLS-geschützt. Public-Read-Policies für: `restaurants`, `menu_categories`, `menu_items`, `upsells`.

---

## Projekt-Struktur

```
gastro-system/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   ├── landing.css
│   ├── [slug]/               ← Multi-Tenant: alle Routen unter Restaurant-Slug
│   │   ├── layout.tsx        ← Restaurant-Layout (lädt Restaurant per Slug)
│   │   ├── page.tsx          ← Redirect → /[slug]/landing oder /[slug]/order
│   │   ├── landing/          ← Landing Page (Hero, Menü, VIP) ✅
│   │   ├── order/            ← Bestellseite (Kategorie-Nav, Items, Warenkorb) ✅
│   │   ├── bestellung/       ← Checkout-Flow ✅
│   │   ├── qr/               ← QR-Scan-Landing (Tracking + Redirect) ✅
│   │   ├── konto/            ← Kundenkonto ✅
│   │   ├── kustomizer/       ← Restaurant-Konfiguration ✅
│   │   ├── auth/             ← Auth + Callback ✅
│   │   └── admin/            ← Admin-Dashboard ✅
│   │       ├── page.tsx
│   │       ├── layout.tsx
│   │       ├── admin-client.tsx
│   │       ├── admin-panel.css
│   │       └── views/
│   │           ├── bestellungen-view.tsx  ← Live-Bestellungen + Status ✅
│   │           ├── speisekarte-view.tsx   ← Menü CRUD ✅
│   │           ├── qr-view.tsx            ← QR-Codes + Analytics ✅
│   │           ├── team-view.tsx          ← MESO Light (Tasks/SOPs/Übergabe) ✅
│   │           ├── kunden-view.tsx        ← Kundenverwaltung ✅
│   │           └── einstellungen-view.tsx ← Restaurant-Einstellungen ✅
│   └── api/
│       └── [slug]/           ← Alle API-Routen unter Restaurant-Slug
│           ├── admin/        ← Admin-APIs (auth, menu, orders, qr, meso, etc.)
│           ├── auth/
│           ├── bestellung/   ← Checkout-API (schreibt gastro_orders) ✅
│           ├── orders/
│           └── qr-scan/      ← QR-Tracking-API ✅
├── lib/
│   ├── supabase.ts           ← Browser + Server Client
│   └── menu.ts               ← DB-Queries
├── .env.local                ← Supabase Keys (nicht in Git!)
├── ROADMAP.md                ← Vollständige Produkt-Roadmap
└── package.json
```

---

## Kern-Features (aktueller Stand)

### Customer-Flow ✅ Fertig
- `[slug]/landing` — Landing Page mit Hero, Menü-Vorschau, VIP
- `[slug]/order` — Bestellseite (Kategorie-Nav, Item-Grid, Upsell-Modal, Warenkorb)
- `[slug]/bestellung` — Checkout-Flow, schreibt `gastro_orders` + `gastro_order_items`
- `[slug]/qr` — QR-Scan-Landing, feuert Tracking, leitet zu `/order` weiter
- Tisch-Tracking aus URL-Param `?table=3`
- Demo-Banner wenn `is_demo = true`

### Admin-Dashboard ✅ Fertig
- Auth (Supabase, Rollen: owner/admin/staff)
- Bestellungen: Live-Refresh, Sound-Notification, Status-Flow
- Speisekarte: Kategorien, Items, Upsells CRUD (image_url vorbereitet)
- QR-Codes: CRUD (Tisch/Theke/Box), Batch, PNG/PDF-Export, Analytics
- Team (MESO Light): Tasks, SOPs, Schichtübergabe
- Kunden + Einstellungen

### Noch offen (Roadmap)
- Produkt-Fotos (Supabase Storage + Upload-UI)
- Zutaten-Verwaltung (neue Tabellen + Admin-View)
- `/[slug]/meso` Staff-Interface (mobile-first für Mitarbeiter)
- Demo-Menüdaten für `haus-des-doeners` befüllen
- Netlify Deploy
- Multilingual Layer DE/EN/TR

---

## Konventionen & Regeln

1. **Immer `restaurant_id`** auf neuen Tabellen — kein Single-Tenant
2. **`is_demo = true`** → keine echten DB-Schreibvorgänge bei Bestellungen
3. **Preise serverseitig validieren** bei Checkout
4. **Mobile-first** — max-w-md, Touch-Targets ≥ 44px
5. **Akzentfarbe** immer aus `restaurant.primary_color` — nie hardcoded
6. **`.env.local` niemals in Git** — Service Role Key nur serverseitig
7. **Next.js 16 Docs lesen** vor neuem Code (Breaking Changes!) — `node_modules/next/dist/docs/`

---

## Schnellstart

```bash
cd ~/Kommandozentrale/gastro-system
npm run dev
# → http://localhost:3000/order?r=odis-bowl
# → http://localhost:3000/order?r=haus-des-doeners  (Demo)
```

---

*Stand: 2026-04-20 — Multi-Tenant `[slug]`-Routing, Landing Page, Checkout, vollständiges Admin-Dashboard, QR-System, MESO Light (Admin) fertig. Nächster Schritt: Produkt-Fotos, Zutaten, Deploy.*
