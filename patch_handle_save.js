const fs = require('fs');
const content = fs.readFileSync('components/views/SecondTeachersView.tsx', 'utf-8');

const target = `  };

  // Change Password State`;

const replacement = `  };

  const handleSaveTutelage = async (updates: { student: StudentUser; isAssigned: boolean }[]) => {
    if (!tutelageModalTeacher || !onSaveStudent) return;
    
    for (const update of updates) {
      const { student, isAssigned } = update;
      const updatedStudent: StudentUser = {
        ...student,
        secondTeacherId: isAssigned ? tutelageModalTeacher.id : undefined,
        secondTeacherName: isAssigned ? tutelageModalTeacher.name : undefined,
      };

      if (supabase) {
        try {
          await supabase
            .from('students')
            .update({
              second_teacher_id: isAssigned ? tutelageModalTeacher.id : null,
              second_teacher_name: isAssigned ? tutelageModalTeacher.name : null,
            })
            .eq('id', student.id);
        } catch (e) {
          console.error(e);
        }
      }
      onSaveStudent(updatedStudent);
    }
    
    setSuccessMsg('Tutela atualizada com sucesso!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Change Password State`;

fs.writeFileSync('components/views/SecondTeachersView.tsx', content.replace(target, replacement));
