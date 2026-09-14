const fs = require('fs');
let content = fs.readFileSync('components/views/SecondTeacherPortalView.tsx', 'utf-8');

const replacement = `
  const derivedTurmas = useMemo(() => {
    return Array.from(
      new Set(
        tutoredStudents.map((s) => s.turma).filter(Boolean)
      )
    );
  }, [tutoredStudents]);

  // Filter library files to only those accessible by the derived turmas or 'Todas'
  const accessibleLibraryFiles = useMemo(() => {
    return libraryFiles.filter(
      f => f.turma === 'Todas' || derivedTurmas.includes(f.turma)
    );
  }, [libraryFiles, derivedTurmas]);
`;

// Insert the accessibleLibraryFiles logic right after derivedTurmas
content = content.replace(
  `  const derivedTurmas = useMemo(() => {
    return Array.from(
      new Set(
        tutoredStudents.map((s) => s.turma).filter(Boolean)
      )
    );
  }, [tutoredStudents]);`,
  replacement
);

// Update the LibraryView props
content = content.replace(
  `files={libraryFiles}`,
  `files={accessibleLibraryFiles}`
);

fs.writeFileSync('components/views/SecondTeacherPortalView.tsx', content);
