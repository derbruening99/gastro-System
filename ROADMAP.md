# Gastro System — Produkt-Roadmap (Ist-Stand & Plan)

> **🔔 AKTUELLER FOKUS**
> **Phase 9 — Gastro System / White-Label Plattform** (STRATEGISCHER SHIFT — 2026-04-12):
> Odi's Bowl wird zum **Prototyp eines skalierbaren Gastro-SaaS-Produkts**.
> Ziel: Demo-ready für externe Kunden (z. B. Haus des Döners Rheine).
> Stand 2026-04-20: Multi-Tenant-Routing via `[slug]` ✅, Landing Page ✅, Auth ✅, Order-Flow + Checkout ✅, Admin-Dashboard vollständig ✅, QR-System + Analytics ✅, MESO Light (Admin) ✅.
> **Nächster Schritt: Produkt-Fotos (Upload), Zutaten-Verwaltung, Demo-Menüdaten, Netlify Deploy.**

---

## Phase 9 — Gastro System / White-Label Plattform 🚀

> **STRATEGISCHER SHIFT — 2026-04-12**
> Odi's Bowl wird vom Einzel-Projekt zum **skalierbaren Gastro-SaaS-Produkt**.
> Erster externer Zielkunde: **Haus des Döners, Rheine**.

### Routing & Architektur

> **Multi-Tenant via `[slug]`** — alle Routen unter `app/[slug]/...`. Jedes Restaurant hat seinen eigenen URL-Namespace.

| Punkt | Status | Anmerkung |
|--------|--------|-----------|
| **Multi-Tenant Routing `[slug]`** | **Erledigt** ✅ | `app/[slug]/` — Restaurant-Slug in URL, kein Query-Param mehr. |
| **`restaurants`-Tabelle** | **Erledigt** ✅ | `id`, `name`, `slug`, `primary_color`, `default_lang`, `is_demo`, `is_active`. |
| **`menu_categories`-Tabelle** | **Erledigt** ✅ | Multi-tenant, mehrsprachig (DE/EN/TR). |
| **`menu_items`-Tabelle** | **Erledigt** ✅ | Flexibel für Bowl, Döner, Pizza, anything. `image_url`-Spalte vorhanden. |
| **`item_modifier_groups` + `item_modifiers`** | **Erledigt** ✅ | Flexible Optionen pro Item. |
| **`upsells`-Tabelle** | **Erledigt** ✅ | Pro Restaurant, mehrsprachig, sortierbar. `image_url`-Spalte vorhanden. |
| **`gastro_orders` + `gastro_order_items`** | **Erledigt** ✅ | Tisch-Tracking, Sprachwahl, Status-Flow. |
| **`gastro_admin_users`-Tabelle** | **Erledigt** ✅ | Verknüpft mit Supabase Auth, Rollen (owner/admin/staff). |
| **`meso_tasks`-Tabelle** | **Erledigt** ✅ | Tasks mit Status, Zuweisung, Deadline. |
| **`meso_sops`-Tabelle** | **Erledigt** ✅ | Steps als JSONB, mehrsprachig (DE/EN/TR). |
| **`meso_shift_handovers`-Tabelle** | **Erledigt** ✅ | Schichtübergabe-Protokoll. |
| **`qr_codes`-Tabelle** | **Erledigt** ✅ | Gespeicherte QR-Codes pro Restaurant (Tisch/Theke/Box). |
| **`qr_scans`-Tabelle** | **Erledigt** ✅ | Tracking mit IP-Hashing, Conversion-Flag. |
| **RLS aktiviert** | **Erledigt** ✅ | Alle Tabellen RLS-geschützt. |

---

### 9.1 — Landing Page & Customer-Flow ✅

