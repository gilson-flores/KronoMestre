'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  initialTeacher,
  initialStudents,
  initialActivities,
  initialSchedule,
  initialLibrary,
  initialChatMessages,
} from '@/lib/initialData';
import { UserRole, TeacherUser, StudentUser, Activity, ChatMessage } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { AuthView } from '@/components/AuthView';
import { Sidebar } from '@/components/Sidebar';
import { NavbarTop } from '@/components/NavbarTop';
import { DashboardView } from '@/components/views/DashboardView';
import { GradingView } from '@/components/views/GradingView';
import { StudentsView } from '@/components/views/StudentsView';
import { LibraryView } from '@/components/views/LibraryView';
import { StudentPortalView } from '@/components/views/StudentPortalView';
import { MessagesView } from '@/components/views/MessagesView';

import { NewActivityModal } from '@/components/modals/NewActivityModal';
import { EditActivityModal } from '@/components/modals/EditActivityModal';
import { ViewActivityModal } from '@/components/modals/ViewActivityModal';
import { NewStudentModal } from '@/components/modals/NewStudentModal';
import { EditStudentModal } from '@/components/modals/EditStudentModal';
import { StudentSupervisionModal } from '@/components/modals/StudentSupervisionModal';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export default function Home() {
  // Auth state
  const [role, setRole] = useState<UserRole>(null); // 'teacher' | 'student' | null
  const [teacher, setTeacher] = useState<TeacherUser>(initialTeacher);
  const [currentStudent, setCurrentStudent] = useState<StudentUser | null>(null);

  // App datasets
  const [students, setStudents] = useState<StudentUser[]>(initialStudents);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [schedule] = useState(initialSchedule);
  const [library] = useState(initialLibrary);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);

  // Active view tab: 'painel' | 'atividades' | 'alunos' | 'horarios' | 'arquivos' | 'grading' | 'mensagens' | 'configuracoes'
  const [currentTab, setCurrentTab] = useState('painel');

  const [selectedActivityForGrading, setSelectedActivityForGrading] = useState<Activity | null>(null);

  // Global search input
  const [globalSearch, setGlobalSearch] = useState('');

  // Mobile menu drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modals state
  const [isNewActivityModalOpen, setIsNewActivityModalOpen] = useState(false);
  const [isNewStudentModalOpen, setIsNewStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentUser | null>(null);
  const [supervisingStudent, setSupervisingStudent] = useState<StudentUser | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isEditActivityModalOpen, setIsEditActivityModalOpen] = useState(false);
  const [viewingActivity, setViewingActivity] = useState<Activity | null>(null);
  const [teacherSaveStatus, setTeacherSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [globalDbStatus, setGlobalDbStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showGlobalStatus = (type: 'success' | 'error', message: string) => {
    setGlobalDbStatus({ type, message });
    setTimeout(() => {
      setGlobalDbStatus((current) => (current?.message === message ? null : current));
    }, 6000);
  };

  // Carregar dados iniciais do Supabase se configurado
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const client = supabase;

    const loadData = async () => {
      try {
        // 0. Carregar Dados do Professor
        const { data: authUser } = await client.auth.getUser();
        const activeEmail = authUser?.user?.email || teacher.email;

        if (activeEmail) {
          const { data: teacherRow, error: teacherErr } = await client
            .from('teachers')
            .select('*')
            .eq('email', activeEmail)
            .maybeSingle();

          if (teacherErr) {
            console.error('Erro ao buscar professor no Supabase:', teacherErr.message);
          } else if (teacherRow) {
            setTeacher({
              id: teacherRow.id,
              name: teacherRow.name,
              subject: teacherRow.subject || 'Sociologia',
              email: teacherRow.email,
              avatarUrl: teacherRow.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
              phone: teacherRow.phone || '',
              school: teacherRow.school || '',
            });
          }
        }

        // 1. Carregar Alunos do Supabase
        const { data: dbStudents } = await client.from('students').select('*');
        if (dbStudents && dbStudents.length > 0) {
          const mappedStudents: StudentUser[] = dbStudents.map((s) => ({
            id: s.id,
            fullName: s.full_name,
            turma: s.turma,
            matricula: s.matricula,
            tag: s.tag,
            passwordHash: s.password_hash || '1234',
            avatarUrl:
              s.avatar_url ||
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
          }));
          setStudents(mappedStudents);
        }

        // 2. Carregar Atividades e Entregas do Supabase
        const { data: dbActivities } = await client.from('activities').select('*');
        const { data: dbSubmissions } = await client.from('submissions').select('*');

        if (dbActivities && dbActivities.length > 0) {
          const mappedActivities: Activity[] = dbActivities.map((act) => {
            const subs = (dbSubmissions || [])
              .filter((sub) => sub.activity_id === act.id)
              .map((sub) => ({
                studentId: sub.student_id,
                studentName: sub.student_name,
                matricula: sub.matricula,
                tag: sub.tag,
                avatarUrl: sub.avatar_url,
                objectiveScore: Number(sub.objective_score || 0),
                maxObjectiveScore: Number(sub.max_objective_score || 5),
                essayScore:
                  sub.essay_score !== null && sub.essay_score !== undefined
                    ? Number(sub.essay_score)
                    : undefined,
                maxEssayScore: Number(sub.max_essay_score || 5),
                status: sub.status,
                essayAnswer: sub.essay_answer,
                teacherFeedback: sub.teacher_feedback,
              }));

            let parsedQuestions = [];
            if (act.questions) {
              if (typeof act.questions === 'string') {
                try {
                  parsedQuestions = JSON.parse(act.questions);
                } catch {
                  parsedQuestions = [];
                }
              } else if (Array.isArray(act.questions)) {
                parsedQuestions = act.questions;
              }
            }

            return {
              id: act.id,
              title: act.title,
              subject: act.subject || 'Sociologia',
              description: act.description || '',
              supportMaterial: act.support_material || act.supportMaterial || '',
              turma: act.turma || '',
              type: act.type || 'Avaliação',
              status: act.status || 'Ativo',
              deadline: act.deadline || '',
              maxGrade: act.max_grade ? Number(act.max_grade) : (act.maxGrade || 10),
              allowGroupWork: act.allow_group_work !== undefined ? Boolean(act.allow_group_work) : Boolean(act.allowGroupWork),
              securityFocusLock: act.security_focus_lock !== undefined ? Boolean(act.security_focus_lock) : Boolean(act.securityFocusLock),
              securityBlockCopyStatement: act.security_block_copy_statement !== undefined ? Boolean(act.security_block_copy_statement) : Boolean(act.securityBlockCopyStatement),
              securityBlockPasteEssay: act.security_block_paste_essay !== undefined ? Boolean(act.security_block_paste_essay) : Boolean(act.securityBlockPasteEssay),
              questions: parsedQuestions,
              totalSubmissions: act.total_submissions || subs.length,
              totalStudents: act.total_students || 0,
              pendingCorrection: act.pending_correction || subs.filter((s) => s.status === 'pending').length,
              averageGrade: act.average_grade ? Number(act.average_grade) : undefined,
              completedDate: act.completed_date,
              submissions: subs,
            };
          });
          setActivities(mappedActivities);
        }
      } catch (err) {
        console.error('Erro ao carregar dados do Supabase:', err);
      }
    };

    loadData();
  }, []);

  // Auth Handlers
  const handleLoginTeacher = (loggedTeacher: TeacherUser) => {
    setTeacher(loggedTeacher);
    setRole('teacher');
    setCurrentTab('painel');
  };

  const handleLoginStudent = (loggedStudent: StudentUser) => {
    setCurrentStudent(loggedStudent);
    setRole('student');
  };

  const handleLogout = () => {
    setRole(null);
    setCurrentStudent(null);
  };

  // Activity Handlers
  const handleCreateActivity = async (newAct: Activity) => {
    if (!isSupabaseConfigured || !supabase) {
      showGlobalStatus('error', 'ARMADILHA DE BUG DISPARADA: Supabase não está configurado no ambiente. A atividade NÃO foi salva.');
      return;
    }

    try {
      const fullPayload = {
        id: newAct.id,
        title: newAct.title,
        subject: newAct.subject || 'Sociologia',
        description: newAct.description || '',
        support_material: newAct.supportMaterial || '',
        turma: newAct.turma || '',
        type: newAct.type,
        status: newAct.status,
        deadline: newAct.deadline || '',
        max_grade: newAct.maxGrade || 10,
        allow_group_work: newAct.allowGroupWork || false,
        security_focus_lock: newAct.securityFocusLock || false,
        security_block_copy_statement: newAct.securityBlockCopyStatement || false,
        security_block_paste_essay: newAct.securityBlockPasteEssay || false,
        questions: newAct.questions || [],
        total_submissions: newAct.totalSubmissions || 0,
        total_students: newAct.totalStudents || 0,
        pending_correction: newAct.pendingCorrection || 0,
      };

      const { error } = await supabase.from('activities').insert(fullPayload);

      if (error) {
        console.error('Erro ao criar atividade no Supabase:', error);
        showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Erro ao gravar atividade no Supabase (${error.code || 'BD'}): ${error.message}`);
        return;
      }

      setActivities((prev) => [newAct, ...prev]);
      showGlobalStatus('success', `Atividade "${newAct.title}" criada e confirmada no Supabase com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao salvar atividade no Supabase:', err);
      showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Falha de conexão/execução (${err?.message || 'Erro desconhecido'})`);
    }
  };

  const handleSaveActivity = async (updatedAct: Activity) => {
    if (!isSupabaseConfigured || !supabase) {
      showGlobalStatus('error', 'ARMADILHA DE BUG DISPARADA: Supabase não está configurado. Alterações NÃO foram gravadas.');
      return;
    }

    try {
      const fullPayload = {
        id: updatedAct.id,
        title: updatedAct.title,
        subject: updatedAct.subject || 'Sociologia',
        description: updatedAct.description || '',
        support_material: updatedAct.supportMaterial || '',
        turma: updatedAct.turma || '',
        type: updatedAct.type,
        status: updatedAct.status,
        deadline: updatedAct.deadline || '',
        max_grade: updatedAct.maxGrade || 10,
        allow_group_work: updatedAct.allowGroupWork || false,
        security_focus_lock: updatedAct.securityFocusLock || false,
        security_block_copy_statement: updatedAct.securityBlockCopyStatement || false,
        security_block_paste_essay: updatedAct.securityBlockPasteEssay || false,
        questions: updatedAct.questions || [],
        total_submissions: updatedAct.totalSubmissions,
        total_students: updatedAct.totalStudents,
        pending_correction: updatedAct.pendingCorrection,
        average_grade: updatedAct.averageGrade,
        completed_date: updatedAct.completedDate,
      };

      let { error } = await supabase.from('activities').upsert(fullPayload);

      if (error && (error.message.includes('security_') || error.code === 'PGRST204')) {
        const { security_focus_lock, security_block_copy_statement, security_block_paste_essay, ...fallbackPayload } = fullPayload as any;
        const fallbackRes = await supabase.from('activities').upsert(fallbackPayload);
        error = fallbackRes.error;
      }

      if (error) {
        console.error('Erro ao atualizar atividade no Supabase:', error);
        showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Erro ao atualizar atividade no Supabase (${error.code || 'BD'}): ${error.message}`);
        return;
      }

      setActivities((prev) => prev.map((a) => (a.id === updatedAct.id ? updatedAct : a)));
      if (selectedActivityForGrading?.id === updatedAct.id) {
        setSelectedActivityForGrading(updatedAct);
      }
      showGlobalStatus('success', `Alterações da atividade "${updatedAct.title}" salvas e confirmadas no Supabase!`);
    } catch (err: any) {
      console.error('Erro ao atualizar atividade no Supabase:', err);
      showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Falha de conexão/execução (${err?.message || 'Erro desconhecido'})`);
    }
  };

  const handleDeleteActivity = async (activity: Activity) => {
    if (!isSupabaseConfigured || !supabase) {
      showGlobalStatus('error', 'ARMADILHA DE BUG DISPARADA: Supabase não está configurado. Atividade NÃO foi excluída.');
      return;
    }

    try {
      await supabase.from('submissions').delete().eq('activity_id', activity.id);
      const { error } = await supabase.from('activities').delete().eq('id', activity.id);

      if (error) {
        console.error('Erro ao excluir atividade no Supabase:', error);
        showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Erro ao excluir atividade no Supabase (${error.code || 'BD'}): ${error.message}`);
        return;
      }

      setActivities((prev) => prev.filter((a) => a.id !== activity.id));
      if (selectedActivityForGrading?.id === activity.id) {
        setSelectedActivityForGrading(null);
      }
      showGlobalStatus('success', `Atividade "${activity.title}" excluída com sucesso do Supabase!`);
    } catch (err: any) {
      console.error('Erro ao excluir atividade no Supabase:', err);
      showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Falha ao excluir (${err?.message || ''})`);
    }
  };

  const handleSelectActivityForGrading = (act: Activity) => {
    setSelectedActivityForGrading(act);
    setCurrentTab('grading');
  };

  const handleUpdateSubmission = async (
    activityId: string,
    studentId: string,
    essayScore: number,
    feedback: string,
    status: 'graded' | 'returned' | 'draft',
    extraPoints?: number,
    registeredInStateSystem?: boolean
  ) => {
    if (!isSupabaseConfigured || !supabase) {
      showGlobalStatus('error', 'ARMADILHA DE BUG DISPARADA: Supabase não configurado. Nota NÃO foi salva.');
      return;
    }

    try {
      const targetActivity = activities.find((a) => a.id === activityId);
      const currentSub = targetActivity?.submissions.find((s) => s.studentId === studentId);
      const currentReturnCount = currentSub?.returnCount || 0;

      if (status === 'returned' && currentReturnCount >= 3) {
        showGlobalStatus('error', '🚨 Bloqueio Ninja: Esta atividade já foi devolvida 3 vezes. A 4ª devolução está bloqueada! Atribua a nota final e conclua a avaliação.');
        return;
      }

      const newReturnCount = status === 'returned' ? currentReturnCount + 1 : currentReturnCount;

      const updatePayload: any = {
        essay_score: essayScore,
        teacher_feedback: feedback,
        status: status,
      };
      if (status === 'returned') updatePayload.return_count = newReturnCount;
      if (extraPoints !== undefined) updatePayload.extra_points = extraPoints;
      if (registeredInStateSystem !== undefined) updatePayload.registered_in_state_system = registeredInStateSystem;

      const { error } = await supabase
        .from('submissions')
        .update(updatePayload)
        .eq('activity_id', activityId)
        .eq('student_id', studentId);

      if (error) {
        // If return_count column is missing in Supabase, retry without return_count
        if (error.message?.includes('return_count') || error.code === 'PGRST204') {
          delete updatePayload.return_count;
          await supabase
            .from('submissions')
            .update(updatePayload)
            .eq('activity_id', activityId)
            .eq('student_id', studentId);
        } else {
          console.error('Erro ao atualizar nota no Supabase:', error);
          showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Falha ao atualizar nota no Supabase (${error.code || 'BD'}): ${error.message}`);
          return;
        }
      }

      setActivities((prev) =>
        prev.map((act) => {
          if (act.id !== activityId) return act;

          const updatedSubmissions = act.submissions.map((sub) => {
            if (sub.studentId === studentId) {
              return {
                ...sub,
                essayScore,
                teacherFeedback: feedback,
                status,
                returnCount: status === 'returned' ? (sub.returnCount || 0) + 1 : sub.returnCount,
                extraPoints: extraPoints !== undefined ? extraPoints : sub.extraPoints,
                registeredInStateSystem:
                  registeredInStateSystem !== undefined ? registeredInStateSystem : sub.registeredInStateSystem,
              };
            }
            return sub;
          });

          const pendingCorrection = updatedSubmissions.filter((s) => s.status === 'pending').length;

          return {
            ...act,
            pendingCorrection,
            submissions: updatedSubmissions,
          };
        })
      );

      if (selectedActivityForGrading && selectedActivityForGrading.id === activityId) {
        setSelectedActivityForGrading((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            submissions: prev.submissions.map((sub) =>
              sub.studentId === studentId
                ? {
                    ...sub,
                    essayScore,
                    teacherFeedback: feedback,
                    status,
                    returnCount: status === 'returned' ? (sub.returnCount || 0) + 1 : sub.returnCount,
                    extraPoints: extraPoints !== undefined ? extraPoints : sub.extraPoints,
                    registeredInStateSystem:
                      registeredInStateSystem !== undefined ? registeredInStateSystem : sub.registeredInStateSystem,
                  }
                : sub
            ),
          };
        });
      }

      showGlobalStatus('success', 'Nota e feedback sincronizados diretamente no Supabase com sucesso!');
    } catch (err: any) {
      console.error('Erro ao atualizar nota no Supabase:', err);
      showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Erro de conexão (${err?.message || ''})`);
    }
  };

  const handleStudentSubmitAnswer = async (
    activityId: string,
    studentId: string,
    essayAnswer: string,
    objectiveScore: number = 0,
    maxObjectiveScore: number = 5.0,
    maxEssayScore: number = 5.0,
    selectedObjectiveAnswers?: { [questionId: string]: number },
    groupMembers?: string
  ) => {
    if (!currentStudent) return;

    if (!isSupabaseConfigured || !supabase) {
      showGlobalStatus('error', 'ARMADILHA DE BUG DISPARADA: Supabase não está configurado. Resposta NÃO enviada.');
      return;
    }

    try {
      const { data: existingSub, error: checkErr } = await supabase
        .from('submissions')
        .select('id')
        .eq('activity_id', activityId)
        .eq('student_id', studentId)
        .maybeSingle();

      if (checkErr) {
        console.error('Erro ao verificar entrega existente:', checkErr);
        showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Erro ao buscar dados da entrega: ${checkErr.message}`);
        return;
      }

      let saveErr = null;

      if (existingSub) {
        const { error } = await supabase
          .from('submissions')
          .update({
            essay_answer: essayAnswer,
            objective_score: objectiveScore,
            max_objective_score: maxObjectiveScore,
            max_essay_score: maxEssayScore,
            selected_objective_answers: selectedObjectiveAnswers || {},
            group_members: groupMembers || null,
            status: 'pending',
          })
          .eq('id', existingSub.id);
        saveErr = error;
      } else {
        const { error } = await supabase.from('submissions').insert({
          activity_id: activityId,
          student_id: studentId,
          student_name: currentStudent.fullName,
          matricula: currentStudent.matricula,
          tag: currentStudent.tag,
          avatar_url: currentStudent.avatarUrl,
          essay_answer: essayAnswer,
          status: 'pending',
          objective_score: objectiveScore,
          max_objective_score: maxObjectiveScore,
          max_essay_score: maxEssayScore,
          selected_objective_answers: selectedObjectiveAnswers || {},
          group_members: groupMembers || null,
        });
        saveErr = error;
      }

      if (saveErr) {
        console.error('Erro ao gravar resposta do aluno no Supabase:', saveErr);
        showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Erro ao gravar resposta no Supabase (${saveErr.code || 'BD'}): ${saveErr.message}`);
        return;
      }

      setActivities((prev) =>
        prev.map((act) => {
          if (act.id !== activityId) return act;

          const existing = act.submissions.find((s) => s.studentId === studentId);
          let updatedSubmissions = [...act.submissions];

          if (existing) {
            updatedSubmissions = updatedSubmissions.map((s) =>
              s.studentId === studentId
                ? {
                    ...s,
                    essayAnswer,
                    objectiveScore,
                    maxObjectiveScore,
                    maxEssayScore,
                    selectedObjectiveAnswers,
                    groupMembers: groupMembers !== undefined ? groupMembers : s.groupMembers,
                    status: 'pending' as const,
                  }
                : s
            );
          } else {
            updatedSubmissions.push({
              studentId,
              studentName: currentStudent.fullName,
              matricula: currentStudent.matricula,
              tag: currentStudent.tag,
              avatarUrl: currentStudent.avatarUrl,
              submittedAt: new Date().toLocaleDateString('pt-BR'),
              objectiveScore,
              maxObjectiveScore,
              maxEssayScore,
              status: 'pending',
              essayAnswer,
              selectedObjectiveAnswers,
              groupMembers: groupMembers || undefined,
              teacherFeedback: '',
            });
          }

          const pendingCorrection = updatedSubmissions.filter((s) => s.status === 'pending').length;

          return {
            ...act,
            totalSubmissions: updatedSubmissions.length,
            pendingCorrection,
            submissions: updatedSubmissions,
          };
        })
      );

      showGlobalStatus('success', 'Resposta do aluno gravada com sucesso no Supabase!');
    } catch (err: any) {
      console.error('Erro ao enviar resposta:', err);
      showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Erro de conexão (${err?.message || ''})`);
    }
  };

  const handleImportStudents = async (newStudents: StudentUser[]) => {
    if (!isSupabaseConfigured || !supabase) {
      showGlobalStatus('error', 'ARMADILHA DE BUG DISPARADA: Supabase não está configurado. Alunos NÃO importados.');
      return;
    }

    try {
      const payload = newStudents.map((s) => ({
        full_name: s.fullName,
        turma: s.turma,
        matricula: s.matricula,
        tag: s.tag,
        password_hash: s.passwordHash || '1234',
        avatar_url: s.avatarUrl,
      }));

      const { error } = await supabase.from('students').insert(payload);

      if (error) {
        console.error('Erro ao importar alunos no Supabase:', error);
        showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Erro ao importar alunos no Supabase (${error.code || 'BD'}): ${error.message}`);
        return;
      }

      setStudents((prev) => [...prev, ...newStudents]);
      showGlobalStatus('success', `${newStudents.length} aluno(s) importado(s) e confirmados no Supabase!`);
    } catch (err: any) {
      console.error('Erro ao importar alunos no Supabase:', err);
      showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Falha na importação (${err?.message || ''})`);
    }
  };

  const handleCreateStudent = async (newStudent: StudentUser) => {
    if (!isSupabaseConfigured || !supabase) {
      showGlobalStatus('error', 'ARMADILHA DE BUG DISPARADA: Supabase não está configurado. Aluno NÃO cadastrado.');
      return;
    }

    try {
      const { error } = await supabase.from('students').insert({
        full_name: newStudent.fullName,
        turma: newStudent.turma,
        matricula: newStudent.matricula,
        tag: newStudent.tag,
        password_hash: newStudent.passwordHash || '1234',
        avatar_url: newStudent.avatarUrl,
      });

      if (error) {
        console.error('Erro ao cadastrar aluno no Supabase:', error);
        showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Erro ao cadastrar aluno no Supabase (${error.code || 'BD'}): ${error.message}`);
        return;
      }

      setStudents((prev) => [...prev, newStudent]);
      showGlobalStatus('success', `Aluno "${newStudent.fullName}" cadastrado com sucesso no Supabase!`);
    } catch (err: any) {
      console.error('Erro ao cadastrar aluno no Supabase:', err);
      showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Erro de conexão ao cadastrar aluno (${err?.message || ''})`);
    }
  };

  const handleSaveStudent = async (updatedStudent: StudentUser) => {
    if (!isSupabaseConfigured || !supabase) {
      showGlobalStatus('error', 'ARMADILHA DE BUG DISPARADA: Supabase não configurado. Alterações NÃO salvas.');
      return;
    }

    try {
      const { error } = await supabase
        .from('students')
        .update({
          full_name: updatedStudent.fullName,
          turma: updatedStudent.turma,
          matricula: updatedStudent.matricula,
          tag: updatedStudent.tag,
        })
        .eq('id', updatedStudent.id);

      if (error) {
        console.error('Erro ao atualizar aluno no Supabase:', error);
        showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Erro ao atualizar aluno no Supabase (${error.code || 'BD'}): ${error.message}`);
        return;
      }

      setStudents((prev) => prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)));
      showGlobalStatus('success', `Dados do aluno "${updatedStudent.fullName}" atualizados com sucesso no Supabase!`);
    } catch (err: any) {
      console.error('Erro ao atualizar aluno no Supabase:', err);
      showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Erro de conexão (${err?.message || ''})`);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!isSupabaseConfigured || !supabase) {
      showGlobalStatus('error', 'ARMADILHA DE BUG DISPARADA: Supabase não configurado. Aluno NÃO excluído.');
      return;
    }

    try {
      const { error } = await supabase.from('students').delete().eq('id', studentId);

      if (error) {
        console.error('Erro ao deletar aluno do Supabase:', error);
        showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Erro ao excluir aluno do Supabase (${error.code || 'BD'}): ${error.message}`);
        return;
      }

      setStudents((prev) => prev.filter((s) => s.id !== studentId));
      showGlobalStatus('success', 'Aluno removido com sucesso do Supabase!');
    } catch (err: any) {
      console.error('Erro ao deletar aluno do Supabase:', err);
      showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Erro de conexão (${err?.message || ''})`);
    }
  };

  const handleSuperviseStudent = (student: StudentUser) => {
    setSupervisingStudent(student);
  };

  const handleGenerateDossier = (act: Activity) => {
    alert(`Dossiê em PDF/Planilha gerado com sucesso para a atividade: ${act.title}`);
  };

  // Messaging Handlers
  const handleSendMessage = (msgData: {
    threadId: string;
    senderId: string;
    senderName: string;
    senderRole: 'teacher' | 'student';
    senderAvatar?: string;
    recipientId: string;
    recipientName: string;
    content: string;
    activityId?: string;
    activityTitle?: string;
  }) => {
    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      threadId: msgData.threadId,
      senderId: msgData.senderId,
      senderName: msgData.senderName,
      senderRole: msgData.senderRole,
      senderAvatar: msgData.senderAvatar,
      recipientId: msgData.recipientId,
      recipientName: msgData.recipientName,
      content: msgData.content,
      createdAt: formattedDate,
      read: false,
      activityId: msgData.activityId,
      activityTitle: msgData.activityTitle,
    };

    setChatMessages((prev) => [...prev, newMsg]);

    if (isSupabaseConfigured && supabase) {
      supabase.from('chat_messages').insert({
        thread_id: msgData.threadId,
        sender_id: msgData.senderId,
        sender_name: msgData.senderName,
        sender_role: msgData.senderRole,
        sender_avatar: msgData.senderAvatar,
        recipient_id: msgData.recipientId,
        recipient_name: msgData.recipientName,
        content: msgData.content,
        created_at: now.toISOString(),
        read: false,
        activity_id: msgData.activityId,
        activity_title: msgData.activityTitle,
      }).then(({ error }) => {
        if (error) console.log('Tabela chat_messages no Supabase (opcional):', error.message);
      });
    }
  };

  const handleMarkThreadAsRead = useCallback((threadId: string, currentRole: 'teacher' | 'student') => {
    setChatMessages((prev) => {
      const hasUnread = prev.some(
        (m) => (m.threadId === threadId || m.recipientId === threadId || m.senderId === threadId) &&
               m.senderRole !== currentRole &&
               !m.read
      );
      if (!hasUnread) return prev;
      return prev.map((m) => {
        if (
          (m.threadId === threadId || m.recipientId === threadId || m.senderId === threadId) &&
          m.senderRole !== currentRole &&
          !m.read
        ) {
          return { ...m, read: true };
        }
        return m;
      });
    });
  }, []);

  const teacherUnreadMessagesCount = chatMessages.filter(
    (m) => m.senderRole === 'student' && !m.read
  ).length;

  // 1. Unauthenticated state -> Show Login Screen
  if (!role) {
    return (
      <AuthView
        students={students}
        teacher={teacher}
        onLoginTeacher={handleLoginTeacher}
        onLoginStudent={handleLoginStudent}
      />
    );
  }

  // 2. Student Portal view
  if (role === 'student' && currentStudent) {
    return (
      <StudentPortalView
        student={currentStudent}
        teacher={teacher}
        activities={activities}
        libraryFiles={library}
        messages={chatMessages}
        students={students}
        onLogout={handleLogout}
        onSubmitAnswer={handleStudentSubmitAnswer}
        onSendMessage={handleSendMessage}
        onMarkThreadAsRead={handleMarkThreadAsRead}
      />
    );
  }

  // 3. Teacher Dashboard Layout
  return (
    <div className="flex min-h-screen bg-[#0b1326] text-[#dae2fd] overflow-x-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'grading') setSelectedActivityForGrading(null);
        }}
        teacher={teacher}
        onOpenNewContentModal={() => setIsNewActivityModalOpen(true)}
        onLogout={handleLogout}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        unreadMessagesCount={teacherUnreadMessagesCount}
      />


      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full">
        <NavbarTop
          role={role}
          user={teacher}
          onOpenSettings={() => setCurrentTab('configuracoes')}
          globalSearch={globalSearch}
          setGlobalSearch={setGlobalSearch}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        {globalDbStatus && (
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4">
            <div
              className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg transition-all animate-fadeIn ${
                globalDbStatus.type === 'success'
                  ? 'bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              <div className="flex items-center gap-2">
                {globalDbStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#4ade80]" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span className="break-words">{globalDbStatus.message}</span>
              </div>
              <button
                onClick={() => setGlobalDbStatus(null)}
                className="text-white hover:opacity-80 ml-3 text-sm cursor-pointer p-1 min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 p-3 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'painel' && (
            <DashboardView
              activities={activities}
              title="Studio"
              subtitle="Gerencie avaliações, redações e dinâmicas das suas turmas."
              showStats={false}
              onOpenNewActivityModal={() => setIsNewActivityModalOpen(true)}
              onSelectActivityForGrading={handleSelectActivityForGrading}
              onEditActivity={(act) => {
                setEditingActivity(act);
                setIsEditActivityModalOpen(true);
              }}
              onViewActivity={(act) => setViewingActivity(act)}
              onGenerateDossier={handleGenerateDossier}
              onDeleteActivity={handleDeleteActivity}
              onSaveActivity={handleSaveActivity}
            />
          )}

          {currentTab === 'atividades' && (
            <DashboardView
              activities={activities}
              title="Correções"
              subtitle="Acompanhe o desempenho geral, estatísticas de entrega e pendências de correção."
              showStats={true}
              isCorrecoesTab={true}
              onOpenNewActivityModal={() => setIsNewActivityModalOpen(true)}
              onSelectActivityForGrading={handleSelectActivityForGrading}
              onEditActivity={(act) => {
                setEditingActivity(act);
                setIsEditActivityModalOpen(true);
              }}
              onViewActivity={(act) => setViewingActivity(act)}
              onGenerateDossier={handleGenerateDossier}
              onDeleteActivity={handleDeleteActivity}
              onSaveActivity={handleSaveActivity}
            />
          )}

          {currentTab === 'grading' && (
            selectedActivityForGrading || activities[0] ? (
              <GradingView
                activity={selectedActivityForGrading || activities[0]}
                allActivities={activities}
                students={students}
                onSelectActivity={(act) => setSelectedActivityForGrading(act)}
                onBack={() => setCurrentTab('atividades')}
                onUpdateSubmission={handleUpdateSubmission}
              />
            ) : (
              <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 text-[#bccabb]">
                Nenhuma atividade selecionada para correção.
              </div>
            )
          )}

          {currentTab === 'mensagens' && (
            <MessagesView
              currentUserRole="teacher"
              teacher={teacher}
              students={students}
              activities={activities}
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              onMarkThreadAsRead={handleMarkThreadAsRead}
            />
          )}

          {currentTab === 'alunos' && (

            <StudentsView
              students={students}
              onOpenNewStudentModal={() => setIsNewStudentModalOpen(true)}
              onEditStudent={(s) => setEditingStudent(s)}
              onDeleteStudent={handleDeleteStudent}
              onSuperviseStudent={handleSuperviseStudent}
              onImportStudents={handleImportStudents}
            />
          )}

          {currentTab === 'arquivos' && <LibraryView files={library} />}

          {currentTab === 'configuracoes' && (
            <div className="glass-panel p-8 rounded-3xl border border-white/10 max-w-2xl space-y-6">
              <h1 className="text-2xl font-bold text-white">Configurações da Conta</h1>

              {teacherSaveStatus && (
                <div
                  className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between transition-all ${
                    teacherSaveStatus.type === 'success'
                      ? 'bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  <span>{teacherSaveStatus.message}</span>
                  <button
                    onClick={() => setTeacherSaveStatus(null)}
                    className="text-white hover:opacity-80 ml-2"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-[#bccabb] font-semibold mb-1">URL da Imagem de Perfil (Avatar)</label>
                  <input
                    type="text"
                    value={teacher.avatarUrl}
                    onChange={(e) => setTeacher({ ...teacher, avatarUrl: e.target.value })}
                    className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#4ade80]"
                  />
                </div>
                <div>
                  <label className="block text-[#bccabb] font-semibold mb-1">Nome do Professor</label>
                  <input
                    type="text"
                    value={teacher.name}
                    onChange={(e) => setTeacher({ ...teacher, name: e.target.value })}
                    className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#4ade80]"
                  />
                </div>
                <div>
                  <label className="block text-[#bccabb] font-semibold mb-1">Disciplina</label>
                  <input
                    type="text"
                    value={teacher.subject}
                    onChange={(e) => setTeacher({ ...teacher, subject: e.target.value })}
                    className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#4ade80]"
                  />
                </div>
                <div>
                  <label className="block text-[#bccabb] font-semibold mb-1">E-mail</label>
                  <input
                    type="email"
                    value={teacher.email}
                    onChange={(e) => setTeacher({ ...teacher, email: e.target.value })}
                    className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#4ade80]"
                  />
                  <p className="text-[10px] text-[#bccabb] mt-1 ml-1">Você pode alterar seu e-mail de contato e acesso do professor por aqui.</p>
                </div>
                <div>
                  <label className="block text-[#bccabb] font-semibold mb-1">Telefone</label>
                  <input
                    type="text"
                    value={teacher.phone || ''}
                    onChange={(e) => setTeacher({ ...teacher, phone: e.target.value })}
                    className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#4ade80]"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="block text-[#bccabb] font-semibold mb-1">Escola / Instituição</label>
                  <input
                    type="text"
                    value={teacher.school || ''}
                    onChange={(e) => setTeacher({ ...teacher, school: e.target.value })}
                    className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#4ade80]"
                  />
                </div>
                <button
                  onClick={async () => {
                    try {
                      if (!isSupabaseConfigured || !supabase) {
                        setTeacherSaveStatus({
                          type: 'error',
                          message: 'ARMADILHA DE BUG DISPARADA: Supabase não está configurado. Alterações NÃO salvas.',
                        });
                        return;
                      }

                      const payload: any = {
                        email: teacher.email,
                        name: teacher.name,
                        subject: teacher.subject,
                        avatar_url: teacher.avatarUrl,
                        phone: teacher.phone || null,
                        school: teacher.school || null,
                      };

                      if (teacher.id) {
                        payload.id = teacher.id;
                      }

                      if (teacher.email) {
                        try {
                          await supabase.auth.updateUser({ email: teacher.email });
                        } catch (e) {
                          console.log('Sincronização de e-mail de auth opcional:', e);
                        }
                      }

                      const { data: updatedData, error } = await supabase
                        .from('teachers')
                        .upsert(payload, { onConflict: teacher.id ? 'id' : 'email' })
                        .select('*')
                        .maybeSingle();

                      if (error) {
                        console.error('Erro ao salvar professor no Supabase:', error);
                        setTeacherSaveStatus({
                          type: 'error',
                          message: `ARMADILHA DE BUG DISPARADA: Erro ao salvar no Supabase (${error.code || 'BD'}): ${error.message}`,
                        });
                        return;
                      }

                      if (updatedData) {
                        const updatedTeacher = {
                          id: updatedData.id,
                          name: updatedData.name,
                          subject: updatedData.subject || 'Sociologia',
                          email: updatedData.email,
                          avatarUrl: updatedData.avatar_url || teacher.avatarUrl,
                          phone: updatedData.phone || '',
                          school: updatedData.school || '',
                        };
                        setTeacher(updatedTeacher);
                      } else {
                        setTeacher(teacher);
                      }

                      setTeacherSaveStatus({
                        type: 'success',
                        message: 'Informações do professor gravadas e confirmadas diretamente no Supabase!',
                      });

                      setTimeout(() => {
                        setTeacherSaveStatus(null);
                      }, 5000);
                    } catch (err: any) {
                      console.error('Erro ao salvar professor:', err);
                      setTeacherSaveStatus({
                        type: 'error',
                        message: 'ARMADILHA DE BUG DISPARADA: Falha de conexão (' + (err?.message || '') + ')',
                      });
                    }
                  }}
                  className="py-3 px-6 bg-[#4ade80] text-[#003919] font-bold rounded-full cursor-pointer hover:bg-[#6bfb9a] transition-all"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Global Modals */}
      <NewActivityModal
        isOpen={isNewActivityModalOpen}
        onClose={() => setIsNewActivityModalOpen(false)}
        onCreateActivity={handleCreateActivity}
      />

      <EditActivityModal
        isOpen={isEditActivityModalOpen}
        onClose={() => {
          setIsEditActivityModalOpen(false);
          setEditingActivity(null);
        }}
        activity={editingActivity}
        onSaveActivity={handleSaveActivity}
      />

      <ViewActivityModal
        isOpen={Boolean(viewingActivity)}
        activity={viewingActivity}
        onClose={() => setViewingActivity(null)}
        onEditActivity={(act) => {
          setEditingActivity(act);
          setIsEditActivityModalOpen(true);
        }}
        onGoToGrading={handleSelectActivityForGrading}
      />

      <NewStudentModal
        isOpen={isNewStudentModalOpen}
        onClose={() => setIsNewStudentModalOpen(false)}
        onCreateStudent={handleCreateStudent}
      />

      <EditStudentModal
        isOpen={Boolean(editingStudent)}
        student={editingStudent}
        onClose={() => setEditingStudent(null)}
        onSaveStudent={handleSaveStudent}
      />

      <StudentSupervisionModal
        isOpen={Boolean(supervisingStudent)}
        student={supervisingStudent}
        activities={activities}
        onClose={() => setSupervisingStudent(null)}
        onSendMessage={(st) => {
          setSupervisingStudent(null);
          setCurrentTab('mensagens');
        }}
      />
    </div>
  );
}
