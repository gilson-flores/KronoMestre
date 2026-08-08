'use client';

import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertTriangle, Copy, Check, Download, Info } from 'lucide-react';
import { StudentUser } from '@/lib/types';
import {
  DEFAULT_TURMAS,
  isValidTurmaCode,
  normalizeStudentName,
  validateStudentName,
  getTurmaLabel,
} from '@/lib/studentUtils';

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportStudents: (newStudents: StudentUser[]) => void;
}

interface ParsedRow {
  index: number;
  rawFullName: string;
  normalizedFullName: string;
  turma: string;
  matricula: string;
  tag: 'REGULAR' | 'PNE' | 'RAD';
  isValid: boolean;
  errors: string[];
}

const EXAMPLE_CSV = `full_name,turma,matricula,tag
CARLOS EDUARDO SILVEIRA,301,2023854,REGULAR
ANA JULIA PEREIRA,3001,2023855,PNE
LUCAS GABRIEL MARTINS,201,2023856,RAD
JOAO PEDRO SILVA,101,2023857,REGULAR`;

export const ImportCsvModal: React.FC<ImportCsvModalProps> = ({
  isOpen,
  onClose,
  onImportStudents,
}) => {
  const [csvText, setCsvText] = useState('');
  const [copied, setCopied] = useState(false);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [hasProcessed, setHasProcessed] = useState(false);

  if (!isOpen) return null;

  const handleCopyExample = () => {
    navigator.clipboard.writeText(EXAMPLE_CSV);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadExample = () => {
    const blob = new Blob([EXAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modelo_alunos_sociologia.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvText(content);
        processCsvContent(content);
      }
    };
    reader.readAsText(file);
  };

  const processCsvContent = (text: string) => {
    setHeaderError(null);
    setParsedRows([]);
    setHasProcessed(false);

    if (!text.trim()) {
      setHeaderError('O conteúdo do CSV está vazio.');
      return;
    }

    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      setHeaderError('O arquivo CSV não possui nenhuma linha de dados.');
      return;
    }

    // Header validation (First line MUST contain English column names: full_name, turma, matricula)
    const headerLine = lines[0].toLowerCase();
    const delimiter = headerLine.includes(';') ? ';' : ',';
    const headerCols = headerLine.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));

    const fullNameIndex = headerCols.findIndex((c) => c === 'full_name' || c === 'fullname' || c === 'name');
    const turmaIndex = headerCols.findIndex((c) => c === 'turma' || c === 'class');
    const matriculaIndex = headerCols.findIndex((c) => c === 'matricula' || c === 'registration' || c === 'id');
    const tagIndex = headerCols.findIndex((c) => c === 'tag' || c === 'category');

    if (fullNameIndex === -1 || turmaIndex === -1 || matriculaIndex === -1) {
      setHeaderError(
        'Cabeçalho incorreto ou ausente! O arquivo CSV deve conter obrigatoriamente as colunas em inglês: full_name,turma,matricula,tag'
      );
      return;
    }

    const rows: ParsedRow[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const cols = line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
      const rawFullName = cols[fullNameIndex] || '';
      const rawTurma = cols[turmaIndex] || '';
      const rawMatricula = cols[matriculaIndex] || '';
      const rawTag = tagIndex !== -1 ? cols[tagIndex] : 'REGULAR';

      const errors: string[] = [];

      // 1. Name validation & normalization
      const nameVal = validateStudentName(rawFullName);
      if (!nameVal.isValid) {
        errors.push(nameVal.errorMessage || 'Nome inválido');
      }

      // 2. Turma code validation
      const cleanTurma = rawTurma.trim();
      if (!cleanTurma) {
        errors.push('Código de turma é obrigatório');
      } else if (!isValidTurmaCode(cleanTurma)) {
        errors.push(
          `Turma "${cleanTurma}" fora do padrão. Deve ter 3 dígitos (ex: 301) ou 4 dígitos técnico (ex: 3001)`
        );
      }

      // 3. Matricula validation
      const cleanMatricula = rawMatricula.trim() || `2023${Math.floor(100 + Math.random() * 900)}`;

      // 4. Tag validation
      let tagValue: 'REGULAR' | 'PNE' | 'RAD' = 'REGULAR';
      const upperTag = rawTag.toUpperCase().trim();
      if (upperTag === 'PNE') tagValue = 'PNE';
      else if (upperTag === 'RAD') tagValue = 'RAD';

      rows.push({
        index: i,
        rawFullName,
        normalizedFullName: nameVal.normalized,
        turma: cleanTurma,
        matricula: cleanMatricula,
        tag: tagValue,
        isValid: errors.length === 0,
        errors,
      });
    }

    setParsedRows(rows);
    setHasProcessed(true);
  };

  const handleConfirmImport = () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    const newStudents: StudentUser[] = validRows.map((r) => ({
      id: `s-${Date.now()}-${r.index}`,
      fullName: r.normalizedFullName, // GUARANTEED UPPERCASE & NO SPECIAL CHARACTERS
      turma: r.turma,
      matricula: r.matricula,
      tag: r.tag,
      passwordHash: '1234',
      avatarUrl:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
    }));

    onImportStudents(newStudents);
    onClose();
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl glass-panel rounded-3xl border border-white/10 p-6 sm:p-8 space-y-6 shadow-2xl relative my-8 animate-fadeIn max-h-[90vh] flex flex-col">
        {/* Header Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#bccabb] hover:text-white rounded-full hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-3 bg-[#4ade80]/10 text-[#4ade80] rounded-2xl border border-[#4ade80]/20">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Importar Alunos via CSV</h2>
            <p className="text-xs text-[#bccabb]">
              Padronização automática de nomes em MAIÚSCULAS e turmas de 3 ou 4 dígitos
            </p>
          </div>
        </div>

        {/* Instructions & English Header Spec */}
        <div className="bg-[#131b2e] p-4 rounded-2xl border border-white/10 space-y-3 shrink-0 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#4ade80] font-bold uppercase tracking-wider">
              <Info className="w-4 h-4" />
              <span>Cabeçalho Obrigatório no CSV (em inglês):</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyExample}
                className="py-1 px-3 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] rounded-lg border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#4ade80]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Exemplo'}</span>
              </button>
              <button
                onClick={handleDownloadExample}
                className="py-1 px-3 bg-[#171f33] hover:bg-[#222a3d] text-[#dae2fd] rounded-lg border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Modelo</span>
              </button>
            </div>
          </div>

          <div className="bg-[#0b1326] p-2.5 rounded-xl font-mono text-white/90 border border-white/5 overflow-x-auto selection:bg-[#4ade80]/30">
            full_name,turma,matricula,tag
          </div>

          <ul className="text-[#bccabb] space-y-1 list-disc list-inside text-[11px]">
            <li>
              <strong className="text-white">full_name:</strong> Nome do aluno. Será convertido automaticamente para{' '}
              <span className="text-[#4ade80] font-bold">MAIÚSCULAS E SEM ACENTOS</span> (ex: <code>JOAO DA SILVA</code>).
            </li>
            <li>
              <strong className="text-white">turma:</strong> Código da turma. 3 dígitos para ensino regular (ex:{' '}
              <code>101</code>, <code>301</code>) ou 4 dígitos para técnico (ex: <code>3001</code>).
            </li>
            <li>
              <strong className="text-white">matricula:</strong> Número de registro do aluno (ex: <code>2023854</code>).
            </li>
            <li>
              <strong className="text-white">tag:</strong> Categoria do aluno: <code>REGULAR</code>, <code>PNE</code> ou <code>RAD</code>.
            </li>
          </ul>
        </div>

        {/* Upload & Text input zone */}
        <div className="space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-white">Carregar Arquivo ou Colar Conteúdo CSV:</label>
            <label className="py-1.5 px-3 bg-[#171f33] hover:bg-[#222a3d] text-[#4ade80] font-bold rounded-lg border border-[#4ade80]/30 text-xs flex items-center gap-1.5 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Escolher Arquivo .csv</span>
              <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <textarea
            rows={4}
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              processCsvContent(e.target.value);
            }}
            placeholder={`Cole aqui o conteúdo CSV. Exemplo:\nfull_name,turma,matricula,tag\nCARLOS EDUARDO SILVEIRA,301,2023854,REGULAR\nANA JULIA PEREIRA,3001,2023855,PNE`}
            className="w-full bg-[#131b2e] border border-white/10 rounded-2xl p-3 text-xs font-mono text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80]"
          />
        </div>

        {/* Error Alert */}
        {headerError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl text-xs flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{headerError}</span>
          </div>
        )}

        {/* Preview Table of parsed rows */}
        {hasProcessed && parsedRows.length > 0 && (
          <div className="flex-1 min-h-[160px] overflow-y-auto space-y-2 border border-white/10 rounded-2xl p-3 bg-[#0b1326]/60">
            <div className="flex items-center justify-between text-xs font-semibold text-[#bccabb] px-1 pb-1 border-b border-white/5">
              <span>Pré-visualização da Importação ({parsedRows.length} linhas)</span>
              <div className="flex items-center gap-3">
                <span className="text-[#4ade80] font-bold">{validCount} Válidos</span>
                {invalidCount > 0 && <span className="text-rose-400 font-bold">{invalidCount} Com Erros</span>}
              </div>
            </div>

            <div className="space-y-1.5">
              {parsedRows.map((row) => (
                <div
                  key={row.index}
                  className={`p-2.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    row.isValid
                      ? 'bg-[#131b2e]/80 border-[#4ade80]/20 text-white'
                      : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {row.isValid ? (
                      <CheckCircle2 className="w-4 h-4 text-[#4ade80] shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        <span>{row.normalizedFullName || row.rawFullName || '(Sem Nome)'}</span>
                        {row.rawFullName && row.rawFullName.toUpperCase() !== row.normalizedFullName && (
                          <span className="text-[10px] text-[#4ade80] bg-[#4ade80]/10 px-1.5 py-0.5 rounded font-mono">
                            Padronizado
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#bccabb]">
                        Turma: <strong className="text-white">{row.turma || '-'}</strong> ({getTurmaLabel(row.turma)}) • Matrícula: {row.matricula} • Tag: {row.tag}
                      </div>
                    </div>
                  </div>

                  {!row.isValid && row.errors.length > 0 && (
                    <div className="text-[11px] text-rose-400 bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20">
                      {row.errors.join(' | ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 shrink-0 pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#171f33] hover:bg-[#222a3d] text-[#bccabb] hover:text-white text-xs font-bold rounded-full transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            onClick={handleConfirmImport}
            disabled={validCount === 0}
            className={`py-2.5 px-6 font-bold rounded-full text-xs transition-all shadow-lg flex items-center gap-2 ${
              validCount > 0
                ? 'bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] shadow-[#4ade80]/20 cursor-pointer'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Importar {validCount} Alunos Válidos</span>
          </button>
        </div>
      </div>
    </div>
  );
};
