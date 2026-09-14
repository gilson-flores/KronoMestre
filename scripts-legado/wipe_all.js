const fs = require('fs');
let content = fs.readFileSync('components/views/MessagesView.tsx', 'utf-8');

content = content.replace('{!isSecondTeacher && (<>', '');
content = content.replace('</>\n)}', '');
content = content.replace('</>\r\n)}', '');
content = content.replace(/<\/>\s*\)}/g, '');

fs.writeFileSync('components/views/MessagesView.tsx', content);
