#!/bin/bash
find components app -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i \
  -e 's/bg-primary hover:bg-\[#6bfb9a\] text-\[#003919\]/bg-primary hover:bg-primary-hover text-white/g' \
  -e 's/shadow-\[#4ade80\]\/20/shadow-primary\/20/g' \
  -e 's/bg-primary hover:opacity-90 text-\[#003919\]/bg-primary hover:opacity-90 text-white/g' \
  -e 's/bg-primary hover:opacity-90 text-foreground/bg-primary hover:opacity-90 text-white/g' \
  {} +
