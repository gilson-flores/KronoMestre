const fs = require('fs');
let content = fs.readFileSync('components/views/SecondTeachersView.tsx', 'utf-8');

// Add import for SecondTeacherMessagesModal
content = content.replace(
  "import { ManageTutelageModal } from '@/components/modals/ManageTutelageModal';",
  "import { ManageTutelageModal } from '@/components/modals/ManageTutelageModal';\nimport { SecondTeacherMessagesModal } from '@/components/modals/SecondTeacherMessagesModal';"
);

// Add state for SecondTeacherMessagesModal
content = content.replace(
  "const [tutelageModalTeacher, setTutelageModalTeacher] = useState<TeacherUser | null>(null);",
  "const [tutelageModalTeacher, setTutelageModalTeacher] = useState<TeacherUser | null>(null);\n  const [historyModalTeacher, setHistoryModalTeacher] = useState<TeacherUser | null>(null);"
);

// Add button to open the modal
// We will put it next to "Resetar Senha"
const resetButtonTarget = `<button
                        onClick={() => handleResetTeacherPassword(st)}
                        className="py-1.5 px-3 text-xs font-bold rounded-xl border transition-all flex items-center gap-1 bg-primary hover:bg-primary/90 text-white border-none shadow-sm cursor-pointer"
                      >
                        <KeyRound className="w-3 h-3" />
                        <span>Resetar Senha</span>
                      </button>`;

const replacementButton = `<button
                        onClick={() => handleResetTeacherPassword(st)}
                        className="py-1.5 px-3 text-xs font-bold rounded-xl border transition-all flex items-center gap-1 bg-primary hover:bg-primary/90 text-white border-none shadow-sm cursor-pointer"
                      >
                        <KeyRound className="w-3 h-3" />
                        <span>Resetar Senha</span>
                      </button>
                      <button
                        onClick={() => setHistoryModalTeacher(st)}
                        className="py-1.5 px-3 text-xs font-bold rounded-xl border transition-all flex items-center gap-1 bg-surface border-border hover:bg-surface-hover text-foreground cursor-pointer shadow-sm"
                        title="Ver Histórico de Conversas"
                      >
                        <MessageSquare className="w-3 h-3" />
                      </button>`;
content = content.replace(resetButtonTarget, replacementButton);

// Add the modal component at the end of the file
const manageTutelageModalStr = `<ManageTutelageModal
        isOpen={Boolean(tutelageModalTeacher)}
        onClose={() => setTutelageModalTeacher(null)}
        teacher={tutelageModalTeacher}
        students={students}
        onSave={handleSaveTutelage}
      />`;

const modalsToAppend = `${manageTutelageModalStr}
      {historyModalTeacher && (
        <SecondTeacherMessagesModal
          isOpen={Boolean(historyModalTeacher)}
          onClose={() => setHistoryModalTeacher(null)}
          secondTeacher={historyModalTeacher}
          messages={messages}
          students={students}
        />
      )}`;

content = content.replace(manageTutelageModalStr, modalsToAppend);

fs.writeFileSync('components/views/SecondTeachersView.tsx', content);