| Punkt | Status | Anmerkung |
|--------|--------|-----------|
| **`/[slug]` Landing Page** | **Erledigt** ✅ | Hero, Menü-Section, VIP-Section, Scroll-Effekte. |
| **`/[slug]/order` Bestellseite** | **Erledigt** ✅ | Kategorie-Nav, Item-Grid, Upsell-Modal, Warenkorb-Bar, Demo-Banner. |
| **Checkout-Flow** | **Erledigt** ✅ | `gastro_orders` + `gastro_order_items` werden geschrieben. API `/api/[slug]/bestellung`. |
| **Tisch-Tracking** | **Erledigt** ✅ | `?table=3` aus URL, wird in Bestellung gespeichert. |
| **Demo-Banner** | **Erledigt** ✅ | `is_demo = true` → Hinweis-Banner. |
| **`/[slug]/konto` Kundenkonto** | **Erledigt** ✅ | Persönliches Konto, Bestellhistorie. |
| **`/[slug]/kustomizer`** | **Erledigt** ✅ | Restaurant-Konfiguration (Farben, Einstellungen). |
| **Demo-Menüdaten `haus-des-doeners`** | **Fehlt** ❌ | `menu_categories` + `menu_items` für Demo-Tenant befüllen. |

---

### 9.2 — Admin Dashboard ✅

> Erreichbar unter `[slug]/admin`. Vollständiges Betreiber-Interface.

| Punkt | Status | Anmerkung |
|--------|--------|-----------|
| **Auth + Login** | **Erledigt** ✅ | Supabase Auth, `gastro_admin_users` Rolle-Check. |
| **Bestellungen-View** | **Erledigt** ✅ | Live-Refresh (15s), Sound-Notification, Status-Flow (Offen→Bestätigt→Abgeholt), Filterbar, KPIs. |
| **Speisekarte-View (CRUD)** | **Erledigt** ✅ | Kategorien + Items + Upsells erstellen, bearbeiten, löschen, aktivieren. `image_url` im Typ vorhanden. |
| **Produkt-Fotos (Upload)** | **Fehlt** ❌ | Supabase Storage Bucket + Upload-UI im Speisekarte-View. `image_url` Feld bereits vorbereitet. |
| **Zutaten-Verwaltung** | **Fehlt** ❌ | Neue Tabellen `menu_ingredients` + `item_ingredients`. Admin-View für Zuordnung zu Items. |
| **QR-Code View** | **Erledigt** ✅ | CRUD (Tisch/Theke/Box), Batch-Erstellung, PNG-Download, PDF-Batch-Export. |
| **QR-Analytics** | **Erledigt** ✅ | KPI-Pills, Scans-nach-Quelle, Tages-Chart, Top-Tische, Recent-Feed. Periodenfilter. |
| **Team-View / MESO Light** | **Erledigt** ✅ | Tasks + SOPs + Schichtübergabe im Admin. |
| **Kunden-View** | **Erledigt** ✅ | Kundenverwaltung. |
| **Einstellungen-View** | **Erledigt** ✅ | Restaurant-Einstellungen. |

---

### 9.3 — QR-Code System ✅

| Punkt | Status | Anmerkung |
|--------|--------|-----------|
| **QR-Generator (Admin)** | **Erledigt** ✅ | Erstellt QR für `[slug]/qr?table=[n]`, Theke, Box. |
| **Batch-Erstellung** | **Erledigt** ✅ | Tisch X bis Y auf einmal erstellen. |
| **PNG-Download** | **Erledigt** ✅ | Einzeln oder alle als PDF. |
| **QR-Scan-Tracking** | **Erledigt** ✅ | `qr_scans`-Tabelle, POST-API, IP-Hashing, Conversion-Flag. |
| **QR-Analytics Dashboard** | **Erledigt** ✅ | Vollständig mit Zeitreihe, Top-Tische, Recent-Feed. |
| **`/[slug]/qr` Landing** | **Erledigt** ✅ | QR-Scan-Seite die auf `/order` weiterleitet und Tracking feuert. |

---

### 9.4 — MESO Light (Mitarbeiter-Modul)

| Punkt | Status | Anmerkung |
|--------|--------|-----------|
| **Admin: Tasks + SOPs + Schichtübergabe** | **Erledigt** ✅ | Vollständiger Team-Tab im Admin. |
| **`/[slug]/meso` Staff-Interface** | **Fehlt** ❌ | Mobile-first Mitarbeiter-View: Task-Liste + SOP-Übersicht. Kein Admin-Zugang nötig. |
| **Mehrsprachige SOPs (Staff-Seite)** | **Fehlt** ❌ | SOPs in DE/EN/TR per Sprach-Toggle. |

