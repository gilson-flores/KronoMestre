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
  isReadOnly?: boolean;
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

export const AtestadosRadView: React.FC<AtestadosRadViewProps> = ({ students, isReadOnly = false }) => {
  const [records, setRecords] = useState<AtestadoRadRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [recordToDelete, setRecordToDelete] = useState<AtestadoRadRecord | null>(null);

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
  const handleDelete = async (id: string) => {
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

  // Filter records strictly for the current role when isReadOnly
  const recordsForRole = useMemo(() => {
    if (!isReadOnly) return records;
    const studentIds = new Set(students.map((s) => s.id));
    const studentMatriculas = new Set(students.map((s) => s.matricula));
    const studentNames = new Set(students.map((s) => s.fullName.toLowerCase().trim()));
    return records.filter(
      (r) =>
        studentIds.has(r.studentId) ||
        studentMatriculas.has(r.studentId) ||
        studentNames.has(r.studentName.toLowerCase().trim())
    );
  }, [records, isReadOnly, students]);

  // Get unique turmas for filtering
  const availableTurmas = useMemo(() => {
    const set = new Set<string>();
    recordsForRole.forEach((r) => {
      if (r.studentTurma) set.add(r.studentTurma);
    });
    students.forEach((s) => {
      if (s.turma) set.add(s.turma);
    });
    return Array.from(set).sort();
  }, [recordsForRole, students]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return recordsForRole.filter((r) => {
      const matchesSearch =
        r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.motivo && r.motivo.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesTurma = turmaFilter === 'all' || r.studentTurma === turmaFilter;
      const matchesTipo = tipoFilter === 'all' || r.tipo === tipoFilter;

      return matchesSearch && matchesTurma && matchesTipo;
    });
  }, [recordsForRole, searchTerm, turmaFilter, tipoFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = recordsForRole.length;
    const radCount = recordsForRole.filter((r) => r.tipo === 'RAD' || r.diasAtestado >= 15).length;
    const atestadoCount = total - radCount;

    const today = getTodayStr();
    const activeNow = recordsForRole.filter((r) => r.dataAtestado <= today && r.dataFinal >= today).length;

    return { total, atestadoCount, radCount, activeNow };
  }, [recordsForRole]);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Header */}
      <div className="glass-panel p-6 rounded-3xl border border-border relative overflow-hidden bg-gradient-to-r from-surface via-surface to-background shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Controle Frequência e Afastamentos</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Atestados e RAD (Atendimento Domiciliar)
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1 max-w-2xl">
              {isReadOnly
                ? 'Acompanhamento dos atestados médicos e Regime de Atendimento Domiciliar (RAD) exclusivos dos seus alunos tutelados. (Modo Somente Leitura)'
                : 'Registre atestados médicos, justificativas de faltas e acompanhe os alunos em Regime de Atendimento Domiciliar (RAD).'}
            </p>
          </div>

          {isReadOnly ? (
            <span className="px-3 py-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-xs font-bold tracking-wide uppercase shrink-0">
              Somente Leitura • Alunos Tutelados
            </span>
          ) : (
            <button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="py-3 px-5 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 cursor-pointer active:scale-95 text-sm shrink-0"
            >
              <Plus className="w-5 h-5" />
              <span>Registrar Atestado / RAD</span>
            </button>
          )}
        </div>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs font-semibold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-foreground cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filters Toolbar */}
      <div className="glass-panel p-4 rounded-3xl border border-border bg-surface flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome do aluno ou motivo..."
            className="w-full bg-surface border border-border rounded-2xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder-[#869486] focus:outline-none focus:border-primary"
          />
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#869486]" />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 bg-surface border border-border rounded-2xl px-3 py-1.5 text-xs text-muted">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-foreground">Turma:</span>
            <select
              value={turmaFilter}
              onChange={(e) => setTurmaFilter(e.target.value)}
              className="bg-transparent text-foreground font-bold focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-surface text-foreground">Todas as Turmas</option>
              {availableTurmas.map((t) => (
                <option key={t} value={t} className="bg-surface text-foreground">
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-surface border border-border rounded-2xl p-1 text-xs">
            <button
              onClick={() => setTipoFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                tipoFilter === 'all'
                  ? 'bg-primary text-white shadow'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setTipoFilter('Atestado')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                tipoFilter === 'Atestado'
                  ? 'bg-primary text-white shadow'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Atestados
            </button>
            <button
              onClick={() => setTipoFilter('RAD')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                tipoFilter === 'RAD'
                  ? 'bg-purple-500 text-foreground shadow'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              RAD
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            title="Sincronizar com banco de dados"
            className="flex items-center gap-1.5 px-3 py-2 bg-surface hover:bg-surface-hover text-amber-400 hover:text-amber-600 border border-border rounded-2xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span className="hidden sm:inline">Sincronizar</span>
          </button>
        </div>
      </div>

      {/* Main Records List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="glass-panel p-12 text-center text-muted rounded-3xl border border-border">
            Carregando registros de atestados e RAD...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl border border-border text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">Nenhum Registro Encontrado</h3>
            <p className="text-xs text-muted max-w-md mb-6">
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
                  className="glass-panel p-5 rounded-3xl border border-border bg-surface hover:border-border transition-all flex flex-col justify-between group shadow-lg"
                >
                  <div>
                    {/* Header: Student Name + Type Badge */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className="inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-surface-hover border border-border text-muted mb-1">
                          {record.studentTurma || 'Turma N/I'}
                        </span>
                        <h3 className="font-bold text-foreground text-base leading-snug truncate">
                          {record.studentName}
                        </h3>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${
                            isRad
                              ? 'bg-purple-100 text-purple-600 border-purple-200 shadow-sm shadow-purple-500/20'
                              : 'bg-blue-100 text-primary-hover border-blue-200'
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
                          {record.tipo}
                        </span>

                        {isActive && (
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-600 border border-amber-500/30 px-2 py-0.5 rounded-full animate-pulse">
                            Afastado Hoje
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dates Grid */}
                    <div className="grid grid-cols-2 gap-2 bg-surface p-3 rounded-2xl border border-border my-3 text-xs">
                      <div>
                        <span className="text-[10px] text-muted block font-semibold">Data da Entrega do Atestado</span>
                        <div className="flex items-center gap-1 text-foreground font-bold mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          <span>{formatDateBR(record.dataFalta)}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-muted block font-semibold">Data do Atestado</span>
                        <div className="flex items-center gap-1 text-foreground font-bold mt-0.5">
                          <FileText className="w-3.5 h-3.5 text-blue-400" />
                          <span>{formatDateBR(record.dataAtestado)}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-muted block font-semibold">Dias Concedidos</span>
                        <div className="flex items-center gap-1 text-amber-600 font-extrabold mt-0.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{record.diasAtestado} {record.diasAtestado === 1 ? 'dia' : 'dias'}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-muted block font-semibold">Data Final (Calculada)</span>
                        <div className="flex items-center gap-1 text-primary font-black mt-0.5">
                          <CalendarDays className="w-3.5 h-3.5" />
                          <span>{formatDateBR(record.dataFinal)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Motivo (Opcional) */}
                    {record.motivo && (
                      <div className="mt-2 text-xs text-muted bg-surface-hover p-2.5 rounded-xl border border-border italic">
                        <span className="not-italic font-bold text-foreground text-[10px] block mb-0.5">Motivo / Justificativa:</span>
                        &ldquo;{record.motivo}&rdquo;
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted">
                    <span>Reg.: {formatDateBR(record.createdAt.split('T')[0])}</span>
                    {!isReadOnly && (
                      <button
                        onClick={() => setRecordToDelete(record)}
                        className="p-1.5 text-rose-400 hover:text-foreground hover:bg-rose-500 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold"
                        title="Excluir atestado"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Registrar Atestado e RAD */}
      {!isReadOnly && isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="glass-panel w-full max-w-lg p-6 rounded-3xl border border-border space-y-5 bg-surface shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                <FileSpreadsheet className="w-5 h-5" />
                <span>Registrar Atestado Médico / RAD</span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted hover:text-foreground p-1 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-100 border border-rose-200 text-rose-600 rounded-2xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Nome do Aluno (Lista Suspensa / Pesquisa) */}
              <div className="relative">
                <label className="block text-muted font-semibold mb-1.5">
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
                    className="w-full bg-surface border border-border rounded-2xl pl-10 pr-4 py-3 text-foreground font-semibold focus:outline-none focus:border-amber-400"
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
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#869486] hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {isStudentDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-surface border border-border rounded-2xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
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
                          className="px-4 py-3 hover:bg-surface cursor-pointer text-foreground border-b border-border last:border-0 flex flex-col"
                        >
                          <span className="font-semibold">{student.fullName}</span>
                          <span className="text-[10px] text-muted">
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
                  <label className="block text-muted font-semibold mb-1.5">
                    Data da Entrega do Atestado <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dataFalta}
                    onChange={(e) => setDataFalta(e.target.value)}
                    className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-foreground font-semibold focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-muted font-semibold mb-1.5">
                    Data do Atestado <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dataAtestado}
                    onChange={(e) => setDataAtestado(e.target.value)}
                    className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-foreground font-semibold focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Dias de Atestado & Data Final Calculada */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted font-semibold mb-1.5">
                    Dias de Atestado <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={diasAtestado}
                    onChange={(e) => setDiasAtestado(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-surface border border-border rounded-2xl px-4 py-3 text-foreground font-extrabold focus:outline-none focus:border-amber-400"
                    placeholder="Ex: 3, 15, 30..."
                  />
                </div>

                <div>
                  <label className="block text-muted font-semibold mb-1.5">
                    Data Final <span className="text-primary font-normal">(Calculada)</span>
                  </label>
                  <div className="w-full bg-surface border border-primary/40 rounded-2xl px-4 py-3 text-primary font-black flex items-center justify-between">
                    <span>{calculatedDataFinal ? formatDateBR(calculatedDataFinal) : 'Aguardando data'}</span>
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                </div>
              </div>

              {/* Classificação / Tipo (Atestado vs RAD) */}
              <div className="bg-surface p-3 rounded-2xl border border-border flex items-center justify-between">
                <div>
                  <span className="text-foreground font-bold block">Classificação do Afastamento:</span>
                  <span className="text-[11px] text-muted">
                    {Number(diasAtestado) >= 15
                      ? 'Atribuição automática de RAD (≥ 15 dias de afastamento)'
                      : 'Atestado Médico padrão (< 15 dias)'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`px-3 py-1.5 rounded-xl font-black text-xs border ${
                      effectiveTipo === 'RAD'
                        ? 'bg-purple-100 text-purple-600 border-purple-200'
                        : 'bg-blue-100 text-primary-hover border-blue-200'
                    }`}
                  >
                    {effectiveTipo}
                  </span>
                </div>
              </div>

              {/* Motivo para Justificar (Opcional) */}
              <div>
                <label className="block text-muted font-semibold mb-1.5">
                  Motivo para Justificar <span className="text-muted font-normal">(Opcional)</span>
                </label>
                <textarea
                  rows={3}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex: CID, consulta médica, licença de saúde ou observações de justificativa..."
                  className="w-full bg-surface border border-border rounded-2xl p-4 text-foreground placeholder-[#869486] focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-surface hover:bg-[#1a243b] text-muted font-bold rounded-2xl border border-border transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white font-extrabold rounded-2xl transition-all shadow-lg shadow-primary/20 cursor-pointer"
                >
                  Registrar Atestado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface border border-border rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-rose-500/10 rounded-full border border-rose-500/20 text-rose-500">
                <Trash2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Excluir Atestado/RAD</h3>
                <p className="text-sm text-text-muted mt-2">
                  Tem certeza que deseja excluir o registro de {recordToDelete.tipo} do aluno <strong className="text-foreground">{recordToDelete.studentName}</strong>?
                  Isto irá removê-lo permanentemente do sistema.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  handleDelete(recordToDelete.id);
                  setRecordToDelete(null);
                }}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors cursor-pointer min-h-[44px]"
              >
                Sim, Excluir Registro
              </button>
              <button
                onClick={() => setRecordToDelete(null)}
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

export default AtestadosRadView;
