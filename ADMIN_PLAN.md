# Admin-Bereich — Neuplan & UX-Strategie
> Stand: 2026-04-27 | Fokus: Professioneller Betreiberflow, modernes UX, keine logischen Brüche

---

## 1. Aktuelle Probleme (Ist-Analyse)

### P0 — Bugs & Duplikate (sofort beheben)

| Problem | Datei | Details |
|---------|-------|---------|
| **QR Generator Tab ist doppelt** | `qr-view.tsx` | Der `generator`-Tab generiert QR-Codes ohne DB-Speicherung. Der `codes`-Tab macht exakt dasselbe + Datenbank + Analytics + Batch. 0% Mehrwert. Entfernen. |
| **VIEW_TITLE falsch** | `admin-client.tsx` L324 | `'QR-Code Generator'` → `'QR-Codes'` |
| **QrIcon falsches SVG** | `admin-client.tsx` L95-97 | SVG zeigt ein Plus-Zeichen (`M12 4v16m8-8H4`), kein QR-Code. Korrektes Grid-Icon einsetzen. |
| **Kein Badge bei neuen Bestellungen** | `admin-client.tsx` Nav | Der Schicht-NavLink hat nur einen statischen LIVE-Dot. Bei neuen Bestellungen fehlt ein Zahl-Badge (z.B. `3` aktive Bestellungen). |

### P1 — UX-Logikbrüche (kurzfristig)

| Problem | Details |
|---------|---------|
| **Schicht vs. Bestellungen Overlap** | Schicht-View hat bereits Status-Buttons. Bestellungen-View hat vermutlich ebenfalls Statusverwaltung → Betreiber weiß nicht, wo er handeln soll. |
| **Keine Rollen-basierte Navigation** | Staff (Rolle: `staff`) sieht Einstellungen, Team-Verwaltung, Kundendaten — das sollte er nicht. |
| **Bestellungen ohne Item-Detail** | Klick auf eine Bestellung öffnet keinen Drawer/Modal mit exakten Items, Modifikatoren, Allergenen, Sonderwünschen. |
| **QR-Tabs unnötig aufgeteilt** | 3 Tabs (`codes`, `analytics`, `generator`) → Generator fällt weg → 2 Tabs reichen. Analytics könnte auch inline in Codes-Tab als Collapsible-Section. |
| **Kein Revenue-Überblick** | Im Schicht-View gibt es "Heute Umsatz" — aber kein Wochen/Monatsvergleich für den Betreiber. |

### P2 — Fehlende Features (mittelfristig)

| Feature | Priorität |
|---------|-----------|
| Bestellhistorie pro Kunde in Kunden-View | MEDIUM |
| Drag & Drop Reihenfolge in Speisekarte | LOW |
| Push-Notification bei neuer Bestellung (PWA) | LOW |
| Multilingual-Toggle im Admin (DE/EN/TR) | LOW |

---

## 2. Neue Admin-Struktur (Navigation)

### Sidebar Navigation — Neuordnung

```
[ Schicht ]       ← Live-Dashboard, Startseite. Badge mit Anzahl aktiver Bestellungen.
[ Bestellungen ]  ← Vollarchiv mit Filter, Suche, Detail-Drawer.
[ Speisekarte ]   ← Kategorien + Items + Upsells + Zutaten CRUD.
[ QR-Codes ]      ← Verwaltung + Analytics (2 Tabs, kein Generator mehr).
[ Kunden ]        ← Kundenliste + Bestellhistorie pro Kunde.
[ Team ]          ← Tasks + SOPs + Schichtübergabe. [MESO Badge]. Nur owner/admin.
[ Einstellungen ] ← Restaurant-Einstellungen. Nur owner.
```

**Rollen-Matrix:**
| View | owner | admin | staff |
|------|-------|-------|-------|
| Schicht | ✅ | ✅ | ✅ |
| Bestellungen | ✅ | ✅ | ✅ |
| Speisekarte | ✅ | ✅ | ❌ |
| QR-Codes | ✅ | ✅ | ❌ |
| Kunden | ✅ | ✅ | ❌ |
| Team | ✅ | ✅ | ✅ |
| Einstellungen | ✅ | ❌ | ❌ |