---

### 9.5 — Produkt-Fotos & Zutaten ✅

| Punkt | Status | Anmerkung |
|--------|--------|-----------|
| **Supabase Storage Bucket** | **Erledigt** ✅ | Bucket `menu-images`, public read, 5 MB Limit, JPEG/PNG/WebP. |
| **Upload-API** | **Erledigt** ✅ | `POST /api/[slug]/admin/upload` — Multipart, Security-Check, gibt public URL zurück. Delete ebenfalls implementiert. |
| **Upload-UI im Speisekarte-View** | **Erledigt** ✅ | 📷-Button bei jedem Item/Upsell. Vorschau mit ✕-Löschen. |
| **Fotos im Order-View anzeigen** | **Erledigt** ✅ | Foto-Banner (140px) oben auf der Item-Karte wenn `image_url` vorhanden. |
| **`menu_ingredients`-Tabelle** | **Erledigt** ✅ | `id`, `restaurant_id`, `name`, `allergen_group`, `is_active`. RLS aktiv. |
| **`item_ingredients`-Tabelle** | **Erledigt** ✅ | Junction `item_id` ↔ `ingredient_id`. Unique Constraint. |
| **Zutaten-API** | **Erledigt** ✅ | `GET/POST/PUT/DELETE /api/[slug]/admin/ingredients` — CRUD + assign/unassign Aktionen. |
| **Zutaten-View im Admin** | **Erledigt** ✅ | Zutaten-Bibliothek im Speisekarte-View. CRUD + Allergen-Gruppen. Zuordnung via Modal (Checkbox-Liste pro Item). |
| **Allergene im Order-View** | **Erledigt** ✅ | Amber-Badges unter Produktbeschreibung. Daten via `lib/menu.ts` Join mitgeladen. |

---

### 9.6 — Deploy & Demo

| Punkt | Status | Was zu tun ist |
|--------|--------|----------------|
| **Netlify Deploy** | **Fehlt** ❌ | Next.js auf Netlify, `.env.local` als Netlify-Env-Vars. |
| **Demo-Menüdaten befüllen** | **Fehlt** ❌ | 5–10 Döner-Items für `haus-des-doeners` in DB. |
| **E2E Demo-Flow testen** | **Fehlt** ❌ | Scan → Order → Admin-Bestätigung durchspielen. |
| **Sales-Präsentation** | **Offen** | Demo-Flow vorbereiten für Haus des Döners Gespräch. |

---

### 9.7 — Multilingual (DE / EN / TR)

| Punkt | Status | Was zu tun ist |
|--------|--------|----------------|
| **Übersetzungs-Layer** | **Fehlt** ❌ | Statische JSON-Dictionaries (`/locales/de.json`, `en.json`, `tr.json`). |
| **Sprach-Toggle im Order-Flow** | **Fehlt** ❌ | Flaggen-Button, wechselt Sprache via Context. |
| **Menü-Items mehrsprachig** | **Vorbereitet** | `name_en`, `name_tr` Spalten in DB. Frontend noch nicht angebunden. |

---

## Priorisierte Nächste Schritte

| Priorität | Was | Warum |
|-----------|-----|-------|
| **1. DONE** | Produkt-Fotos (Storage + Upload-UI) | ✅ Erledigt 2026-04-20 |
| **2. DONE** | Zutaten-Verwaltung + Allergene | ✅ Erledigt 2026-04-20 |
| **3. NOW** | Admin-Bereich Neuplan & UX-Upgrade | ✅ Plan erstellt 2026-04-27 → siehe `ADMIN_PLAN.md` |
| **4. DONE** | Admin Sprint 1 — Bugs & Quick Wins | ✅ Erledigt 2026-04-27 |
| **5. DONE** | Admin Sprint 2 — Schicht-View Upgrade | ✅ Erledigt 2026-04-27 |
| **6. DONE** | Admin Sprint 3 — Bestellungen Detail-Drawer | ✅ Erledigt 2026-04-27 |
| **7. DONE** | Admin Sprint 4 — Rollen & Zugang | ✅ Erledigt 2026-04-27 |
| **8. DONE** | Vercel Deploy | ✅ Erledigt 2026-04-28 — live auf Vercel |
| **9. NOW** | Phase 9.9 — Payment (Stripe) | Ohne Payment kein echtes Produkt — Planung siehe unten |
| **10. MEDIUM** | Produktfotos Upload-UI | Kritisch für Kundenerlebnis — Spalten in DB vorhanden |
| **11. MEDIUM** | Stripe Connect (Multi-Tenant) | Skalierung auf mehrere Restaurants — nach erstem Kunden |
| **12. MEDIUM** | `/meso` Staff-Interface | Differenzierung, aber Admin reicht für Demo |
| **13. LOW** | Multilingual Layer | Nice-to-have |

