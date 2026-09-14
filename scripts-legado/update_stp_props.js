const fs = require('fs');
let content = fs.readFileSync('components/views/SecondTeacherPortalView.tsx', 'utf-8');

content = content.replace(
  'currentUserRole="teacher"',
  'currentUserRole="teacher"\n              isSecondTeacher={true}'
);

fs.writeFileSync('components/views/SecondTeacherPortalView.tsx', content);
