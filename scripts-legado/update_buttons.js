const fs = require('fs');
let content = fs.readFileSync('components/views/SecondTeachersView.tsx', 'utf-8');

// Update Gerenciar Tutela
content = content.replace(
  'bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-500 rounded-xl text-[11px]',
  'bg-amber-400 hover:bg-amber-300 border-none text-black shadow-md rounded-xl text-xs'
);

// Update Resetar Senha
content = content.replace(
  'bg-amber-400/20 hover:bg-amber-400/30 text-amber-600 border-amber-400/30 cursor-pointer',
  'bg-primary hover:bg-primary/90 text-white border-none shadow-sm cursor-pointer'
);

fs.writeFileSync('components/views/SecondTeachersView.tsx', content);
