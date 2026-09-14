const fs = require('fs');
let content = fs.readFileSync('components/views/MessagesView.tsx', 'utf-8');

// Remove the garbage from the beginning
content = content.replace('{!isSecondTeacher && (\n\n)}\n', '');

fs.writeFileSync('components/views/MessagesView.tsx', content);
