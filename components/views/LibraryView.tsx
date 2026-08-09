'use client';

import React from 'react';
import { LibraryFile } from '@/lib/types';
import { FileText, ExternalLink, HardDrive } from 'lucide-react';

interface LibraryViewProps {
  files: LibraryFile[];
}

export const LibraryView: React.FC<LibraryViewProps> = ({ files }) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Arquivos e Biblioteca</h1>
        <p className="text-sm text-[#bccabb] mt-1">
          Materiais didáticos, textos teóricos e apresentações hospedados no Google Drive
        </p>
      </div>

      <div className="space-y-3">
        {files.map((file) => {
          const driveUrl = file.driveUrl || 'https://drive.google.com/';

          return (
            <div
              key={file.id}
              className="glass-panel p-4 sm:p-5 rounded-3xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel-hover"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-[#171f33] border border-white/10 text-[#4ade80] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white leading-snug">{file.title}</h3>
              </div>

              <a
                href={driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-6 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-extrabold rounded-full text-xs transition-all shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer min-h-[44px] w-full sm:w-auto"
                title="Baixar arquivo"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Baixar</span>
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
};
