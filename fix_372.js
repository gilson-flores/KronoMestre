const fs = require('fs');
let content = fs.readFileSync('components/views/MessagesView.tsx', 'utf-8');

const bad = `                <span>Ativar Notificações</span>
                 
          </button>`;
const good = `                <span>Ativar Notificações</span>
              </>
            )}
          </button>`;

content = content.replace(bad, good);
fs.writeFileSync('components/views/MessagesView.tsx', content);