---

## Phase 9.8 — Admin UX-Upgrade (NEU — 2026-04-27)

> **Vollständiger Plan:** `ADMIN_PLAN.md`
> **Grundprinzip:** Hochmodernes, attraktives UX ist Grundvoraussetzung — kein generisches Dashboard.

### Sprint 1 — Bugs & Quick Wins ✅ Erledigt (2026-04-27)

| Punkt | Status | Details |
|-------|--------|---------|
| **QR Generator Tab entfernen** | **Erledigt** ✅ | `generator`-Tab in `qr-view.tsx` entfernt. 2 Tabs: `codes` + `analytics`. |
| **VIEW_TITLE QR-Codes fixen** | **Erledigt** ✅ | `'QR-Code Generator'` → `'QR-Codes'` in `admin-client.tsx` |
| **QrIcon korrektes SVG** | **Erledigt** ✅ | Heroicons v2 QR-Grid-SVG mit 3 Eck-Quadraten + Innen-Punkten. |
| **Pending-Order-Badge in Nav** | **Erledigt** ✅ | Amber-Badge mit `badge-pop`-Animation zeigt Live-Zahl aktiver Bestellungen. |
| **CSS-Qualität: Cards, Buttons, Spacing** | **Erledigt** ✅ | Tab-Bar, Button-States, Badge, Spacing-Rhythm in `admin-panel.css`. |

### Sprint 2 — Schicht-View Upgrade ✅ Erledigt (2026-04-27)

| Punkt | Status | Details |
|-------|--------|---------|
| **Items aus DB in Bestellkarte** | **Erledigt** ✅ | `gastro_order_items` Join, `renderModifiers()` für JSONB-Parsing. |
| **Neue-Bestellung-Animation** | **Erledigt** ✅ | `new-order` CSS-Klasse mit Pulse-Animation bei Realtime-INSERT. |
| **Sound-Toggle in KPI-Bar** | **Erledigt** ✅ | An/Aus-Button, State in localStorage, Web Audio API Töne. |
| **Optimistic Status-Update** | **Erledigt** ✅ | `order-dismissing` Animations-Klasse, Karte fährt beim "Abgeholt"-Klick aus Liste. |

### Sprint 3 — Bestellungen Detail-Drawer ✅ Erledigt (2026-04-27)

| Punkt | Status | Details |
|-------|--------|---------|
| **Slide-in Drawer Component** | **Erledigt** ✅ | `OrderDrawer` — von rechts, Overlay + ESC-Close + Body-Scroll-Lock. Mobile: Bottom Sheet. |
| **Item-Liste mit Modifikatoren** | **Erledigt** ✅ | Exakte Items + Optionen + Einzelpreise, Order-Note-Block. |
| **Allergene im Drawer** | **Zurückgestellt** ⏸ | `item_ingredients` Join noch nicht implementiert. |
| **Status-Flow im Drawer** | **Erledigt** ✅ | 3 Status-Buttons mit translateX-Hover direkt im Drawer. |

### Sprint 4 — Rollen & Zugang ✅ Erledigt (2026-04-27)

