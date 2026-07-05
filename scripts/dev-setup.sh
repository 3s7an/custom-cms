#!/usr/bin/env bash
#
# One-shot local dev bootstrap for the CMS template.
#
# Starts a local Supabase stack (Docker), writes the resulting API URL + anon
# key into .env, then applies migrations + seed. After it finishes just run:
#   npm run dev
#
# Requirements: Docker running, and the Supabase CLI (used via `npx supabase`).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Checking Docker..."
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker is not running. Start Docker Desktop / the docker daemon and re-run." >&2
  exit 1
fi

echo "==> Starting local Supabase (first run downloads images, be patient)..."
npx supabase start

echo "==> Writing .env from local Supabase credentials..."
if [ -f .env ]; then
  cp .env ".env.bak.$(date +%s)"
  echo "    (existing .env backed up)"
fi

# Pull the local API URL + anon key straight from the running stack.
{
  npx supabase status -o env \
    --override-name api.url=VITE_SUPABASE_URL \
    --override-name auth.anon_key=VITE_SUPABASE_PUBLISHABLE_KEY
  echo 'VITE_SITE_URL="http://localhost:8080"'
  echo 'VITE_ADMIN_LOGIN_EMAIL="admin@example.com"'
} > .env

echo "==> Applying migrations + seed (supabase db reset)..."
npx supabase db reset

echo ""
echo "✅ Done. Local Supabase is running and .env is configured."
echo ""
echo "   Start the app:   npm run dev"
echo "   Public site:     http://localhost:8080"
echo "   Admin login:     http://localhost:8080/admin/login   (admin / template)"
echo "   Supabase Studio: http://127.0.0.1:54323"
echo ""
echo "   Stop Supabase later with:  npx supabase stop"
