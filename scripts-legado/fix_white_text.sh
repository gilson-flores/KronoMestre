#!/bin/bash
find components app -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i \
  -e 's/text-white/text-foreground/g' \
  -e 's/text-slate-300/text-muted/g' \
  -e 's/text-slate-400/text-muted/g' \
  -e 's/text-slate-500/text-muted/g' \
  -e 's/bg-rose-500\/20/bg-rose-100/g' \
  -e 's/text-rose-300/text-rose-600/g' \
  -e 's/border-rose-500\/40/border-rose-200/g' \
  -e 's/bg-amber-500\/20/bg-amber-100/g' \
  -e 's/text-amber-300/text-amber-600/g' \
  -e 's/border-amber-500\/40/border-amber-200/g' \
  -e 's/bg-emerald-500\/20/bg-emerald-100/g' \
  -e 's/text-emerald-300/text-emerald-600/g' \
  -e 's/border-emerald-500\/40/border-emerald-200/g' \
  -e 's/bg-cyan-500\/20/bg-cyan-100/g' \
  -e 's/text-cyan-300/text-cyan-600/g' \
  -e 's/border-cyan-500\/40/border-cyan-200/g' \
  -e 's/bg-purple-500\/20/bg-purple-100/g' \
  -e 's/text-purple-300/text-purple-600/g' \
  -e 's/border-purple-500\/40/border-purple-200/g' \
  -e 's/bg-indigo-500\/20/bg-indigo-100/g' \
  -e 's/text-indigo-300/text-indigo-600/g' \
  -e 's/border-indigo-500\/40/border-indigo-200/g' \
  -e 's/bg-blue-500\/20/bg-blue-100/g' \
  -e 's/text-blue-300/text-blue-600/g' \
  -e 's/border-blue-500\/40/border-blue-200/g' \
  {} +
