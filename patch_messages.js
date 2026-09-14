const fs = require('fs');
let content = fs.readFileSync('components/views/MessagesView.tsx', 'utf-8');

// Add isSecondTeacher to props
content = content.replace(
  "currentUserRole: 'teacher' | 'student';",
  "currentUserRole: 'teacher' | 'student';\n  isSecondTeacher?: boolean;"
);

content = content.replace(
  "export const MessagesView: React.FC<MessagesViewProps> = ({",
  "export const MessagesView: React.FC<MessagesViewProps> = ({\n  isSecondTeacher,"
);

// We need to hide the filters if it is second teacher.
const filterStart = content.indexOf('{/* Filtros Container */}');
const nextSibling = content.indexOf('{/* Student Thread Scroll Area */}');

const filterContent = content.slice(filterStart, nextSibling);
content = content.replace(filterContent, `{!isSecondTeacher && (\n${filterContent}\n)}\n`);

fs.writeFileSync('components/views/MessagesView.tsx', content);
