'use client';

import React, { useState, useRef, useMemo } from 'react';
import { LibraryFile, StudentUser } from '@/lib/types';
import { TurmaMultiSelect } from '@/components/TurmaMultiSelect';
import { TurmaFilterDropdown } from '@/components/TurmaFilterDropdown';
import {
  FileText,
  ExternalLink,
  HardDrive,
  Save,
  CheckCircle2,
  Link2,
  FolderOpen,
  UploadCloud,
  Plus,
  Trash2,
  FileUp,
  Tag,
  Users,
  Search,
  HeartHandshake,
  ShieldCheck,
} from 'lucide-react';

interface LibraryViewProps {
  files: LibraryFile[];
  students?: StudentUser[];
  driveFolderUrl?: string;
  onSaveDriveFolderUrl?: (url: string) => void;
  onAddFile?: (newFile: LibraryFile) => void;
  onDeleteFile?: (fileId: string) => void;
  isReadOnly?: boolean;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  files = [],
  students = [],
  driveFolderUrl = '',
  onSaveDriveFolderUrl,
  onAddFile,
  onDeleteFile,
  isReadOnly = false,
}) => {
  const [prevDriveFolderUrl, setPrevDriveFolderUrl] = useState(driveFolderUrl);
  const [folderInput, setFolderInput] = useState(driveFolderUrl);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Estados de busca e filtro padronizado de turmas (Passo 10)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTurmas, setSelectedTurmas] = useState<string[]>(['all']);
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'all_turmas' | 'second_teacher' | 'specific_turmas'>('all');

  // Estados do formulário de novo arquivo com compartilhamento granular (Passo 9)
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Apostila');
  const [targetAudience, setTargetAudience] = useState<'all_turmas' | 'second_teacher' | 'specific_turmas'>('all_turmas');
  const [newTurmasSelected, setNewTurmasSelected] = useState<string[]>([]);
  const [newDriveUrl, setNewDriveUrl] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileSize, setSelectedFileSize] = useState('1 MB');
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');
  const [fileToDelete, setFileToDelete] = useState<LibraryFile | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (driveFolderUrl !== prevDriveFolderUrl) {
    setPrevDriveFolderUrl(driveFolderUrl);
    setFolderInput(driveFolderUrl);
  }

  // Lista unificada de turmas do professor (extraída dos alunos ativos + arquivos)
  const turmasList = useMemo(() => {
    const set = new Set<string>();
    (students || []).forEach((s) => {
      if (s.turma && s.turma.trim()) set.add(s.turma.trim());
    });
    (files || []).forEach((f) => {
      if (f.turma && f.turma !== 'Todas' && f.turma !== 'Somente 2º Professor') {
        f.turma.split(',').forEach((part) => {
          const clean = part.trim();
          if (clean) set.add(clean);
        });
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students, files]);

  // Filtragem de arquivos pelo filtro padronizado de turmas, busca e público-alvo
  const filteredFiles = useMemo(() => {
    const isNone = selectedTurmas.includes('none');
    const isAll =
      !isNone &&
      (selectedTurmas.length === 0 ||
        selectedTurmas.includes('all') ||
        (turmasList.length > 0 && selectedTurmas.length === turmasList.length));

    return (files || []).filter((file) => {
      if (isNone) return false;

      const matchesSearch =
        !searchTerm.trim() ||
        file.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (file.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (file.turma || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      const fileAudience =
        file.targetAudience ||
        (file.turma === 'Somente 2º Professor'
          ? 'second_teacher'
          : file.turma === 'Todas'
          ? 'all_turmas'
          : 'specific_turmas');

      if (audienceFilter !== 'all' && fileAudience !== audienceFilter) {
        return false;
      }

      if (isAll) return true;

      // Arquivos gerais ou de 2º professor aparecem ou filtram conforme turma selecionada
      if (file.turma === 'Todas' || fileAudience === 'all_turmas') return true;
      const fileTurmas = (file.turma || '').split(',').map((t) => t.trim());
      return selectedTurmas.some((sel) => fileTurmas.includes(sel));
    });
  }, [files, selectedTurmas, turmasList, searchTerm, audienceFilter]);

  const handleSaveDriveFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSaveDriveFolderUrl) {
      onSaveDriveFolderUrl(folderInput.trim());
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    if (!newTitle) {
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setNewTitle(nameWithoutExt);
    }

    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB >= 1) {
      setSelectedFileSize(`${sizeInMB.toFixed(1)} MB`);
    } else {
      const sizeInKB = Math.round(file.size / 1024);
      setSelectedFileSize(`${sizeInKB} KB`);
    }
  };

  const handleAddFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const submittedUrl = newDriveUrl.trim();
    if (!submittedUrl) {
      alert('Por favor, cole o Link do Google Drive ou Repositório Externo do material no campo correspondente.');
      return;
    }

    if (targetAudience === 'specific_turmas' && newTurmasSelected.length === 0) {
      alert('Selecione pelo menos uma turma específica ou mude o compartilhamento para Todas as Turmas.');
      return;
    }

    const finalTurmaLabel =
      targetAudience === 'all_turmas'
        ? 'Todas'
        : targetAudience === 'second_teacher'
        ? 'Somente 2º Professor'
        : newTurmasSelected.join(', ');

    const createdFile: LibraryFile = {
      id: `file_${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      turma: finalTurmaLabel,
      targetAudience,
      fileSize: selectedFileSize || '1 MB',
      updatedAt: new Date().toLocaleDateString('pt-BR'),
      driveUrl: submittedUrl,
    };

    if (onAddFile) {
      onAddFile(createdFile);
    }

    setNewTitle('');
    setNewDriveUrl('');
    setSelectedFileName('');
    setTargetAudience('all_turmas');
    setNewTurmasSelected([]);
    setShowAddForm(false);
    setUploadSuccessMsg(`Arquivo "${createdFile.title}" compartilhado com sucesso (${finalTurmaLabel})!`);
    setTimeout(() => setUploadSuccessMsg(''), 5000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <FolderOpen className="w-8 h-8 text-primary" />
            <span>{isReadOnly ? 'Biblioteca de Arquivos' : 'Arquivos e Biblioteca'}</span>
          </h1>
          <p className="text-sm text-muted mt-1">
            {isReadOnly
              ? 'Consulta de materiais didáticos e repositório do Google Drive de Sociologia. (Modo Somente Leitura)'
              : 'Gerencie o Google Drive e o compartilhamento granular de materiais para turmas e 2º Professor'}
          </p>
        </div>

        {isReadOnly ? (
          <span className="px-3 py-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-xs font-bold tracking-wide uppercase shrink-0">
            Somente Leitura
          </span>
        ) : (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="py-3 px-6 bg-primary hover:bg-primary-hover text-white font-black rounded-2xl text-xs transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-95"
          >
            {showAddForm ? (
              <span>Fechar Formulário</span>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Upload / Cadastrar Arquivo</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* BARRA DE BUSCA E FILTRO DE TURMAS PADRONIZADA (PASSO 10 - IDÊNTICA À ÁREA DE ALUNOS) */}
      <div className="p-4 rounded-3xl bg-surface border border-border shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar arquivo por título, apostila, categoria ou turma..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-background border border-border text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <TurmaFilterDropdown
              turmasList={turmasList}
              selectedTurmas={selectedTurmas}
              onChange={setSelectedTurmas}
              students={students}
              totalCountLabel="alunos"
            />

            <select
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value as any)}
              className="px-3.5 py-2.5 rounded-2xl bg-background border border-border text-xs font-bold text-foreground focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="all">Todos os Públicos ({files.length})</option>
              <option value="all_turmas">🌐 Todas as Turmas</option>
              <option value="second_teacher">🤝 Somente 2º Professor</option>
              <option value="specific_turmas">🎯 Turmas Específicas</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted px-1">
          <span>
            Exibindo <strong className="text-foreground">{filteredFiles.length}</strong> de{' '}
            <strong className="text-foreground">{files.length}</strong> arquivos
          </span>
        </div>
      </div>

      {uploadSuccessMsg && (
        <div className="p-4 bg-primary/20 border border-primary/40 text-primary rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{uploadSuccessMsg}</span>
        </div>
      )}

      {/* FORMULÁRIO DE CADASTRO DE NOVO ARQUIVO COM COMPARTILHAMENTO GRANULAR (PASSO 9) */}
      {!isReadOnly && showAddForm && (
        <div className="glass-panel p-6 rounded-3xl border border-primary/40 bg-surface space-y-4 shadow-2xl animate-fadeIn">
          <div className="flex items-center gap-3 pb-3 border-b border-border">
            <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/40 text-primary flex items-center justify-center shrink-0">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Upload ou Link de Novo Arquivo Didático</h2>
              <p className="text-xs text-muted">
                Escolha o público-alvo granular: Todas as Turmas, Somente 2º Professor ou Turmas Específicas
              </p>
            </div>
          </div>

          <form onSubmit={handleAddFileSubmit} className="space-y-4 text-xs">
            <div className="p-4 rounded-2xl border-2 border-dashed border-border bg-background/50 hover:border-primary/60 transition-all text-center space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.zip,.rar,.txt"
              />
              <FileUp className="w-8 h-8 text-primary mx-auto opacity-80" />
              <div>
                <p className="font-bold text-foreground text-sm">
                  {selectedFileName ? selectedFileName : 'Clique para extrair metadados de um arquivo do seu computador'}
                </p>
                <p className="text-[11px] text-muted mt-0.5">
                  Suporta PDF, Word, PowerPoint, Imagens, ZIP e mais ({selectedFileSize})
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-2 px-4 bg-surface-hover hover:bg-white/20 text-foreground font-bold rounded-xl text-xs transition-all border border-border inline-flex items-center gap-1.5 cursor-pointer mt-1"
              >
                <UploadCloud className="w-4 h-4 text-primary" />
                <span>{selectedFileName ? 'Trocar Arquivo Selecionado' : 'Selecionar Arquivo do Dispositivo'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-muted font-semibold mb-1">Título do Arquivo / Material *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Apostila Capítulo 3 - Durkheim e Sociedade"
                  className="w-full bg-background border border-white/15 rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-muted font-semibold mb-1 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-primary" />
                  <span>Categoria</span>
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-background border border-white/15 rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="Apostila">Apostila</option>
                  <option value="Exercício">Exercício / Atividade</option>
                  <option value="Slides">Slides / Apresentação</option>
                  <option value="Material Adaptado / PEI">Material Adaptado / PEI (AEE)</option>
                  <option value="Leitura">Leitura Complementar</option>
                  <option value="Provas">Prova / Gabarito</option>
                  <option value="Outro">Outro Material</option>
                </select>
              </div>

              {/* SELETOR GRANULAR DE COMPARTILHAMENTO (PASSO 9) */}
              <div className="space-y-3">
                <div>
                  <label className="block text-muted font-semibold mb-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <span>Compartilhar Com (Público-Alvo) *</span>
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value as any)}
                    className="w-full bg-background border border-white/15 rounded-xl px-3.5 py-2.5 text-foreground font-semibold focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="all_turmas">🌐 Todas as Turmas (Alunos e 2º Professor)</option>
                    <option value="second_teacher">🤝 Somente 2º Professor (Restrito AEE / Inclusão)</option>
                    <option value="specific_turmas">🎯 Turma(s) Específica(s)...</option>
                  </select>
                </div>

                {targetAudience === 'specific_turmas' && (
                  <div className="animate-fadeIn">
                    <label className="block text-muted font-semibold mb-1">
                      Selecione as Turmas Permitidas (com Marcar/Desmarcar Tudo)
                    </label>
                    <TurmaMultiSelect
                      selectedTurmas={newTurmasSelected}
                      onChange={setNewTurmasSelected}
                      options={turmasList}
                      placeholder="Escolha uma ou mais turmas..."
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-muted font-semibold mb-1 flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5 text-primary" />
                  <span>Link do Google Drive / Repositório *</span>
                </label>
                <input
                  type="url"
                  required
                  value={newDriveUrl}
                  onChange={(e) => setNewDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="w-full bg-background border border-white/15 rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:border-primary font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="py-2.5 px-4 bg-surface-hover hover:bg-white/20 text-foreground font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="py-2.5 px-6 bg-primary hover:bg-primary-hover text-white font-black rounded-xl text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Salvar e Compartilhar Arquivo</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CARD CONFIGURAÇÃO DO REPOSITÓRIO DO GOOGLE DRIVE */}
      <div className="glass-panel p-6 rounded-3xl border border-primary/40 bg-gradient-to-br from-surface via-surface to-background space-y-4 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shrink-0 shadow-lg shadow-[#4ade80]/10">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground leading-tight flex items-center gap-2">
                <span>Repositório Geral do Google Drive</span>
                {folderInput.trim() ? (
                  <span className="text-[10px] font-extrabold bg-primary/20 text-primary border border-primary/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Conectado
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold bg-amber-100 text-amber-600 border border-amber-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Não Configurado
                  </span>
                )}
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Pasta principal do Google Drive compartilhada com as turmas e com o 2º Professor
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-primary/20 text-primary border border-primary/40 rounded-full text-[11px] font-bold tracking-wide uppercase shrink-0 w-fit">
            Drive Integrado
          </span>
        </div>

        {isReadOnly ? (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-xs text-muted">
              {folderInput.trim() ? (
                <span>Repositório gerenciado pelo professor titular regente.</span>
              ) : (
                <span>Nenhum repositório de pasta do Google Drive configurado até o momento.</span>
              )}
            </div>
            {folderInput.trim() && (
              <a
                href={folderInput.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Acessar Repositório no Drive</span>
              </a>
            )}
          </div>
        ) : (
          <form onSubmit={handleSaveDriveFolder} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-primary" />
                <span>Link da Pasta Principal do Google Drive</span>
              </label>
              <input
                type="url"
                value={folderInput}
                onChange={(e) => setFolderInput(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/sua-pasta-no-drive"
                className="w-full bg-background border border-white/15 rounded-2xl px-4 py-3 text-sm text-foreground placeholder-[#869486] focus:outline-none focus:border-primary transition-all font-mono"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="py-3 px-6 bg-primary hover:bg-primary-hover text-white font-black rounded-xl text-xs transition-all shadow-lg shadow-primary/20 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Repositório do Drive</span>
                </button>

                {folderInput.trim() && (
                  <a
                    href={folderInput.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-3 px-5 bg-surface-hover hover:bg-white/20 text-foreground font-bold rounded-xl text-xs transition-all border border-border flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <ExternalLink className="w-4 h-4 text-primary" />
                    <span>Acessar Repositório</span>
                  </a>
                )}
              </div>

              {savedSuccess && (
                <div className="flex items-center gap-2 text-primary text-xs font-bold animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Repositório do Google Drive salvo com sucesso!</span>
                </div>
              )}
            </div>
          </form>
        )}
      </div>

      {/* LISTA DE ARQUIVOS COMPARTILHADOS */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span>Arquivos Cadastrados e Materiais Didáticos ({filteredFiles.length})</span>
          </h2>
        </div>

        {filteredFiles.length === 0 ? (
          <div className="glass-panel p-8 text-center rounded-3xl border border-border text-muted text-xs space-y-3">
            <p>Nenhum arquivo encontrado para os filtros selecionados.</p>
            {!isReadOnly && (
              <button
                onClick={() => setShowAddForm(true)}
                className="py-2.5 px-5 bg-primary hover:bg-primary-hover text-white font-black rounded-xl text-xs transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Novo Arquivo</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredFiles.map((file) => {
              const fileUrl = file.driveUrl || folderInput.trim();
              const isSecondTeacherOnly =
                file.targetAudience === 'second_teacher' || file.turma === 'Somente 2º Professor';

              return (
                <div
                  key={file.id}
                  className="glass-panel p-4 sm:p-5 rounded-3xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel-hover"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#171f33] border border-border text-primary flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug">{file.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {file.category && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary border border-primary/30 rounded-full">
                            {file.category}
                          </span>
                        )}
                        {isSecondTeacherOnly ? (
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-full flex items-center gap-1">
                            <HeartHandshake className="w-3 h-3" />
                            Somente 2º Professor
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-surface-hover text-muted rounded-full flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-primary" />
                            Turma: {file.turma || 'Todas'}
                          </span>
                        )}
                        <span className="text-[11px] text-[#869486]">
                          {file.fileSize || '1 MB'} • Atualizado em {file.updatedAt || 'recentemente'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {fileUrl ? (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2.5 px-5 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-full text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer min-h-[40px]"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Baixar / Acessar</span>
                      </a>
                    ) : (
                      <span className="text-xs text-[#869486] italic">Sem link anexado</span>
                    )}

                    {!isReadOnly && onDeleteFile && (
                      <button
                        onClick={() => setFileToDelete(file)}
                        className="p-2.5 text-rose-400 hover:text-foreground hover:bg-rose-100 rounded-full transition-colors border border-rose-500/20 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                        title="Excluir arquivo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface border border-border rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-rose-500/10 rounded-full border border-rose-500/20 text-rose-500">
                <Trash2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Excluir Arquivo</h3>
                <p className="text-sm text-text-muted mt-2">
                  Deseja realmente excluir o material <strong className="text-foreground">{fileToDelete.title}</strong>?
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  if (onDeleteFile) onDeleteFile(fileToDelete.id);
                  setFileToDelete(null);
                }}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors cursor-pointer min-h-[44px]"
              >
                Sim, Excluir Arquivo
              </button>
              <button
                onClick={() => setFileToDelete(null)}
                className="w-full py-3 bg-transparent border border-border hover:bg-surface-hover text-foreground font-bold rounded-xl transition-colors cursor-pointer min-h-[44px]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryView;
