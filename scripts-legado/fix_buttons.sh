#!/bin/bash
find components app -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i \
  -e 's/bg-primary text-foreground/bg-primary text-white/g' \
  -e 's/bg-primary hover:bg-primary-hover text-foreground/bg-primary hover:bg-primary-hover text-white/g' \
  -e 's/bg-primary rounded-full text-foreground/bg-primary rounded-full text-white/g' \
  -e 's/bg-rose-500 text-foreground/bg-rose-500 text-white/g' \
  -e 's/bg-emerald-500 text-foreground/bg-emerald-500 text-white/g' \
  -e 's/bg-blue-500 text-foreground/bg-blue-500 text-white/g' \
  {} +
