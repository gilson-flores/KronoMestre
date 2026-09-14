const fs = require('fs');
let content = fs.readFileSync('components/views/SecondTeacherPortalView.tsx', 'utf-8');

const replacement = `  const tutoredMetrics = useMemo(() => {
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
  }, [tutoredStudents, tutoredStudentIds, activities]);

  const tutoredDeliveries = useMemo(() => {
    const deliveries = [];
    activities.forEach(act => {
      act.submissions?.forEach(sub => {
        if (tutoredStudentIds.has(sub.studentId)) {
          const student = tutoredStudents.find(s => s.id === sub.studentId);
          deliveries.push({
            activityId: act.id,
            studentId: sub.studentId,
            studentName: student?.fullName || student?.name || 'Aluno Desconhecido',
            activityTitle: act.title,
            isAdapted: !!act.adaptedContent,
            turma: student?.turma || 'Sem Turma',
            status: (sub.grade === undefined || sub.grade === null) ? 'pending' : 'graded',
            totalGrade: sub.grade,
            maxGrade: act.maxGrade || 10,
            teacherFeedback: sub.feedback
          });
        }
      });
    });
    // Sort by most recent (assuming ID is loosely chronological or just reversed)
    return deliveries.reverse();
  }, [activities, tutoredStudents, tutoredStudentIds]);`;

content = content.replace(/  const tutoredMetrics = useMemo\(\(\) => \{[\s\S]*?\}, \[tutoredStudents, tutoredStudentIds, activities\]\);/, replacement);

fs.writeFileSync('components/views/SecondTeacherPortalView.tsx', content);
