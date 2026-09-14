const fs = require('fs');
let content = fs.readFileSync('components/views/SecondTeacherPortalView.tsx', 'utf-8');

// Move tutoredStudentIds definition BEFORE filteredClassRoster
const studentIdsStr = "  // Set of tutored IDs for quick lookup\n  const tutoredStudentIds = useMemo(() => new Set(tutoredStudents.map((s) => s.id)), [tutoredStudents]);";

content = content.replace(studentIdsStr + '\n\n', '');
content = content.replace('  const filteredClassRoster = useMemo(() => {', studentIdsStr + '\n\n  const filteredClassRoster = useMemo(() => {');

fs.writeFileSync('components/views/SecondTeacherPortalView.tsx', content);
