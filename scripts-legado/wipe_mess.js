const fs = require('fs');
let content = fs.readFileSync('components/views/MessagesView.tsx', 'utf-8');

// Wipe what I did
content = content.replace('{!isSecondTeacher && (<>', '');
content = content.replace('</>)}', '');

fs.writeFileSync('components/views/MessagesView.tsx', content);
