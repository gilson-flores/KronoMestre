const fs = require('fs');
let content = fs.readFileSync('components/views/SecondTeacherPortalView.tsx', 'utf-8');

const replacement = `  const filteredClassRoster = useMemo(() => {
    return classRoster.filter((s) => {
      const matchSearch = s.fullName.toLowerCase().includes(rosterSearch.toLowerCase());
      const matchTurma = rosterTurmaFilter === 'all' || s.turma === rosterTurmaFilter;
      
      let matchTag = true;
      if (rosterTagFilter === 'tutelados') {
        matchTag = tutoredStudentIds.has(s.id);
      } else if (rosterTagFilter === 'pne') {
        matchTag = s.specialNeeds && s.specialNeeds.trim().length > 0;
      } else if (rosterTagFilter === 'regular') {
        matchTag = !s.specialNeeds || s.specialNeeds.trim().length === 0;
      }

      return matchSearch && matchTurma && matchTag;
    });
  }, [classRoster, rosterSearch, rosterTurmaFilter, rosterTagFilter, tutoredStudentIds]);`;

content = content.replace(/  const filteredClassRoster = useMemo\(\(\) => \{[\s\S]*?\}, \[classRoster, rosterSearchTerm, rosterTurmaFilter, rosterPneFilter\]\);/, replacement);

fs.writeFileSync('components/views/SecondTeacherPortalView.tsx', content);