---

## 3. UX-Design-Prinzipien (Grundvoraussetzung: hochmodern + attraktiv)

### Design-Sprache

Das Admin-Panel muss sich anfühlen wie ein Produkt, für das man gerne zahlt.
Kein generisches Dashboard. Kein Bootstrap-Grau.

**Visuelle Leitlinien:**
- **Dark Mode als Standard** — Gastronomie-Betrieb läuft oft bei schlechtem Licht, Dark ist professioneller und moderner.
- **Glassmorphism-Akzente** — Cards mit subtilen `backdrop-filter: blur()` und `border: 1px solid rgba(255,255,255,0.08)`. Nicht übertrieben, nur als Tiefengefühl.
- **Schriftbild**: Heading-Font (Slab/Display) für Zahlen und KPIs. Mono für IDs/Ordernummern. System-UI für Fließtext.
- **Akzentfarbe**: Aus `restaurant.primary_color` — das ist bereits implementiert. Konsequent überall anwenden.
- **Spacing-Rhythm**: 4/8/16/24/32/48px — kein wildes Inline-Padding mehr. CSS-Variablen für alle Spacings.
- **Radius**: 12px für Cards, 8px für Buttons/Inputs, 6px für Badges/Pills.
- **Micro-Animations**:
  - Status-Änderung → kurze Slide-out-Animation der Karte
  - Neue Bestellung → Slide-in von rechts + sanfter Pulse
  - Button-Hover → translate-y(-1px) + Shadow-Lift
  - Nav-Active → Accent-Left-Border + Subtle Background

### Component-Qualität

**Cards:**
```
background: rgba(255,255,255,0.03) oder var(--surface)
border: 1px solid rgba(255,255,255,0.08)
border-radius: 12px
box-shadow: 0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.3)
```

**Buttons (Primary):**
```
background: var(--accent)
border-radius: 8px
padding: 10px 20px
font-weight: 700
font-size: 13px
letter-spacing: 0.01em
transition: all 0.15s ease
hover: brightness(1.1) + translateY(-1px)
active: scale(0.98)
```

**Status-Badges:**
- `pending` → Amber/Orange (`#f59e0b` bg-tint, `#92400e` text)
- `confirmed` → Blau (`#3b82f6` bg-tint, `#1e3a8a` text)
- `done` → Grün (`#10b981` bg-tint, `#064e3b` text)
- Pill-Form mit `border-radius: 99px`, `padding: 2px 10px`, `font-size: 11px`, `font-weight: 800`

**Inputs:**
```
background: var(--bg-input)  /* leicht heller als Card-BG */
border: 1.5px solid var(--border)
border-radius: 8px
padding: 10px 14px
font-size: 14px
focus: border-color: var(--accent), box-shadow: 0 0 0 3px var(--accent-tint)
```

**Empty States:**
Jede View braucht einen illustrierten, freundlichen Empty State — kein nacktes "Noch keine Daten".
Format: Icon (40px) + Titel (16px bold) + Subtitle (13px muted) + optionaler CTA.

---

## 4. Schicht-View (Neu-Konzept)

