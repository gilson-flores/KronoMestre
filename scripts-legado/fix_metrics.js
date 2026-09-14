const fs = require('fs');
let content = fs.readFileSync('components/views/SecondTeacherPortalView.tsx', 'utf-8');

const replacement = `  // Set of tutored IDs for quick lookup
  const tutoredStudentIds = useMemo(() => new Set(tutoredStudents.map((s) => s.id)), [tutoredStudents]);

  const tutoredMetrics = useMemo(() => {
    let totalEntregas = 0;
    let aguardandoCorrecao = 0;
    let somaNotas = 0;
    let qtdNotas = 0;

    activities.forEach(act => {
      act.submissions?.forEach(sub => {
        if (tutoredStudentIds.has(sub.studentId)) {
          totalEntregas++;
          if (sub.grade === undefined || sub.grade === null) {
            aguardandoCorrecao++;
          } else {
            somaNotas += sub.grade;
            qtdNotas++;
          }
        }
      });
    });

    const mediaGeral = qtdNotas > 0 ? (somaNotas / qtdNotas).toFixed(1) : '-';

    return {
      totalTutelados: tutoredStudents.length,
      totalEntregas,
      aguardandoCorrecao,
      mediaGeral,
    };
  }, [tutoredStudents, tutoredStudentIds, activities]);`;

content = content.replace('  // Set of tutored IDs for quick lookup\n  const tutoredStudentIds = useMemo(() => new Set(tutoredStudents.map((s) => s.id)), [tutoredStudents]);', replacement);

fs.writeFileSync('components/views/SecondTeacherPortalView.tsx', content);
