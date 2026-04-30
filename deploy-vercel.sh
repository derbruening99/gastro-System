#!/bin/bash
# ─── Gastro System — Deploy zu Vercel ────────────────────────────────────────
set -e

ENV_FILE=".env.local"
PROJECT_NAME="gastro-system"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Gastro System — Vercel Deploy"
echo "  Projekt: $PROJECT_NAME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Vercel CLI prüfen
if ! command -v vercel &> /dev/null; then
  echo "[ 1/4 ] Vercel CLI installieren..."
  npm install -g vercel
fi
echo "[ 1/4 ] Vercel CLI: OK"

# 2. Env Vars aus .env.local auf Vercel setzen
if [ -f "$ENV_FILE" ]; then
  echo ""
  echo "[ 2/4 ] Env Vars aus $ENV_FILE auf Vercel setzen..."
  while IFS= read -r line || [ -n "$line" ]; do
    [[ "$line" =~ ^#.*$ ]] && continue
    [[ -z "$line" ]] && continue
    KEY="${line%%=*}"
    VALUE="${line#*=}"
    echo "  → $KEY"
    # Für alle Environments (production, preview, development) setzen
    echo "$VALUE" | vercel env add "$KEY" production --force 2>/dev/null || true
    echo "$VALUE" | vercel env add "$KEY" preview    --force 2>/dev/null || true
  done < "$ENV_FILE"
  echo "  → Alle Vars gesetzt."
else
  echo "[ 2/4 ] WARNUNG: Kein .env.local gefunden!"
  echo "        Bitte Env Vars manuell im Vercel Dashboard hinterlegen:"
  echo "          NEXT_PUBLIC_SUPABASE_URL"
  echo "          NEXT_PUBLIC_SUPABASE_ANON_KEY"
  echo "          SUPABASE_SERVICE_ROLE_KEY"
fi

# 3. Build lokal prüfen
echo ""
echo "[ 3/4 ] Lokaler Build-Check..."
rm -rf .next
npm run build
echo "  → Build erfolgreich."

# 4. Production Deploy
echo ""
echo "[ 4/4 ] Deploy zu Vercel (Production)..."
vercel --prod

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Fertig!"
echo "  Aufruf nach Deploy:"
echo "  https://<deine-domain>/odis-bowl         (Kundenseite)"
echo "  https://<deine-domain>/odis-bowl/admin   (Admin)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
