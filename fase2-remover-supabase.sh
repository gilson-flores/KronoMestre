#!/usr/bin/env bash
set -euo pipefail

echo "Este script APAGA arquivos do Supabase e desinstala @supabase/supabase-js."
read -r -p "Digite REMOVER para continuar: " ans
[ "$ans" = "REMOVER" ] || { echo "Cancelado."; exit 1; }

rm -f lib/supabase.ts lib/supabase-admin.ts
rm -rf app/api/admin/migrate-supabase-to-firestore app/api/admin/pull-archives
rm -rf supabase .github/workflows/supabase-migrations.yml

if [ "${SKIP_NPM:-0}" != "1" ]; then
  npm uninstall @supabase/supabase-js
fi

echo "Concluído. Rode 'npm run build' para confirmar."
