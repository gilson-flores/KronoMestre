'use client';

import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  Users,
  Search,
  FileText,
  Save,
  Plus,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Printer,
  Sparkles,
  MessageSquare,
  Shield,
  Clock,
  ChevronRight,
  Filter,
  UserCheck,
  Award
} from 'lucide-react';
import { StudentUser, Activity, InclusionRecord, InclusionEvaluation } from '@/lib/types';
import { formatAvatarUrl } from '@/lib/utils';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

import { UserPlus } from 'lucide-react';

interface SecondTeacherInclusionViewProps {
  students: StudentUser[];
  activities: Activity[];
  onOpenMessageWithStudent?: (studentId: string) => void;
  onOpenNewSecondTeacherModal?: () => void;
  isMainTeacherADM?: boolean;
}

export const SecondTeacherInclusionView: React.FC<SecondTeacherInclusionViewProps> = ({
  students,
  activities,
  onOpenMessageWithStudent,
  onOpenNewSecondTeacherModal,
  isMainTeacherADM,
}) => {
  // Filtermode: 'pne_only' | 'all'
  const [filterMode, setFilterMode] = useState<'pne_only' | 'all'>('pne_only');
  const [selectedTurma, setSelectedTurma] = useState<string>('todas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Selected student for PEI / Inclusion Dossier
  const [selectedStudent, setSelectedStudent] = useState<StudentUser | null>(null);

  // PEI Form State for the selected student
  const [diagnosisNotes, setDiagnosisNotes] = useState<string>('');
  const [peiGoals, setPeiGoals] = useState<string>('');
  const [adaptedResources, setAdaptedResources] = useState<string>('');
  const [evaluations, setEvaluations] = useState<InclusionEvaluation[]>([]);

  // New Evaluation Modal / Form State
  const [isAddingEval, setIsAddingEval] = useState<boolean>(false);
  const [newEvalCategory, setNewEvalCategory] = useState<InclusionEvaluation['category']>('Acompanhamento');
  const [newEvalContent, setNewEvalContent] = useState<string>('');

  // Saving / Status indicator
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Map of stored inclusion records from Supabase or local state
  const [recordsMap, setRecordsMap] = useState<{ [studentId: string]: InclusionRecord }>({});

  // Extract unique turmas
  const turmasList = Array.from(new Set(students.map((s) => s.turma))).filter(Boolean);

  // Load inclusion records from Supabase on mount
  useEffect(() => {
    const fetchInclusionRecords = async () => {
      if (!isSupabaseConfigured || !supabase) return;
      try {
        const { data, error } = await supabase.from('inclusion_records').select('*');
        if (!error && data) {
          const map: { [studentId: string]: InclusionRecord } = {};
          data.forEach((row: any) => {
            map[row.student_id] = {
              id: row.id,
              studentId: row.student_id,
              studentName: row.student_name,
              turma: row.turma,
              diagnosisNotes: row.diagnosis_notes || '',
              peiGoals: row.pei_goals || '',
              adaptedResources: row.adapted_resources || '',
              evaluationsHistory: Array.isArray(row.evaluations_history) ? row.evaluations_history : [],
              updatedAt: row.updated_at,
            };
          });
          setRecordsMap(map);
        }
      } catch (err) {
        console.error('Erro ao buscar registros de inclusão do Supabase:', err);
      }
    };

    fetchInclusionRecords();
  }, []);

  // Filter students list
  const filteredStudents = students.filter((s) => {
    const matchesTag = filterMode === 'pne_only' ? s.tag === 'PNE' : true;
    const matchesTurma = selectedTurma === 'todas' || s.turma === selectedTurma;
    const matchesSearch =
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.matricula.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTag && matchesTurma && matchesSearch;
  });

  // Active student selection
  const activeStudent = selectedStudent || filteredStudents[0] || null;

  useEffect(() => {
    if (activeStudent) {
      const existingRecord = recordsMap[activeStudent.id];
      if (existingRecord) {
        setDiagnosisNotes(existingRecord.diagnosisNotes || '');
        setPeiGoals(existingRecord.peiGoals || '');
        setAdaptedResources(existingRecord.adaptedResources || '');
        setEvaluations(existingRecord.evaluationsHistory || []);
      } else {
        setDiagnosisNotes(activeStudent.pedagogicalNotes ? `Observações Pedagógicas Iniciais:\n${activeStudent.pedagogicalNotes}` : '');
        setPeiGoals('• Garantir desenvolvimento da autonomia e participação ativa nas atividades.\n• Adaptação de tempo para realização de exercícios dissertativos.\n• Suporte na mediação de leitura e interpretação de texto.');
        setAdaptedResources('• Fonte ampliada e contraste elevado nas avaliações impressas e digitais.\n• Tempo estendido (+50%) em atividades e simulados.\n• Suporte com áudio ou mediação em sala pelo 2º Professor.');
        setEvaluations([
          {
            id: 'eval-init-1',
            date: new Date().toLocaleDateString('pt-BR'),
            teacherName: '2º Professor de Inclusão',
            category: 'Acompanhamento',
            content: 'Acolhimento inicial realizado. Aluno demonstrando bom engajamento com as atividades adaptadas.',
          },
        ]);
      }
    }
  }, [activeStudent?.id, recordsMap]);

  const handleSelectStudent = (student: StudentUser) => {
    setSelectedStudent(student);
    setSaveStatus(null);
    setIsAddingEval(false);
  };

  // Save Inclusion / PEI Record to Supabase
  const handleSaveRecord = async () => {
    if (!selectedStudent) return;
    setIsSaving(true);
    setSaveStatus(null);

    const recordPayload: InclusionRecord = {
      studentId: selectedStudent.id,
      studentName: selectedStudent.fullName,
      turma: selectedStudent.turma,
      diagnosisNotes,
      peiGoals,
      adaptedResources,
      evaluationsHistory: evaluations,
      updatedAt: new Date().toISOString(),
    };

    // Update local state map immediately
    setRecordsMap((prev) => ({
      ...prev,
      [selectedStudent.id]: recordPayload,
    }));

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('inclusion_records').upsert(
          {
            student_id: selectedStudent.id,
            student_name: selectedStudent.fullName,
            turma: selectedStudent.turma,
            diagnosis_notes: diagnosisNotes,
            pei_goals: peiGoals,
            adapted_resources: adaptedResources,
            evaluations_history: evaluations,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'student_id' }
        );

        if (error) {
          console.error('Erro ao salvar no Supabase:', error);
          setSaveStatus({
            type: 'error',
            message: 'Salvo localmente. Aviso Supabase: ' + error.message,
          });
        } else {
          setSaveStatus({
            type: 'success',
            message: 'Plano de Ensino Individualizado (PEI) salvo e sincronizado com sucesso!',
          });
        }
      } catch (err: any) {
        console.error('Falha de conexão Supabase:', err);
        setSaveStatus({
          type: 'error',
          message: 'Salvo em modo local resilitente.',
        });
      }
    } else {
      setSaveStatus({
        type: 'success',
        message: 'PEI atualizado localmente com sucesso!',
      });
    }

    setIsSaving(false);

    setTimeout(() => {
      setSaveStatus(null);
    }, 4000);
  };

  // Add new evaluation record
  const handleAddEvaluation = () => {
    if (!newEvalContent.trim()) return;

    const newEval: InclusionEvaluation = {
      id: `eval-${Date.now()}`,
      date: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      teacherName: '2º Professor de Inclusão',
      category: newEvalCategory,
      content: newEvalContent.trim(),
    };

    const updatedEvals = [newEval, ...evaluations];
    setEvaluations(updatedEvals);
    setNewEvalContent('');
    setIsAddingEval(false);
  };

  // Print PEI / Dossier
  const handlePrintDossier = () => {
    if (!selectedStudent) return;
    window.print();
  };

  // Statistics
  const pneStudentsCount = students.filter((s) => s.tag === 'PNE').length;
  const peiCompletedCount = Object.keys(recordsMap).length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 relative overflow-hidden bg-gradient-to-r from-[#131b2e] via-[#0b1326] to-[#0d1f38]">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[#4ade80]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4ade80]/20 border border-[#4ade80]/40 text-[#4ade80] text-xs font-bold uppercase tracking-wider">
              <HeartHandshake className="w-4 h-4" />
              <span>Educação Inclusiva & AEE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Painel do 2º Professor — Inclusão Escolar
            </h1>
            <p className="text-sm text-[#bccabb] max-w-2xl leading-relaxed">
              Área dedicada ao acompanhamento pedagógico especializado, Elaboração do Plano de Ensino Individualizado (PEI), adaptações de conteúdos e diário de pareceres de aprendizagem para estudantes com necessidades educacionais específicas.
            </p>
          </div>

          {/* Quick Stats Widget & ADM Action */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {onOpenNewSecondTeacherModal && (
              <button
                onClick={onOpenNewSecondTeacherModal}
                className="px-4 py-3 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-amber-400/20 transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Cadastrar 2º Professor</span>
              </button>
            )}

            <div className="glass-panel p-4 rounded-2xl border border-white/10 bg-[#0b1326]/60 text-center min-w-[110px]">
              <div className="text-2xl font-black text-[#4ade80]">{pneStudentsCount}</div>
              <div className="text-[10px] uppercase font-bold text-[#bccabb] tracking-wider mt-0.5">Alunos PNE</div>
            </div>
            <div className="glass-panel p-4 rounded-2xl border border-white/10 bg-[#0b1326]/60 text-center min-w-[110px]">
              <div className="text-2xl font-black text-amber-400">{peiCompletedCount}</div>
              <div className="text-[10px] uppercase font-bold text-[#bccabb] tracking-wider mt-0.5">PEIs Ativos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Students Selector + Right PEI & Record Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Student List & Filter (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-4">
            
            {/* Header & Filter Selector */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#4ade80]" />
                <span>Estudantes</span>
              </h2>

              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-[#bccabb]">
                {filteredStudents.length} {filteredStudents.length === 1 ? 'aluno' : 'alunos'}
              </span>
            </div>

            {/* Filter Toggle Buttons */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#0b1326] border border-white/10 rounded-2xl">
              <button
                onClick={() => setFilterMode('pne_only')}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  filterMode === 'pne_only'
                    ? 'bg-[#4ade80] text-[#003919] shadow-md'
                    : 'text-[#bccabb] hover:text-white'
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>Apenas PNE</span>
              </button>

              <button
                onClick={() => setFilterMode('all')}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-[#4ade80] text-[#003919] shadow-md'
                    : 'text-[#bccabb] hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Todos</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#869486]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome ou matrícula..."
                className="w-full bg-[#131b2e] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80]"
              />
            </div>

            {/* Turma Filter Select */}
            {turmasList.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-[#bccabb]" />
                <select
                  value={selectedTurma}
                  onChange={(e) => setSelectedTurma(e.target.value)}
                  className="w-full bg-[#131b2e] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-[#dae2fd] focus:outline-none focus:border-[#4ade80]"
                >
                  <option value="todas">Todas as Turmas</option>
                  {turmasList.map((t) => (
                    <option key={t} value={t}>
                      Turma: {t}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Student List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl text-[#bccabb]">
                  <p className="text-xs">Nenhum estudante encontrado com os filtros selecionados.</p>
                </div>
              ) : (
                filteredStudents.map((student) => {
                  const isSelected = selectedStudent?.id === student.id;
                  const hasPei = !!recordsMap[student.id];

                  return (
                    <button
                      key={student.id}
                      onClick={() => handleSelectStudent(student)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer ${
                        isSelected
                          ? 'bg-[#17253d] border-[#4ade80] shadow-lg'
                          : 'bg-[#131b2e]/60 border-white/5 hover:border-white/20 hover:bg-[#171f33]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={formatAvatarUrl(student.avatarUrl)}
                            alt={student.fullName}
                            className="w-10 h-10 rounded-full object-cover border border-white/10"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150';
                            }}
                          />
                          {student.tag === 'PNE' && (
                            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 border-2 border-[#0b1326] rounded-full flex items-center justify-center text-[8px] text-black font-extrabold" title="Aluno Inclusivo (PNE)">
                              ★
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">{student.fullName}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-[#bccabb]">
                              Mat: <strong className="text-[#dae2fd]">{student.matricula}</strong>
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white font-medium">
                              {student.turma}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0 pl-2">
                        {student.tag === 'PNE' && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-1">
                            PNE
                          </span>
                        )}

                        {hasPei ? (
                          <span className="flex items-center gap-1 text-[9px] text-[#4ade80] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            PEI Ok
                          </span>
                        ) : (
                          <span className="text-[9px] text-[#bccabb]">Pendente</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

          </div>
        </div>

        {/* Right Column: PEI Workspace & Inclusion Journal (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedStudent ? (
            <div className="space-y-6">
              
              {/* Selected Student Header Card */}
              <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-[#131b2e]/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={formatAvatarUrl(selectedStudent.avatarUrl)}
                    alt={selectedStudent.fullName}
                    className="w-14 h-14 rounded-full object-cover border-2 border-[#4ade80]/50 shadow-md"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150';
                    }}
                  />
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl font-bold text-white">{selectedStudent.fullName}</h2>
                      {selectedStudent.tag === 'PNE' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Inclusão / PNE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#bccabb] mt-1 flex items-center gap-3">
                      <span>Turma: <strong className="text-white">{selectedStudent.turma}</strong></span>
                      <span>•</span>
                      <span>Matrícula: <strong className="text-white">{selectedStudent.matricula}</strong></span>
                    </p>
                  </div>
                </div>

                {/* Actions: Save PEI, Print Dossier, Open Message */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {onOpenMessageWithStudent && (
                    <button
                      onClick={() => onOpenMessageWithStudent(selectedStudent.id)}
                      className="px-3 py-2 rounded-2xl bg-[#171f33] hover:bg-[#222a3d] border border-white/10 text-xs font-bold text-[#dae2fd] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Enviar mensagem direta ao aluno"
                    >
                      <MessageSquare className="w-4 h-4 text-[#4ade80]" />
                      <span className="hidden sm:inline">Mensagem</span>
                    </button>
                  )}

                  <button
                    onClick={handlePrintDossier}
                    className="px-3 py-2 rounded-2xl bg-[#171f33] hover:bg-[#222a3d] border border-white/10 text-xs font-bold text-[#dae2fd] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Imprimir Dossiê do PEI"
                  >
                    <Printer className="w-4 h-4 text-amber-400" />
                    <span className="hidden sm:inline">Imprimir PEI</span>
                  </button>

                  <button
                    onClick={handleSaveRecord}
                    disabled={isSaving}
                    className="px-4 py-2.5 rounded-2xl bg-[#4ade80] hover:bg-[#3ec470] text-[#003919] font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Salvando...' : 'Salvar PEI'}</span>
                  </button>
                </div>
              </div>

              {/* Status Alert Banner */}
              {saveStatus && (
                <div
                  className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between animate-fadeIn ${
                    saveStatus.type === 'success'
                      ? 'bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {saveStatus.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{saveStatus.message}</span>
                  </div>
                </div>
              )}

              {/* PEI Section 1: Diagnóstico e Necessidades Específicas */}
              <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-3 bg-[#131b2e]/80">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>1. Diagnóstico, Laudo & Especificidades do Aluno</span>
                  </label>
                  <span className="text-[10px] text-[#bccabb]">AEE / 2º Professor</span>
                </div>
                <textarea
                  value={diagnosisNotes}
                  onChange={(e) => setDiagnosisNotes(e.target.value)}
                  rows={3}
                  placeholder="Descreva aqui laudos, diagnósticos (ex: TDAH, TEA, Deficiência Visual/Auditiva/Motora, DI) ou observações de entrada do AEE..."
                  className="w-full bg-[#0b1326] border border-white/10 rounded-2xl p-4 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80] leading-relaxed custom-scrollbar"
                />
              </div>

              {/* PEI Section 2: Objetivos de Aprendizagem Adaptados */}
              <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-3 bg-[#131b2e]/80">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#4ade80]" />
                    <span>2. Objetivos de Aprendizagem Adaptados (PEI)</span>
                  </label>
                  <span className="text-[10px] text-[#bccabb]">Metas Individuais</span>
                </div>
                <textarea
                  value={peiGoals}
                  onChange={(e) => setPeiGoals(e.target.value)}
                  rows={3}
                  placeholder="Liste os objetivos pedagógicos específicos do trimestre para o estudante..."
                  className="w-full bg-[#0b1326] border border-white/10 rounded-2xl p-4 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80] leading-relaxed custom-scrollbar"
                />
              </div>

              {/* PEI Section 3: Recursos Assistivos & Metodologias Adaptadas */}
              <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-3 bg-[#131b2e]/80">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <span>3. Recursos Assistivos & Metodologias de Adaptação</span>
                  </label>
                  <span className="text-[10px] text-[#bccabb]">Acessibilidade em Sala</span>
                </div>
                <textarea
                  value={adaptedResources}
                  onChange={(e) => setAdaptedResources(e.target.value)}
                  rows={3}
                  placeholder="Ex: Tempo estendido (+50%), fonte ampliada (20pt), mediação de leitura/escrita, recursos visuais, provas reduzidas..."
                  className="w-full bg-[#0b1326] border border-white/10 rounded-2xl p-4 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80] leading-relaxed custom-scrollbar"
                />
              </div>

              {/* Section 4: Diário de Acompanhamento / Registros do 2º Professor */}
              <div className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 bg-[#131b2e]/80">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span>4. Diário de Acompanhamento do 2º Professor</span>
                    </h3>
                    <p className="text-xs text-[#bccabb] mt-0.5">Pareceres periódicos, avanços comportamentais e registros de evolução do AEE</p>
                  </div>

                  <button
                    onClick={() => setIsAddingEval(!isAddingEval)}
                    className="px-3 py-1.5 rounded-xl bg-[#171f33] hover:bg-[#222a3d] border border-white/10 text-xs font-bold text-[#4ade80] transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Novo Parecer</span>
                  </button>
                </div>

                {/* New Evaluation Form */}
                {isAddingEval && (
                  <div className="p-4 rounded-2xl bg-[#0b1326] border border-[#4ade80]/30 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Registrar Parecer de Acompanhamento</span>
                      <select
                        value={newEvalCategory}
                        onChange={(e) => setNewEvalCategory(e.target.value as any)}
                        className="bg-[#131b2e] border border-white/10 rounded-xl px-3 py-1 text-xs text-[#dae2fd] focus:outline-none focus:border-[#4ade80]"
                      >
                        <option value="Acompanhamento">Acompanhamento</option>
                        <option value="Evolução">Evolução</option>
                        <option value="Adaptação">Adaptação de Atividade</option>
                        <option value="Ocorrência">Ocorrência / Observação</option>
                        <option value="Reunião Família">Reunião com Família</option>
                      </select>
                    </div>

                    <textarea
                      value={newEvalContent}
                      onChange={(e) => setNewEvalContent(e.target.value)}
                      rows={3}
                      placeholder="Escreva a observação do dia/semana sobre o progresso e mediação do estudante..."
                      className="w-full bg-[#131b2e] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-[#869486] focus:outline-none focus:border-[#4ade80]"
                    />

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setIsAddingEval(false)}
                        className="px-3 py-1.5 rounded-xl bg-white/10 text-xs text-[#bccabb] hover:text-white cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleAddEvaluation}
                        className="px-4 py-1.5 rounded-xl bg-[#4ade80] text-[#003919] font-bold text-xs cursor-pointer"
                      >
                        Salvar Registros
                      </button>
                    </div>
                  </div>
                )}

                {/* Evaluations List */}
                <div className="space-y-3">
                  {evaluations.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-white/10 rounded-2xl text-[#bccabb] text-xs">
                      Nenhum parecer registrado ainda. Clique em &quot;Novo Parecer&quot; para adicionar a primeira anotação de acompanhamento.
                    </div>
                  ) : (
                    evaluations.map((item) => (
                      <div key={item.id} className="p-4 rounded-2xl bg-[#0b1326]/70 border border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30">
                              {item.category}
                            </span>
                            <span className="text-[11px] font-semibold text-white">{item.teacherName || '2º Professor'}</span>
                          </div>
                          <span className="text-[10px] text-[#bccabb] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#869486]" />
                            {item.date}
                          </span>
                        </div>
                        <p className="text-xs text-[#dae2fd] leading-relaxed whitespace-pre-wrap pl-1">
                          {item.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>

              </div>

            </div>
          ) : (
            <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 text-[#bccabb] space-y-3">
              <UserCheck className="w-12 h-12 text-[#4ade80] mx-auto opacity-60" />
              <h3 className="text-lg font-bold text-white">Selecione um Estudante</h3>
              <p className="text-xs max-w-md mx-auto">
                Escolha um aluno na lista ao lado para visualização do PEI (Plano de Ensino Individualizado), relatórios e lançamento do diário de acompanhamento do 2º Professor.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
