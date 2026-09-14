const fs = require('fs');
let content = fs.readFileSync('components/views/SecondTeacherPortalView.tsx', 'utf-8');

// Add imports
if (!content.includes("import { Sidebar }")) {
  content = content.replace(
    "import { MessagesView } from '@/components/views/MessagesView';",
    "import { MessagesView } from '@/components/views/MessagesView';\nimport { Sidebar } from '@/components/Sidebar';\nimport { Menu } from 'lucide-react';"
  );
}

// Add state
if (!content.includes("isMobileMenuOpen")) {
  content = content.replace(
    "const [activeTab, setActiveTab] = useState",
    "const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);\n  const [activeTab, setActiveTab] = useState"
  );
}

// Find the return statement and replace the whole thing.
// I will just use regex to replace everything after `return (` 
const returnStart = content.indexOf('return (');
const beforeReturn = content.slice(0, returnStart);

const newReturn = `return (
    <div className="flex min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={activeTab}
        setCurrentTab={setActiveTab as any}
        teacher={teacher}
        role="second_teacher"
        onLogout={onLogout}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border shadow-sm px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-foreground hover:bg-surface-hover rounded-xl transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-foreground text-sm truncate max-w-[200px]">
              Portal PNE
            </span>
          </div>
          <div className="flex items-center gap-3">
            <img
              src={teacher.avatarUrl ? teacher.avatarUrl : 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250'}
              alt={teacher.name || 'Professor'}
              className="w-8 h-8 rounded-full object-cover border border-primary/30"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250';
              }}
            />
          </div>
        </div>

        {/* Main Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
          {tutoredStudents.length === 0 && (
            <div className="p-6 mb-6 rounded-3xl bg-surface border border-border shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              <div className="p-4 rounded-2xl bg-amber-500/15 text-amber-500 shrink-0">
                <HeartHandshake className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-bold text-foreground">Nenhum aluno vinculado à sua tutela ainda</h2>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Você está autenticado no Portal do 2º Professor. Assim que o Professor Titular vincular os estudantes PNE ao seu cadastro, as turmas correspondentes, o roster completo dos alunos da turma e os indicadores de acompanhamento pedagógico carregarão aqui automaticamente.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <button
                    onClick={() => setActiveTab('biblioteca')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-surface border border-border text-foreground hover:bg-surface-hover transition-all"
                  >
                    Explorar Biblioteca de Arquivos
                  </button>
                  <button
                    onClick={() => setActiveTab('mensagens')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-surface border border-border text-foreground hover:bg-surface-hover transition-all"
                  >
                    Falar com o Professor Titular
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'desempenho' && (
            <div className="space-y-6 animate-fadeIn">
`;

// Now I need to extract the actual content of the tabs from the original content
const mainContentStart = content.indexOf("{/* TAB 1: DESEMPENHO E ACOMPANHAMENTO PNE */}");
// Wait, is there a `{/* TAB 1...` comment? Let's check!