| Punkt | Status | Details |
|-------|--------|---------|
| **Rolle aus Session-Token laden** | **Erledigt** ✅ | Token-Format: `base64(slug:pin:timestamp:role)`. GET-Auth gibt `{ ok, role }` zurück. |
| **Dual-PIN: owner + staff** | **Erledigt** ✅ | `admin_pin` → owner, `staff_pin` (optional) → staff. Backward-compat für bestehende Sessions. |
| **Nav rollenbasiert filtern** | **Erledigt** ✅ | `NAV_ACCESS`-Map: staff → Schicht/Bestellungen/Team; admin → alles außer Einstellungen; owner → alles. |
| **View-Guard** | **Erledigt** ✅ | `safeView` computed value — verbotene Views werden sofort auf `schicht` umgeleitet. |
| **Rollen-Badge im UI** | **Erledigt** ✅ | Farbcodiertes Badge (Grün = Inhaber, Blau = Admin, Grau = Mitarbeiter) in Sidebar-Footer + Profil-Avatar. |

### Design-System Ziele

| Kriterium | Ziel |
|-----------|------|
| Dark Mode | Standard-Theme. Hell als Option. |
| Card-Style | Glassmorphism: `rgba(255,255,255,0.03)` + `border: 1px solid rgba(255,255,255,0.08)` |
| Animationen | View-Switch, Neue Bestellung, Status-Change, Button-Hover |
| Empty States | Illustriert: Icon + Titel + Subtitle + CTA |
| Mobile | Sidebar als Overlay auf <768px, Touch-Targets ≥ 44px |

---

## Phase 9.9 — Payment Integration (Stripe) 🔜

> **Status:** Geplant — noch nicht implementiert
> **Priorität:** P0 — ohne Payment kein produktionsreifes System
> **Voraussetzung:** Stripe-Account des Inhabers (Odi) + API Keys als Env Vars

### Strategie & Entscheidungen

| Entscheidung | Gewählt | Begründung |
|-------------|---------|------------|
| Stripe Checkout vs. Stripe Elements | **Stripe Checkout** (hosted) | Fertig in 2 Tagen, PCI-konform, kein eigenes UI nötig |
| Zahlungsfluss | **Pay-before-order** | Gast zahlt → dann erst Bestellung in DB → kein Bestellrisiko |
| Multi-Tenant Payment | **Phase 1: direkte Keys** | Odi gibt seine Stripe-Keys, Geld geht direkt auf sein Konto |
| Multi-Tenant Payment | **Phase 2: Stripe Connect** | Plattform-Architektur für mehrere Restaurants, optional Provision |
| Zahlungsarten | Karte, Apple Pay, Google Pay | Stripe Checkout bringt das automatisch mit |

### Bestellfluss mit Payment (Neu)

```
Gast wählt Items → Checkout-Formular ausfüllen
→ POST /api/[slug]/checkout/session   (erstellt Stripe Checkout Session)
→ Redirect auf Stripe-Hosted-Checkout-Seite
→ Gast zahlt (Karte / Apple Pay / Google Pay)
→ Stripe redirect → /[slug]/bestellung/success?session_id=xxx
→ GET /api/[slug]/checkout/confirm    (verifiziert Session, schreibt Order in DB)
→ Webhook /api/stripe/webhook         (Backup: checkout.session.completed)
→ Admin-Dashboard zeigt neue Bestellung live
```

### Neue Dateien (noch nicht erstellt)

| Datei | Zweck |
|-------|-------|
| `app/api/[slug]/checkout/session/route.ts` | POST — erstellt Stripe Checkout Session mit Line Items |
| `app/api/[slug]/checkout/confirm/route.ts` | GET — verifiziert Session, schreibt `gastro_orders` + `gastro_order_items` |
| `app/api/stripe/webhook/route.ts` | POST — Stripe Webhook (Backup für Bestätigung) |
| `app/[slug]/bestellung/success/page.tsx` | Erfolgsseite nach Zahlung mit Bestellnummer |
| `app/[slug]/bestellung/abgebrochen/page.tsx` | Cancel-Seite wenn Gast Zahlung abbricht |
| `lib/stripe.ts` | Stripe-Client-Initialisierung (Server-only) |

### Datenbankänderungen

| Tabelle | Neue Spalte | Typ | Zweck |
|---------|------------|-----|-------|
| `gastro_orders` | `payment_status` | `text` | `'pending'` / `'paid'` / `'failed'` |
| `gastro_orders` | `stripe_session_id` | `text` | Verknüpfung mit Stripe Checkout Session |
| `gastro_orders` | `stripe_payment_intent` | `text` | Payment Intent ID für Rückerstattungen |
| `restaurants` | `stripe_secret_key` | `text` | Pro-Restaurant Stripe Key (Phase 1) |
| `restaurants` | `stripe_publishable_key` | `text` | Pro-Restaurant Publishable Key (Phase 1) |

