const fs = require('fs');
let content = fs.readFileSync('components/views/SecondTeacherPortalView.tsx', 'utf-8');

// The active tab check is followed by 'bg-primary text-white shadow-sm'
// We replace it with 'bg-surface border border-border text-foreground shadow-sm'
content = content.replace(
  /'bg-primary text-white shadow-sm'/g,
  "'bg-surface border border-border text-foreground shadow-sm'"
);

// To avoid messing up other things, we specifically target the inactive class
content = content.replace(
  /'text-muted hover:text-foreground hover:bg-surface-hover'/g,
  "'text-muted hover:text-foreground hover:bg-surface-hover border border-transparent'"
);

fs.writeFileSync('components/views/SecondTeacherPortalView.tsx', content);
