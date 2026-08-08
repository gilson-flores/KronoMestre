'use client';

import React from 'react';
import { LibraryFile } from '@/lib/types';
import { FileText, Download, FolderOpen, Calendar, HardDrive } from 'lucide-react';

interface LibraryViewProps {
  files: LibraryFile[];
}

export const LibraryView: React.FC<LibraryViewProps> = ({ files }) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Arquivos e Biblioteca</h1>
        <p className="text-sm text-[#bccabb] mt-1">Materiais didáticos, textos teóricos e apresentações</p>
      </div>

      <div className="space-y-3">
        {files.map((file) => (
          <div
            key={file.id}
            className="glass-panel p-5 rounded-3xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel-hover"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#171f33] border border-white/10 text-[#4ade80] flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{file.title}</h3>
                <div className="flex items-center gap-3 text-xs text-[#bccabb] mt-1">
                  <span className="text-[#c0c1ff] font-semibold">{file.category}</span>
                  <span>•</span>
                  <span>{file.turma}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 self-end sm:self-center">
              <div className="text-right text-xs text-[#bccabb] hidden md:block">
                <p>{file.fileSize}</p>
                <p className="text-[10px]">Atualizado: {file.updatedAt}</p>
              </div>

              <button
                onClick={() => alert(`Baixando arquivo: ${file.title}`)}
                className="p-3 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] rounded-full transition-all shadow-md cursor-pointer"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
