const fs = require('fs');
let lines = fs.readFileSync('components/views/MessagesView.tsx', 'utf-8').split('\n');

lines[956] = '                  </>\n                )}';

fs.writeFileSync('components/views/MessagesView.tsx', lines.join('\n'));
