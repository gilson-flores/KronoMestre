const fs = require('fs');
let content = fs.readFileSync('components/views/MessagesView.tsx', 'utf-8');

// The outer div is <div className="p-3 sm:p-4 border-b border-border space-y-2.5 bg-surface/60 shrink-0">
// We wrapped `<> {/* Filtros: Aluno, Turma e Status */} ... </>`
// The end is:
//               </div>
//             </div>
//             </>)}
// {/* Student Thread Scroll Area */}

const badEnding = `              </div>
            </div>
            </>)}
{/* Student Thread Scroll Area */}`;

const goodEnding = `              </div>
            </>)}
            </div>
            {/* Student Thread Scroll Area */}`;

content = content.replace(badEnding, goodEnding);
fs.writeFileSync('components/views/MessagesView.tsx', content);
