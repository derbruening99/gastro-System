#!/bin/bash
# ─── Gastro System — Build & Deploy to Netlify ───────────────────────────────
set -e

SITE_ID="823144ba-c929-4bc1-98d7-62791efc9fee"
SITE_URL="https://odis-bowl-rheine.netlify.app"
ENV_FILE=".env.local"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Gastro System — Netlify Deploy"
echo "  Site: $SITE_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Netlify-Login prüfen
echo "[ 1/4 ] Netlify-Auth prüfen..."
if ! npx netlify status --json > /dev/null 2>&1; then
  echo "  → Nicht eingeloggt. Starte Login..."
  npx netlify login
fi
echo "  → OK"

# 2. Env Vars aus .env.local auf Netlify setzen
if [ -f "$ENV_FILE" ]; then
  echo ""
  echo "[ 2/4 ] Env Vars aus $ENV_FILE auf Netlify setzen..."
  while IFS= read -r line || [ -n "$line" ]; do
    # Kommentare und leere Zeilen überspringen
    [[ "$line" =~ ^#.*$ ]] && continue
    [[ -z "$line" ]] && continue
    KEY="${line%%=*}"
    VALUE="${line#*=}"
    echo "  → $KEY"
    npx netlify env:set "$KEY" "$VALUE" --site "$SITE_ID" > /dev/null 2>&1 || true
  done < "$ENV_FILE"
  echo "  → Alle Vars gesetzt."
else
  echo "[ 2/4 ] Kein .env.local gefunden — Env Vars werden nicht gesetzt."
  echo "        Bitte manuell im Netlify Dashboard hinterlegen:"
  echo "          NEXT_PUBLIC_SUPABASE_URL"
  echo "          NEXT_PUBLIC_SUPABASE_ANON_KEY"
  echo "          SUPABASE_SERVICE_ROLE_KEY"
fi

# 3. Build
echo ""
echo "[ 3/4 ] Next.js Production Build..."
rm -rf .next
npm run build
echo "  → Build erfolgreich."

# 4. Deploy
echo ""
echo "[ 4/4 ] Deploy zu Netlify (Production)..."
npx netlify deploy --prod --site="$SITE_ID"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Fertig! Live unter:"
echo "  $SITE_URL"
echo "  $SITE_URL/odis-bowl         (Kundenseite)"
echo "  $SITE_URL/odis-bowl/admin   (Admin)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
