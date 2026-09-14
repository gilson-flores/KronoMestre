const fs = require('fs');
const content = fs.readFileSync('components/views/SecondTeachersView.tsx', 'utf-8');

const target = `                        {st.subject && (
                          <div className="flex items-center gap-1.5 truncate">
                            <BookOpen className="w-3 h-3 shrink-0" />
                            <span className="truncate">{st.subject}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">`;

const replacement = `                        {st.subject && (
                          <div className="flex items-center gap-1.5 truncate">
                            <BookOpen className="w-3 h-3 shrink-0" />
                            <span className="truncate">{st.subject}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-3">
                        <button
                          onClick={() => setTutelageModalTeacher(st)}
                          className="w-full py-1.5 px-3 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-500 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex justify-center items-center gap-1.5"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>
                            Gerenciar Tutela (
                            {students.filter(s => 
                              (s.secondTeacherId && s.secondTeacherId === st.id) || 
                              (s.secondTeacherName && s.secondTeacherName.toLowerCase() === st.name?.toLowerCase())
                            ).length} alunos)
                          </span>
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">`;

fs.writeFileSync('components/views/SecondTeachersView.tsx', content.replace(target, replacement));
