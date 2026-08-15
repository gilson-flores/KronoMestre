const fs = require('fs');
let content = fs.readFileSync('components/views/PlanningView.tsx', 'utf8');

const target = `                        {/* Botão Baixar (PDF/Docs) */}
                        <button
                          onClick={() => handleDownload(plan)}
                          className="px-3 py-1.5 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] hover:text-white rounded-xl border border-white/10 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Baixar documento"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-400" />
                          <span>Baixar</span>
                        </button>`;

const replacement = `                        {/* Botão Abrir Google Docs */}
                        <button
                          onClick={() => handleDownload(plan)}
                          className="px-3 py-1.5 bg-[#171f33] hover:bg-[#222a3d] text-[#34a853] hover:text-white rounded-xl border border-white/10 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Abrir no Google Docs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Abrir Google Docs</span>
                        </button>
                        
                        {/* Botão Baixar PDF */}
                        <button
                          onClick={() => handleDownload(plan)}
                          className="px-3 py-1.5 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] hover:text-white rounded-xl border border-white/10 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Baixar PDF"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-400" />
                          <span>Baixar PDF</span>
                        </button>`;

content = content.replace(target, replacement);
fs.writeFileSync('components/views/PlanningView.tsx', content);
console.log('Done!');
