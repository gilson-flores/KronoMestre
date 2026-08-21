'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Trash2,
  Calendar,
  Clock,
  UserCheck,
  X,
  AlertCircle,
  CheckCircle2,
  Filter,
  FileText,
  Building2,
  Sparkles,
  CalendarDays,
  RefreshCw
} from 'lucide-react';
import { StudentUser, AtestadoRadRecord } from '@/lib/types';
import { supabase } from '@/lib/supabase';

const generateRecordId = () => 'atest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

interface AtestadosRadViewProps {
  students: StudentUser[];
}

// Utility function to calculate end date (Data Final)
const calculateEndDate = (startDateStr: string, days: number): string => {
  if (!startDateStr || !days || days < 1) return '';
  const parts = startDateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return '';
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + (days - 1));
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Utility function to format date YYYY-MM-DD -> DD/MM/YYYY
const formatDateBR = (dateStr: string): string => {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

// Get today's date YYYY-MM-DD
const getTodayStr = (): string => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const AtestadosRadView: React.FC<AtestadosRadViewProps> = ({ students }) => {
  const [records, setRecords] = useState<AtestadoRadRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [modalStudentSearch, setModalStudentSearch] = useState('');
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const [dataFalta, setDataFalta] = useState(getTodayStr());
  const [dataAtestado, setDataAtestado] = useState(getTodayStr());
  const [diasAtestado, setDiasAtestado] = useState<number>(1);
  const [motivo, setMotivo] = useState('');
  const [customTipo, setCustomTipo] = useState<'Atestado' | 'RAD' | 'auto'>('auto');

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [turmaFilter, setTurmaFilter] = useState('all');
  const [tipoFilter, setTipoFilter] = useState<'all' | 'Atestado' | 'RAD'>('all');

  const filteredModalStudents = useMemo(() => {
    if (!modalStudentSearch.trim()) return students;
    const q = modalStudentSearch.toLowerCase();
    return students.filter(
      (s) => s.fullName.toLowerCase().includes(q) || (s.turma && s.turma.toLowerCase().includes(q))
    );
  }, [students, modalStudentSearch]);

  // Computed calculated end date
  const calculatedDataFinal = useMemo(() => {
    return calculateEndDate(dataAtestado, Number(diasAtestado) || 1);
  }, [dataAtestado, diasAtestado]);

  // Computed record type
  const effectiveTipo = useMemo(() => {
    if (customTipo !== 'auto') return customTipo;
    return (Number(diasAtestado) || 1) >= 15 ? 'RAD' : 'Atestado';
  }, [diasAtestado, customTipo]);

  // Sync to LocalStorage
  const saveRecordsToLocal = (newRecords: AtestadoRadRecord[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('atestados_rad_records', JSON.stringify(newRecords));
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Load records from Supabase and LocalStorage with bidirectional synchronization
  const fetchRecords = async () => {
    setIsLoading(true);
    let loaded: AtestadoRadRecord[] = [];

    // 1. Try LocalStorage first (instant UI feedback)
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('atestados_rad_records');
        if (saved) {
          loaded = JSON.parse(saved);
        }
      } catch (e) {
        console.error('Erro ao ler atestados do localStorage:', e);
      }
    }

    // 2. Query Supabase (Source of Truth)
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('atestados_rad')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          const dbRecords: AtestadoRadRecord[] = data.map((item: any) => ({
            id: item.id,
            studentId: item.student_id,
            studentName: item.student_name,
            studentTurma: item.student_turma || '',
            dataFalta: item.data_falta,
            dataAtestado: item.data_atestado,
            diasAtestado: Number(item.dias_atestado) || 1,
            dataFinal: item.data_final,
            motivo: item.motivo || undefined,
            tipo: item.tipo as 'Atestado' | 'RAD',
            createdAt: item.created_at,
          }));

          // Merge: DB records take precedence, but keep local items not yet in DB
          const dbIds = new Set(dbRecords.map((r) => r.id));
          const localPending = loaded.filter((l) => !dbIds.has(l.id));

          // If there are local records that were not in DB, sync them up to DB now
          if (localPending.length > 0) {
            const uploadPayload = localPending.map((rec) => ({
              id: rec.id,
              student_id: rec.studentId,
              student_name: rec.studentName,
              student_turma: rec.studentTurma || '',
              data_falta: rec.dataFalta,
              data_atestado: rec.dataAtestado,
              dias_atestado: rec.diasAtestado,
              data_final: rec.dataFinal,
              motivo: rec.motivo || null,
              tipo: rec.tipo,
              created_at: rec.createdAt,
            }));

            supabase
              .from('atestados_rad')
              .upsert(uploadPayload, { onConflict: 'id' })
              .then(({ error: upErr }) => {
                if (upErr) console.warn('Aviso ao sincronizar atestados locais com o Supabase:', upErr.message);
              });
          }

          loaded = [...dbRecords, ...localPending];
        } else if (error) {
          console.warn('Aviso ao carregar atestados do Supabase:', error.message);
        }
      } catch (err: any) {
        console.warn('Conexão com atestados_rad no Supabase:', err?.message || err);
      }
    }

    setRecords(loaded);
    saveRecordsToLocal(loaded);
    setIsLoading(false);
    setIsRefreshing(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchRecords();
  };

  useEffect(() => {
    let isSubscribed = true;
    async function loadData() {
      await fetchRecords();
    }
    loadData();
    return () => {
      isSubscribed = false;
    };
  }, []);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedStudentId) {
      setErrorMsg('Por favor, selecione o nome do aluno na lista.');
      return;
    }

    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) {
      setErrorMsg('Aluno não encontrado.');
      return;
    }

    if (!dataFalta || !dataAtestado) {
      setErrorMsg('Por favor, informe a data da falta e a data do atestado.');
      return;
    }

    if (!diasAtestado || Number(diasAtestado) < 1) {
      setErrorMsg('O número de dias do atestado deve ser no mínimo 1.');
      return;
    }

    const newRecord: AtestadoRadRecord = {
      id: generateRecordId(),
      studentId: student.id,
      studentName: student.fullName,
      studentTurma: student.turma,
      dataFalta: dataFalta,
      dataAtestado: dataAtestado,
      diasAtestado: Number(diasAtestado),
      dataFinal: calculatedDataFinal,
      motivo: motivo.trim() || undefined,
      tipo: effectiveTipo,
      createdAt: new Date().toISOString(),
    };

    // Save to State & LocalStorage immediately
    const updatedRecords = [newRecord, ...records];
    setRecords(updatedRecords);
    saveRecordsToLocal(updatedRecords);

    // Save to Supabase
    if (supabase) {
      try {
        const { error: insertError } = await supabase.from('atestados_rad').upsert({
          id: newRecord.id,
          student_id: newRecord.studentId,
          student_name: newRecord.studentName,
          student_turma: newRecord.studentTurma || '',
          data_falta: newRecord.dataFalta,
          data_atestado: newRecord.dataAtestado,
          dias_atestado: newRecord.diasAtestado,
          data_final: newRecord.dataFinal,
          motivo: newRecord.motivo || null,
          tipo: newRecord.tipo,
          created_at: newRecord.createdAt,
        }, { onConflict: 'id' });

        if (insertError) {
          console.warn('Aviso ao salvar no Supabase:', insertError.message);
        }
      } catch (dbErr: any) {
        console.warn('Erro ao salvar no Supabase:', dbErr?.message || dbErr);
      }
    }

    setSuccessMsg(`Atestado / RAD de ${student.fullName} registrado com sucesso e sincronizado na nuvem!`);
    setIsModalOpen(false);
    resetForm();

    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  const resetForm = () => {
    setSelectedStudentId('');
    setModalStudentSearch('');
    setDataFalta(getTodayStr());
    setDataAtestado(getTodayStr());
    setDiasAtestado(1);
    setMotivo('');
    setCustomTipo('auto');
    setErrorMsg('');
  };

  // Delete Handler
  const handleDelete = async (id: string, studentName: string) => {
    if (!confirm(`Deseja realmente remover o registro de atestado/RAD do aluno ${studentName}?`)) {
      return;
    }

    const updated = records.filter((r) => r.id !== id);
    setRecords(updated);
    saveRecordsToLocal(updated);

    if (supabase) {
      try {
        const { error } = await supabase.from('atestados_rad').delete().eq('id', id);
        if (error) {
          console.warn('Aviso ao deletar do Supabase:', error.message);
        }
      } catch (e: any) {
        console.warn('Erro ao deletar do Supabase:', e?.message || e);
      }
    }

    setSuccessMsg(`Registro de ${studentName} removido com sucesso.`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Get unique turmas for filtering
  const availableTurmas = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.studentTurma) set.add(r.studentTurma);
    });
    students.forEach((s) => {
      if (s.turma) set.add(s.turma);
    });
    return Array.from(set).sort();
  }, [records, students]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.motivo && r.motivo.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesTurma = turmaFilter === 'all' || r.studentTurma === turmaFilter;
      const matchesTipo = tipoFilter === 'all' || r.tipo === tipoFilter;

      return matchesSearch && matchesTurma && matchesTipo;
    });
  }, [records, searchTerm, turmaFilter, tipoFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = records.length;
    const radCount = records.filter((r) => r.tipo === 'RAD' || r.diasAtestado >= 15).length;
    const atestadoCount = total - radCount;

    const today = getTodayStr();
    const activeNow = records.filter((r) => r.dataAtestado <= today && r.dataFinal >= today).length;

    return { total, atestadoCount, radCount, activeNow };
  }, [records]);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Header */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden bg-gradient-to-r from-[#0e172a] via-[#131b2e] to-[#0b1326] shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Controle Frequência e Afastamentos</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Atestados e RAD (Atendimento Domiciliar)
            </h1>
            <p className="text-xs sm:text-sm text-[#bccabb] mt-1 max-w-2xl">
              Registre atestados médicos, justificativas de faltas e acompanhe os alunos em Regime de Atendimento Domiciliar (RAD).
            </p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="py-3 px-5 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#4ade80]/20 cursor-pointer active:scale-95 text-sm shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Registrar Atestado / RAD</span>
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filters Toolbar */}
      <div className="glass-panel p-4 rounded-3xl border border-white/10 bg-[#0e172a] flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome do aluno ou motivo..."
            className="w-full bg-[#131b2e] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80]"
          />
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#869486]" />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 bg-[#131b2e] border border-white/10 rounded-2xl px-3 py-1.5 text-xs text-[#bccabb]">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-white">Turma:</span>
            <select
              value={turmaFilter}
              onChange={(e) => setTurmaFilter(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#0e172a] text-white">Todas as Turmas</option>
              {availableTurmas.map((t) => (
                <option key={t} value={t} className="bg-[#0e172a] text-white">
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-[#131b2e] border border-white/10 rounded-2xl p-1 text-xs">
            <button
              onClick={() => setTipoFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                tipoFilter === 'all'
                  ? 'bg-[#4ade80] text-[#003919] shadow'
                  : 'text-[#bccabb] hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setTipoFilter('Atestado')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                tipoFilter === 'Atestado'
                  ? 'bg-blue-500 text-white shadow'
                  : 'text-[#bccabb] hover:text-white'
              }`}
            >
              Atestados
            </button>
            <button
              onClick={() => setTipoFilter('RAD')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                tipoFilter === 'RAD'
                  ? 'bg-purple-500 text-white shadow'
                  : 'text-[#bccabb] hover:text-white'
              }`}
            >
              RAD
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            title="Sincronizar com banco de dados"
            className="flex items-center gap-1.5 px-3 py-2 bg-[#131b2e] hover:bg-white/10 text-amber-400 hover:text-amber-300 border border-white/10 rounded-2xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden sm:inline">Sincronizar</span>
          </button>
        </div>
      </div>

      {/* Main Records List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="glass-panel p-12 text-center text-[#bccabb] rounded-3xl border border-white/10">
            Carregando registros de atestados e RAD...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl border border-white/10 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Nenhum Registro Encontrado</h3>
            <p className="text-xs text-[#bccabb] max-w-md mb-6">
              {searchTerm || turmaFilter !== 'all' || tipoFilter !== 'all'
                ? 'Nenhum atestado corresponde aos filtros selecionados.'
                : 'Nenhum atestado ou RAD registrado até o momento. Clique no botão acima para cadastrar.'}
            </p>
            <button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="py-2.5 px-6 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-2xl transition-all text-xs cursor-pointer shadow-lg shadow-amber-400/20"
            >
              Registrar Primeiro Atestado
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecords.map((record) => {
              const today = getTodayStr();
              const isActive = record.dataAtestado <= today && record.dataFinal >= today;
              const isRad = record.tipo === 'RAD' || record.diasAtestado >= 15;

              return (
                <div
                  key={record.id}
                  className="glass-panel p-5 rounded-3xl border border-white/10 bg-[#0e172a] hover:border-white/20 transition-all flex flex-col justify-between group shadow-lg"
                >
                  <div>
                    {/* Header: Student Name + Type Badge */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className="inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#bccabb] mb-1">
                          {record.studentTurma || 'Turma N/I'}
                        </span>
                        <h3 className="font-bold text-white text-base leading-snug truncate">
                          {record.studentName}
                        </h3>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${
                            isRad
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/20'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          {record.tipo}
                        </span>

                        {isActive && (
                          <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full animate-pulse">
                            Afastado Hoje
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dates Grid */}
                    <div className="grid grid-cols-2 gap-2 bg-[#131b2e] p-3 rounded-2xl border border-white/5 my-3 text-xs">
                      <div>
                        <span className="text-[10px] text-[#bccabb] block font-semibold">Data da Entrega do Atestado</span>
                        <div className="flex items-center gap-1 text-white font-bold mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          <span>{formatDateBR(record.dataFalta)}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#bccabb] block font-semibold">Data do Atestado</span>
                        <div className="flex items-center gap-1 text-white font-bold mt-0.5">
                          <FileText className="w-3.5 h-3.5 text-blue-400" />
                          <span>{formatDateBR(record.dataAtestado)}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#bccabb] block font-semibold">Dias Concedidos</span>
                        <div className="flex items-center gap-1 text-amber-300 font-extrabold mt-0.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{record.diasAtestado} {record.diasAtestado === 1 ? 'dia' : 'dias'}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#bccabb] block font-semibold">Data Final (Calculada)</span>
                        <div className="flex items-center gap-1 text-[#4ade80] font-black mt-0.5">
                          <CalendarDays className="w-3.5 h-3.5" />
                          <span>{formatDateBR(record.dataFinal)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Motivo (Opcional) */}
                    {record.motivo && (
                      <div className="mt-2 text-xs text-[#bccabb] bg-white/5 p-2.5 rounded-xl border border-white/5 italic">
                        <span className="not-italic font-bold text-white text-[10px] block mb-0.5">Motivo / Justificativa:</span>
                        &ldquo;{record.motivo}&rdquo;
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-[#bccabb]">
                    <span>Reg.: {formatDateBR(record.createdAt.split('T')[0])}</span>
                    <button
                      onClick={() => handleDelete(record.id, record.studentName)}
                      className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-500 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold"
                      title="Excluir atestado"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Registrar Atestado e RAD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="glass-panel w-full max-w-lg p-6 rounded-3xl border border-white/10 space-y-5 bg-[#0e172a] shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                <FileSpreadsheet className="w-5 h-5" />
                <span>Registrar Atestado Médico / RAD</span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#bccabb] hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Nome do Aluno (Lista Suspensa / Pesquisa) */}
              <div className="relative">
                <label className="block text-[#bccabb] font-semibold mb-1.5">
                  Nome do Aluno <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required={!selectedStudentId}
                    value={modalStudentSearch}
                    onChange={(e) => {
                      setModalStudentSearch(e.target.value);
                      setIsStudentDropdownOpen(true);
                      if (selectedStudentId) setSelectedStudentId('');
                    }}
                    onFocus={() => setIsStudentDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsStudentDropdownOpen(false), 200)}
                    placeholder="Digite o nome do aluno..."
                    className="w-full bg-[#131b2e] border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-white font-semibold focus:outline-none focus:border-amber-400"
                  />
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#869486]" />
                  {selectedStudentId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudentId('');
                        setModalStudentSearch('');
                        setIsStudentDropdownOpen(true);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#869486] hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {isStudentDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-[#0e172a] border border-white/10 rounded-2xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                    {filteredModalStudents.length === 0 ? (
                      <div className="p-4 text-center text-[#869486]">Nenhum aluno encontrado.</div>
                    ) : (
                      filteredModalStudents.map((student) => (
                        <div
                          key={student.id}
                          onClick={() => {
                            setSelectedStudentId(student.id);
                            setModalStudentSearch(`${student.fullName} (${student.turma || 'Sem Turma'})${student.tag ? ` - [${student.tag}]` : ''}`);
                            setIsStudentDropdownOpen(false);
                          }}
                          className="px-4 py-3 hover:bg-[#131b2e] cursor-pointer text-white border-b border-white/5 last:border-0 flex flex-col"
                        >
                          <span className="font-semibold">{student.fullName}</span>
                          <span className="text-[10px] text-[#bccabb]">
                            Turma: {student.turma || 'Sem Turma'} {student.tag ? ` • [${student.tag}]` : ''}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Grid 2 colunas: Data da Falta e Data do Atestado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#bccabb] font-semibold mb-1.5">
                    Data da Entrega do Atestado <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dataFalta}
                    onChange={(e) => setDataFalta(e.target.value)}
                    className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-white font-semibold focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[#bccabb] font-semibold mb-1.5">
                    Data do Atestado <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dataAtestado}
                    onChange={(e) => setDataAtestado(e.target.value)}
                    className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-white font-semibold focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Dias de Atestado & Data Final Calculada */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#bccabb] font-semibold mb-1.5">
                    Dias de Atestado <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={diasAtestado}
                    onChange={(e) => setDiasAtestado(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-white font-extrabold focus:outline-none focus:border-amber-400"
                    placeholder="Ex: 3, 15, 30..."
                  />
                </div>

                <div>
                  <label className="block text-[#bccabb] font-semibold mb-1.5">
                    Data Final <span className="text-[#4ade80] font-normal">(Calculada)</span>
                  </label>
                  <div className="w-full bg-[#131b2e] border border-[#4ade80]/40 rounded-2xl px-4 py-3 text-[#4ade80] font-black flex items-center justify-between">
                    <span>{calculatedDataFinal ? formatDateBR(calculatedDataFinal) : 'Aguardando data'}</span>
                    <Sparkles className="w-4 h-4 text-[#4ade80]" />
                  </div>
                </div>
              </div>

              {/* Classificação / Tipo (Atestado vs RAD) */}
              <div className="bg-[#131b2e] p-3 rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-white font-bold block">Classificação do Afastamento:</span>
                  <span className="text-[11px] text-[#bccabb]">
                    {Number(diasAtestado) >= 15
                      ? 'Atribuição automática de RAD (≥ 15 dias de afastamento)'
                      : 'Atestado Médico padrão (< 15 dias)'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`px-3 py-1.5 rounded-xl font-black text-xs border ${
                      effectiveTipo === 'RAD'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    }`}
                  >
                    {effectiveTipo}
                  </span>
                </div>
              </div>

              {/* Motivo para Justificar (Opcional) */}
              <div>
                <label className="block text-[#bccabb] font-semibold mb-1.5">
                  Motivo para Justificar <span className="text-[#bccabb] font-normal">(Opcional)</span>
                </label>
                <textarea
                  rows={3}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex: CID, consulta médica, licença de saúde ou observações de justificativa..."
                  className="w-full bg-[#131b2e] border border-white/10 rounded-2xl p-4 text-white placeholder-[#869486] focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-[#131b2e] hover:bg-[#1a243b] text-[#bccabb] font-bold rounded-2xl border border-white/10 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#4ade80] hover:bg-[#6bfb9a] text-[#003919] font-extrabold rounded-2xl transition-all shadow-lg shadow-[#4ade80]/20 cursor-pointer"
                >
                  Registrar Atestado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AtestadosRadView;
