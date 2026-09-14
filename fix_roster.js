const fs = require('fs');
let content = fs.readFileSync('components/views/SecondTeacherPortalView.tsx', 'utf-8');

const replacement = `  // 3. Class Roster: ALL students belonging to the derived turmas
  const classRoster = useMemo(() => {
    if (derivedTurmas.length === 0) return [];
    return allStudents.filter((s) => s.turma && derivedTurmas.includes(s.turma.trim()));
  }, [allStudents, derivedTurmas]);

  const filteredClassRoster = useMemo(() => {
    return classRoster.filter((s) => {
      const matchSearch = s.fullName.toLowerCase().includes(rosterSearchTerm.toLowerCase());
      const matchTurma = rosterTurmaFilter === 'all' || s.turma === rosterTurmaFilter;
      const matchPNE = rosterPneFilter === 'all' || 
                       (rosterPneFilter === 'pne' && s.specialNeeds && s.specialNeeds.trim().length > 0) ||
                       (rosterPneFilter === 'regular' && (!s.specialNeeds || s.specialNeeds.trim().length === 0));
      return matchSearch && matchTurma && matchPNE;
    });
  }, [classRoster, rosterSearchTerm, rosterTurmaFilter, rosterPneFilter]);`;

content = content.replace(/  \/\/ 3\. Class Roster: ALL students belonging to the derived turmas\s+const classRoster = useMemo\(\(\) => \{\s+if \(derivedTurmas\.length === 0\) return \[\];\s+return allStudents\.filter\(\(s\) => s\.turma && derivedTurmas\.includes\(s\.turma\.trim\(\)\)\);\s+\}, \[allStudents, derivedTurmas\]\);/, replacement);

fs.writeFileSync('components/views/SecondTeacherPortalView.tsx', content);