### Neue Env Vars

```bash
# Phase 1 — direkte Keys (im Vercel Dashboard setzen)
STRIPE_SECRET_KEY=sk_live_...          # Odi's Stripe Secret Key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  # Odi's Publishable Key
STRIPE_WEBHOOK_SECRET=whsec_...        # Webhook Signing Secret

# Phase 2 — Stripe Connect (später)
STRIPE_PLATFORM_SECRET_KEY=sk_live_... # Sebastians Platform-Account
```

### Admin-Dashboard Erweiterungen

| Feature | View | Details |
|---------|------|---------|
| Zahlungsstatus-Badge | Bestellungen | Grün "Bezahlt" / Amber "Offen" / Rot "Fehlgeschlagen" |
| Filter nach Zahlungsstatus | Bestellungen | Nur unbezahlte anzeigen |
| Tageseinnahmen aus Stripe | Schicht (KPI-Bar) | Nur `payment_status = 'paid'` zählen |
| Rückerstattungs-Button | Bestellungen Drawer | Trigger Stripe Refund via API |

### Upselling-Optimierung (parallel zu Stripe)

> Upsells existieren in der DB — das Frontend-Modal braucht Conversion-Optimierung.

| Maßnahme | Status | Details |
|----------|--------|---------|
| Upsell-Modal beim Checkout zeigen | Offen ❌ | Aktuell: Upsell beim Item hinzufügen. Besser: **vor** dem Bezahl-Button |
| "Auch beliebt bei anderen" Section | Offen ❌ | Datenbasiert aus Bestellhistorie, psychologischer Anker |
| Bundle-Angebote | Offen ❌ | "Bowl + Getränk + Dessert = X€" — Stripe unterstützt das nativ |
| Post-Payment Upsell | Offen ❌ | Auf der Success-Seite: "Trinkgeld?" als optionale Zahlung |

### QR-Code & Dine-In Flow (parallel zu Stripe)

> QR-Codes sind gebaut — der Dine-In-Flow braucht Payment-Integration.

| Szenario | Flow |
|----------|------|
| Tisch-QR scannen | Gast scannt → `/[slug]/order?table=3` → bestellt → zahlt sofort digital |
| Theken-QR | Gast scannt → `/[slug]/order` → bestellt → zahlt → wartet auf Abholung |
| Ende-der-Mahlzeit | Kellner bringt QR-Code → Gast zahlt am Tisch ohne Bargeld |

### Klarer Vorteil vs. Lieferando — nach Payment-Integration

| Kriterium | Lieferando | Gastro-System |
|-----------|-----------|---------------|
| Provision | 13–30% | 0% |
| Kundendaten | Lieferando | Inhaber |
| Tisch-QR-Zahlung | Nein | Ja |
| Eigene Upsells | Nein | Ja |
| Rückerstattungen | Lieferando entscheidet | Inhaber entscheidet |
| Stammkunden-System | Nein | Stempelkarte integriert |

---

## Kurz-Checkliste für Agenten / PRs

- [ ] Änderung passt zu aktuellem Fokus (**Phase 9 / Gastro System**).
- [ ] Routing immer unter `app/[slug]/` — kein Legacy `/order?r=slug` mehr.
- [ ] Neue Tabellen immer mit `restaurant_id` — kein Single-Tenant.
- [ ] Keine neuen öffentlichen Endpoints ohne Klärung: **Lesen** vs. **Schreiben**, **Preise serverseitig** validieren.
- [ ] `is_demo = true` → kein Schreiben in `gastro_orders`.
- [ ] Design: Mobile-first, max-w-md, Akzentfarbe via `restaurant.primary_color`.
- [ ] `npm run dev` nutzt `--webpack` Flag (Turbopack-Bug in Next.js 16).

---

*Letzte Aktualisierung: 2026-04-20 — Produkt-Fotos (Supabase Storage + Upload-UI) ✅, Zutaten-Verwaltung + Allergen-Badges ✅. Nächster Schritt: Netlify Deploy.*
