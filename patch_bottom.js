const fs = require('fs');
const content = fs.readFileSync('components/views/SecondTeachersView.tsx', 'utf-8');

const target = `      )}
    </div>
  );
};`;

const replacement = `      )}

      {/* Modal de Gestão de Tutela */}
      {tutelageModalTeacher && (
        <ManageTutelageModal
          isOpen={true}
          onClose={() => setTutelageModalTeacher(null)}
          secondTeacher={tutelageModalTeacher}
          allStudents={students}
          onSaveTutelage={handleSaveTutelage}
        />
      )}
    </div>
  );
};`;

fs.writeFileSync('components/views/SecondTeachersView.tsx', content.replace(target, replacement));
