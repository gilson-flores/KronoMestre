'use client';

import React, { useState, useRef } from 'react';
import { LibraryFile } from '@/lib/types';
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
  Users
} from 'lucide-react';

interface LibraryViewProps {
  files: LibraryFile[];
  driveFolderUrl?: string;
  onSaveDriveFolderUrl?: (url: string) => void;
  onAddFile?: (newFile: LibraryFile) => void;
  onDeleteFile?: (fileId: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  files,
  driveFolderUrl = '',
  onSaveDriveFolderUrl,
  onAddFile,
  onDeleteFile,
}) => {
  const [prevDriveFolderUrl, setPrevDriveFolderUrl] = useState(driveFolderUrl);
  const [folderInput, setFolderInput] = useState(driveFolderUrl);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Modal / Form state para cadastrar novo arquivo
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Apostila');
  const [newTurma, setNewTurma] = useState('Todas');
  const [newDriveUrl, setNewDriveUrl] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileSize, setSelectedFileSize] = useState('1 MB');
  const [fileDataUrl, setFileDataUrl] = useState('');
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (driveFolderUrl !== prevDriveFolderUrl) {
    setPrevDriveFolderUrl(driveFolderUrl);
    setFolderInput(driveFolderUrl);
  }

  const handleSaveDriveFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSaveDriveFolderUrl) {
      onSaveDriveFolderUrl(folderInput.trim());
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 4000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    if (!newTitle) {
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setNewTitle(nameWithoutExt);
    }

    // Format size
    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB >= 1) {
      setSelectedFileSize(`${sizeInMB.toFixed(1)} MB`);
    } else {
      const sizeInKB = Math.round(file.size / 1024);
      setSelectedFileSize(`${sizeInKB} KB`);
    }

    // Convert file to Data URL so it can be downloaded directly
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setFileDataUrl(result);
        if (!newDriveUrl) {
          setNewDriveUrl(result);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const finalUrl = newDriveUrl.trim() || fileDataUrl || driveFolderUrl;

    const newLibraryFile: LibraryFile = {
      id: `file-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      turma: newTurma,
      fileSize: selectedFileSize,
      updatedAt: new Date().toLocaleDateString('pt-BR'),
      driveUrl: finalUrl,
    };

    if (onAddFile) {
      onAddFile(newLibraryFile);
    }

    setUploadSuccessMsg('Arquivo cadastrado com sucesso!');
    setTimeout(() => setUploadSuccessMsg(''), 4000);

    // Reset form
    setNewTitle('');
    setNewDriveUrl('');
    setSelectedFileName('');
    setFileDataUrl('');
    setSelectedFileSize('1 MB');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <FolderOpen className="w-8 h-8 text-[#4ade80]" />
            <span>Arquivos e Biblioteca</span>
          </h1>
          <p className="text-sm text-[#bccabb] mt-1">
            Gerencie o Google Drive e materiais didáticos de Sociologia para os seus alunos
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="py-3 px-6 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-black rounded-2xl text-xs transition-all shadow-lg shadow-[#4ade80]/20 flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-95"
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
      </div>

      {uploadSuccessMsg && (
        <div className="p-4 bg-[#4ade80]/20 border border-[#4ade80]/40 text-[#4ade80] rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{uploadSuccessMsg}</span>
        </div>
      )}

      {/* FORMULÁRIO DE CADASTRO DE NOVO ARQUIVO */}
      {showAddForm && (
        <div className="glass-panel p-6 rounded-3xl border border-[#4ade80]/40 bg-[#131b2e] space-y-4 shadow-2xl animate-fadeIn">
          <div className="flex items-center gap-3 pb-3 border-b border-white/10">
            <div className="w-10 h-10 rounded-2xl bg-[#4ade80]/20 border border-[#4ade80]/40 text-[#4ade80] flex items-center justify-center shrink-0">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Upload ou Link de Novo Arquivo Didático</h2>
              <p className="text-xs text-[#bccabb]">Anexe um arquivo local do seu computador ou informe o link direto</p>
            </div>
          </div>

          <form onSubmit={handleAddFileSubmit} className="space-y-4 text-xs">
            {/* AREA DE UPLOAD DE ARQUIVO LOCAL */}
            <div className="p-4 rounded-2xl border-2 border-dashed border-white/20 bg-[#0b1326]/50 hover:border-[#4ade80]/60 transition-all text-center space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.zip,.rar,.txt"
              />
              <FileUp className="w-8 h-8 text-[#4ade80] mx-auto opacity-80" />
              <div>
                <p className="font-bold text-white text-sm">
                  {selectedFileName ? selectedFileName : 'Clique para selecionar um arquivo do seu computador'}
                </p>
                <p className="text-[11px] text-[#bccabb] mt-0.5">
                  Suporta PDF, Word, PowerPoint, Imagens, ZIP e mais ({selectedFileSize})
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-2 px-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-all border border-white/10 inline-flex items-center gap-1.5 cursor-pointer mt-1"
              >
                <UploadCloud className="w-4 h-4 text-[#4ade80]" />
                <span>{selectedFileName ? 'Trocar Arquivo Selecionado' : 'Selecionar Arquivo do Dispositivo'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#bccabb] font-semibold mb-1">Título do Arquivo / Material *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Apostila Capitulo 3 - Durkheim e Sociedade"
                  className="w-full bg-[#0b1326] border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#4ade80]"
                />
              </div>

              <div>
                <label className="block text-[#bccabb] font-semibold mb-1 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-[#4ade80]" />
                  <span>Categoria</span>
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-[#0b1326] border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#4ade80]"
                >
                  <option value="Apostila">Apostila</option>
                  <option value="Exercício">Exercício / Atividade</option>
                  <option value="Slides">Slides / Apresentação</option>
                  <option value="Leitura">Leitura Complementar</option>
                  <option value="Provas">Prova / Gabarito</option>
                  <option value="Outro">Outro Material</option>
                </select>
              </div>

              <div>
                <label className="block text-[#bccabb] font-semibold mb-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#4ade80]" />
                  <span>Turma Alvo</span>
                </label>
                <select
                  value={newTurma}
                  onChange={(e) => setNewTurma(e.target.value)}
                  className="w-full bg-[#0b1326] border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#4ade80]"
                >
                  <option value="Todas">Todas as Turmas</option>
                  <option value="3º Ano B">3º Ano B</option>
                  <option value="2º Ano A">2º Ano A</option>
                  <option value="1º Ano C">1º Ano C</option>
                  <option value="Turma 301">Turma 301</option>
                  <option value="Turma 302">Turma 302</option>
                </select>
              </div>

              <div>
                <label className="block text-[#bccabb] font-semibold mb-1 flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5 text-[#4ade80]" />
                  <span>Link Externo / Google Drive (Opcional se já anexou arquivo)</span>
                </label>
                <input
                  type="url"
                  value={newDriveUrl}
                  onChange={(e) => setNewDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="w-full bg-[#0b1326] border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#4ade80] font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="py-2.5 px-6 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-black rounded-xl text-xs transition-all shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Salvar e Cadastrar Arquivo</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CARD CONFIGURAÇÃO DA PASTA DO GOOGLE DRIVE */}
      <div className="glass-panel p-6 rounded-3xl border border-[#4ade80]/30 bg-gradient-to-br from-[#131b2e] to-[#0d1527] space-y-4 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4ade80]/10 border border-[#4ade80]/30 text-[#4ade80] flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Link da Pasta do Google Drive</h2>
              <p className="text-xs text-[#bccabb]">
                Cole o link público da sua pasta no Drive onde ficam os arquivos gerais para download dos alunos
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/40 rounded-full text-[11px] font-bold tracking-wide uppercase shrink-0 w-fit">
            Aba dos Alunos
          </span>
        </div>

        <form onSubmit={handleSaveDriveFolder} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#dae2fd] uppercase tracking-wider flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-[#4ade80]" />
              <span>URL da Pasta Geral no Google Drive</span>
            </label>
            <input
              type="url"
              value={folderInput}
              onChange={(e) => setFolderInput(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/seu-codigo-de-pasta"
              className="w-full bg-[#0b1326] border border-white/15 rounded-2xl px-4 py-3 text-sm text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80] transition-all font-mono"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="py-3 px-6 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-black rounded-xl text-xs transition-all shadow-lg shadow-[#4ade80]/20 flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Link do Drive</span>
              </button>

              {folderInput.trim() && (
                <a
                  href={folderInput.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-all border border-white/10 flex items-center gap-2 cursor-pointer active:scale-95"
                  title="Testar e abrir pasta em nova aba"
                >
                  <ExternalLink className="w-4 h-4 text-[#4ade80]" />
                  <span>Testar Link</span>
                </a>
              )}
            </div>

            {savedSuccess && (
              <div className="flex items-center gap-2 text-[#4ade80] text-xs font-bold animate-fadeIn">
                <CheckCircle2 className="w-4 h-4" />
                <span>Link salvo com sucesso! Os alunos já têm acesso a esta pasta.</span>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* LISTA DE ARQUIVOS AVULSOS */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#4ade80]" />
            <span>Arquivos Cadastrados e Materiais Didáticos ({files.length})</span>
          </h2>
        </div>

        {files.length === 0 ? (
          <div className="glass-panel p-8 text-center rounded-3xl border border-white/10 text-[#bccabb] text-xs space-y-3">
            <p>Nenhum arquivo individual cadastrado até o momento.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="py-2.5 px-5 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-black rounded-xl text-xs transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Primeiro Arquivo</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {files.map((file) => {
              const fileUrl = file.driveUrl || folderInput.trim();

              return (
                <div
                  key={file.id}
                  className="glass-panel p-4 sm:p-5 rounded-3xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel-hover"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#171f33] border border-white/10 text-[#4ade80] flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white leading-snug">{file.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {file.category && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/30 rounded-full">
                            {file.category}
                          </span>
                        )}
                        {file.turma && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-white/10 text-[#bccabb] rounded-full">
                            Turma: {file.turma}
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
                        className="py-2.5 px-5 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-extrabold rounded-full text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer min-h-[40px]"
                        title="Baixar ou abrir arquivo"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Baixar / Acessar</span>
                      </a>
                    ) : (
                      <span className="text-xs text-[#869486] italic">Sem link anexado</span>
                    )}

                    {onDeleteFile && (
                      <button
                        onClick={() => onDeleteFile(file.id)}
                        className="p-2.5 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-full transition-colors border border-rose-500/20 cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
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
    </div>
  );
};
