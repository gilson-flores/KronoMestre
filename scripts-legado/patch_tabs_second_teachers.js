const fs = require('fs');
let content = fs.readFileSync('components/views/SecondTeachersView.tsx', 'utf-8');

content = content.replace(
  /'bg-amber-400 text-black shadow-md'/g,
  "'bg-surface border border-border text-foreground shadow-sm'"
).replace(
  /'text-muted hover:text-foreground'/g,
  "'text-muted hover:text-foreground border border-transparent'"
);

fs.writeFileSync('components/views/SecondTeachersView.tsx', content);
