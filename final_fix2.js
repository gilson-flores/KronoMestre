const fs = require('fs');
let lines = fs.readFileSync('components/views/MessagesView.tsx', 'utf-8').split('\n');

lines[490] = '            </>)}';
lines[491] = '            </div>';

fs.writeFileSync('components/views/MessagesView.tsx', lines.join('\n'));
