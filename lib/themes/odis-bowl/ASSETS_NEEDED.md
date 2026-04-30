# Odi's Bowl Theme — benötigte Assets

Diese Dateien müssen unter `gastro-system/public/themes/odis-bowl/` abgelegt werden, damit das Theme komplett rendert.

## Pflicht-Assets

| Datei | Zweck | Empfohlene Größe |
|-------|-------|------------------|
| `logo.png` | Hero-Logo (oben mittig) | 620 × 234 px, transparenter Hintergrund |
| `Titelbild01.JPG` | Hero-Backdrop, Slide 1 | 2400 × 1600 px (hochkant geht auch) |
| `Titelbild02.JPG` | Hero-Backdrop, Slide 2 | 2400 × 1600 px |
| `Titelbild03.JPG` | Hero-Backdrop, Slide 3 | 2400 × 1600 px |

## Wo liegen die Originale?

Die Bilder waren im alten Single-Tenant Odi's-Bowl-Repo unter `/public/`:
- `/public/logo.png`
- `/public/Titelbild01.JPG`
- `/public/Titelbild02.JPG`
- `/public/Titelbild03.JPG`

→ Bitte 1:1 kopieren nach `gastro-system/public/themes/odis-bowl/` (Verzeichnis ist bereits angelegt).

## Fallback-Verhalten

- **Logo fehlt** → `LandingHeroLogo` zeigt automatisch Tag + Bowl-Emoji als Fallback
- **Titelbilder fehlen** → Next.js `Image`-Komponente zeigt 404er-Bild-Platzhalter (Layout bleibt korrekt, nur kein Hintergrund)

## Optional: andere Hero-Bilder

Wenn andere Hero-Bilder gewünscht: Pfad-Override im Code möglich:

```tsx
<OdisBowlLandingPage
  basePath="/odis-bowl"
  // aktuell ohne API für Override — bei Bedarf in pages/OdisBowlLanding.tsx
  // einen `heroImages`-Prop ergänzen, der an LandingHeroBackdrop weitergereicht wird
/>
```

## Fonts

Inter und Plus_Jakarta_Sans werden über `next/font/google` automatisch geladen — **kein manueller Asset-Upload nötig**.
