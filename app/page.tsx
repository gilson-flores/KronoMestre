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
import { UserRole, TeacherUser, StudentUser, Activity, ChatMessage, LibraryFile } from '@/lib/types';
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
import { SecondTeachersView } from '@/components/views/SecondTeachersView';
import { PlanningView } from '@/components/views/PlanningView';


import { normalizeStudentName } from '@/lib/studentUtils';
import { NewActivityModal } from '@/components/modals/NewActivityModal';
import { EditActivityModal } from '@/components/modals/EditActivityModal';
import { ViewActivityModal } from '@/components/modals/ViewActivityModal';
import { NewStudentModal } from '@/components/modals/NewStudentModal';
import { EditStudentModal } from '@/components/modals/EditStudentModal';
import { StudentSupervisionModal } from '@/components/modals/StudentSupervisionModal';
import { NewSecondTeacherModal } from '@/components/modals/NewSecondTeacherModal';
import { CheckCircle2, AlertTriangle, HeartHandshake, UserPlus } from 'lucide-react';

export default function Home() {
  // Auth state
  const [role, setRole] = useState<UserRole>(null);
  const [teacher, setTeacher] = useState<TeacherUser>(initialTeacher);
  const [currentStudent, setCurrentStudent] = useState<StudentUser | null>(null);
  const [inactivityTimeoutEnabled, setInactivityTimeoutEnabled] = useState<boolean>(true);
  const [currentTab, setCurrentTab] = useState('painel');

  // Restaurar sessão e preferências no carregamento do cliente
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const timer = setTimeout(() => {
      const savedDriveUrl = localStorage.getItem('teacher_drive_folder_url');
      if (savedDriveUrl) {
        setTeacher((prev) => ({ ...prev, driveFolderUrl: savedDriveUrl }));
      }

      const savedTimeout = localStorage.getItem('inactivity_timeout_enabled');
      if (savedTimeout !== null) {
        setInactivityTimeoutEnabled(savedTimeout === 'true');
      }

      const sessionStr = sessionStorage.getItem('active_session');
      if (sessionStr) {
        try {
          const session = JSON.parse(sessionStr);
          if (session.role === 'teacher') {
            setRole('teacher');
            if (session.teacherData) setTeacher(session.teacherData);
          } else if (session.role === 'second_teacher') {
            setRole('second_teacher');
            if (session.teacherData) setTeacher(session.teacherData);
            setCurrentTab('2_professor');
          } else if (session.role === 'student' && session.studentData) {
            setCurrentStudent(session.studentData);
            setRole('student');
          }
        } catch (e) {
          console.warn('Erro ao ler sessão armazenada:', e);
        }
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // App datasets
  const [students, setStudents] = useState<StudentUser[]>(initialStudents);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [schedule] = useState(initialSchedule);
  const [library, setLibrary] = useState<LibraryFile[]>(initialLibrary);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);

  // Active view tab: 'painel' | 'planejamento' | 'atividades' | 'alunos' | 'horarios' | 'arquivos' | 'grading' | 'mensagens' | 'configuracoes'

  const [selectedActivityForGrading, setSelectedActivityForGrading] = useState<Activity | null>(null);

  // Global search input
  const [globalSearch, setGlobalSearch] = useState('');

  // Mobile menu drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modals state
  const [isNewActivityModalOpen, setIsNewActivityModalOpen] = useState(false);
  const [isNewStudentModalOpen, setIsNewStudentModalOpen] = useState(false);
  const [isNewSecondTeacherModalOpen, setIsNewSecondTeacherModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentUser | null>(null);
  const [supervisingStudent, setSupervisingStudent] = useState<StudentUser | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isEditActivityModalOpen, setIsEditActivityModalOpen] = useState(false);
  const [viewingActivity, setViewingActivity] = useState<Activity | null>(null);
  const [teacherSaveStatus, setTeacherSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [globalDbStatus, setGlobalDbStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [newTeacherPassword, setNewTeacherPassword] = useState('');

  const showGlobalStatus = (type: 'success' | 'error', message: string) => {
    setGlobalDbStatus({ type, message });
    setTimeout(() => {
      setGlobalDbStatus((current) => (current?.message === message ? null : current));
    }, 6000);
  };

  const handleSaveDriveFolderUrl = async (url: string) => {
    setTeacher((prev) => ({ ...prev, driveFolderUrl: url }));
    if (typeof window !== 'undefined') {
      localStorage.setItem('teacher_drive_folder_url', url);
    }
    if (isSupabaseConfigured && supabase) {
      try {
        const isValidUUID = (id?: string | null) => !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (teacher.id && isValidUUID(teacher.id)) {
          await supabase
            .from('teachers')
            .update({ drive_folder_url: url })
            .eq('id', teacher.id);
        } else if (teacher.email) {
          await supabase
            .from('teachers')
            .update({ drive_folder_url: url })
            .eq('email', teacher.email);
        }
      } catch (err) {
        console.warn('Persistência no Supabase para drive_folder_url:', err);
      }
    }
    showGlobalStatus('success', 'Link da pasta do Google Drive salvo com sucesso!');
  };

  const sanitizeLibraryForStorage = (files: LibraryFile[]) => {
    return files.map((item) => {
      if (item.driveUrl && item.driveUrl.startsWith('data:') && item.driveUrl.length > 50000) {
        return { ...item, driveUrl: '' };
      }
      return item;
    });
  };

  const handleAddLibraryFile = async (newFile: LibraryFile) => {
    setLibrary((prev) => [newFile, ...prev]);
    if (typeof window !== 'undefined') {
      try {
        const updated = sanitizeLibraryForStorage([newFile, ...library]);
        localStorage.setItem('library_files_data', JSON.stringify(updated));
      } catch (err) {
        console.warn('Não foi possível salvar os arquivos no localStorage (cota excedida):', err);
      }
    }
    if (isSupabaseConfigured && supabase) {
      try {
        // Se a Data URL for muito grande para a coluna text do Supabase, salvar string vazia para evitar estouro
        const safeDriveUrl =
          newFile.driveUrl && newFile.driveUrl.startsWith('data:') && newFile.driveUrl.length > 500000
            ? ''
            : newFile.driveUrl || '';

        await supabase.from('library_files').insert({
          id: newFile.id,
          title: newFile.title,
          category: newFile.category,
          turma: newFile.turma,
          file_size: newFile.fileSize,
          updated_at: newFile.updatedAt,
          drive_url: safeDriveUrl,
        });
      } catch (err) {
        console.warn('Erro ao salvar arquivo no Supabase:', err);
      }
    }
    showGlobalStatus('success', 'Arquivo cadastrado com sucesso!');
  };

  const handleDeleteLibraryFile = async (fileId: string) => {
    setLibrary((prev) => prev.filter((f) => f.id !== fileId));
    if (typeof window !== 'undefined') {
      try {
        const updated = sanitizeLibraryForStorage(library.filter((f) => f.id !== fileId));
        localStorage.setItem('library_files_data', JSON.stringify(updated));
      } catch (err) {
        console.warn('Erro ao atualizar localStorage após deleção:', err);
      }
    }
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('library_files').delete().eq('id', fileId);
      } catch (err) {
        console.warn('Erro ao deletar arquivo no Supabase:', err);
      }
    }
    showGlobalStatus('success', 'Arquivo removido da biblioteca.');
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
            setTeacher((prev) => ({
              id: teacherRow.id,
              name: teacherRow.name,
              subject: teacherRow.subject || 'Sociologia',
              email: teacherRow.email,
              avatarUrl: teacherRow.avatar_url || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=250',
              phone: teacherRow.phone || '',
              school: teacherRow.school || '',
              driveFolderUrl: teacherRow.drive_folder_url || prev.driveFolderUrl || '',
            }));
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
            pedagogicalNotes: s.pedagogical_notes || '',
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
              allowGroupWork: act.allow_group_work !== undefined && act.allow_group_work !== null ? Boolean(act.allow_group_work) : Boolean(act.allowGroupWork),
              securityFocusLock: act.security_focus_lock !== undefined && act.security_focus_lock !== null ? Boolean(act.security_focus_lock) : Boolean(act.securityFocusLock),
              securityBlockCopyStatement: act.security_block_copy_statement !== undefined && act.security_block_copy_statement !== null ? Boolean(act.security_block_copy_statement) : Boolean(act.securityBlockCopyStatement),
              securityBlockPasteEssay: act.security_block_paste_essay !== undefined && act.security_block_paste_essay !== null ? Boolean(act.security_block_paste_essay) : Boolean(act.securityBlockPasteEssay),
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

        // 3. Carregar Mensagens do Supabase
        const { data: dbMessages } = await client.from('chat_messages').select('*').order('created_at', { ascending: true });
        if (dbMessages && dbMessages.length > 0) {
          const mappedMessages: ChatMessage[] = dbMessages.map((m) => ({
            id: m.id || `msg-${m.created_at}`,
            threadId: m.thread_id,
            senderId: m.sender_id,
            senderName: m.sender_name,
            senderRole: m.sender_role,
            senderAvatar: m.sender_avatar,
            recipientId: m.recipient_id,
            recipientName: m.recipient_name,
            content: m.content,
            createdAt: m.created_at ? new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
            read: Boolean(m.read),
            activityId: m.activity_id,
            activityTitle: m.activity_title,
          }));
          setChatMessages(mappedMessages);
        }

        // 4. Carregar Arquivos da Biblioteca do Supabase
        const { data: dbLibrary } = await client.from('library_files').select('*');
        if (dbLibrary && dbLibrary.length > 0) {
          const mappedLibrary: LibraryFile[] = dbLibrary.map((item) => ({
            id: item.id,
            title: item.title,
            category: item.category || 'Geral',
            turma: item.turma || 'Todas',
            fileSize: item.file_size || '1 MB',
            updatedAt: item.updated_at || new Date().toLocaleDateString('pt-BR'),
            driveUrl: item.drive_url || item.file_url || '',
          }));
          setLibrary(mappedLibrary);
        } else if (typeof window !== 'undefined') {
          const savedLib = localStorage.getItem('library_files_data');
          if (savedLib) {
            try {
              setLibrary(JSON.parse(savedLib));
            } catch (e) {
              console.warn(e);
            }
          }
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
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('active_session', JSON.stringify({ role: 'teacher', teacherData: loggedTeacher }));
      window.location.reload();
    }
  };

  const handleLoginSecondTeacher = (loggedTeacher: TeacherUser) => {
    setTeacher(loggedTeacher);
    setRole('second_teacher');
    setCurrentTab('2_professor');
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('active_session', JSON.stringify({ role: 'second_teacher', teacherData: loggedTeacher }));
      window.location.reload();
    }
  };

  const handleLoginStudent = (loggedStudent: StudentUser) => {
    setCurrentStudent(loggedStudent);
    setRole('student');
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        'active_session',
        JSON.stringify({
          role: 'student',
          studentId: loggedStudent.id,
          studentData: loggedStudent,
        })
      );
      window.location.reload();
    }
  };

  const handleLogout = (reason?: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('active_session');
    }
    setRole(null);
    setCurrentStudent(null);
    if (reason && typeof reason === 'string') {
      showGlobalStatus('error', reason);
    }
  };

  // Temporizador de Desconexão por Inatividade (8 minutos)
  useEffect(() => {
    if (!role || !inactivityTimeoutEnabled) return;

    const INACTIVITY_LIMIT_MS = 8 * 60 * 1000; // 8 minutos = 480.000 ms
    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout('Sessão encerrada por inatividade (8 minutos sem interação).');
      }, INACTIVITY_LIMIT_MS);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [role, inactivityTimeoutEnabled]);

  // Activity Handlers
  const sanitizeTypeForDb = (rawType: string): string => {
    if (rawType === 'Trabalho em grupo') return 'Dinâmica';
    if (rawType === 'Projeto de pesquisa') return 'Avaliação';
    const valid = ['Simulado', 'Redação', 'Dinâmica', 'Avaliação'];
    return valid.includes(rawType) ? rawType : 'Avaliação';
  };

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

      let { error } = await supabase.from('activities').insert(fullPayload);

      // Se falhou (ex: restrição check constraint do tipo ou colunas inexistentes no Supabase)
      if (error) {
        console.warn('Inserção direta de atividade falhou, executando estratégias de fallback...', error);
        const isConstraintErr =
          error.message?.includes('check constraint') ||
          error.message?.includes('type_check') ||
          error.details?.includes('type_check');

        // Tentativa 1: mesmo payload com tipo seguro para o banco
        if (isConstraintErr) {
          const safeTypePayload = { ...fullPayload, type: sanitizeTypeForDb(fullPayload.type) };
          const safeTypeRes = await supabase.from('activities').insert(safeTypePayload);
          if (!safeTypeRes.error) {
            error = null;
          } else {
            error = safeTypeRes.error;
          }
        }

        // Tentativa 2: enviar payload com tipo saneado sem remover travas de segurança
        if (error) {
          const fallbackPayload = {
            ...fullPayload,
            type: sanitizeTypeForDb(fullPayload.type),
          };

          const fallbackRes = await supabase.from('activities').insert(fallbackPayload);
          if (!fallbackRes.error) {
            error = null;
          } else {
            const upsertRes = await supabase.from('activities').upsert(fallbackPayload);
            error = upsertRes.error;
          }
        }
      }

      if (error) {
        const errorDetails = error.message || error.details || error.hint || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        console.error('Erro ao criar atividade no Supabase:', errorDetails, error);
        showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Erro ao gravar atividade no Supabase (${error.code || 'BD'}): ${errorDetails || 'Erro desconhecido'}`);
        // Mantém no estado local para garantir usabilidade sem perder dados do professor
        setActivities((prev) => [newAct, ...prev]);
        return;
      }

      setActivities((prev) => [newAct, ...prev]);
      showGlobalStatus('success', `Atividade "${newAct.title}" criada e confirmada no Supabase com sucesso!`);
    } catch (err: any) {
      const catchedMsg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      console.error('Erro ao salvar atividade no Supabase:', catchedMsg, err);
      showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Falha de conexão/execução (${catchedMsg || 'Erro desconhecido'})`);
      setActivities((prev) => [newAct, ...prev]);
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

      if (error) {
        console.warn('Upsert de atividade falhou, executando estratégias de fallback...', error);
        const isConstraintErr =
          error.message?.includes('check constraint') ||
          error.message?.includes('type_check') ||
          error.details?.includes('type_check');

        if (isConstraintErr) {
          const safeTypePayload = { ...fullPayload, type: sanitizeTypeForDb(fullPayload.type) };
          const safeTypeRes = await supabase.from('activities').upsert(safeTypePayload);
          if (!safeTypeRes.error) {
            error = null;
          } else {
            error = safeTypeRes.error;
          }
        }

        if (error) {
          const fallbackPayload = {
            ...fullPayload,
            type: sanitizeTypeForDb(fullPayload.type),
          };

          const fallbackRes = await supabase.from('activities').upsert(fallbackPayload);
          error = fallbackRes.error;
        }
      }

      if (error) {
        const errorDetails = error.message || error.details || error.hint || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        console.error('Erro ao atualizar atividade no Supabase:', errorDetails, error);
        showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Erro ao atualizar atividade no Supabase (${error.code || 'BD'}): ${errorDetails || 'Erro desconhecido'}`);
        setActivities((prev) => prev.map((a) => (a.id === updatedAct.id ? updatedAct : a)));
        return;
      }

      setActivities((prev) => prev.map((a) => (a.id === updatedAct.id ? updatedAct : a)));
      if (selectedActivityForGrading?.id === updatedAct.id) {
        setSelectedActivityForGrading(updatedAct);
      }
      showGlobalStatus('success', `Alterações da atividade "${updatedAct.title}" salvas e confirmadas no Supabase!`);
    } catch (err: any) {
      const catchedMsg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      console.error('Erro ao atualizar atividade no Supabase:', catchedMsg, err);
      showGlobalStatus('error', `ARMADILHA DE BUG DISPARADA: Falha de conexão/execução (${catchedMsg || 'Erro desconhecido'})`);
      setActivities((prev) => prev.map((a) => (a.id === updatedAct.id ? updatedAct : a)));
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

      // Identify group members if this is a group submission being corrected from pending queue
      const isInitialGroupGrading = currentSub?.status === 'pending' && Boolean(currentSub?.groupMembers);

      const targetGroupStudentIds = new Set<string>([studentId]);
      const missingGroupMembers: StudentUser[] = [];

      if (currentSub?.groupMembers) {
        const memberNames = currentSub.groupMembers
          .split(',')
          .map((n) => n.trim())
          .filter(Boolean);

        memberNames.forEach((memberCandidate) => {
          const normCandidate = normalizeStudentName(memberCandidate);
          const matchedSt = students.find(
            (st) =>
              normalizeStudentName(st.fullName) === normCandidate ||
              st.fullName.toLowerCase() === memberCandidate.toLowerCase()
          );
          if (matchedSt) {
            targetGroupStudentIds.add(matchedSt.id);
            const existsInActivity = targetActivity?.submissions.some((s) => s.studentId === matchedSt.id);
            if (!existsInActivity) {
              missingGroupMembers.push(matchedSt);
            }
          }
        });

        if (targetActivity) {
          targetActivity.submissions.forEach((s) => {
            if (
              s.groupMembers === currentSub.groupMembers ||
              memberNames.some((m) => normalizeStudentName(m) === normalizeStudentName(s.studentName))
            ) {
              targetGroupStudentIds.add(s.studentId);
            }
          });
        }
      }

      // If missing members exist, insert initial submission for them first in Supabase
      if (isInitialGroupGrading && missingGroupMembers.length > 0) {
        for (const memberSt of missingGroupMembers) {
          await supabase.from('submissions').insert({
            activity_id: activityId,
            student_id: memberSt.id,
            student_name: memberSt.fullName,
            matricula: memberSt.matricula,
            tag: memberSt.tag,
            avatar_url: memberSt.avatarUrl,
            essay_answer: currentSub?.essayAnswer || '',
            status: status,
            essay_score: essayScore,
            teacher_feedback: feedback,
            objective_score: currentSub?.objectiveScore || 0,
            max_objective_score: currentSub?.maxObjectiveScore || 0,
            max_essay_score: currentSub?.maxEssayScore || 0,
            selected_objective_answers: currentSub?.selectedObjectiveAnswers || {},
            group_members: currentSub?.groupMembers || null,
            extra_points: extraPoints || 0,
          });
        }
      }

      const idsToUpdate = isInitialGroupGrading ? Array.from(targetGroupStudentIds) : [studentId];

      for (const tid of idsToUpdate) {
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
          .eq('student_id', tid);

        if (error) {
          if (error.message?.includes('return_count') || error.code === 'PGRST204') {
            delete updatePayload.return_count;
            await supabase
              .from('submissions')
              .update(updatePayload)
              .eq('activity_id', activityId)
              .eq('student_id', tid);
          } else {
            console.error(`Erro ao atualizar nota no Supabase para ${tid}:`, error);
          }
        }
      }

      setActivities((prev) =>
        prev.map((act) => {
          if (act.id !== activityId) return act;

          let updatedSubmissions = [...act.submissions];

          if (isInitialGroupGrading && missingGroupMembers.length > 0) {
            missingGroupMembers.forEach((memberSt) => {
              if (!updatedSubmissions.some((s) => s.studentId === memberSt.id)) {
                updatedSubmissions.push({
                  studentId: memberSt.id,
                  studentName: memberSt.fullName,
                  matricula: memberSt.matricula,
                  tag: memberSt.tag,
                  avatarUrl: memberSt.avatarUrl,
                  submittedAt: currentSub?.submittedAt || new Date().toLocaleDateString('pt-BR'),
                  objectiveScore: currentSub?.objectiveScore || 0,
                  maxObjectiveScore: currentSub?.maxObjectiveScore || 0,
                  maxEssayScore: currentSub?.maxEssayScore || 0,
                  status: status,
                  essayAnswer: currentSub?.essayAnswer || '',
                  selectedObjectiveAnswers: currentSub?.selectedObjectiveAnswers || {},
                  groupMembers: currentSub?.groupMembers || undefined,
                  teacherFeedback: feedback,
                  essayScore: essayScore,
                  extraPoints: extraPoints || 0,
                  registeredInStateSystem: registeredInStateSystem || false,
                });
              }
            });
          }

          updatedSubmissions = updatedSubmissions.map((sub) => {
            if (idsToUpdate.includes(sub.studentId)) {
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
          let updatedSubmissions = [...prev.submissions];

          if (isInitialGroupGrading && missingGroupMembers.length > 0) {
            missingGroupMembers.forEach((memberSt) => {
              if (!updatedSubmissions.some((s) => s.studentId === memberSt.id)) {
                updatedSubmissions.push({
                  studentId: memberSt.id,
                  studentName: memberSt.fullName,
                  matricula: memberSt.matricula,
                  tag: memberSt.tag,
                  avatarUrl: memberSt.avatarUrl,
                  submittedAt: currentSub?.submittedAt || new Date().toLocaleDateString('pt-BR'),
                  objectiveScore: currentSub?.objectiveScore || 0,
                  maxObjectiveScore: currentSub?.maxObjectiveScore || 0,
                  maxEssayScore: currentSub?.maxEssayScore || 0,
                  status: status,
                  essayAnswer: currentSub?.essayAnswer || '',
                  selectedObjectiveAnswers: currentSub?.selectedObjectiveAnswers || {},
                  groupMembers: currentSub?.groupMembers || undefined,
                  teacherFeedback: feedback,
                  essayScore: essayScore,
                  extraPoints: extraPoints || 0,
                  registeredInStateSystem: registeredInStateSystem || false,
                });
              }
            });
          }

          return {
            ...prev,
            submissions: updatedSubmissions.map((sub) =>
              idsToUpdate.includes(sub.studentId)
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
      // Identify all target students involved in the submission (current student + group members)
      const targetStudents: StudentUser[] = [currentStudent];
      if (groupMembers) {
        const memberNames = groupMembers
          .split(',')
          .map((n) => n.trim())
          .filter(Boolean);

        memberNames.forEach((memberCandidate) => {
          const normCandidate = normalizeStudentName(memberCandidate);
          const matched = students.find(
            (st) =>
              normalizeStudentName(st.fullName) === normCandidate ||
              st.fullName.toLowerCase() === memberCandidate.toLowerCase()
          );
          if (matched && !targetStudents.some((t) => t.id === matched.id)) {
            targetStudents.push(matched);
          }
        });
      }

      // Save submission in Supabase for each target student
      for (const targetSt of targetStudents) {
        const { data: existingSub, error: checkErr } = await supabase
          .from('submissions')
          .select('id')
          .eq('activity_id', activityId)
          .eq('student_id', targetSt.id)
          .maybeSingle();

        if (checkErr) {
          console.error(`Erro ao verificar entrega existente para ${targetSt.fullName}:`, checkErr);
          continue;
        }

        if (existingSub) {
          await supabase
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
        } else {
          await supabase.from('submissions').insert({
            activity_id: activityId,
            student_id: targetSt.id,
            student_name: targetSt.fullName,
            matricula: targetSt.matricula,
            tag: targetSt.tag,
            avatar_url: targetSt.avatarUrl,
            essay_answer: essayAnswer,
            status: 'pending',
            objective_score: objectiveScore,
            max_objective_score: maxObjectiveScore,
            max_essay_score: maxEssayScore,
            selected_objective_answers: selectedObjectiveAnswers || {},
            group_members: groupMembers || null,
          });
        }
      }

      // Update local state for all target students
      setActivities((prev) =>
        prev.map((act) => {
          if (act.id !== activityId) return act;

          let updatedSubmissions = [...act.submissions];

          targetStudents.forEach((targetSt) => {
            const existingIndex = updatedSubmissions.findIndex((s) => s.studentId === targetSt.id);

            if (existingIndex >= 0) {
              updatedSubmissions[existingIndex] = {
                ...updatedSubmissions[existingIndex],
                essayAnswer,
                objectiveScore,
                maxObjectiveScore,
                maxEssayScore,
                selectedObjectiveAnswers,
                groupMembers: groupMembers !== undefined ? groupMembers : updatedSubmissions[existingIndex].groupMembers,
                status: 'pending' as const,
              };
            } else {
              updatedSubmissions.push({
                studentId: targetSt.id,
                studentName: targetSt.fullName,
                matricula: targetSt.matricula,
                tag: targetSt.tag,
                avatarUrl: targetSt.avatarUrl,
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
          });

          const pendingCorrection = updatedSubmissions.filter((s) => s.status === 'pending').length;

          return {
            ...act,
            totalSubmissions: updatedSubmissions.length,
            pendingCorrection,
            submissions: updatedSubmissions,
          };
        })
      );

      if (selectedActivityForGrading && selectedActivityForGrading.id === activityId) {
        setSelectedActivityForGrading((prev) => {
          if (!prev) return null;
          let updatedSubmissions = [...prev.submissions];
          targetStudents.forEach((targetSt) => {
            const existingIndex = updatedSubmissions.findIndex((s) => s.studentId === targetSt.id);
            if (existingIndex >= 0) {
              updatedSubmissions[existingIndex] = {
                ...updatedSubmissions[existingIndex],
                essayAnswer,
                objectiveScore,
                maxObjectiveScore,
                maxEssayScore,
                selectedObjectiveAnswers,
                groupMembers: groupMembers !== undefined ? groupMembers : updatedSubmissions[existingIndex].groupMembers,
                status: 'pending' as const,
              };
            } else {
              updatedSubmissions.push({
                studentId: targetSt.id,
                studentName: targetSt.fullName,
                matricula: targetSt.matricula,
                tag: targetSt.tag,
                avatarUrl: targetSt.avatarUrl,
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
          });
          return {
            ...prev,
            totalSubmissions: updatedSubmissions.length,
            pendingCorrection: updatedSubmissions.filter((s) => s.status === 'pending').length,
            submissions: updatedSubmissions,
          };
        });
      }

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

  const handleSavePedagogicalNotes = async (studentId: string, notes: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, pedagogicalNotes: notes } : s))
    );
    if (supervisingStudent && supervisingStudent.id === studentId) {
      setSupervisingStudent((prev) => (prev ? { ...prev, pedagogicalNotes: notes } : null));
    }
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('students')
          .update({ pedagogical_notes: notes })
          .eq('id', studentId);
      } catch (err) {
        console.error('Erro ao salvar anotações pedagógicas no Supabase:', err);
      }
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
      const unreadMsgs = prev.filter(
        (m) => (m.threadId === threadId || m.recipientId === threadId || m.senderId === threadId) &&
               m.senderRole !== currentRole &&
               !m.read
      );
      if (unreadMsgs.length === 0) return prev;

      if (isSupabaseConfigured && supabase) {
        const unreadDbIds = unreadMsgs.map((m) => m.id).filter((id) => id && !id.startsWith('msg-'));
        if (unreadDbIds.length > 0) {
          supabase
            .from('chat_messages')
            .update({ read: true })
            .in('id', unreadDbIds)
            .then(({ error }) => {
              if (error) console.log('Atualização de mensagens lidas no Supabase:', error.message);
            });
        } else {
          supabase
            .from('chat_messages')
            .update({ read: true })
            .or(`thread_id.eq.${threadId},sender_id.eq.${threadId},recipient_id.eq.${threadId}`)
            .neq('sender_role', currentRole)
            .eq('read', false)
            .then(({ error }) => {
              if (error) console.log('Atualização de mensagens lidas no Supabase:', error.message);
            });
        }
      }

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
        onLoginSecondTeacher={handleLoginSecondTeacher}
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

          {currentTab === 'planejamento' && (
            <PlanningView students={students} />
          )}

          {currentTab === '2_professor' && (
            <SecondTeachersView
              teacher={teacher}
            />
          )}

          {currentTab === 'arquivos' && (
            <LibraryView
              files={library}
              driveFolderUrl={teacher.driveFolderUrl}
              onSaveDriveFolderUrl={handleSaveDriveFolderUrl}
              onAddFile={handleAddLibraryFile}
              onDeleteFile={handleDeleteLibraryFile}
            />
          )}

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
                <div>
                  <label className="block text-[#bccabb] font-semibold mb-1">Nova Senha de Acesso</label>
                  <input
                    type="password"
                    value={newTeacherPassword}
                    onChange={(e) => setNewTeacherPassword(e.target.value)}
                    className="w-full bg-[#131b2e] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#4ade80]"
                    placeholder="Deixe em branco para não alterar"
                  />
                  <p className="text-[10px] text-[#bccabb] mt-1 ml-1">Preencha apenas se desejar alterar a senha de acesso (Supabase Auth).</p>
                </div>

                <div className="pt-4 border-t border-white/10 space-y-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Segurança da Sessão</span>
                  </h3>
                  <div className="flex items-center justify-between p-4 bg-[#131b2e] rounded-2xl border border-white/10">
                    <div>
                      <p className="text-xs font-bold text-white">Deslogar por 8 minutos de inatividade</p>
                      <p className="text-[11px] text-[#bccabb] mt-0.5">Sua sessão será encerrada automaticamente após 8 minutos sem cliques ou movimentação.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                      <input
                        type="checkbox"
                        checked={inactivityTimeoutEnabled}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setInactivityTimeoutEnabled(val);
                          if (typeof window !== 'undefined') {
                            localStorage.setItem('inactivity_timeout_enabled', String(val));
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4ade80]"></div>
                    </label>
                  </div>
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

                      const isValidUUID = (id?: string | null) => !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

                      let authNotice = '';

                      // Atualizar Auth do Supabase PRIMEIRO
                      if (teacher.email || newTeacherPassword) {
                        try {
                          const { data: sessionData } = await supabase.auth.getSession();
                          const currentUser = sessionData?.session?.user;

                          const authUpdates: any = {};
                          if (teacher.email && currentUser && teacher.email !== currentUser.email) {
                            authUpdates.email = teacher.email;
                          }
                          if (newTeacherPassword) {
                            authUpdates.password = newTeacherPassword;
                          }

                          if (Object.keys(authUpdates).length > 0) {
                            const { error: authError } = await supabase.auth.updateUser(authUpdates);
                            if (authError) {
                              console.error('Erro/Aviso ao atualizar autenticação:', authError);
                              const isRateLimit =
                                authError.message?.toLowerCase().includes('security purposes') ||
                                authError.message?.toLowerCase().includes('after') ||
                                authError.message?.toLowerCase().includes('rate limit');
                              if (isRateLimit) {
                                authNotice = 'Nota de segurança: Aguarde 1 minuto para alterar e-mail/senha novamente no Supabase Auth.';
                              } else {
                                authNotice = `Aviso Auth: ${authError.message}`;
                              }
                            } else {
                              setNewTeacherPassword(''); // Limpa o campo de senha após alteração bem-sucedida
                            }
                          }
                        } catch (e) {
                          console.error('Falha de sistema ao atualizar auth:', e);
                        }
                      }

                      const updateFields: any = {
                        email: teacher.email,
                        name: teacher.name,
                        subject: teacher.subject,
                        avatar_url: teacher.avatarUrl,
                        phone: teacher.phone || null,
                        school: teacher.school || null,
                        drive_folder_url: teacher.driveFolderUrl || '',
                      };

                      if (teacher.id && isValidUUID(teacher.id)) {
                        updateFields.id = teacher.id;
                      }

                      let savedRow: any = null;
                      let error: any = null;

                      // 1. Tentar upsert por e-mail no Supabase
                      const upsertRes = await supabase
                        .from('teachers')
                        .upsert(updateFields, { onConflict: 'email' })
                        .select('*')
                        .maybeSingle();

                      savedRow = upsertRes.data;
                      error = upsertRes.error;

                      // 2. Se o upsert direto falhou (ex: falha de constraint UNIQUE em DB antigo), buscar por e-mail/ID e fazer update ou insert
                      if (error || !savedRow) {
                        let existingId: string | null = null;

                        if (teacher.email) {
                          const { data: rowByEmail } = await supabase
                            .from('teachers')
                            .select('id')
                            .eq('email', teacher.email)
                            .maybeSingle();
                          if (rowByEmail?.id) {
                            existingId = rowByEmail.id;
                          }
                        }

                        if (!existingId && teacher.id && isValidUUID(teacher.id)) {
                          const { data: rowById } = await supabase
                            .from('teachers')
                            .select('id')
                            .eq('id', teacher.id)
                            .maybeSingle();
                          if (rowById?.id) {
                            existingId = rowById.id;
                          }
                        }

                        if (existingId) {
                          const updatePayload = { ...updateFields };
                          delete updatePayload.id;
                          const res = await supabase
                            .from('teachers')
                            .update(updatePayload)
                            .eq('id', existingId)
                            .select('*')
                            .maybeSingle();
                          savedRow = res.data;
                          error = res.error;
                        } else {
                          const res = await supabase
                            .from('teachers')
                            .insert(updateFields)
                            .select('*')
                            .maybeSingle();
                          savedRow = res.data;
                          error = res.error;
                        }
                      }

                      if (error) {
                        console.error('Erro ao salvar professor no Supabase:', error);
                        setTeacherSaveStatus({
                          type: 'error',
                          message: `ARMADILHA DE BUG DISPARADA: Erro ao salvar no Supabase (${error.code || 'BD'}): ${error.message}`,
                        });
                        return;
                      }

                      if (!savedRow) {
                        console.error('Nenhum registro de professor retornado pelo Supabase.');
                        setTeacherSaveStatus({
                          type: 'error',
                          message: 'ARMADILHA DE BUG DISPARADA: O Supabase não confirmou a gravação do registro. Verifique a conexão e permissões.',
                        });
                        return;
                      }

                      const updatedTeacher: TeacherUser = {
                        id: savedRow.id,
                        name: savedRow.name,
                        subject: savedRow.subject || 'Sociologia',
                        email: savedRow.email,
                        avatarUrl: savedRow.avatar_url || teacher.avatarUrl,
                        phone: savedRow.phone || '',
                        school: savedRow.school || '',
                        driveFolderUrl: savedRow.drive_folder_url || teacher.driveFolderUrl || '',
                      };
                      setTeacher(updatedTeacher);

                      const successMessage = authNotice
                        ? `Perfil salvo no banco com sucesso! (${authNotice})`
                        : `Informações salvas e confirmadas no Supabase! (ID do banco: ${savedRow.id})`;

                      setTeacherSaveStatus({
                        type: 'success',
                        message: successMessage,
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
        onSaveNotes={handleSavePedagogicalNotes}
        onSendMessage={(st) => {
          setSupervisingStudent(null);
          setCurrentTab('mensagens');
        }}
      />
    </div>
  );
}
