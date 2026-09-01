'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  Clock,
  History,
  UserCheck,
  RefreshCw,
  Search,
} from 'lucide-react';
import { TeacherUser, RcoEmissionRecord } from '@/lib/types';
import { fetchRcoEmissions } from '@/lib/rcoStorage';

interface RcoEmissionsHistoryProps {
  teacher?: TeacherUser;
}

export const RcoEmissionsHistory: React.FC<RcoEmissionsHistoryProps> = ({ teacher }) => {
  const [emissions, setEmissions] = useState<RcoEmissionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const teacherId = teacher?.id;

  const loadHistory = async () => {
    setLoading(true);
    try {
      const records = await fetchRcoEmissions(teacherId);
      setEmissions(records);
    } catch (err) {
      console.warn('Aviso ao carregar histórico de emissões:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetchRcoEmissions(teacherId)
      .then((records) => {
        if (isMounted) {
          setEmissions(records);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Aviso ao carregar histórico de emissões:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [teacherId]);

  const filtered = emissions.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.emissionHash.toLowerCase().includes(term) ||
      item.teacherName.toLowerCase().includes(term) ||
      item.school.toLowerCase().includes(term) ||
      (item.turma && item.turma.toLowerCase().includes(term))
    );
  });

  return (
    <div className="bg-[#131b2e] rounded-3xl border border-white/10 p-5 sm:p-6 space-y-4 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Registro Eterno de Emissões RCO</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full font-bold">
                Audit Trail Imutável
              </span>
            </h3>
            <p className="text-xs text-[#bccabb]">
              Histórico intransferível e autenticado de relatórios emitidos para segurança jurídica e transição de contrato.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadHistory}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#bccabb] hover:text-white transition-colors cursor-pointer"
            title="Recarregar histórico"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Busca rápida */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#869486]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código hash de autenticidade, turma ou escola..."
            className="w-full bg-[#0b1326] border border-white/10 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80]"
          />
        </div>
      </div>

      {/* Lista de Emissões */}
      {loading ? (
        <div className="py-8 text-center text-xs text-[#bccabb]">
          Carregando registros imutáveis de emissão...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 px-4 text-center rounded-2xl bg-[#0b1326]/60 border border-white/5 space-y-2">
          <ShieldCheck className="w-8 h-8 text-emerald-400/40 mx-auto" />
          <p className="text-xs text-[#bccabb] font-semibold">
            Nenhuma emissão registrada no momento.
          </p>
          <p className="text-[11px] text-[#869486]">
            Ao clicar em &quot;Gerar PDF Timbrado RCO&quot;, uma via oficial com hash criptográfico será registrada eternamente aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
          {filtered.map((item) => {
            const dateObj = new Date(item.emittedAt || item.createdAt);
            const dateStr = dateObj.toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={item.emissionHash || item.id}
                className="p-3.5 rounded-2xl bg-[#0b1326] border border-white/10 hover:border-emerald-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-black text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                      {item.emissionHash}
                    </span>
                    <span className="text-[11px] font-bold text-white">
                      {item.scope === 'single' ? `Turma ${item.turma}` : 'Todas as Turmas (Consolidado)'}
                    </span>
                    <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                      {item.totalStudents} alunos • {item.totalActivities} atividades
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-[#bccabb] flex-wrap">
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-[#4ade80]" />
                      {item.teacherName} ({item.subject})
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      {item.school}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3" />
                      {dateStr}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `Comprovante de Emissão RCO\nAutenticidade: ${item.emissionHash}\nDocente: ${item.teacherName}\nEscola: ${item.school}\nData/Hora: ${dateStr}\nEscopo: ${item.scope === 'single' ? `Turma ${item.turma}` : 'Geral'}`
                      );
                      alert('Código e dados do comprovante copiados para a área de transferência!');
                    }}
                    className="py-1.5 px-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-white/10"
                    title="Copiar Hash de Autenticidade"
                  >
                    Copiar Hash
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
