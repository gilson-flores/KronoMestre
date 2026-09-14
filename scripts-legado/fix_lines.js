const fs = require('fs');
let lines = fs.readFileSync('components/views/MessagesView.tsx', 'utf-8').split('\n');

// Replace lines 491, 492, 493, 494 (0-indexed 491, 492, 493)
lines.splice(491, 3, '            </>)}');

fs.writeFileSync('components/views/MessagesView.tsx', lines.join('\n'));