**Zweck**: Das operative Echtzeit-Cockpit. Wird beim Login direkt geöffnet.

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  KPI-Bar: [ Aktiv: 3 ] [ Heute: 187,50€ ] [ ⏱ 2 überfällig ] [ 🔄 LIVE ]
├──────────────────────┬──────────────────────────────┤
│  EINGEHEND           │  ÜBERFÄLLIG (>30 Min)         │
│  ─────────────────   │  ─────────────────────────── │
│  [ Order #042 ]      │  [ Order #038 — 12 Min über ] │
│  Max Müller · Tisch 4│  ──────────────────────────  │
│  Doner Box · 12,90€  │                              │
│  [Bestätigen]        │                              │
├──────────────────────┴──────────────────────────────┤
│  AKTIVE BESTELLUNGEN (vollständige Liste mit Status-Flow)
│  #042 Max · Tisch 4 · 12,90€ · [Offen→Bestätigt→Abgeholt]
│  #041 Anna · Theke  · 8,50€  · [Offen→Bestätigt→Abgeholt]
└─────────────────────────────────────────────────────┘
```

**Verbesserungen gegenüber Ist:**
- Order-Karten zeigen alle bestellten Items (nicht nur notes-Parsing)
- Sound-Toggle in der KPI-Bar (an/aus für Notifications)
- Neue Bestellung → Karte fährt von oben ein, pulsiert 3x grün
- Status-Änderung → optimistic update + sanfte Ausblend-Animation bei "Abgeholt"
- Badge-Zahl im Sidebar-NavLink (live, via useSyncExternalStore oder Context)

---

## 5. Bestellungen-View (Neu-Konzept)

**Zweck**: Vollarchiv, Suche, Filter, Detail-Ansicht. Nicht operativ — für Auswertung.

**Layout:**
```
┌───────────────────────────────────────────────────────────────┐
│  Filter: [ Alle | Offen | Bestätigt | Abgeholt ] [ Suche... ] │
│  KPIs:   [ Gesamt heute: 12 ] [ Umsatz: 234,50€ ]             │
├───────────────────────────────────────────────────────────────┤
│  Tabelle:                                                      │
│  # | Zeit  | Kunde         | Typ      | Summe  | Status       │
│  042 19:32  Max Müller      Tisch 4   12,90€   ● Offen        │
│  041 19:18  Anna Schmidt    Theke      8,50€   ✓ Bestätigt    │
│  [Klick auf Zeile → Slide-in Detail-Drawer von rechts]        │
└───────────────────────────────────────────────────────────────┘

Detail-Drawer (Slide-in):
┌───────────────────────────────┐
│ Bestellung #042               │
│ Max Müller · Tisch 4          │
│ 19:32 Uhr · 12,90€           │
│ ─────────────────────────    │
│ 1x Doner Box         9,90€   │
│    + Extra Sauce     +0,50€  │
│    ⚠ Laktose (Sauce)         │
│ 1x Cola              3,00€   │
│ ─────────────────────────    │
│ Gesamt              12,90€   │
│ ─────────────────────────    │
│ [Offen] → [Bestätigt] → [Abgeholt]
└───────────────────────────────┘
```

---

## 6. QR-Codes View (Bereinigt)

**Änderungen:**
- `generator` Tab: **entfernen**
- Verbleibende Tabs: `codes` | `analytics`
- VIEW_TITLE: `'QR-Code Generator'` → `'QR-Codes'`
- QrIcon: Korrektes QR-Code-SVG

**QR-Codes Tab (Verbesserungen):**
- Grid bleibt, aber Card-Design aufwerten
- Scan-Count Badge prominenter (mit Trend-Arrow: ↑ ↓)
- "Batch Tische" direkt als Primary-Button, nicht Secondary
- QR-Bild: Größer (200px), weißer Hintergrund, Restaurant-Logo optional einbetten

**Analytics Tab (Verbesserungen):**
- Conversion-Rate als großer Hero-KPI oben
- Tages-Chart: Linienchart statt Balken (wirkt professioneller)
- Top-Tische: Horizontal-Bars mit Percentage
- Zeitraum-Switcher: Heute / 7 Tage / 30 Tage / Gesamt (klarer als aktuell)

---

## 7. Speisekarte-View (Verbesserungen)

**Aktuell bereits gut** — folgende Ergänzungen:
- Drag & Drop für Sortierung von Kategorien und Items (via `@dnd-kit`)
- Item-Karte: Bild prominent links, Preis/Status rechts — kompaktes Tabellenformat statt Grid
- Aktiv/Inaktiv Toggle: Größerer, deutlicherer Switch
- Zutaten-Zuordnung: Inline-Chips direkt auf der Item-Karte (nicht nur im Modal)

---

## 8. Umsetzungsreihenfolge (Priorisiert)

### Sprint 1 — Bugs & Quick Wins (2-4h)
1. QR Generator Tab entfernen
2. VIEW_TITLE fixen (`'QR-Code Generator'` → `'QR-Codes'`)
3. QrIcon korrektes SVG
4. Pending-Order-Badge in Sidebar (Live-Count aus Schicht-State)
5. CSS-Überarbeitung: Spacing-Rhythm, Card-Qualität, Button-Hover-States

### Sprint 2 — Schicht-View Upgrade (4-6h)
6. Items aus `gastro_order_items` laden und in Schicht-View anzeigen (nicht nur notes-Parsing)
7. Neue-Bestellung-Animation (Slide-in + Pulse)
8. Sound-Toggle in KPI-Bar
9. Optimistic Status-Update mit Ausblend-Animation

### Sprint 3 — Bestellungen Detail-Drawer (3-4h)
10. Slide-in Drawer Component (wiederverwendbar)
11. Detail-View mit Items + Modifikatoren + Allergenen
12. Status-Flow im Drawer

### Sprint 4 — Rollen & Zugang (2-3h)
13. Rolle aus Session laden (owner/admin/staff)
14. Nav-Items rollenbasiert filtern
15. View-Guard: staff → redirect bei Einstellungen/Speisekarte/QR/Kunden

### Sprint 5 — UX Polish (ongoing)
16. Dark Mode als Default
17. Empty States für alle Views
18. Transition-Animationen (View-Switch)
19. Mobile Sidebar: Overlay statt Push

---

## 9. CSS-Architektur (Neustruktur admin-panel.css)

Das bestehende `admin-panel.css` ist funktional aber unstrukturiert.
Neustruktur in Sektionen:

```css
/* 1. CSS Variables (Light + Dark) */
/* 2. Reset & Base */
/* 3. Layout (Shell, Sidebar, Main) */
/* 4. Sidebar (Brand, Nav, Footer) */
/* 5. Header */
/* 6. Cards */
/* 7. Buttons */
/* 8. Inputs & Forms */
/* 9. Badges & Pills */
/* 10. Tables */
/* 11. Empty States */
/* 12. Animations & Transitions */
/* 13. Responsive (Mobile Breakpoints) */
```

**Neue CSS-Variablen (Dark Mode Default):**
```css
:root {
  --bg:           #0f1117;
  --bg-2:         #161b27;
  --surface:      #1a2035;
  --surface-2:    #1f2640;
  --border:       rgba(255,255,255,0.08);
  --text:         #f1f5f9;
  --text-2:       #94a3b8;
  --text-3:       #64748b;
  --accent:       /* aus restaurant.primary_color */;
  --accent-deep:  /* accent, 20% dunkler */;
  --accent-tint:  /* accent, 10% opacity */;
  --danger:       #ef4444;
  --success:      #10b981;
  --warning:      #f59e0b;
  --mono:         'JetBrains Mono', 'Fira Code', monospace;
}
```

---

## 10. Erfolgskriterien

Ein professioneller Admin-Bereich für ein SaaS-Gastro-Produkt erfüllt:

- [ ] Kein logischer Doppelinhalt in der Navigation
- [ ] Jede Aktion hat genau EINEN klaren Ort (keine Verwirrung: wo ändere ich Status?)
- [ ] Neue Bestellung ist innerhalb von 2 Sek sichtbar (Sound + Visual)
- [ ] Betreiber kann den ganzen Abend ohne Laptop operieren (Mobile-first)
- [ ] Demo-Präsentation: Investor/Kunde versteht in 60 Sek was das System kann
- [ ] Dark Mode sieht aus wie ein modernes SaaS-Tool (nicht wie ein Wordpress-Plugin)
- [ ] Kein einziges überflüssiges Tab, Button oder Formularfeld
