const fs = require('fs');
let content = fs.readFileSync('components/views/BackupView.tsx', 'utf-8');

content = content.replace(
  /'bg-primary text-white shadow-sm'/g,
  "'bg-surface border-border text-foreground shadow-sm'"
);

// We need to also add border-transparent to the inactive class if it doesn't have it
content = content.replace(
  /'text-text-muted hover:text-foreground'/g,
  "'border-transparent text-text-muted hover:text-foreground hover:bg-surface-hover'"
);

fs.writeFileSync('components/views/BackupView.tsx', content);
