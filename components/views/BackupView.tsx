import React, { useState } from 'react';
import { Database, Download, AlertTriangle, ShieldCheck } from 'lucide-react';

export const BackupView: React.FC = () => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = () => {
    setIsDownloading(true);
    // Dispara o download nativamente chamando a rota de exportação
    window.location.href = '/api/export-backup?token=BACKUP_SEGURO_2026';
    
    // Feedback rápido para reabilitar o botão
    setTimeout(() => {
      setIsDownloading(false);
    }, 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 animate-fadeIn text-foreground">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl border border-primary/20">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Backup e Recuperação</h1>
              <p className="text-sm text-text-muted mt-1">
                Gere cópias de segurança (snapshots) de todos os dados do sistema.
              </p>
            </div>
          </div>
        </header>

        <section className="bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-full shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Backup em Tempo Real</h2>
              <p className="text-sm text-text-muted mt-2 leading-relaxed">
                Ao clicar em "Exportar Banco de Dados", o sistema irá varrer todas as tabelas e compilar um arquivo <strong className="text-foreground">JSON unificado</strong> contendo a base de dados exata deste milissegundo. O arquivo inclui alunos matriculados, configurações de professores de apoio, laudos, histórico do fórum/chat e todas as atividades ou recuperações cadastradas.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <ShieldCheck className="w-4 h-4" />
              Conexão Segura
            </div>
            
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full sm:w-auto px-6 py-3 bg-primary hover:bg-[#00e664] text-white font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {isDownloading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              {isDownloading ? 'Gerando Arquivo...' : 'Exportar Banco de Dados'}
            </button>
          </div>
        </section>

      </div>
    </div>
  );
};

export default BackupView;
