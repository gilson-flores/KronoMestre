const fs = require('fs');
let content = fs.readFileSync('components/views/MessagesView.tsx', 'utf-8');

const filterStart = content.indexOf('{/* Filtros: Aluno, Turma e Status */}');
const nextSibling = content.indexOf('{/* Student Thread Scroll Area */}');

const filterContent = content.slice(filterStart, nextSibling);
content = content.replace(filterContent, `{!isSecondTeacher && (\n<>\n${filterContent}\n</>\n)}\n`);

fs.writeFileSync('components/views/MessagesView.tsx', content);
