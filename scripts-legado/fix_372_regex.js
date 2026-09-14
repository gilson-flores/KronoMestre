const fs = require('fs');
let content = fs.readFileSync('components/views/MessagesView.tsx', 'utf-8');

content = content.replace(
  /<span>Ativar Notificações<\/span>\s*<\/button>/,
  "<span>Ativar Notificações</span>\n              </>\n            )}\n          </button>"
);

fs.writeFileSync('components/views/MessagesView.tsx', content);
